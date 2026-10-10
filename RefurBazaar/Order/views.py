from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from urllib.parse import urlencode
import json
from django.db import transaction
from django.conf import settings
from datetime import timedelta
import razorpay
import hmac
import hashlib
from decimal import Decimal

from .models import Order, OrderItem
from .serializers import (
    OrderSerializer, OrderCreateSerializer, 
    PaymentVerificationSerializer, OrderItemSerializer,
    OrderItemVerificationSerializer, OrderItemActionSerializer,
    ReturnRequestSerializer
)
from .services import (
    CheckoutError, release_expired_holds, hold_unit, sell_unit, cancel_pending_order,
    supersede_pending_orders, confirm_payment, create_razorpay_order, get_razorpay_client,
    valid_signature, refund_payment, sync_customer_profile, save_checkout_address,
)
from .shiprocket_service import create_shiprocket_shipment, refresh_tracking
from ShoppingCart.models import ShoppingCart, ShoppingCartItem
from Product.models import ListingUnit
from utils.decorators import handle_exceptions, check_authentication, check_refurbisher_profile
from utils.shiprocket_api import ShiprocketClient, ShiprocketAPIException
from utils.email_service import send_order_confirmation_email


def _error(message, code=400, not_logged_in=False):
    return Response({
        "success": False, "user_not_logged_in": not_logged_in, "user_unauthorized": code == 403,
        "data": None, "error": message
    }, status=code)


def _place_order(user, cart, data):
    """Create the order, claim its devices and (for Razorpay) the payment order. Runs inside a transaction."""
    cart_items = list(
        ShoppingCartItem.objects.filter(cart=cart).select_related(
            'listing_unit__listing__model__brand', 'listing_unit__listing__refurbisher'
        )
    )
    if not cart_items:
        raise CheckoutError("Your cart is empty", 400)

    units = {
        u.id: u for u in ListingUnit.objects.select_for_update().filter(
            id__in=[ci.listing_unit_id for ci in cart_items]
        )
    }
    unavailable = [
        str(ci.listing_unit.listing.model) for ci in cart_items
        if units[ci.listing_unit_id].is_sold or not units[ci.listing_unit_id].is_available
    ]
    if unavailable:
        raise CheckoutError(
            f"Some items are no longer available: {', '.join(unavailable)}. "
            "Please remove them from your cart and try again.", 409
        )

    subtotal_amount = sum(units[ci.listing_unit_id].price for ci in cart_items)
    tax_amount = Decimal('0.00')
    delivery_charge = Decimal('50.00')
    # Warranty comes from the cart items' server-set price, never from the request body.
    warranty_amount = sum(
        (ci.warranty_price for ci in cart_items if ci.has_extended_warranty), Decimal('0.00')
    )
    total_amount = subtotal_amount + tax_amount + delivery_charge + warranty_amount

    sync_customer_profile(user, data)
    address = save_checkout_address(user, data, data['set_as_primary']) if data['save_address'] else None
    shipping_address_id = data.get('shipping_address_id') or (address.id if address else None)

    order = Order.objects.create(
        user=user,
        first_name=data['first_name'],
        last_name=data['last_name'],
        # The verified account email is authoritative.
        email=(user.email or data['email']).lower(),
        phone=data['phone'],
        alternate_phone=data.get('alternate_phone', ''),
        shipping_address=data['shipping_address'],
        shipping_city=data['shipping_city'],
        shipping_state=data['shipping_state'],
        shipping_pincode=data['shipping_pincode'],
        shipping_address_id=shipping_address_id,
        different_billing_address=data['different_billing_address'],
        billing_first_name=data.get('billing_first_name', ''),
        billing_last_name=data.get('billing_last_name', ''),
        billing_address=data.get('billing_address', ''),
        billing_city=data.get('billing_city', ''),
        billing_state=data.get('billing_state', ''),
        billing_pincode=data.get('billing_pincode', ''),
        billing_phone=data.get('billing_phone', ''),
        billing_alternate_phone=data.get('billing_alternate_phone', ''),
        delivery_date=data.get('delivery_date'),
        timeslot_id=data.get('timeslot_id', ''),
        special_instructions=data.get('special_instructions', ''),
        subtotal_amount=subtotal_amount,
        tax_amount=tax_amount,
        delivery_charge=delivery_charge,
        warranty_amount=warranty_amount,
        discount_amount=Decimal('0.00'),
        coupon_code=data.get('coupon_code', ''),
        coupon_discount=Decimal('0.00'),
        total_amount=total_amount,
        payment_method=data['payment_method'],
        order_note=data.get('order_note', ''),
        status='pending',
    )

    is_online = data['payment_method'] == 'razorpay'
    for ci in cart_items:
        unit = units[ci.listing_unit_id]
        OrderItem.objects.create(
            order=order,
            listing_unit=unit,
            price_at_purchase=unit.price,
            condition_at_purchase=unit.condition,
            refurbisher=unit.listing.refurbisher,
            refurbisher_name=unit.listing.refurbisher.first_name,
            has_extended_warranty=ci.has_extended_warranty,
            warranty_price=ci.warranty_price if ci.has_extended_warranty else 0,
        )
        # Older unpaid orders for this device can no longer be fulfilled.
        supersede_pending_orders(unit, order)
        # The device is taken: drop it from every other cart too.
        ShoppingCartItem.objects.filter(listing_unit=unit).exclude(cart=cart).delete()
        if is_online:
            hold_unit(unit)
        else:
            sell_unit(unit)

    razorpay_order = None
    if is_online:
        razorpay_order = create_razorpay_order(order)
    else:
        order.status = 'confirmed'
        order.payment_received = False  # COD: collected on delivery
        order.save()

    ShoppingCartItem.objects.filter(cart=cart).delete()
    cart.active_cart = False
    cart.user = user
    cart.save()

    return order, razorpay_order


