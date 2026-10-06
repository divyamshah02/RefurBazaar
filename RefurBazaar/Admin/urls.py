from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdminDashboardViewSet
from .warehouse_views import RefurbisherWarehouseViewSet
from .pricing_views import AdminPricingViewSet, AdminListingManageViewSet

router = DefaultRouter()
router.register(r'dashboard', AdminDashboardViewSet, basename='admin-dashboard')
router.register(r'warehouse', RefurbisherWarehouseViewSet, basename='refurbisher-warehouse')
router.register(r'pricing', AdminPricingViewSet, basename='admin-pricing')
router.register(r'listing-manage', AdminListingManageViewSet, basename='admin-listing-manage')

urlpatterns = [
    path('', include(router.urls)),
]
