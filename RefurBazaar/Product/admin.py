from django.contrib import admin
from .models import *


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'created_at')
    search_fields = ('name',)


@admin.register(ProductModel)
class ProductModelAdmin(admin.ModelAdmin):
    list_display = ('id', 'brand', 'name', 'category', 'is_active', 'created_at')
    list_filter = ('category', 'is_active', 'brand')
    search_fields = ('name', 'brand__name')


@admin.register(AttributeMaster)
class AttributeMasterAdmin(admin.ModelAdmin):
    list_display = ('id', 'category', 'name', 'data_type', 'created_at')
    list_filter = ('category',)
    search_fields = ('name',)


@admin.register(ProductModelAttribute)
class ProductModelAttributeAdmin(admin.ModelAdmin):
    list_display = ('id', 'product_model', 'attribute', 'is_required')
    list_filter = ('product_model__category', 'is_required')
    search_fields = ('product_model__name', 'attribute__name')


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ('id', 'model', 'refurbisher', 'price_per_unit', 'total_quantity', 'condition', 'status', 'created_at')
    list_filter = ('status', 'condition', 'model__category')
    search_fields = ('model__name', 'refurbisher__name')


@admin.register(ListingUnit)
class ListingUnitAdmin(admin.ModelAdmin):
    list_display = ('id', 'listing', 'quantity', 'imei_number', 'created_at')
    list_filter = ('listing__condition',)
    search_fields = ('listing__model__name', 'imei_number')


@admin.register(ListingUnitAttribute)
class ListingUnitAttributeAdmin(admin.ModelAdmin):
    list_display = ('id', 'listing_unit', 'attribute', 'value', 'created_at')
    list_filter = ('attribute__category',)
    search_fields = ('attribute__name', 'value')
