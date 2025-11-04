from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils.crypto import get_random_string
from django.db import transaction

from .models import ShoppingCart, ShoppingCartItem
from .serializers import CartSerializer, CartItemSerializer
from Product.models import ListingUnit


def generate_unique_cart_id():
    """Generate a unique 10-digit cart ID"""
    while True:
        cart_id = get_random_string(10, allowed_chars='0123456789')
        if not ShoppingCart.objects.filter(cart_id=cart_id).exists():
            return cart_id


class CartViewSet(viewsets.ViewSet):
    """
    ViewSet for managing shopping cart operations.
    Supports both guest (session-based) and authenticated users.
    """

    def list(self, request):
        """
        Get cart items for current user/session.
        Query params: cart_id (optional)
        """
        cart_id = request.query_params.get('cart_id')
        user = request.user if request.user.is_authenticated else None
        session_id = request.session.get('session_token')

        cart = None
        
        # Priority: cart_id > user > session_id
        if cart_id:
            cart = ShoppingCart.objects.filter(cart_id=cart_id, active_cart=True).first()
        elif user:
            cart = ShoppingCart.objects.filter(user=user, active_cart=True).first()
        elif session_id:
            cart = ShoppingCart.objects.filter(session_id=session_id, active_cart=True).first()

        if cart:
            serializer = CartSerializer(cart)
            return Response({
                "success": True,
                "user_not_logged_in": not bool(user),
                "data": serializer.data,
                "error": None
            }, status=status.HTTP_200_OK)

        return Response({
            "success": True,
            "user_not_logged_in": not bool(user),
            "data": {
                "cart_id": None,
                "items": [],
                "total_items": 0,
                "total_price": "0.00"
            },
            "error": "No active cart found"
        }, status=status.HTTP_200_OK)

    def create(self, request):
        """
        Add item to cart.
        Body: { "listing_unit_id": <id> }
        """
        user = request.user if request.user.is_authenticated else None
        
        # Get or create session token from CSRF token
        if request.session.get('session_token') is None:
            request.session['session_token'] = request.COOKIES.get('csrftoken')
        session_id = request.session.get('session_token')
        
        listing_unit_id = request.data.get('listing_unit_id')

        if not listing_unit_id:
            return Response({
                "success": False,
                "user_not_logged_in": not bool(user),
                "data": None,
                "error": "Missing listing_unit_id"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate listing unit exists and is available
        try:
            listing_unit = ListingUnit.objects.get(id=listing_unit_id)
        except ListingUnit.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": not bool(user),
                "data": None,
                "error": "Listing unit not found"
            }, status=status.HTTP_404_NOT_FOUND)

        if not listing_unit.is_available or listing_unit.is_sold:
            return Response({
                "success": False,
                "user_not_logged_in": not bool(user),
                "data": None,
                "error": "This listing unit is not available for purchase"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get or create cart
        with transaction.atomic():
            if user:
                cart, created = ShoppingCart.objects.get_or_create(
                    user=user,
                    active_cart=True,
                    defaults={'cart_id': generate_unique_cart_id()}
                )
            else:
                if not session_id:
                    return Response({
                        "success": False,
                        "user_not_logged_in": True,
                        "data": None,
                        "error": "Session ID is required for guests"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                cart, created = ShoppingCart.objects.get_or_create(
                    session_id=session_id,
                    active_cart=True,
                    defaults={'cart_id': generate_unique_cart_id()}
                )

            # Check if item already in cart
            existing_item = ShoppingCartItem.objects.filter(
                cart=cart,
                listing_unit=listing_unit
            ).first()

            if existing_item:
                return Response({
                    "success": False,
                    "user_not_logged_in": not bool(user),
                    "data": None,
                    "error": "This item is already in your cart"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create cart item
            cart_item = ShoppingCartItem.objects.create(
                cart=cart,
                listing_unit=listing_unit
            )

        serializer = CartItemSerializer(cart_item)
        return Response({
            "success": True,
            "user_not_logged_in": not bool(user),
            "data": {
                "cart_id": cart.cart_id,
                "item": serializer.data
            },
            "error": None
        }, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        """
        Remove item from cart.
        URL param: cart_item_id
        """
        cart_item_id = pk

        if not cart_item_id:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "data": None,
                "error": "Missing cart_item_id"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            cart_item = ShoppingCartItem.objects.get(id=cart_item_id)
        except ShoppingCartItem.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "data": None,
                "error": "Cart item not found"
            }, status=status.HTTP_404_NOT_FOUND)

        cart_item.delete()

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "data": {"message": "Item removed from cart"},
            "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def clear(self, request):
        """
        Clear all items from cart.
        Body: { "cart_id": <id> } (optional)
        """
        cart_id = request.data.get('cart_id')
        user = request.user if request.user.is_authenticated else None
        session_id = request.session.get('session_token')

        cart = None
        
        if cart_id:
            cart = ShoppingCart.objects.filter(cart_id=cart_id, active_cart=True).first()
        elif user:
            cart = ShoppingCart.objects.filter(user=user, active_cart=True).first()
        elif session_id:
            cart = ShoppingCart.objects.filter(session_id=session_id, active_cart=True).first()

        if not cart:
            return Response({
                "success": False,
                "user_not_logged_in": not bool(user),
                "data": None,
                "error": "No active cart found"
            }, status=status.HTTP_404_NOT_FOUND)

        cart.items.all().delete()

        return Response({
            "success": True,
            "user_not_logged_in": not bool(user),
            "data": {"message": "Cart cleared successfully"},
            "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def validate(self, request):
        """
        Validate all items in cart are still available.
        Removes unavailable items and returns updated cart.
        Body: { "cart_id": <id> } (optional)
        """
        cart_id = request.data.get('cart_id')
        user = request.user if request.user.is_authenticated else None
        session_id = request.session.get('session_token')

        cart = None
        
        if cart_id:
            cart = ShoppingCart.objects.filter(cart_id=cart_id, active_cart=True).first()
        elif user:
            cart = ShoppingCart.objects.filter(user=user, active_cart=True).first()
        elif session_id:
            cart = ShoppingCart.objects.filter(session_id=session_id, active_cart=True).first()

        if not cart:
            return Response({
                "success": False,
                "user_not_logged_in": not bool(user),
                "data": None,
                "error": "No active cart found"
            }, status=status.HTTP_404_NOT_FOUND)

        # Check each item and remove if unavailable
        removed_items = []
        for item in cart.items.all():
            if not item.listing_unit.is_available or item.listing_unit.is_sold:
                removed_items.append({
                    'id': item.id,
                    'listing_unit_id': item.listing_unit.id,
                    'reason': 'No longer available' if not item.listing_unit.is_available else 'Already sold'
                })
                item.delete()

        serializer = CartSerializer(cart)
        return Response({
            "success": True,
            "user_not_logged_in": not bool(user),
            "data": {
                "cart": serializer.data,
                "removed_items": removed_items
            },
            "error": None
        }, status=status.HTTP_200_OK)


class CartTransferViewSet(viewsets.ViewSet):
    """
    ViewSet for transferring guest cart to authenticated user on login.
    """

    def create(self, request):
        """
        Transfer guest cart to authenticated user.
        Body: { "session_id": <id> } (optional, will use session token if not provided)
        """
        if not request.user.is_authenticated:
            return Response({
                "success": False,
                "user_not_logged_in": True,
                "data": None,
                "error": "User must be authenticated to transfer cart"
            }, status=status.HTTP_401_UNAUTHORIZED)

        user = request.user
        session_id = request.data.get('session_id')
        
        if not session_id:
            session_id = request.session.get('session_token')

        if not session_id:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "data": None,
                "error": "No session ID available for transfer"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Find guest cart
        guest_cart = ShoppingCart.objects.filter(
            session_id=session_id, 
            active_cart=True,
            user__isnull=True
        ).first()

        if not guest_cart:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "data": None,
                "error": "No guest cart found for this session"
            }, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            # Deactivate existing user cart if exists
            existing_user_cart = ShoppingCart.objects.filter(
                user=user, 
                active_cart=True
            ).first()
            
            if existing_user_cart:
                # Merge items from existing user cart to guest cart
                for item in existing_user_cart.items.all():
                    # Check if item already exists in guest cart
                    if not guest_cart.items.filter(listing_unit=item.listing_unit).exists():
                        item.cart = guest_cart
                        item.save()
                
                # Deactivate old user cart
                existing_user_cart.active_cart = False
                existing_user_cart.save()
            
            # Transfer guest cart to user
            guest_cart.user = user
            guest_cart.active_cart = True
            guest_cart.save()

        serializer = CartSerializer(guest_cart)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "data": {
                "cart_id": guest_cart.cart_id,
                "cart": serializer.data
            },
            "error": None
        }, status=status.HTTP_200_OK)
