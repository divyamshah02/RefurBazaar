from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, payment_callback

router = DefaultRouter()
router.register(r'', OrderViewSet, basename='order')

urlpatterns = [
    # Must come before the router: its `<pk>/` detail pattern would otherwise match this path.
    path('payment-callback/', payment_callback, name='payment-callback'),
    path('', include(router.urls)),
]
