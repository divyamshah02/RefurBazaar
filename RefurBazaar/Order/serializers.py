from rest_framework import serializers
from .models import Order, OrderItem, DevicePhoto
from Product.serializers import ListingUnitSerializer


class DevicePhotoSerializer(serializers.ModelSerializer):
    """Serializer for device photos"""
    photo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DevicePhoto
        fields = ['id', 'photo', 'photo_url', 'uploaded_at']
    
    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for OrderItem with product details"""
    listing_unit = ListingUnitSerializer(read_only=True)
    brand_name = serializers.SerializerMethodField()
    model_name = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()
    fulfillment_status_display = serializers.CharField(source='get_fulfillment_status_display', read_only=True)
    device_photos = DevicePhotoSerializer(many=True, read_only=True)
    return_status_display = serializers.CharField(source='get_return_status_display', read_only=True)
    is_return_eligible = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'listing_unit', 'price_at_purchase', 'condition_at_purchase',
            'has_extended_warranty', 'warranty_price',
            'refurbisher', 'refurbisher_name', 'brand_name', 'model_name',
            'product_image', 'device_imei', 'device_photos', 'verification_notes',
            'verified_at', 'fulfillment_status', 'fulfillment_status_display',
            'packed_at', 'rejection_reason', 'rejected_at',
            'return_status', 'return_status_display', 'return_reason',
            'return_requested_at', 'is_return_eligible',
            'created_at', 'updated_at'
        ]

    def get_is_return_eligible(self, obj):
        return obj.is_return_eligible()
    
    def get_brand_name(self, obj):
        return obj.listing_unit.listing.model.brand.name
    
    def get_model_name(self, obj):
        return obj.listing_unit.listing.model.name
    
    def get_product_image(self, obj):
        if obj.listing_unit.listing.model.image:
            return obj.listing_unit.listing.model.image.url
        return None


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for Order with nested items"""
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'order_number', 'user', 'session_id',
            'first_name', 'last_name', 'email', 'phone', 'alternate_phone',
            'shipping_address', 'shipping_city', 'shipping_state', 'shipping_pincode', 'shipping_address_id',
            'different_billing_address', 'billing_first_name', 'billing_last_name',
            'billing_address', 'billing_city', 'billing_state', 'billing_pincode',
            'billing_phone', 'billing_alternate_phone',
            'delivery_date', 'timeslot_id', 'special_instructions',
            'subtotal_amount', 'tax_amount', 'delivery_charge', 'warranty_amount', 'discount_amount',
            'coupon_code', 'coupon_discount', 'total_amount',
            'payment_method', 'payment_method_display', 'razorpay_order_id', 
            'razorpay_payment_id', 'razorpay_signature', 'razorpay_link', 'payment_received',
            'status', 'status_display', 'order_note', 'delivered_at',
            'tracking_number', 'courier_name', 'tracking_url', 'items',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['order_id', 'order_number', 'created_at', 'updated_at', 'delivered_at']


class OrderCreateSerializer(serializers.Serializer):
    """Serializer for creating an order from cart"""
    cart_id = serializers.CharField(required=True)
    
    # Customer details
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=15)
    alternate_phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    
    # Shipping address
    shipping_address_id = serializers.IntegerField(required=False, allow_null=True)
    shipping_address = serializers.CharField()
    shipping_city = serializers.CharField(max_length=100)
    shipping_state = serializers.CharField(max_length=100)
    shipping_pincode = serializers.CharField(max_length=10)
    
    # Billing address
    different_billing_address = serializers.BooleanField(default=False)
    billing_first_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    billing_last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    billing_address = serializers.CharField(required=False, allow_blank=True)
    billing_city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    billing_state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    billing_pincode = serializers.CharField(max_length=10, required=False, allow_blank=True)
    billing_phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    billing_alternate_phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    
    # Delivery details
    delivery_date = serializers.DateField(required=False, allow_null=True)
    timeslot_id = serializers.CharField(max_length=20, required=False, allow_blank=True)
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    
    # Payment and order
    payment_method = serializers.ChoiceField(choices=['razorpay', 'cod'])
    order_note = serializers.CharField(required=False, allow_blank=True)
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True)


class PaymentVerificationSerializer(serializers.Serializer):
    """Serializer for payment verification"""
    order_id = serializers.CharField()
    razorpay_order_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()


class OrderItemVerificationSerializer(serializers.Serializer):
    """Serializer for refurbisher to verify device and upload details"""
    device_imei = serializers.CharField(max_length=50, required=True)
    verification_notes = serializers.CharField(required=False, allow_blank=True)


class ReturnRequestSerializer(serializers.Serializer):
    """Serializer for a customer's self-service return request on an OrderItem"""
    reason = serializers.CharField(required=True, allow_blank=False, max_length=2000)


class OrderItemActionSerializer(serializers.Serializer):
    """Serializer for refurbisher actions (pack/reject)"""
    action = serializers.ChoiceField(choices=['pack', 'reject'], required=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        if data['action'] == 'reject' and not data.get('rejection_reason'):
            raise serializers.ValidationError({
                'rejection_reason': 'Rejection reason is required when rejecting an item'
            })
        return data
