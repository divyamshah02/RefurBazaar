from rest_framework import serializers
from .models import *


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'logo', 'is_active']


class ProductModelImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductModelImage
        fields = ['id', 'image', 'is_primary', 'display_order']


class ProductModelSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    images = ProductModelImageSerializer(many=True, read_only=True)
    # Included so the admin modal can pre-select attributes on edit
    model_attributes = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProductModel
        fields = [
            'id', 'brand', 'brand_name', 'name', 'category',
            'description', 'image', 'release_year', 'is_active', 'images',
            'model_attributes',
        ]

    def get_model_attributes(self, obj):
        qs = obj.model_attributes.select_related('attribute').all()
        return [
            {
                'id': ma.id,
                'attribute_id': ma.attribute_id,
                'attribute_name': ma.attribute.name,
                'is_required': ma.is_required,
                'is_filter': ma.is_filter,
                'section': ma.section,
                'data_type': ma.data_type,
                'possible_values': ma.possible_values,
            }
            for ma in qs
        ]


class AttributeMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttributeMaster
        fields = ['id', 'category', 'name', 'is_active', 'display_order']


class ProductModelAttributeSerializer(serializers.ModelSerializer):
    attribute = AttributeMasterSerializer(read_only=True)
    attribute_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ProductModelAttribute
        fields = [
            'id', 'attribute', 'attribute_id',
            'is_required', 'is_filter', 'section',
            'data_type', 'possible_values',
        ]


class ListingUnitAttributeSerializer(serializers.ModelSerializer):
    attribute_name = serializers.CharField(source='attribute.name', read_only=True)
    attribute_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = ListingUnitAttribute
        fields = ['id', 'attribute', 'attribute_id', 'attribute_name', 'value']


class ListingUnitSerializer(serializers.ModelSerializer):
    attributes = ListingUnitAttributeSerializer(many=True, read_only=True)

    class Meta:
        model = ListingUnit
        fields = [
            'id', 'unit_number', 'price', 'condition',
            'is_available', 'is_sold', 'half_sold',
            'attributes', 'created_at',
        ]


class ListingSerializer(serializers.ModelSerializer):
    model_name  = serializers.CharField(source='model.name',               read_only=True)
    brand_name  = serializers.CharField(source='model.brand.name',         read_only=True)
    brand_id    = serializers.IntegerField(source='model.brand.id',        read_only=True)
    category    = serializers.CharField(source='model.category',           read_only=True)
    category_display = serializers.CharField(source='model.get_category_display', read_only=True)

    # Refurbisher basic name fields (already present)
    refurbisher_first_name = serializers.CharField(source='refurbisher.first_name', read_only=True)
    refurbisher_last_name  = serializers.CharField(source='refurbisher.last_name',  read_only=True)

    # Additional refurbisher detail fields for listing detail page
    refurbisher_id      = serializers.CharField(source='refurbisher.user_id',        read_only=True)
    refurbisher_email   = serializers.EmailField(source='refurbisher.email',         read_only=True)
    refurbisher_phone   = serializers.CharField(source='refurbisher.contact_number', read_only=True)
    refurbisher_company = serializers.SerializerMethodField()

    units = ListingUnitSerializer(many=True, read_only=True)

    class Meta:
        model = Listing
        fields = [
            'id', 'listing_id', 'model', 'model_name', 'brand_name', 'brand_id',
            'category', 'category_display',
            'refurbisher', 'refurbisher_id',
            'refurbisher_first_name', 'refurbisher_last_name',
            'refurbisher_email', 'refurbisher_phone', 'refurbisher_company',
            'total_quantity', 'status', 'units',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['listing_id', 'refurbisher', 'created_at', 'updated_at']

    def get_refurbisher_company(self, obj):
        """Return company name from CompanyProfile if it exists."""
        try:
            return obj.refurbisher.company_profile.company_name or '—'
        except Exception:
            return '—'
