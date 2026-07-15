from rest_framework import serializers
from .models import ShoppingCart, ShoppingCartItem
from Product.models import ListingUnit, Listing, ProductModel, Brand
from Product.serializers import ListingUnitSerializer

from .models import Wishlist, WishlistItem

class CartItemListingUnitSerializer(serializers.ModelSerializer):
    """Nested serializer for ListingUnit with product details"""
    listing_id = serializers.CharField(source='listing.listing_id', read_only=True)
    model_name = serializers.CharField(source='listing.model.name', read_only=True)
    brand_name = serializers.CharField(source='listing.model.brand.name', read_only=True)
    category = serializers.CharField(source='listing.model.category', read_only=True)
    refurbisher_first_name = serializers.CharField(source='listing.refurbisher.first_name', read_only=True)
    refurbisher_last_name = serializers.CharField(source='listing.refurbisher.last_name', read_only=True)
    attributes = serializers.SerializerMethodField()
    
    class Meta:
        model = ListingUnit
        fields = [
            'id', 'listing_id', 'unit_number', 'price', 'condition',
            'model_name', 'brand_name', 'category',
            'refurbisher_first_name', 'refurbisher_last_name',
            'attributes', 'is_available', 'is_sold'
        ]
    
    def get_attributes(self, obj):
        """Get all attributes for this listing unit"""
        return [
            {
                'name': attr.attribute.name,
                'value': attr.value
            }
            for attr in obj.attributes.all()
        ]


class CartItemSerializer(serializers.ModelSerializer):
    """Serializer for CartItem with nested ListingUnit details"""
    listing_unit = CartItemListingUnitSerializer(read_only=True)
    listing_unit_id = serializers.PrimaryKeyRelatedField(
        queryset=ListingUnit.objects.filter(is_available=True, is_sold=False),
        source='listing_unit',
        write_only=True
    )
    
    class Meta:
        model = ShoppingCartItem
        fields = ['id', 'cart', 'listing_unit', 'listing_unit_id', 'added_at']
        read_only_fields = ['cart', 'added_at']
    
    def validate_listing_unit_id(self, value):
        """Validate that listing unit is available and not sold"""
        if not value.is_available:
            raise serializers.ValidationError("This listing unit is not available.")
        
        if value.is_sold:
            raise serializers.ValidationError("This listing unit has already been sold.")
        
        return value


class CartSerializer(serializers.ModelSerializer):
    """Serializer for Cart with nested items"""
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(source='get_total_items', read_only=True)
    total_price = serializers.DecimalField(
        source='get_total_price', 
        max_digits=10, 
        decimal_places=2, 
        read_only=True
    )
    user_email = serializers.CharField(source='user.email', read_only=True, allow_null=True)
    
    class Meta:
        model = ShoppingCart
        fields = [
            'id', 'cart_id', 'session_id', 'user', 'user_email',
            'active_cart', 'items', 'total_items', 'total_price',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['cart_id', 'created_at', 'updated_at']


# ----------
# Wishlist
# ----------

class WishlistItemSerializer(serializers.ModelSerializer):
    """Serializer for individual wishlist items"""
    listing_unit = CartItemListingUnitSerializer(read_only=True)
    listing_unit_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = WishlistItem
        fields = ['id', 'wishlist', 'listing_unit', 'listing_unit_id', 'added_at']
        read_only_fields = ['wishlist', 'added_at']


class WishlistSerializer(serializers.ModelSerializer):
    """Serializer for the user's complete wishlist"""
    items = WishlistItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Wishlist
        fields = ['id', 'user', 'items', 'created_at']