def _reusable_razorpay_order(order):
    """
    Reuse the order's existing Razorpay order when it is still open and the amount
    matches. Returns {'already_paid': True} if Razorpay says it was paid (and
    reconciles our order), or None when a fresh Razorpay order is needed.
    """
    if not order.razorpay_order_id:
        return None
    try:
        client, key_id = get_razorpay_client()
        existing = client.order.fetch(order.razorpay_order_id)
        rzp_status = existing.get('status')

        if rzp_status == 'paid':
            payments = client.order.payments(order.razorpay_order_id).get('items', [])
            paid = next((p for p in payments if p.get('status') in ('captured', 'authorized')), None)
            if paid:
                confirm_payment(order, paid['id'])
                return {'already_paid': True}
            return None

        if rzp_status in ('created', 'attempted') and existing.get('amount') == int(order.total_amount * 100):
            existing['key_id'] = key_id
            return existing
    except Exception:
        return None
    return None


# Billing, payment gateway and session details a refurbisher does not need to fulfil an item.
REFURBISHER_HIDDEN_ORDER_FIELDS = (
    'user', 'session_id', 'email', 'alternate_phone',
    'different_billing_address', 'billing_first_name', 'billing_last_name',
    'billing_address', 'billing_city', 'billing_state', 'billing_pincode',
    'billing_phone', 'billing_alternate_phone',
    'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'razorpay_link',
    'coupon_code', 'coupon_discount', 'discount_amount',
)


def refurbisher_safe_order_data(order):
    data = OrderSerializer(order).data
    for field in REFURBISHER_HIDDEN_ORDER_FIELDS:
        data.pop(field, None)
    return data


def _page_url(path, **params):
    query = urlencode({k: v for k, v in params.items() if v})
    return f"{path}?{query}" if query else path


