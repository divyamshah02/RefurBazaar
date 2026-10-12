"""
Shared checkout / order helpers.

Unit "hold" lifecycle
---------------------
available  -> is_available=True,  is_sold=False, half_sold=False
held       -> is_available=False, is_sold=False, half_sold=True  (unpaid Razorpay order)
sold       -> is_available=False, is_sold=True,  half_sold=False

A held unit is hidden from every listing (they all filter on is_available /
is_sold) so nobody else can buy it while the first buyer's order is awaiting
payment. Holds expire after CHECKOUT_HOLD_MINUTES; the order itself stays
"pending" so the customer can still pay from the order page as long as the
device has not been bought by someone else in the meantime.
"""
import re
import hmac
import hashlib
import logging
from datetime import timedelta

import razorpay
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from Product.models import ListingUnit
from UserDetail.models import Address


logger = logging.getLogger(__name__)

DEFAULT_HOLD_MINUTES = 30


class CheckoutError(Exception):
    """Raised inside a transaction to roll it back and return a clean API error."""

    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


# ---------------------------------------------------------------- holds ----

def hold_minutes():
    return int(getattr(settings, 'CHECKOUT_HOLD_MINUTES', DEFAULT_HOLD_MINUTES))


def hold_unit(unit):
    unit.half_sold = True
    unit.half_sold_at = timezone.now()
    unit.is_available = False
    unit.save(update_fields=['half_sold', 'half_sold_at', 'is_available'])


def release_unit(unit):
    if unit.is_sold:
        return
    unit.half_sold = False
    unit.half_sold_at = None
    unit.is_available = True
    unit.save(update_fields=['half_sold', 'half_sold_at', 'is_available'])


def sell_unit(unit):
    unit.is_sold = True
    unit.is_available = False
    unit.half_sold = False
    unit.half_sold_at = None
    unit.save(update_fields=['is_sold', 'is_available', 'half_sold', 'half_sold_at'])


def release_expired_holds():
    """Free units whose checkout hold ran out. Returns how many were freed."""
    threshold = timezone.now() - timedelta(minutes=hold_minutes())
    return ListingUnit.objects.filter(
        half_sold=True, is_sold=False, half_sold_at__lt=threshold
    ).update(half_sold=False, half_sold_at=None, is_available=True)


# --------------------------------------------------------------- orders ----

class PaymentNotCaptured(CheckoutError):
    """Razorpay has not (yet) reported the payment as captured."""


def active_claims(unit, exclude_order=None):
    """True if a live (not cancelled, not rejected) order item still owns `unit`."""
    from .models import OrderItem
    claims = OrderItem.objects.filter(listing_unit=unit).exclude(
        order__status='cancelled'
    ).exclude(fulfillment_status='rejected')
    if exclude_order is not None:
        claims = claims.exclude(order=exclude_order)
    return claims.exists()


def unit_problem(unit, order=None):
    """Why `unit` cannot be bought/paid for right now, or None when it is fine."""
    listing = unit.listing
    if unit.is_sold:
        return "already sold"
    if listing.status in ('inactive', 'draft'):
        return "no longer listed for sale"
    seller = listing.refurbisher
    if getattr(seller, 'active_user', True) is False:
        return "from a seller who is no longer active"
    profile = getattr(seller, 'company_profile', None)
    if profile is not None and not profile.is_approved:
        return "from a seller who is not approved"
    if not unit.is_available and not unit.half_sold:
        return "not available"
    if active_claims(unit, exclude_order=order):
        return "reserved by another order"
    return None


def release_order_units(order):
    """Put this order's devices back on sale, never touching a device another live order owns."""
    with transaction.atomic():
        for item in order.items.all():
            unit = ListingUnit.objects.select_for_update().get(pk=item.listing_unit_id)
            if active_claims(unit, exclude_order=order):
                continue
            unit.is_sold = False
            unit.half_sold = False
            unit.half_sold_at = None
            unit.is_available = True
            unit.save(update_fields=['is_sold', 'half_sold', 'half_sold_at', 'is_available'])


