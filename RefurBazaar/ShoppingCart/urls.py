from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CartViewSet, CartTransferViewSet

from .views import WishlistAPIViewSet

router = DefaultRouter()
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'cart-transfer', CartTransferViewSet, basename='cart-transfer')

router.register(r'wishlist-api', WishlistAPIViewSet, basename='wishlist-api')

urlpatterns = [
    path('', include(router.urls)),
]
