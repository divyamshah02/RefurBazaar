from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['listing_unit', 'price_at_purchase', 'condition_at_purchase', 'refurbisher', 'created_at']
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'order_id', 'order_number', 'get_customer_name', 'email', 
        'total_amount', 'payment_method', 'payment_received', 'status', 'created_at'
    ]
    list_filter = ['status', 'payment_method', 'payment_received', 'created_at']
    search_fields = ['order_id', 'order_number', 'email', 'first_name', 'last_name', 'phone']
    readonly_fields = ['order_id', 'created_at', 'updated_at']
    inlines = [OrderItemInline]
    
    fieldsets = (
        ('Order Information', {
            'fields': ('order_id', 'order_number', 'user', 'session_id', 'status', 'order_note')
        }),
        ('Customer Details', {
            'fields': ('first_name', 'last_name', 'email', 'phone', 'alternate_phone')
        }),
        ('Shipping Address', {
            'fields': ('shipping_address', 'shipping_city', 'shipping_state', 'shipping_pincode', 'shipping_address_id')
        }),
        ('Billing Address', {
            'fields': ('different_billing_address', 'billing_first_name', 'billing_last_name', 
                      'billing_address', 'billing_city', 'billing_state', 'billing_pincode', 
                      'billing_phone', 'billing_alternate_phone')
        }),
        ('Delivery Details', {
            'fields': ('delivery_date', 'timeslot_id', 'special_instructions')
        }),
        ('Order Amounts', {
            'fields': ('subtotal_amount', 'tax_amount', 'delivery_charge', 'discount_amount', 
                      'coupon_code', 'coupon_discount', 'total_amount')
        }),
        ('Payment Details', {
            'fields': ('payment_method', 'razorpay_order_id', 'razorpay_payment_id', 
                      'razorpay_signature', 'razorpay_link', 'payment_received')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def get_customer_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    get_customer_name.short_description = 'Customer'


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'get_product_name', 'price_at_purchase', 'condition_at_purchase', 'refurbisher_name', 'created_at']
    list_filter = ['condition_at_purchase', 'created_at']
    search_fields = ['order__order_id', 'listing_unit__listing__model__name', 'refurbisher_name']
    readonly_fields = ['order', 'listing_unit', 'price_at_purchase', 'condition_at_purchase', 'refurbisher', 'created_at']
    
    def get_product_name(self, obj):
        return f"{obj.listing_unit.listing.model.brand.name} {obj.listing_unit.listing.model.name}"
    get_product_name.short_description = 'Product'
