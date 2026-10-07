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
from datetime import timedelta

import razorpay
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from Product.models import ListingUnit
from UserDetail.models import Address


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

def cancel_pending_order(order, release_units=True):
    """Cancel an unpaid order and (optionally) give its devices back to the shop."""
    if order.payment_received or order.status != 'pending':
        return False
    with transaction.atomic():
        order.status = 'cancelled'
        order.save(update_fields=['status', 'updated_at'])
        if release_units:
            for item in order.items.select_related('listing_unit'):
                unit = item.listing_unit
                # Only release a unit that is still held by this (now cancelled) order.
                if unit.half_sold and not unit.is_sold:
                    release_unit(unit)
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


def confirm_payment(order, payment_id, signature=''):
    """Mark an order as paid and its devices as sold. Idempotent."""
    if order.payment_received:
        return False
    with transaction.atomic():
        order.razorpay_payment_id = payment_id
        order.razorpay_signature = signature or order.razorpay_signature
        order.payment_received = True
        order.status = 'confirmed'
        order.save()
        for item in order.items.select_related('listing_unit'):
            sell_unit(item.listing_unit)
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


def refund_payment(payment_id):
    """Best-effort full refund, used when money arrives for an order we can no longer fulfil."""
    try:
        client, _ = get_razorpay_client()
        client.payment.refund(payment_id, {})
        return True
    except Exception:
        return False


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
