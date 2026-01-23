from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *
from .admin_views import *

router = DefaultRouter()

router.register(r'shop', ShopViewSet, basename='shop')
router.register(r'product', ProductDetailViewSet, basename='product')
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'checkout', CheckoutViewSet, basename='checkout')
router.register(r'order-success', OrderSuccessViewSet, basename='order-success')
router.register(r'order-detail', OrderDetailViewSet, basename='order-detail')
router.register(r'account', AccountViewSet, basename='account')
router.register(r'logout', LogoutViewSet, basename='logout')

### Refurbisher Views ###
router.register(r'refurbisher-profile', RefurbisherProfileViewSet, basename='refurbisher-profile')
router.register(r'refurbisher-login', RefurbisherLoginViewSet, basename='refurbisher-login')
router.register(r'refurbisher-logout', RefurbisherLogoutViewSet, basename='refurbisher-logout')
router.register(r'refurbisher-add-listing', RefurbisherAddListingViewSet, basename='refurbisher-add-listing')
router.register(r'refurbisher-listings', RefurbisherListingsViewSet, basename='refurbisher-listings')
router.register(r'refurbisher-detail-listing', RefurbisherListingDetailViewSet, basename='refurbisher-detail-listing')
router.register(r'refurbisher-orders', RefurbisherOrdersViewSet, basename='refurbisher-orders')
router.register(r'refurbisher-order-detail', RefurbisherOrderDetailViewSet, basename='refurbisher-order-detail')

### Admin Views ###
router.register(r'admin-dashboard', AdminDashboardPageViewSet, basename='admin-dashboard')
router.register(r'admin-orders', AdminOrdersPageViewSet, basename='admin-orders')
router.register(r'admin-order-detail', AdminOrderDetailPageViewSet, basename='admin-order-detail')
router.register(r'admin-refurbishers', AdminRefurbishersPageViewSet, basename='admin-refurbishers')
router.register(r'admin-pending-refurbishers', AdminPendingRefurbishersPageViewSet, basename='admin-pending-refurbishers')
router.register(r'admin-refurbisher-detail', AdminRefurbisherDetailPageViewSet, basename='admin-refurbisher-detail')
router.register(r'admin-customers', AdminCustomersPageViewSet, basename='admin-customers')

urlpatterns = [
    path('', include(router.urls)),
]