@csrf_exempt
@require_http_methods(["GET", "POST"])
def payment_callback(request):
    """
    Razorpay redirect-mode callback (checkout option `callback_url`).

    After the customer pays (including the 3-D Secure / UPI step), Razorpay sends the
    browser here with a POST: razorpay_payment_id, razorpay_order_id, razorpay_signature.
    On failure it posts `error[code]`, `error[description]` and `error[metadata]`.
    Trust comes from the signature, not the session (the cross-site POST carries no
    SameSite=Lax cookie), so this view is CSRF-exempt. It always ends in a redirect to
    a normal page, where the customer's own session takes over.
    """
    data = request.POST if request.method == 'POST' else request.GET

    rzp_order_id = data.get('razorpay_order_id') or ''
    rzp_payment_id = data.get('razorpay_payment_id') or ''
    rzp_signature = data.get('razorpay_signature') or ''

    error_description = data.get('error[description]') or data.get('error_description') or ''
    if not rzp_order_id:
        try:
            metadata = json.loads(data.get('error[metadata]') or '{}')
            rzp_order_id = metadata.get('order_id') or ''
        except (ValueError, TypeError):
            pass

    order = None
    if request.GET.get('order_id'):
        order = Order.objects.filter(order_id=request.GET['order_id']).first()
    if order is None and rzp_order_id:
        order = Order.objects.filter(razorpay_order_id=rzp_order_id).first()
    if order is None:
        return redirect('/account/')

    detail_path = '/order-detail/'
    if order.payment_received:
        return redirect(_page_url('/order-success/', order_id=order.order_id))

    paid_fields = rzp_payment_id and rzp_signature and rzp_order_id
    if not paid_fields or error_description:
        return redirect(_page_url(
            detail_path, order_id=order.order_id, payment='failed',
            reason=error_description or 'The payment was not completed.',
        ))

    if order.razorpay_order_id != rzp_order_id or not valid_signature(rzp_order_id, rzp_payment_id, rzp_signature):
        return redirect(_page_url(
            detail_path, order_id=order.order_id, payment='failed',
            reason='We could not verify this payment. If money was deducted it will be refunded.',
        ))

    if order.status == 'cancelled':
        refunded = refund_payment(rzp_payment_id)
        return redirect(_page_url(
            detail_path, order_id=order.order_id, payment='cancelled',
            reason='This order was cancelled before the payment completed. '
                   + ('Your payment has been refunded.' if refunded
                      else 'Any amount charged will be refunded shortly.'),
        ))

    confirm_payment(order, rzp_payment_id, rzp_signature)
    send_order_confirmation_email(order)
    return redirect(_page_url('/order-success/', order_id=order.order_id))


