from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.utils.timezone import now
from django.db.models import Q, Count, Sum
from UserDetail.models import User, CompanyProfile
from Order.models import Order, OrderItem
from Product.models import Listing, ListingUnit, AttributeMaster
from Product.serializers import AttributeMasterSerializer
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
        """Get dashboard statistics — all sections share this endpoint."""
        # Orders
        total_orders     = Order.objects.count()
        pending_orders   = Order.objects.filter(status='pending').count()
        shipped_orders   = Order.objects.filter(status='shipped').count()
        delivered_orders = Order.objects.filter(status='delivered').count()
        cancelled_orders = Order.objects.filter(status='cancelled').count()
        total_revenue    = Order.objects.filter(
            payment_received=True
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0

        # Refurbishers
        total_refurbishers    = User.objects.filter(role='refurbisher').count()
        approved_refurbishers = CompanyProfile.objects.filter(is_approved=True).count()
        pending_refurbishers  = CompanyProfile.objects.filter(
            is_profile_complete=True, is_approved=False
        ).count()
        rejected_refurbishers = total_refurbishers - approved_refurbishers - pending_refurbishers

        # Listings
        total_listings    = Listing.objects.count()
        active_listings   = Listing.objects.filter(status='active').count()
        draft_listings    = Listing.objects.filter(status='draft').count()
        sold_listings     = Listing.objects.filter(status='sold').count()

        # Customers
        total_customers      = User.objects.filter(role='customer').count()
        customers_with_orders = User.objects.filter(
            role='customer', orders__isnull=False
        ).distinct().count()
        month_start = now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        customers_new_month  = User.objects.filter(
            role='customer', date_joined__gte=month_start
        ).count()
        inactive_customers   = User.objects.filter(
            role='customer', is_active=False
        ).count()

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                # orders
                "total_orders":     total_orders,
                "pending_orders":   pending_orders,
                "shipped_orders":   shipped_orders,
                "delivered_orders": delivered_orders,
                "cancelled_orders": cancelled_orders,
                "total_revenue":    float(total_revenue),
                # refurbishers
                "total_refurbishers":    total_refurbishers,
                "approved_refurbishers": approved_refurbishers,
                "pending_refurbishers":  pending_refurbishers,
                "rejected_refurbishers": max(rejected_refurbishers, 0),
                # listings
                "total_listings":  total_listings,
                "active_listings": active_listings,
                "draft_listings":  draft_listings,
                "sold_listings":   sold_listings,
                # customers
                "total_customers":        total_customers,
                "customers_with_orders":  customers_with_orders,
                "customers_new_month":    customers_new_month,
                "inactive_customers":     inactive_customers,
            },
            "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='orders')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def all_orders(self, request):
        """Get all orders with filters"""
        orders = Order.objects.all().select_related('user').prefetch_related(
            'items__listing_unit__listing__model__brand',
            'items__device_photos'
        )

        # Filter by status if provided
        order_status = request.query_params.get('status')
        if order_status:
            orders = orders.filter(status=order_status)

        # Filter by payment status — accept both 'is_paid' and legacy 'payment_received'
        is_paid = request.query_params.get('is_paid') or request.query_params.get('payment_received')
        if is_paid == 'true':
            orders = orders.filter(payment_received=True)
        elif is_paid == 'false':
            orders = orders.filter(payment_received=False)

        # Search by order ID or customer name/phone
        search = request.query_params.get('search')
        if search:
            orders = orders.filter(
                Q(order_id__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone__icontains=search)
            )

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
            'items__device_photos'
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

    @action(detail=True, methods=['patch'], url_path='update-order-status')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def update_order_status(self, request, pk=None):
        """Update order status and/or payment_received flag"""
        order = Order.objects.filter(order_id=pk).first()
        if not order:
            return Response({"success": False, "error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        payment_received = request.data.get('payment_received')

        VALID_STATUSES = [s[0] for s in Order.STATUS_CHOICES]
        if new_status and new_status not in VALID_STATUSES:
            return Response({"success": False, "error": f"Invalid status '{new_status}'"}, status=status.HTTP_400_BAD_REQUEST)

        if new_status:
            order.status = new_status
        if payment_received is not None:
            order.payment_received = bool(payment_received)
        order.save()

        serializer = OrderSerializer(order)
        return Response({"success": True, "data": serializer.data, "error": None}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='refurbishers')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def all_refurbishers(self, request):
        """Get all refurbishers with their profiles"""
        status_filter = request.query_params.get('status')  # 'approved', 'pending', 'incomplete', 'all'

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
                Q(company_profile__company_name__icontains=search) |
                Q(contact_number__icontains=search)
            )

        data = []
        for refurbisher in refurbishers:
            user_data = UserSerializer(refurbisher).data
            company_data = None
            if hasattr(refurbisher, 'company_profile'):
                company_data = CompanyProfileSerializer(refurbisher.company_profile).data

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

        listings = Listing.objects.filter(refurbisher=refurbisher).prefetch_related('units')
        listings_data = ListingSerializer(listings, many=True).data

        # Orders that contain items from this refurbisher
        order_item_order_ids = OrderItem.objects.filter(
            refurbisher=refurbisher
        ).values_list('order_id', flat=True).distinct()

        orders = Order.objects.filter(
            id__in=order_item_order_ids
        ).prefetch_related('items__device_photos').distinct()
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

    @action(detail=False, methods=['get'], url_path='listings')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def all_listings(self, request):
        """Get all listings with filters"""
        listings = Listing.objects.all().select_related(
            'model__brand', 'refurbisher'
        ).prefetch_related('units')

        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            listings = listings.filter(status=status_filter)

        # Filter by category
        category = request.query_params.get('category')
        if category:
            listings = listings.filter(model__category=category)

        # Search by listing_id, product name, refurbisher name
        search = request.query_params.get('search')
        if search:
            listings = listings.filter(
                Q(listing_id__icontains=search) |
                Q(model__name__icontains=search) |
                Q(model__brand__name__icontains=search) |
                Q(refurbisher__first_name__icontains=search) |
                Q(refurbisher__last_name__icontains=search)
            )

        listings = listings.order_by('-created_at')
        serializer = ListingSerializer(listings, many=True)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='listing-detail')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def listing_detail(self, request, pk=None):
        """Get a single listing by listing_id (pk)"""
        listing = Listing.objects.select_related(
            'model__brand', 'refurbisher'
        ).prefetch_related('units__attributes').filter(listing_id=pk).first()

        if not listing:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Listing not found"
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = ListingSerializer(listing)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='customers')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def all_customers(self, request):
        """Get all customers"""
        customers = User.objects.filter(role='customer').order_by('-created_at')

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

            total_orders = Order.objects.filter(user=customer).count()
            total_spent = Order.objects.filter(
                user=customer,
                payment_received=True
            ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0

            data.append({
                **user_data,
                'total_orders': total_orders,
                'total_spent': float(total_spent),
            })

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": data,
            "error": None
        }, status=status.HTTP_200_OK)

    # ── Attributes ────────────────────────────────────────────────
    @action(detail=False, methods=['get', 'post'], url_path='attributes')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def attributes_list(self, request):
        """List all AttributeMaster entries, or create a new one."""
        if request.method == 'GET':
            qs = AttributeMaster.objects.all().order_by('category', 'display_order', 'name')
            cat = request.query_params.get('category')
            if cat:
                qs = qs.filter(category=cat)
            serializer = AttributeMasterSerializer(qs, many=True)
            return Response({
                "success": True, "user_not_logged_in": False, "user_unauthorized": False,
                "data": serializer.data, "error": None
            }, status=status.HTTP_200_OK)

        # POST — create
        serializer = AttributeMasterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True, "user_not_logged_in": False, "user_unauthorized": False,
                "data": serializer.data, "error": None
            }, status=status.HTTP_201_CREATED)
        return Response({
            "success": False, "user_not_logged_in": False, "user_unauthorized": False,
            "data": None, "error": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch', 'delete'], url_path='attributes')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def attribute_detail(self, request, pk=None):
        """Update or delete a single AttributeMaster."""
        try:
            attr = AttributeMaster.objects.get(pk=pk)
        except AttributeMaster.DoesNotExist:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Attribute not found"
            }, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'DELETE':
            attr.delete()
            return Response({
                "success": True, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": None
            }, status=status.HTTP_200_OK)

        serializer = AttributeMasterSerializer(attr, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True, "user_not_logged_in": False, "user_unauthorized": False,
                "data": serializer.data, "error": None
            }, status=status.HTTP_200_OK)
        return Response({
            "success": False, "user_not_logged_in": False, "user_unauthorized": False,
            "data": None, "error": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
