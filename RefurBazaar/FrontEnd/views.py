from rest_framework import viewsets, status
from rest_framework.response import Response

from django.utils.dateparse import parse_date

from utils.decorators import handle_exceptions  # your custom decorators
from django.shortcuts import render, redirect
from functools import wraps
from django.contrib.auth import authenticate, login, logout


def check_authentication(required_role=None):
    '''Checks if user is logged in or not.
    If required_role is passed (as str or list), will check for that as well.'''
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(self, request, *args, **kwargs):
            user = request.user
            session_info = {}

            if hasattr(request, 'session'):
                session_info = {
                    'session_key': request.session.session_key,
                    'session_expiry': request.session.get_expiry_date(),
                    'session_data_keys': list(request.session.keys()),
                }

            if not user.is_authenticated:
                # logger.warning(f"Unauthenticated access attempt: {request.path}")
                if required_role == 'refurbisher' or (isinstance(required_role, (list, tuple, set)) and 'refurbisher' in required_role):
                    return redirect('refurbisher-login-list')
                return redirect('login-list')

            if required_role:
                # Convert to list if it's a string
                allowed_roles = required_role if isinstance(required_role, (list, tuple, set)) else [required_role]
                
                if getattr(user, "role", None) not in allowed_roles:
                    # logger.warning(
                    #     f"Unauthorized access: User {user.id} role {user.role} "
                    #     f"required {allowed_roles}"
                    # )
                    return Response(
                        {
                            "success": False,
                            "user_not_logged_in": False,
                            "user_unauthorized": True,
                            "data": None,
                            "error": f"User role must be one of {allowed_roles}"
                        }, status=status.HTTP_403_FORBIDDEN
                    )

            return view_func(self, request, *args, **kwargs)

        return _wrapped_view
    return decorator

class IndexViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'index.html')

class LandingPageViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'landing-page.html')

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


class ShopViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'shop.html')


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

    @handle_exceptions
    def list(self, request):
        return render(request, 'account.html')

class LogoutViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        logout(request)
        return redirect('account-list')


### Refurbisher Views ###
class RefurbisherLoginViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'refurbisher/login.html')


class RefurbisherProfileViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication(required_role='refurbisher')
    def list(self, request):
        return render(request, 'refurbisher/profile.html')


class RefurbisherAddListingViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication(required_role='refurbisher')
    def list(self, request):
        return render(request, 'refurbisher/refurbisher_add_listing.html')

class RefurbisherListingsViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication(required_role='refurbisher')
    def list(self, request):
        return render(request, 'refurbisher/refurbisher_listings.html')


class RefurbisherListingDetailViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication(required_role='refurbisher')
    def list(self, request):
        return render(request, 'refurbisher/refurbisher_listing_detail.html')


class RefurbisherOrdersViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication(required_role='refurbisher')
    def list(self, request):
        return render(request, 'refurbisher/refurbisher_orders.html')


class RefurbisherOrderDetailViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication(required_role='refurbisher')
    def list(self, request):
        return render(request, 'refurbisher/refurbisher_order_detail.html')


class RefurbisherLogoutViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication()
    def list(self, request):
        logout(request)
        return redirect('refurbisher-login-list')