class OrderViewSet(viewsets.ViewSet):
    """ViewSet for Order operations"""
    
    @action(detail=False, methods=['post'], url_path='create')
    @handle_exceptions
    def create_order(self, request):
        """
        Create an order from the cart.
        Razorpay: the devices are held (hidden from the shop) until payment is
        verified or the hold expires. COD: the devices are sold immediately.
        Requires a verified (logged-in) customer; the profile and address book
        are updated from what was entered at checkout.
        """
        release_expired_holds()

        if not request.user.is_authenticated:
            return _error("Please verify your email to place an order.", 401, not_logged_in=True)

        serializer = OrderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(serializer.errors, 400)

        data = serializer.validated_data
        user = request.user

        cart = ShoppingCart.objects.filter(cart_id=data['cart_id'], active_cart=True).first()
        if not cart:
            return _error("Cart not found or inactive", 404)

        session_token = request.session.get('cart_session_token')
        owns_cart = cart.user_id == user.pk or (
            cart.user_id is None and session_token and cart.session_id == session_token
        )
        if not owns_cart:
            return _error("This cart does not belong to you", 403)

        try:
            with transaction.atomic():
                order, razorpay_order = _place_order(user, cart, data)
        except CheckoutError as exc:
            return _error(exc.message, exc.status_code)

        # COD orders are confirmed immediately; email right away.
        # Razorpay orders are confirmed in verify_payment instead.
        if order.payment_method != 'razorpay':
            send_order_confirmation_email(order)

        response_data = OrderSerializer(order).data
        if razorpay_order:
            response_data['razorpay_order'] = razorpay_order

        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": response_data, "error": None
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='verify-payment')
    @handle_exceptions
    def verify_payment(self, request):
        """Verify Razorpay payment signature and confirm the order"""
        order = get_object_or_404(Order, order_id=request.data.get('order_id'))

        rzp_order_id = request.data.get('razorpay_order_id') or ''
        rzp_payment_id = request.data.get('razorpay_payment_id') or ''
        rzp_signature = request.data.get('razorpay_signature') or ''

        if not getattr(settings, 'RAZORPAY_KEY_SECRET', None):
            return _error("Razorpay credentials not configured", 500)
        if not (rzp_order_id and rzp_payment_id and rzp_signature):
            return _error("Missing payment details")
        if order.razorpay_order_id != rzp_order_id:
            return _error("Payment does not belong to this order")
        if not valid_signature(rzp_order_id, rzp_payment_id, rzp_signature):
            return _error("Payment verification failed")

        # Already confirmed (e.g. double submit) - success without re-sending the email.
        if order.payment_received:
            return Response({
                "success": True, "user_not_logged_in": False, "user_unauthorized": False,
                "data": OrderSerializer(order).data, "error": None
            }, status=status.HTTP_200_OK)

        if order.status == 'cancelled':
            refunded = refund_payment(rzp_payment_id)
            return _error(
                "This order was cancelled before the payment completed. "
                + ("Your payment has been refunded." if refunded
                   else "Any amount charged will be refunded to you shortly."),
                409,
            )

        confirm_payment(order, rzp_payment_id, rzp_signature)
        send_order_confirmation_email(order)

        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": OrderSerializer(order).data, "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='pay')
    @handle_exceptions
    @check_authentication()
    def pay_order(self, request, pk=None):
        """
        Resume payment for an order that is still 'Pending Payment'.
        Re-checks the devices are still free, refreshes the hold and returns a
        Razorpay order for the checkout modal.
        """
        release_expired_holds()
        order = get_object_or_404(Order, order_id=pk, user=request.user)

        if order.payment_received or order.status != 'pending':
            return _error("This order is not waiting for payment.", 400)
        if order.payment_method != 'razorpay':
            return _error("This order is not an online payment order.", 400)

        items = list(order.items.select_related('listing_unit__listing__model__brand'))

        with transaction.atomic():
            units = {
                u.id: u for u in ListingUnit.objects.select_for_update().filter(
                    id__in=[i.listing_unit_id for i in items]
                )
            }
            gone = [
                str(units[i.listing_unit_id].listing.model)
                for i in items
                if units[i.listing_unit_id].is_sold
                or (not units[i.listing_unit_id].is_available and not units[i.listing_unit_id].half_sold)
            ]

        if gone:
            cancel_pending_order(order)
            return _error(
                f"Sorry, {', '.join(gone)} is no longer available, so this order has been cancelled.", 409
            )

        try:
            with transaction.atomic():
                for i in items:
                    hold_unit(ListingUnit.objects.select_for_update().get(pk=i.listing_unit_id))

                razorpay_order = _reusable_razorpay_order(order)
                if razorpay_order is None:
                    razorpay_order = create_razorpay_order(order)
        except CheckoutError as exc:
            return _error(exc.message, exc.status_code)

        if razorpay_order.get('already_paid'):
            order.refresh_from_db()
            send_order_confirmation_email(order)
            return Response({
                "success": True, "user_not_logged_in": False, "user_unauthorized": False,
                "data": {"already_paid": True, "order": OrderSerializer(order).data}, "error": None
            }, status=status.HTTP_200_OK)

        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": {"already_paid": False, "razorpay_order": razorpay_order,
                     "order": OrderSerializer(order).data},
            "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='cancel')
    @handle_exceptions
    @check_authentication()
    def cancel_order(self, request, pk=None):
        """Cancel an order that has not been paid yet and free its devices."""
        order = get_object_or_404(Order, order_id=pk, user=request.user)
        if not cancel_pending_order(order):
            return _error("Only orders that are waiting for payment can be cancelled here.", 400)
        order.refresh_from_db()
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": OrderSerializer(order).data, "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='cleanup-half-sold')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def cleanup_half_sold(self, request):
        """Release devices whose checkout hold expired (also runs automatically)."""
        count = release_expired_holds()
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": {"released_count": count}, "error": None
        }, status=status.HTTP_200_OK)
    
    
    @action(detail=False, methods=['get'], url_path='my-orders')
    @handle_exceptions
    @check_authentication()
    def my_orders(self, request):
        """Get all orders for logged-in user"""
        orders = Order.objects.filter(user=request.user).prefetch_related('items')
        serializer = OrderSerializer(orders, many=True)
        
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'], url_path='detail')
    @handle_exceptions
    def order_detail(self, request, pk=None):
        """Get order details by order_id"""
        order = get_object_or_404(Order, order_id=pk)
        
        if order.user_id:
            if not request.user.is_authenticated:
                return Response({
                    "success": False, "user_not_logged_in": True, "user_unauthorized": False,
                    "data": None, "error": "Please log in to view this order."
                }, status=status.HTTP_401_UNAUTHORIZED)
            if order.user != request.user:
                return Response({
                    "success": False, "user_not_logged_in": False, "user_unauthorized": True,
                    "data": None, "error": "Unauthorized access"
                }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = OrderSerializer(order)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='refurbisher-orders')
    @handle_exceptions
    @check_refurbisher_profile()
    def refurbisher_orders(self, request):
        """Get all orders for refurbisher's sold items"""
        # Get all order items for this refurbisher
        order_items = OrderItem.objects.filter(
            refurbisher=request.user
        ).select_related('order', 'listing_unit__listing__model__brand')
        
        # Group by order
        orders_dict = {}
        for item in order_items:
            order_id = item.order.order_id
            if order_id not in orders_dict:
                orders_dict[order_id] = {
                    'order': item.order,
                    'items': []
                }
            orders_dict[order_id]['items'].append(item)
        
        # Serialize orders
        orders_data = []
        for order_info in orders_dict.values():
            order_data = refurbisher_safe_order_data(order_info['order'])
            # Filter items to only show this refurbisher's items
            order_data['items'] = [
                OrderItemSerializer(item).data 
                for item in order_info['items']
            ]
            orders_data.append(order_data)
        
        # Sort by created_at descending
        orders_data.sort(key=lambda x: x['created_at'], reverse=True)
        
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": orders_data, "error": None
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'], url_path='refurbisher-order-detail')
    @handle_exceptions
    @check_refurbisher_profile()
    def refurbisher_order_detail(self, request, pk=None):
        """Get order detail for refurbisher (shows only their items)"""
        order = get_object_or_404(Order, order_id=pk)
        
        # Check if refurbisher has any items in this order
        refurbisher_items = OrderItem.objects.filter(
            order=order,
            refurbisher=request.user
        ).select_related('listing_unit__listing__model__brand')
        
        if not refurbisher_items.exists():
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": True,
                "data": None, "error": "You don't have any items in this order"
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Serialize order with only refurbisher's items
        order_data = refurbisher_safe_order_data(order)
        order_data['items'] = [OrderItemSerializer(item).data for item in refurbisher_items]
        
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": order_data, "error": None
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='shipping-rates')
    @handle_exceptions
    @check_refurbisher_profile()
    def shipping_rates(self, request, pk=None):
        """
        Step 1 of accepting an order: refurbisher gives a pickup date (+ optional
        box size override) and gets back ShipRocket's available couriers + rates
        for their address -> the customer's address.
        """
        order_item = get_object_or_404(OrderItem, id=pk)

        if order_item.refurbisher != request.user:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": True,
                "data": None, "error": "Unauthorized access"
            }, status=status.HTTP_403_FORBIDDEN)

        if not order_item.order.payment_received:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Payment has not been confirmed for this order yet."
            }, status=status.HTTP_400_BAD_REQUEST)

        profile = getattr(request.user, 'company_profile', None)
        if not profile or not profile.shiprocket_warehouse_created or not profile.shiprocket_pickup_code:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None,
                "error": "Your warehouse/pickup point hasn't been set up yet. Please contact admin."
            }, status=status.HTTP_400_BAD_REQUEST)

        pickup_date = request.data.get('pickup_date')
        if not pickup_date:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "pickup_date is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        defaults = order_item.get_default_box_dims()
        box = {
            "length": float(request.data.get('box_length') or defaults['length']),
            "breadth": float(request.data.get('box_breadth') or defaults['breadth']),
            "height": float(request.data.get('box_height') or defaults['height']),
            "weight": float(request.data.get('box_weight') or defaults['weight']),
        }

        try:
            client = ShiprocketClient()
            response = client.check_serviceability(
                pickup_postcode=profile.pincode,
                delivery_postcode=order_item.order.shipping_pincode,
                weight=box['weight'],
                cod=1 if order_item.order.payment_method == 'cod' else 0,
                declared_value=float(order_item.price_at_purchase),
            )
        except ShiprocketAPIException as e:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": f"Could not fetch shipping rates: {e}"
            }, status=status.HTTP_502_BAD_GATEWAY)

        couriers_raw = (
            response.get("data", {}).get("available_courier_companies", [])
            if isinstance(response, dict) else []
        )
        couriers = sorted([
            {
                "courier_id": c.get("courier_company_id"),
                "courier_name": c.get("courier_name"),
                "rate": c.get("rate"),
                "etd": c.get("etd"),
                "rating": c.get("rating"),
            }
            for c in couriers_raw
        ], key=lambda c: c["rate"] or float('inf'))

        # Save the box + pickup date now (shipment not created yet — just staged).
        order_item.box_length, order_item.box_breadth = box['length'], box['breadth']
        order_item.box_height, order_item.box_weight = box['height'], box['weight']
        order_item.pickup_scheduled_date = pickup_date
        order_item.save(update_fields=['box_length', 'box_breadth', 'box_height', 'box_weight', 'pickup_scheduled_date'])

        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": {
                "couriers": couriers,
                "recommended_courier_id": couriers[0]["courier_id"] if couriers else None,
                "box": box,
                "pickup_date": pickup_date,
            },
            "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='confirm-shipping')
    @handle_exceptions
    @check_refurbisher_profile()
    def confirm_shipping(self, request, pk=None):
        """
        Step 2: refurbisher confirms (or accepts the default/cheapest) courier
        from the shipping-rates results. This is the "accept order" action —
        the actual ShipRocket shipment is only created later, once IMEI/photos
        are submitted via verify-item.
        """
        order_item = get_object_or_404(OrderItem, id=pk)

        if order_item.refurbisher != request.user:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": True,
                "data": None, "error": "Unauthorized access"
            }, status=status.HTTP_403_FORBIDDEN)

        if not order_item.order.payment_received:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Payment has not been confirmed for this order yet."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not order_item.pickup_scheduled_date:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Call shipping-rates first to set a pickup date"
            }, status=status.HTTP_400_BAD_REQUEST)

        courier_id = request.data.get('courier_id')
        courier_name = request.data.get('courier_name', '')
        rate = request.data.get('rate')
        if not courier_id:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "courier_id is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        order_item.shiprocket_courier_id = str(courier_id)
        order_item.shiprocket_courier_name = courier_name
        order_item.shiprocket_shipping_rate = rate
        order_item.shipping_selected_at = timezone.now()
        order_item.save(update_fields=[
            'shiprocket_courier_id', 'shiprocket_courier_name',
            'shiprocket_shipping_rate', 'shipping_selected_at'
        ])

        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": OrderItemSerializer(order_item, context={'request': request}).data, "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='track-shipment')
    @handle_exceptions
    @check_refurbisher_profile()
    def track_shipment(self, request, pk=None):
        """Manually refresh ShipRocket tracking status for this item. Safe to call anytime."""
        order_item = get_object_or_404(OrderItem, id=pk)

        if order_item.refurbisher != request.user:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": True,
                "data": None, "error": "Unauthorized access"
            }, status=status.HTTP_403_FORBIDDEN)

        ok, error = refresh_tracking(order_item)
        return Response({
            "success": ok, "user_not_logged_in": False, "user_unauthorized": False,
            "data": OrderItemSerializer(order_item, context={'request': request}).data,
            "error": error
        }, status=status.HTTP_200_OK if ok else status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=['post'], url_path='verify-item')
    @handle_exceptions
    @check_refurbisher_profile()
    def verify_order_item(self, request, pk=None):
        """Refurbisher verifies device and uploads IMEI/photos"""
        order_item = get_object_or_404(OrderItem, id=pk)
        
        # Check if refurbisher owns this item
        if order_item.refurbisher != request.user:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": True,
                "data": None, "error": "Unauthorized access"
            }, status=status.HTTP_403_FORBIDDEN)

        if not order_item.order.payment_received:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Payment has not been confirmed for this order yet."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate data
        serializer = OrderItemVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        # Update order item
        order_item.device_imei = data['device_imei']
        order_item.verification_notes = data.get('verification_notes', '')
        order_item.verified_at = timezone.now()
        order_item.fulfillment_status = 'device_verified'
        order_item.save()
        
        # Handle device photo uploads
        from .models import DevicePhoto
        device_photos = request.FILES.getlist('device_photos')
        for photo in device_photos:
            DevicePhoto.objects.create(
                order_item=order_item,
                photo=photo
            )

        # Shipping was already accepted (pickup date + courier chosen) — now that
        # IMEI/photos are in, actually create the ShipRocket shipment + AWB and
        # schedule pickup. Failures here don't block device verification; they're
        # recorded on shiprocket_last_error and can be retried via track-shipment
        # or by re-submitting confirm-shipping.
        if order_item.shiprocket_courier_id and order_item.pickup_scheduled_date:
            create_shiprocket_shipment(order_item)
            order_item.refresh_from_db()

        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": OrderItemSerializer(order_item, context={'request': request}).data, "error": None
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='item-action')
    @handle_exceptions
    @check_refurbisher_profile()
    def order_item_action(self, request, pk=None):
        """Refurbisher packs or rejects order item"""
        order_item = get_object_or_404(OrderItem, id=pk)
        
        # Check if refurbisher owns this item
        if order_item.refurbisher != request.user:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": True,
                "data": None, "error": "Unauthorized access"
            }, status=status.HTTP_403_FORBIDDEN)

        if order_item.fulfillment_status in ('shipped', 'delivered', 'rejected'):
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "This item can no longer be changed."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate data
        serializer = OrderItemActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        action = data['action']
        
        if action == 'pack':
            # Check if device is verified
            if order_item.fulfillment_status == 'pending':
                return Response({
                    "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                    "data": None, "error": "Please verify device details before packing"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            order_item.fulfillment_status = 'packed'
            order_item.packed_at = timezone.now()
            order_item.save()
            
        elif action == 'reject':
            order_item.fulfillment_status = 'rejected'
            order_item.rejection_reason = data.get('rejection_reason', '')
            order_item.rejected_at = timezone.now()
            order_item.save()
            
            # Unpaid holds go back on sale; a paid unit stays off the market until
            # the refund/cancellation workflow is handled by admin.
            if not order_item.order.payment_received:
                listing_unit = order_item.listing_unit
                listing_unit.is_sold = False
                listing_unit.is_available = True
                listing_unit.save()
        
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": OrderItemSerializer(order_item).data, "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='request-return')
    @handle_exceptions
    @check_authentication()
    def request_return(self, request, pk=None):
        """
        Customer self-service return request for a single order item.
        URL param (pk): OrderItem id.
        Body: { "reason": "<text>" }
        """
        order_item = get_object_or_404(OrderItem, id=pk)

        # Only the order's own customer may request a return on their item.
        if order_item.order.user != request.user:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": True,
                "data": None, "error": "Unauthorized access"
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = ReturnRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        # Re-validate eligibility server-side — never trust a disabled button on the client.
        if not order_item.is_return_eligible():
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None,
                "error": "This item is not eligible for a return request "
                         "(must be delivered within the last 7 days and not already actioned)."
            }, status=status.HTTP_400_BAD_REQUEST)

        order_item.return_status = 'requested'
        order_item.return_reason = serializer.validated_data['reason']
        order_item.return_requested_at = timezone.now()
        order_item.save(update_fields=['return_status', 'return_reason', 'return_requested_at'])

        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": OrderItemSerializer(order_item).data, "error": None
        }, status=status.HTTP_200_OK)
