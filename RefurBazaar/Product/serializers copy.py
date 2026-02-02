from rest_framework import serializers
from .models import (
    Brand, ProductModel, AttributeMaster, ProductModelAttribute,
    Listing, ListingUnit, ListingUnitAttribute
)


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'logo', 'is_active']


class ProductModelSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    
    class Meta:
        model = ProductModel
        fields = [
            'id', 'brand', 'brand_name', 'name', 'category',
            'description', 'image', 'release_year', 'is_active'
        ]


class AttributeMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttributeMaster
        fields = [
            'id', 'category', 'name', 'data_type', 'possible_values',
            'is_active', 'display_order'
        ]


class ProductModelAttributeSerializer(serializers.ModelSerializer):
    attribute = AttributeMasterSerializer(read_only=True)
    attribute_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = ProductModelAttribute
        fields = ['id', 'attribute', 'attribute_id', 'is_required']


class ListingUnitAttributeSerializer(serializers.ModelSerializer):
    attribute_name = serializers.CharField(source='attribute.name', read_only=True)
    attribute_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = ListingUnitAttribute
        fields = ['id', 'attribute', 'attribute_id', 'attribute_name', 'value']


class ListingUnitSerializer(serializers.ModelSerializer):
    attributes = ListingUnitAttributeSerializer(many=True, read_only=True)
    condition_display = serializers.CharField(source='get_condition_display', read_only=True)
    
    class Meta:
        model = ListingUnit
        fields = ['id', 'unit_number', 'price', 'condition', 'condition_display', 'is_available', 'is_sold', 'attributes', 'created_at']


class ListingSerializer(serializers.ModelSerializer):
    model_name = serializers.CharField(source='model.name', read_only=True)
    brand_name = serializers.CharField(source='model.brand.name', read_only=True)
    brand_id = serializers.IntegerField(source='model.brand.id', read_only=True)
    category = serializers.CharField(source='model.category', read_only=True)
    category_display = serializers.CharField(source='model.get_category_display', read_only=True)
    refurbisher_name = serializers.CharField(source='refurbisher.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    units = ListingUnitSerializer(many=True, read_only=True)
    available_units_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Listing
        fields = [
            'id', 'listing_id', 'model', 'model_name', 'brand_name', 'brand_id',
            'category', 'category_display', 'refurbisher', 'refurbisher_name',
            'total_quantity', 'available_units_count', 'status', 'status_display',
            'is_approved', 'approved_at', 'approved_by', 'approved_by_name',
            'rejection_reason', 'units',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['listing_id', 'refurbisher', 'is_approved', 'approved_at', 'approved_by', 'created_at', 'updated_at']
    
    def get_available_units_count(self, obj):
        return obj.units.filter(is_available=True, is_sold=False).count()