def cancel_pending_order(order, release_units=True):
    """Cancel an unpaid order and (optionally) give its devices back to the shop."""
    from .models import Order
    with transaction.atomic():
        # Lock the order so a payment confirming at the same moment cannot also be cancelled.
        locked = Order.objects.select_for_update().get(pk=order.pk)
        if locked.payment_received or locked.status != 'pending':
            order.refresh_from_db()
            return False
        locked.status = 'cancelled'
        locked.save(update_fields=['status', 'updated_at'])
        if release_units:
            for item in locked.items.all():
                unit = ListingUnit.objects.select_for_update().get(pk=item.listing_unit_id)
                if unit.half_sold and not unit.is_sold and not active_claims(unit, exclude_order=locked):
                    release_unit(unit)
    order.refresh_from_db()
    return True


def supersede_pending_orders(unit, keep_order):
    """
    A new buyer is claiming `unit`. Any older unpaid order for the same
    device can no longer be fulfilled, so cancel it instead of leaving a
    pending order that points at a device someone else now owns.
    """
    from .models import Order
    stale = Order.objects.filter(
        items__listing_unit=unit, status='pending', payment_received=False
    ).exclude(pk=keep_order.pk).distinct()
    for stale_order in stale:
        stale_order.status = 'cancelled'
        stale_order.save(update_fields=['status', 'updated_at'])


def confirm_payment(order, payment_id, signature='', verify_capture=True):
    """
    Mark an order as paid and its devices as sold. Idempotent.

    Raises PaymentNotCaptured while Razorpay has not captured the money, and
    CheckoutError when the order was cancelled or a device is no longer free
    (the caller should then refund). The order row and its devices are locked
    together so cancel/pay races end in exactly one outcome.
    """
    from .models import Order
    if order.payment_received:
        return False
    if verify_capture and not payment_is_captured(order, payment_id):
        raise PaymentNotCaptured(
            "Your payment is not captured yet. If money was deducted, the order will be "
            "confirmed or the amount refunded automatically.", 402
        )
    with transaction.atomic():
        locked = Order.objects.select_for_update().get(pk=order.pk)
        if locked.payment_received:
            order.refresh_from_db()
            return False
        if locked.status == 'cancelled':
            raise CheckoutError("This order was cancelled before the payment completed.", 409)

        items = list(locked.items.all())
        units = {
            u.id: u for u in ListingUnit.objects.select_for_update().filter(
                id__in=[i.listing_unit_id for i in items]
            )
        }
        for item in items:
            unit = units[item.listing_unit_id]
            if unit.is_sold or active_claims(unit, exclude_order=locked):
                raise CheckoutError(
                    "A device in this order was bought by someone else before the payment completed.", 409
                )

        locked.razorpay_payment_id = payment_id or locked.razorpay_payment_id
        locked.razorpay_signature = signature or locked.razorpay_signature
        locked.payment_received = True
        if locked.status == 'pending':
            locked.status = 'confirmed'
        locked.save()
        for unit in units.values():
            sell_unit(unit)
    order.refresh_from_db()
    return True


# ------------------------------------------------------------- razorpay ----

def get_razorpay_client():
    key_id = getattr(settings, 'RAZORPAY_KEY_ID', None)
    key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', None)
    if not key_id or not key_secret:
        raise CheckoutError("Razorpay credentials not configured", 500)
    return razorpay.Client(auth=(key_id, key_secret)), key_id


def create_razorpay_order(order):
    """Create a Razorpay order for `order`, store its id and return the payload for the checkout modal."""
    client, key_id = get_razorpay_client()
    try:
        rzp_order = client.order.create({
            'amount': int(order.total_amount * 100),
            'currency': 'INR',
            'receipt': order.order_id,
            'notes': {'order_id': order.order_id},
        })
    except Exception as exc:
        raise CheckoutError(f"Razorpay order creation failed: {exc}", 502)
    order.razorpay_order_id = rzp_order['id']
    order.save(update_fields=['razorpay_order_id', 'updated_at'])
    rzp_order['key_id'] = key_id
    return rzp_order


def valid_signature(razorpay_order_id, razorpay_payment_id, signature):
    secret = getattr(settings, 'RAZORPAY_KEY_SECRET', None)
    if not secret:
        return False
    expected = hmac.new(
        secret.encode(), f"{razorpay_order_id}|{razorpay_payment_id}".encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature or '')


