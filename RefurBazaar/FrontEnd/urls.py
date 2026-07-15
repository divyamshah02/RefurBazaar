from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *
from .admin_views import *

router = DefaultRouter()

router.register(r'', IndexViewSet, basename='index')
# router.register(r'', LandingPageViewSet, basename='index')
router.register(r'landing-page', LandingPageViewSet, basename='landing-page')
router.register(r'contact', ContactViewSet, basename='contact')
router.register(r'about', AboutViewSet, basename='about')
router.register(r'wishlist', WishlistPageViewSet, basename='wishlist')
router.register(r'shop', ShopViewSet, basename='shop')
router.register(r'partner-application', PartnerApplicationViewSet, basename='partner-application')
router.register(r'product', ProductDetailViewSet, basename='product')
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'checkout', CheckoutViewSet, basename='checkout')
router.register(r'order-success', OrderSuccessViewSet, basename='order-success')
router.register(r'order-detail', OrderDetailViewSet, basename='order-detail')
router.register(r'account', AccountViewSet, basename='account')
router.register(r'logout', LogoutViewSet, basename='logout')

# -------- Legal Pages --------
router.register(r'legal', LegalViewSet, basename='legal')
router.register(r'terms-conditions', TermsConditionsViewSet, basename='terms-conditions')
router.register(r'privacy-policy', PrivacyPolicyViewSet, basename='privacy-policy')
router.register(r'product-grading-policy', ProductGradingPolicyViewSet, basename='product-grading-policy')
router.register(r'returns-refunds', ReturnsRefundsViewSet, basename='returns-refunds')
router.register(r'warranty-policy', WarrantyPolicyViewSet, basename='warranty-policy')
router.register(r'shipping-policy', ShippingPolicyViewSet, basename='shipping-policy')
router.register(r'cookie-policy', CookiePolicyViewSet, basename='cookie-policy')
router.register(r'disclaimer', DisclaimerViewSet, basename='disclaimer')
# ------------------------------

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
router.register(r'admin-listings', AdminListingsPageViewSet, basename='admin-listings')
router.register(r'admin-listing-detail', AdminListingDetailPageViewSet, basename='admin-listing-detail')
router.register(r'admin-customers', AdminCustomersPageViewSet, basename='admin-customers')
router.register(r'admin-add-products', AdminAddProductPageViewSet, basename='admin-add-products')
router.register(r'admin-catalog-brands', AdminBrandsPageViewSet, basename='admin-catalog-brands')
router.register(r'admin-catalog-products', AdminProductsPageViewSet, basename='admin-catalog-products')
router.register(r'admin-catalog-attributes', AdminAttributesPageViewSet, basename='admin-catalog-attributes')

urlpatterns = [
    path('', include(router.urls)),
]
