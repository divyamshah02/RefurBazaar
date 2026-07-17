from django.shortcuts import render, redirect
from rest_framework import viewsets
from utils.decorators import handle_exceptions, check_authentication


class AdminDashboardPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @check_authentication(required_role='admin')
    def list(self, request):
        return render(request, 'admin/dashboard.html')


class AdminOrdersPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @check_authentication(required_role='admin')
    def list(self, request):
        return render(request, 'admin/orders.html')


class AdminOrderDetailPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @check_authentication(required_role='admin')
    def list(self, request):
        return render(request, 'admin/order_detail.html')

    @handle_exceptions
    @check_authentication(required_role='admin')
    def retrieve(self, request, pk=None):
        return render(request, 'admin/order_detail.html')


class AdminRefurbishersPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @check_authentication(required_role='admin')
    def list(self, request):
        return render(request, 'admin/refurbishers.html')


class AdminPendingRefurbishersPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @check_authentication(required_role='admin')
    def list(self, request):
        return render(request, 'admin/pending_refurbishers.html')


class AdminRefurbisherDetailPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @check_authentication(required_role='admin')
    def list(self, request):
        return render(request, 'admin/refurbisher_detail.html')

    @handle_exceptions
    @check_authentication(required_role='admin')
    def retrieve(self, request, pk=None):
        return render(request, 'admin/refurbisher_detail.html')

class AdminListingsPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @check_authentication(required_role='admin')
    def list(self, request):
        return render(request, 'admin/listings.html')

class AdminListingDetailPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @check_authentication(required_role='admin')
    def list(self, request):
        return render(request, 'admin/listing_detail.html')

    @handle_exceptions
    @check_authentication(required_role='admin')
    def retrieve(self, request, pk=None):
        return render(request, 'admin/listing_detail.html')


class AdminCustomersPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @check_authentication(required_role='admin')
    def list(self, request):
        return render(request, 'admin/customers.html')

class AdminAddProductPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @check_authentication(required_role='admin')
    def list(self, request):
        return render(request, 'admin/add_products.html')


class AdminBrandsPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @check_authentication(required_role='admin')
    def list(self, request):
        return render(request, 'admin/brands.html')


class AdminProductsPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @check_authentication(required_role='admin')
    def list(self, request):
        return render(request, 'admin/products.html')


class AdminAttributesPageViewSet(viewsets.ViewSet):
    @handle_exceptions
    @check_authentication(required_role='admin')
    def list(self, request):
        return render(request, 'admin/attributes.html')
