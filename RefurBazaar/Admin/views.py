from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count, Sum
from UserDetail.models import User, CompanyProfile
from Order.models import Order, OrderItem
from Product.models import Listing, ListingUnit
from UserDetail.serializers import UserSerializer, CompanyProfileSerializer
from Order.serializers import OrderSerializer
from Product.serializers import ListingSerializer
from utils.decorators import handle_exceptions, check_authentication


class AdminDashboardViewSet(viewsets.ViewSet):
    """Admin Dashboard APIs"""

    @action(detail=False, methods=['get'], url_path='stats')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def dashboard_stats(self, request):
        """Get dashboard statistics"""
        total_orders = Order.objects.count()
        total_refurbishers = User.objects.filter(role='refurbisher').count()
        pending_refurbishers = CompanyProfile.objects.filter(
            is_profile_complete=True,
            is_approved=False
        ).count()
        total_revenue = Order.objects.filter(
            payment_status='paid'
        ).aggregate(Sum('total_price'))['total_price__sum'] or 0

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "total_orders": total_orders,
                "total_refurbishers": total_refurbishers,
                "pending_refurbishers": pending_refurbishers,
                "total_revenue": float(total_revenue)
            },
            "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='orders')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def all_orders(self, request):
        """Get all orders with filters"""
        orders = Order.objects.all().select_related('user').prefetch_related('items')
        
        # Filter by status if provided
        order_status = request.query_params.get('status')
        if order_status:
            orders = orders.filter(order_status=order_status)
        
        # Filter by payment status
        payment_status = request.query_params.get('payment_status')
        if payment_status:
            orders = orders.filter(payment_status=payment_status)
        
        # Search by order ID or customer name
        search = request.query_params.get('search')
        if search:
            orders = orders.filter(
                Q(order_id__icontains=search) |
                Q(customer_name__icontains=search) |
                Q(customer_phone__icontains=search)
            )
        
        # Order by created_at descending
        orders = orders.order_by('-created_at')
        
        serializer = OrderSerializer(orders, many=True)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='order-detail')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def order_detail(self, request, pk=None):
        """Get detailed order information"""
        order = Order.objects.select_related('user').prefetch_related(
            'items__listing_unit__listing__model__brand',
            'items__refurbisher'
        ).filter(order_id=pk).first()
        
        if not order:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Order not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = OrderSerializer(order)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='refurbishers')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def all_refurbishers(self, request):
        """Get all refurbishers with their profiles"""
        status_filter = request.query_params.get('status')  # 'approved', 'pending', 'all'
        
        refurbishers = User.objects.filter(role='refurbisher').select_related('company_profile')
        
        if status_filter == 'pending':
            refurbishers = refurbishers.filter(
                company_profile__is_profile_complete=True,
                company_profile__is_approved=False
            )
        elif status_filter == 'approved':
            refurbishers = refurbishers.filter(company_profile__is_approved=True)
        
        # Search by name or company
        search = request.query_params.get('search')
        if search:
            refurbishers = refurbishers.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(company_profile__company_name__icontains=search)
            )
        
        data = []
        for refurbisher in refurbishers:
            user_data = UserSerializer(refurbisher).data
            company_data = None
            if hasattr(refurbisher, 'company_profile'):
                company_data = CompanyProfileSerializer(refurbisher.company_profile).data
            
            # Get statistics
            total_listings = Listing.objects.filter(refurbisher=refurbisher).count()
            total_sales = OrderItem.objects.filter(refurbisher=refurbisher).count()
            
            data.append({
                **user_data,
                'company_profile': company_data,
                'stats': {
                    'total_listings': total_listings,
                    'total_sales': total_sales
                }
            })
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": data[::-1],
            "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='refurbisher-detail')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def refurbisher_detail(self, request, pk=None):
        """Get detailed refurbisher information with listings and orders"""
        refurbisher = User.objects.filter(user_id=pk, role='refurbisher').select_related('company_profile').first()
        
        if not refurbisher:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Refurbisher not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        user_data = UserSerializer(refurbisher).data
        company_data = None
        if hasattr(refurbisher, 'company_profile'):
            company_data = CompanyProfileSerializer(refurbisher.company_profile).data
        
        # Get listings
        listings = Listing.objects.filter(refurbisher=refurbisher).prefetch_related('units')
        listings_data = ListingSerializer(listings, many=True).data
        
        # Get orders (order items from this refurbisher)
        order_items = OrderItem.objects.filter(refurbisher=refurbisher).select_related('order')
        orders = Order.objects.filter(
            id__in=order_items.values_list('order_id', flat=True)
        ).distinct()
        orders_data = OrderSerializer(orders, many=True).data
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                'user': user_data,
                'company_profile': company_data,
                'listings': listings_data,
                'orders': orders_data
            },
            "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='approve-refurbisher')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def approve_refurbisher(self, request, pk=None):
        """Approve or reject refurbisher profile"""
        refurbisher = User.objects.filter(user_id=pk, role='refurbisher').first()
        
        if not refurbisher:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Refurbisher not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        if not hasattr(refurbisher, 'company_profile'):
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Company profile not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        action_type = request.data.get('action')  # 'approve' or 'reject'
        
        company_profile = refurbisher.company_profile
        
        if action_type == 'approve':
            company_profile.is_approved = True
            company_profile.approved_at = timezone.now()
            company_profile.approved_by = request.user
            company_profile.save()
            
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"message": "Refurbisher approved successfully"},
                "error": None
            }, status=status.HTTP_200_OK)
        
        elif action_type == 'reject':
            company_profile.is_approved = False
            company_profile.approved_at = None
            company_profile.approved_by = None
            company_profile.save()
            
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"message": "Refurbisher rejected"},
                "error": None
            }, status=status.HTTP_200_OK)
        
        return Response({
            "success": False,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": None,
            "error": "Invalid action. Use 'approve' or 'reject'"
        }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='customers')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def all_customers(self, request):
        """Get all customers"""
        customers = User.objects.filter(role='customer')
        
        # Search by name or phone
        search = request.query_params.get('search')
        if search:
            customers = customers.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(contact_number__icontains=search) |
                Q(email__icontains=search)
            )
        
        data = []
        for customer in customers:
            user_data = UserSerializer(customer).data
            
            # Get customer statistics
            total_orders = Order.objects.filter(user=customer).count()
            total_spent = Order.objects.filter(
                user=customer,
                payment_status='paid'
            ).aggregate(Sum('total_price'))['total_price__sum'] or 0
            
            data.append({
                **user_data,
                'stats': {
                    'total_orders': total_orders,
                    'total_spent': float(total_spent)
                }
            })
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": data,
            "error": None
        }, status=status.HTTP_200_OK)
