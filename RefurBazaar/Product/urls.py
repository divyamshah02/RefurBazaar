from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *
from .product_finder_views import ProductFinderViewSet
router = DefaultRouter()
router.register(r'brands', BrandViewSet, basename='brands')
router.register(r'products', ProductModelViewSet, basename='products')
router.register(r'product-model-attributes', ProductModelAttributeViewSet, basename='product-model-attributes')
router.register(r'listings', ListingViewSet, basename='listings')
router.register(r'listing-units', ListingUnitViewSet, basename='listing-units')
router.register(r'seed-data', SeedDataViewSet, basename='seed-data')
router.register(r'product-models-admin', ProductModelAdminViewSet, basename='product-models-admin')
router.register(r'finder', ProductFinderViewSet, basename='finder')

urlpatterns = [
    path('', include(router.urls)),
]
