from rest_framework import serializers
from .models import *


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = '__all__'


class AttributeMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttributeMaster
        fields = ['id', 'category', 'name', 'data_type', 'possible_values']


class ProductModelSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)

    class Meta:
        model = ProductModel
        fields = '__all__'


class ProductModelAttributeSerializer(serializers.ModelSerializer):
    # include attribute metadata inline for easy consumption by frontend
    attribute = AttributeMasterSerializer(read_only=True)

    class Meta:
        model = ProductModelAttribute
        fields = ['id', 'product_model', 'attribute', 'is_required']


class ListingSerializer(serializers.ModelSerializer):
    model = ProductModelSerializer(read_only=True)
    refurbisher_name = serializers.CharField(source='refurbisher.name', read_only=True)

    class Meta:
        model = Listing
        fields = '__all__'


class ListingUnitAttributeSerializer(serializers.ModelSerializer):
    attribute = AttributeMasterSerializer(read_only=True)

    class Meta:
        model = ListingUnitAttribute
        fields = ['id', 'listing_unit', 'attribute', 'value', 'created_at']


class ListingUnitSerializer(serializers.ModelSerializer):
    attributes = ListingUnitAttributeSerializer(many=True, read_only=True)

    class Meta:
        model = ListingUnit
        fields = ['id', 'listing', 'quantity', 'imei_number', 'image', 'created_at', 'updated_at', 'attributes']
