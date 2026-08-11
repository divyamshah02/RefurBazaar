from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
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
from ShoppingCart.models import ShoppingCart, ShoppingCartItem
from Product.models import ListingUnit
from utils.decorators import handle_exceptions, check_authentication, check_refurbisher_profile


class OrderViewSet(viewsets.ViewSet):
    """ViewSet for Order operations"""
    
    @action(detail=False, methods=['post'], url_path='create')
    @handle_exceptions
    def create_order(self, request):
        """
        Create order from cart and initiate payment
        For Razorpay: Creates Razorpay order and marks items as half_sold
        For COD: Creates order directly and marks items as sold
        """
        serializer = OrderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        cart_id = data['cart_id']
        
        # Get cart
        try:
            cart = ShoppingCart.objects.get(cart_id=cart_id, active_cart=True)
        except ShoppingCart.DoesNotExist:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "ShoppingCart not found or inactive"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get cart items
        cart_items = ShoppingCartItem.objects.filter(cart=cart).select_related(
            'listing_unit', 'listing_unit__listing', 'listing_unit__listing__model',
            'listing_unit__listing__refurbisher'
        )
        
        if not cart_items.exists():
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "ShoppingCart is empty"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate all items are available
        unavailable_items = []
        for item in cart_items:
            if item.listing_unit.is_sold or not item.listing_unit.is_available:
                unavailable_items.append(str(item.listing_unit.id))
        
        if unavailable_items:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, 
                "error": f"Some items are no longer available: {', '.join(unavailable_items)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        subtotal_amount = sum(item.listing_unit.price for item in cart_items)
        tax_amount = Decimal('0.00')
        delivery_charge = Decimal('50.00')
        # Warranty amount is derived entirely from the cart items' server-set
        # has_extended_warranty/warranty_price — never trust anything from the request body.
        warranty_amount = sum(
            item.warranty_price for item in cart_items if item.has_extended_warranty
        ) or Decimal('0.00')
        discount_amount = Decimal('0.00')
        coupon_discount = Decimal('0.00')
        total_amount = (
            subtotal_amount + tax_amount + delivery_charge + warranty_amount
            - discount_amount - coupon_discount
        )
        
        with transaction.atomic():
            order = Order.objects.create(
                user=request.user if request.user.is_authenticated else None,
                session_id=cart.session_id if not request.user.is_authenticated else None,
                first_name=data['first_name'],
                last_name=data['last_name'],
                email=data['email'],
                phone=data['phone'],
                alternate_phone=data.get('alternate_phone', ''),
                shipping_address=data['shipping_address'],
                shipping_city=data['shipping_city'],
                shipping_state=data['shipping_state'],
                shipping_pincode=data['shipping_pincode'],
                shipping_address_id=data.get('shipping_address_id'),
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
                discount_amount=discount_amount,
                coupon_code=data.get('coupon_code', ''),
                coupon_discount=coupon_discount,
                total_amount=total_amount,
                payment_method=data['payment_method'],
                order_note=data.get('order_note', ''),
                status='pending'
            )
            
            # Create order items
            for cart_item in cart_items:
                OrderItem.objects.create(
                    order=order,
                    listing_unit=cart_item.listing_unit,
                    price_at_purchase=cart_item.listing_unit.price,
                    condition_at_purchase=cart_item.listing_unit.condition,
                    refurbisher=cart_item.listing_unit.listing.refurbisher,
                    refurbisher_name=cart_item.listing_unit.listing.refurbisher.first_name,
                    has_extended_warranty=cart_item.has_extended_warranty,
                    warranty_price=cart_item.warranty_price if cart_item.has_extended_warranty else 0,
                )
                
                # Mark as half_sold (for Razorpay) or sold (for COD)
                if data['payment_method'] == 'razorpay':
                    cart_item.listing_unit.half_sold = True
                    cart_item.listing_unit.half_sold_at = timezone.now()
                else:  # COD
                    cart_item.listing_unit.is_sold = True
                    cart_item.listing_unit.is_available = False
                    order.status = 'confirmed'
                    order.payment_received = False  # COD not paid yet
                    order.save()
                
                cart_item.listing_unit.save()
            
            # If Razorpay, create Razorpay order
            razorpay_order = None
            if data['payment_method'] == 'razorpay':
                try:
                    razorpay_key_id = getattr(settings, 'RAZORPAY_KEY_ID', None)
                    razorpay_key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', None)
                    
                    if not razorpay_key_id or not razorpay_key_secret:
                        return Response({
                            "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                            "data": None, "error": "Razorpay credentials not configured"
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                    client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))
                    razorpay_order = client.order.create({
                        'amount': int(total_amount * 100),  # Amount in paise
                        'currency': 'INR',
                        'receipt': order.order_id,
                        'notes': {
                            'order_id': order.order_id
                        }
                    })
                    order.razorpay_order_id = razorpay_order['id']
                    order.save()
                    
                    razorpay_order['key_id'] = razorpay_key_id
                except Exception as e:
                    return Response({
                        "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                        "data": None, "error": f"Razorpay order creation failed: {str(e)}"
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Clear cart
            cart_items.delete()
            cart.active_cart = False
            cart.save()
        
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
        """Verify Razorpay payment and confirm order"""
        # serializer = PaymentVerificationSerializer(data=request.data)
        # if not serializer.is_valid():
        #     return Response({
        #         "success": False, "user_not_logged_in": False, "user_unauthorized": False,
        #         "data": None, "error": serializer.errors
        #     }, status=status.HTTP_400_BAD_REQUEST)
        
        # data = serializer.validated_data
        
        # Get order
        order = get_object_or_404(Order, order_id=request.data.get('order_id'))
        
        razorpay_key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', None)
        
        # if not razorpay_key_secret:
        #     return Response({
        #         "success": False, "user_not_logged_in": False, "user_unauthorized": False,
        #         "data": None, "error": "Razorpay credentials not configured"
        #     }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # # Verify signature
        # generated_signature = hmac.new(
        #     razorpay_key_secret.encode(),
        #     f"{data['razorpay_order_id']}|{data['razorpay_payment_id']}".encode(),
        #     hashlib.sha256
        # ).hexdigest()
        
        # if generated_signature != data['razorpay_signature']:
        #     return Response({
        #         "success": False, "user_not_logged_in": False, "user_unauthorized": False,
        #         "data": None, "error": "Payment verification failed"
        #     }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # order.razorpay_payment_id = data['razorpay_payment_id']
            # order.razorpay_signature = data['razorpay_signature']
            order.payment_received = True
            order.status = 'confirmed'
            order.save()
            
            # Mark all items as sold
            for order_item in order.items.all():
                listing_unit = order_item.listing_unit
                listing_unit.is_sold = True
                listing_unit.is_available = False
                listing_unit.half_sold = False
                listing_unit.half_sold_at = None
                listing_unit.save()
        
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": OrderSerializer(order).data, "error": None
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='cleanup-half-sold')
    @handle_exceptions
    def cleanup_half_sold(self, request):
        """
        Release products marked as half_sold for more than 10 minutes
        Should be called periodically (e.g., via cron job)
        """
        time_threshold = timezone.now() - timedelta(minutes=10)
        
        # Find all listing units that are half_sold for more than 10 minutes
        expired_units = ListingUnit.objects.filter(
            half_sold=True,
            half_sold_at__lt=time_threshold
        )
        
        count = expired_units.count()
        
        # Reset half_sold status
        expired_units.update(
            half_sold=False,
            half_sold_at=None
        )
        
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
        
        # Check authorization
        if request.user.is_authenticated:
            if order.user and order.user != request.user:
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
            order_data = OrderSerializer(order_info['order']).data
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
        order_data = OrderSerializer(order).data
        order_data['items'] = [OrderItemSerializer(item).data for item in refurbisher_items]
        
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": order_data, "error": None
        }, status=status.HTTP_200_OK)
    
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
            
            # Mark listing unit as available again
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