def payment_is_captured(order, payment_id):
    """
    True once Razorpay reports the payment as captured. An authorized payment
    (manual-capture accounts) is captured here first; anything else is not paid.
    """
    if not payment_id:
        return False
    try:
        client, _ = get_razorpay_client()
        payment = client.payment.fetch(payment_id)
        expected = int(order.total_amount * 100)
        if order.razorpay_order_id and payment.get('order_id') != order.razorpay_order_id:
            return False
        if int(payment.get('amount') or 0) != expected:
            return False
        if payment.get('status') == 'captured':
            return True
        if payment.get('status') == 'authorized':
            captured = client.payment.capture(payment_id, expected, {'currency': 'INR'})
            return captured.get('status') == 'captured'
    except Exception:
        logger.exception("Could not verify capture for payment %s", payment_id)
    return False


MAX_REFUND_ATTEMPTS = 5


def request_refund(order, payment_id=None):
    """
    Full refund of a payment we cannot fulfil. The attempt and its outcome are
    saved on the order so a failed refund is visible to admin and retried
    (see retry_failed_refunds). Returns True once Razorpay has accepted it.
    """
    if order.refund_status == 'processed':
        return True
    payment_id = payment_id or order.refund_payment_id or order.razorpay_payment_id
    order.refund_payment_id = payment_id or ''
    order.refund_attempts = (order.refund_attempts or 0) + 1
    try:
        client, _ = get_razorpay_client()
        refund = client.payment.refund(payment_id, {})
        order.refund_status = 'processed'
        order.refund_id = refund.get('id', '') if isinstance(refund, dict) else ''
        order.refund_error = ''
        accepted = True
    except Exception as exc:
        order.refund_status = 'failed'
        order.refund_error = str(exc)[:500]
        logger.error("Refund failed for order %s (attempt %s): %s", order.order_id, order.refund_attempts, exc)
        accepted = False
    order.save(update_fields=[
        'refund_payment_id', 'refund_attempts', 'refund_status', 'refund_id', 'refund_error', 'updated_at'
    ])
    return accepted


def retry_failed_refunds():
    """Retry refunds that failed earlier. Returns (retried, still_failing)."""
    from .models import Order
    pending = Order.objects.filter(refund_status='failed', refund_attempts__lt=MAX_REFUND_ATTEMPTS)
    retried = still_failing = 0
    for order in pending:
        retried += 1
        if not request_refund(order):
            still_failing += 1
    return retried, still_failing


# -------------------------------------------------- customer profile sync ----

def normalize_phone(value):
    """Digits only, dropping a leading country code. Returns '' if it is not a 10 digit number."""
    digits = re.sub(r'\D', '', value or '')
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith('0'):
        digits = digits[1:]
    return digits if len(digits) == 10 else ''


def sync_customer_profile(user, data):
    """
    Save what the customer typed at checkout onto their account, filling only
    fields that are still empty so we never overwrite details they set earlier.
    """
    updates = []
    for field, value in (
        ('first_name', (data.get('first_name') or '').strip()),
        ('last_name', (data.get('last_name') or '').strip()),
        ('email', (data.get('email') or '').strip().lower()),
        ('contact_number', normalize_phone(data.get('phone'))),
    ):
        if value and not getattr(user, field):
            setattr(user, field, value)
            updates.append(field)
    if updates:
        user.save(update_fields=updates)


def save_checkout_address(user, data, set_as_primary):
    """Store the shipping address in the address book (once) and return it."""
    line = (data.get('shipping_address') or '').strip()
    pincode = (data.get('shipping_pincode') or '').strip()
    book = Address.objects.filter(user_id=user.user_id)

    address = next(
        (a for a in book if a.address_line.strip().lower() == line.lower() and a.pincode == pincode),
        None,
    )
    if address is None:
        address = Address.objects.create(
            user_id=user.user_id,
            address_line=line,
            city=(data.get('shipping_city') or '').strip(),
            state=(data.get('shipping_state') or '').strip(),
            pincode=pincode,
            address_name=f"Address {book.count() + 1}" if book.exists() else "Home",
            is_default=False,
        )

    if set_as_primary or not book.filter(is_default=True).exclude(pk=address.pk).exists():
        book.exclude(pk=address.pk).update(is_default=False)
        if not address.is_default:
            address.is_default = True
            address.save(update_fields=['is_default'])
    return address
