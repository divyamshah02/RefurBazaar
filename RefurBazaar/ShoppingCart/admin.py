from django.contrib import admin
from .models import ShoppingCart, ShoppingCartItem


@admin.register(ShoppingCart)
class CartAdmin(admin.ModelAdmin):
    list_display = (
        'cart_id', 
        'user', 
        'session_id_short', 
        'active_cart', 
        'total_items',
        'total_price',
        'created_at'
    )
    list_filter = ('active_cart', 'created_at')
    search_fields = ('cart_id', 'session_id', 'user__email', 'user__name')
    readonly_fields = ('cart_id', 'created_at', 'updated_at')
    
    def session_id_short(self, obj):
        """Display shortened session ID"""
        if obj.session_id:
            return f"{obj.session_id[:15]}..."
        return "-"
    session_id_short.short_description = "Session ID"
    
    def total_items(self, obj):
        """Display total items in cart"""
        return obj.get_total_items()
    total_items.short_description = "Total Items"
    
    def total_price(self, obj):
        """Display total price of cart"""
        return f"₹{obj.get_total_price()}"
    total_price.short_description = "Total Price"


@admin.register(ShoppingCartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'cart_id_display',
        'listing_unit',
        'unit_price',
        'product_info',
        'added_at'
    )
    list_filter = ('added_at',)
    search_fields = (
        'cart__cart_id',
        'listing_unit__listing__listing_id',
        'listing_unit__listing__model__name'
    )
    readonly_fields = ('added_at',)
    
    def cart_id_display(self, obj):
        """Display cart ID"""
        return obj.cart.cart_id
    cart_id_display.short_description = "Cart ID"
    
    def unit_price(self, obj):
        """Display listing unit price"""
        return f"₹{obj.listing_unit.price}"
    unit_price.short_description = "Price"
    
    def product_info(self, obj):
        """Display product model and brand"""
        listing = obj.listing_unit.listing
        return f"{listing.model.brand.name} {listing.model.name}"
    product_info.short_description = "Product"
