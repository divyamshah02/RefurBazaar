from django.shortcuts import render, redirect
from rest_framework import viewsets
from utils.decorators import handle_exceptions
from utils.page_access import page_access, safe_next_url


class AdminLoginPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    def list(self, request):
        user = request.user
        if user.is_authenticated and getattr(user, 'role', None) == 'admin' and user.is_active:
            return redirect(safe_next_url(request, 'admin') or '/admin-dashboard/')
        return render(request, 'admin/login.html')


class AdminDashboardPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return render(request, 'admin/dashboard.html')


class AdminHomePageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return render(request, 'admin/homepage.html')


class AdminOrdersPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return render(request, 'admin/orders.html')


class AdminOrderDetailPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return render(request, 'admin/order_detail.html')

    @handle_exceptions
    @page_access('admin')
    def retrieve(self, request, pk=None):
        return render(request, 'admin/order_detail.html')


class AdminRefurbishersPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return render(request, 'admin/refurbishers.html')


class AdminPendingRefurbishersPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return redirect('/admin-refurbishers/?status=pending')


class AdminRefurbisherDetailPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return render(request, 'admin/refurbisher_detail.html')

    @handle_exceptions
    @page_access('admin')
    def retrieve(self, request, pk=None):
        return render(request, 'admin/refurbisher_detail.html')

class AdminListingsPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return render(request, 'admin/listings.html')

class AdminListingDetailPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return render(request, 'admin/listing_detail.html')

    @handle_exceptions
    @page_access('admin')
    def retrieve(self, request, pk=None):
        return render(request, 'admin/listing_detail.html')


class AdminCustomersPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return render(request, 'admin/customers.html')

class AdminAddProductPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return render(request, 'admin/add_products.html')


class AdminBrandsPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return render(request, 'admin/brands.html')


class AdminProductsPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return render(request, 'admin/products.html')


class AdminAttributesPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return render(request, 'admin/attributes.html')


class AdminTeamPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return render(request, 'admin/team.html')


class AdminPricingPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @page_access('admin')
    def list(self, request):
        return render(request, 'admin/pricing.html')
