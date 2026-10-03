from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdminDashboardViewSet
from .warehouse_views import RefurbisherWarehouseViewSet

router = DefaultRouter()
router.register(r'dashboard', AdminDashboardViewSet, basename='admin-dashboard')
router.register(r'warehouse', RefurbisherWarehouseViewSet, basename='refurbisher-warehouse')

urlpatterns = [
    path('', include(router.urls)),
]
# update