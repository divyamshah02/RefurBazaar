from rest_framework import viewsets, status
from rest_framework.response import Response

from django.utils.dateparse import parse_date

from utils.decorators import handle_exceptions  # your custom decorators
from utils.page_access import (
    page_access,
    safe_next_url,
    ROLE_HOME_URLS,
    ROLE_LOGOUT_URLS,
)
from django.shortcuts import render, redirect
from django.contrib.auth import logout


class IndexViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'index.html')

class LandingPageViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'landing-page.html')

class DynamicHomePageViewSet(viewsets.ViewSet):
    """Renders the new fully dynamic homepage, driven entirely by the
    admin-managed homepage config (Admin.homepage_views.HomepageConfigView)."""

    @handle_exceptions
    def list(self, request):
        from Admin.homepage_render import build_homepage_context
        return render(request, 'dy_homepage.html', build_homepage_context())

class ContactViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'contact.html')

class AboutViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'about.html')

class LegalViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'legal-pages/legal.html')

class TermsConditionsViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'legal-pages/terms-conditions.html')
    
class PrivacyPolicyViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'legal-pages/privacy-policy.html')
    
class ProductGradingPolicyViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'legal-pages/product-grading-policy.html')
    
class ReturnsRefundsViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'legal-pages/returns-refunds.html')
    
class WarrantyPolicyViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'legal-pages/warranty-policy.html')
    
class ShippingPolicyViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'legal-pages/shipping-policy.html')
    
class CookiePolicyViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'legal-pages/cookie-policy.html')
    
class DisclaimerViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'legal-pages/disclaimer.html')

class PartnerApplicationViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'partner-application.html')


class PartnerEnterpriseSolutionViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'Recarvit_Enterprise_Solutions.html')


class ShopViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'shop.html')


class WishlistPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    def list(self, request):
        return render(request, 'wishlist.html')

class ProductDetailViewSet(viewsets.ViewSet):

    @handle_exceptions
    def retrieve(self, request, pk):
        return render(request, 'product-detail.html')


class CartViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'cart.html')

class CheckoutViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'checkout.html')


class OrderSuccessViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'order-success.html')


class OrderDetailViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'order-detail.html')


class AccountViewSet(viewsets.ViewSet):
    """Customer account page. Logged-out visitors get the page itself, which
    opens the customer OTP login; other roles get the access-restricted page."""

    @handle_exceptions
    @page_access('customer', anonymous_ok=True)
    def list(self, request):
        return render(request, 'account.html')


def _logout_and_redirect(request, fallback_role):
    """End the session and send the user to the login page of the role they
    were signed in as (customers go to the homepage). If nobody is signed in,
    ``fallback_role`` decides where the visitor lands."""
    role = getattr(request.user, 'role', None) if request.user.is_authenticated else None
    role = role if role in ROLE_LOGOUT_URLS else fallback_role

    # An explicit ?next= (e.g. from the access-denied page) wins, but only
    # towards a login page so logout can never be used as an open redirect.
    login_targets = {'/admin-login/', '/refurbisher-login/', '/account/'}
    requested_next = request.GET.get('next') or request.POST.get('next')
    explicit_next = requested_next if requested_next in login_targets else None

    logout(request)
    return redirect(explicit_next or ROLE_LOGOUT_URLS[role])


class LogoutViewSet(viewsets.ViewSet):
    """Universal logout: redirects by the role of the signed-in user."""

    @handle_exceptions
    def list(self, request):
        return _logout_and_redirect(request, 'customer')

    @handle_exceptions
    def create(self, request):
        return _logout_and_redirect(request, 'customer')


class AdminLogoutViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return _logout_and_redirect(request, 'admin')

    @handle_exceptions
    def create(self, request):
        return _logout_and_redirect(request, 'admin')


### Refurbisher Views ###
class RefurbisherLoginViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        user = request.user
        if user.is_authenticated and getattr(user, 'role', None) == 'refurbisher' and user.is_active:
            return redirect(safe_next_url(request, 'refurbisher') or '/refurbisher-profile/')
        return render(request, 'refurbisher/login.html')


class RefurbisherProfileViewSet(viewsets.ViewSet):

    @handle_exceptions
    @page_access('refurbisher', allow_incomplete_profile=True)
    def list(self, request):
        return render(request, 'refurbisher/profile.html')


class RefurbisherAddListingViewSet(viewsets.ViewSet):

    @handle_exceptions
    @page_access('refurbisher')
    def list(self, request):
        return render(request, 'refurbisher/refurbisher_add_listing.html')

class RefurbisherListingsViewSet(viewsets.ViewSet):

    @handle_exceptions
    @page_access('refurbisher')
    def list(self, request):
        return render(request, 'refurbisher/refurbisher_listings.html')


class RefurbisherListingDetailViewSet(viewsets.ViewSet):

    @handle_exceptions
    @page_access('refurbisher')
    def list(self, request):
        return render(request, 'refurbisher/refurbisher_listing_detail.html')


class RefurbisherOrdersViewSet(viewsets.ViewSet):

    @handle_exceptions
    @page_access('refurbisher')
    def list(self, request):
        return render(request, 'refurbisher/refurbisher_orders.html')


class RefurbisherOrderDetailViewSet(viewsets.ViewSet):

    @handle_exceptions
    @page_access('refurbisher')
    def list(self, request):
        return render(request, 'refurbisher/refurbisher_order_detail.html')


class RefurbisherLogoutViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return _logout_and_redirect(request, 'refurbisher')

    @handle_exceptions
    def create(self, request):
        return _logout_and_redirect(request, 'refurbisher')
