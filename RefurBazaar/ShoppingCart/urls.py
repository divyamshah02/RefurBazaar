from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CartViewSet, CartTransferViewSet

router = DefaultRouter()
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'cart-transfer', CartTransferViewSet, basename='cart-transfer')

urlpatterns = [
    path('', include(router.urls)),
]
