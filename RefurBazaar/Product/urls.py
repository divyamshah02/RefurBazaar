from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'brands', BrandViewSet, basename='brands')
router.register(r'products', ProductModelViewSet, basename='products')
router.register(r'product-model-attributes', ProductModelAttributeViewSet, basename='product-model-attributes')
router.register(r'listings', ListingViewSet, basename='listings')
router.register(r'listing-units', ListingUnitViewSet, basename='listing-units')
router.register(r'seed-data', SeedDataViewSet, basename='seed-data')

urlpatterns = [
    path('', include(router.urls)),
]
