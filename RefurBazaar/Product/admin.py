from django.contrib import admin
from .models import *


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']


class ProductModelAttributeInline(admin.TabularInline):
    model = ProductModelAttribute
    extra = 1

class ProductModelImageInline(admin.TabularInline):
    model = ProductModelImage
    extra = 1

@admin.register(ProductModel)
class ProductModelAdmin(admin.ModelAdmin):
    list_display = ['name', 'brand', 'category', 'is_active', 'created_at']
    list_filter = ['category', 'brand', 'is_active']
    search_fields = ['name', 'brand__name']

    inlines = [
        ProductModelImageInline,     # ✅ images inline
        ProductModelAttributeInline  # existing attributes
    ]


@admin.register(AttributeMaster)
class AttributeMasterAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'data_type', 'is_active', 'display_order']
    list_filter = ['category', 'data_type', 'is_active']
    search_fields = ['name']
    ordering = ['category', 'display_order', 'name']


@admin.register(ProductModelAttribute)
class ProductModelAttributeAdmin(admin.ModelAdmin):
    list_display = ['product_model', 'attribute', 'is_required']
    list_filter = ['is_required', 'product_model__category']
    search_fields = ['product_model__name', 'attribute__name']


class ListingUnitInline(admin.TabularInline):
    model = ListingUnit
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ['listing_id', 'model', 'refurbisher', 'total_quantity', 'status', 'created_at']
    list_filter = ['status', 'model__category', 'created_at']
    search_fields = ['listing_id', 'model__name', 'refurbisher__name']
    readonly_fields = ['listing_id', 'created_at', 'updated_at']
    inlines = [ListingUnitInline]  # Removed ListingImageInline


class ListingUnitAttributeInline(admin.TabularInline):
    model = ListingUnitAttribute
    extra = 0


@admin.register(ListingUnit)
class ListingUnitAdmin(admin.ModelAdmin):
    list_display = ['id', 'listing', 'unit_number', 'price', 'condition', 'is_available', 'is_sold', 'created_at']
    list_filter = ['condition', 'is_available', 'is_sold', 'listing__status', 'created_at']
    search_fields = ['listing__listing_id']
    inlines = [ListingUnitAttributeInline]


@admin.register(ListingUnitAttribute)
class ListingUnitAttributeAdmin(admin.ModelAdmin):
    list_display = ['listing_unit', 'attribute', 'value']
    list_filter = ['attribute']
    search_fields = ['listing_unit__listing__listing_id', 'value']
