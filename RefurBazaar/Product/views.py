from rest_framework import status, viewsets
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import *
from .serializers import *
from utils.decorators import *


class BrandViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        brands = Brand.objects.all()
        serializer = BrandSerializer(brands, many=True)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_200_OK)


class ProductModelViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        """
        Accepts optional query params:
         - category (mobile/laptop/tablet/accessory)
         - brand_id
         - search (partial name)
        """
        category = request.query_params.get('category')
        brand_id = request.query_params.get('brand_id')
        search = request.query_params.get('search')

        queryset = ProductModel.objects.filter(is_active=True)
        if category:
            queryset = queryset.filter(category=category)
        if brand_id:
            queryset = queryset.filter(brand_id=brand_id)
        if search:
            queryset = queryset.filter(name__icontains=search)

        serializer = ProductModelSerializer(queryset, many=True)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_200_OK)


class ProductModelAttributeViewSet(viewsets.ViewSet):
    """
    Return attribute definitions for a given ProductModel.
    Usage: GET /.../product-model-attributes/?model_id=<id>
    """

    @handle_exceptions
    def list(self, request):
        model_id = request.query_params.get('model_id')
        if not model_id:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "model_id is required."
            }, status=status.HTTP_400_BAD_REQUEST)

        product_model = get_object_or_404(ProductModel, id=model_id)

        # Fetch linked ProductModelAttribute rows (these include is_required flag + attribute metadata)
        pm_attrs = ProductModelAttribute.objects.filter(product_model=product_model).select_related('attribute')
        serializer = ProductModelAttributeSerializer(pm_attrs, many=True)

        # Return the attribute metadata array for frontend to render form controls
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_200_OK)


class ListingViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication(required_role='refurbisher')
    def create(self, request):
        """
        Create Listing by refurbisher.
        Expected payload:
        {
          "model_id": int,
          "price_per_unit": "1234.00",
          "total_quantity": int,
          "condition": "good"|"excellent"|"fair"
        }
        """
        model_id = request.data.get('model_id')
        price_per_unit = request.data.get('price_per_unit')
        total_quantity = request.data.get('total_quantity')
        condition = request.data.get('condition')

        if not all([model_id, price_per_unit, total_quantity, condition]):
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Missing required fields."
            }, status=status.HTTP_400_BAD_REQUEST)

        model = get_object_or_404(ProductModel, id=model_id)
        refurbisher = request.user

        listing = Listing.objects.create(
            model=model,
            refurbisher=refurbisher,
            price_per_unit=price_per_unit,
            total_quantity=total_quantity,
            condition=condition
        )

        serializer = ListingSerializer(listing)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_201_CREATED)

    @handle_exceptions
    def list(self, request):
        model_id = request.query_params.get('model_id')
        refurbisher_id = request.query_params.get('refurbisher_id')

        queryset = Listing.objects.filter(status='active')
        if model_id:
            queryset = queryset.filter(model_id=model_id)
        if refurbisher_id:
            queryset = queryset.filter(refurbisher_id=refurbisher_id)

        serializer = ListingSerializer(queryset, many=True)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_200_OK)


class ListingUnitViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication(required_role='refurbisher')
    def create(self, request):
        """
        Create ListingUnit and its ListingUnitAttribute rows.
        Expected payload:
        {
          "listing_id": int,
          "quantity": int,
          "imei_number": "optional string",    # if uploading per unit IMEI or a batch
          "attributes": [ {"attribute_id": 1, "value": "128GB"}, ... ]
        }
        """
        listing_id = request.data.get('listing_id')
        attributes = request.data.get('attributes', [])  # list of {attribute_id, value}
        quantity = request.data.get('quantity', 1)
        imei_number = request.data.get('imei_number')

        listing = get_object_or_404(Listing, id=listing_id, refurbisher=request.user)

        unit = ListingUnit.objects.create(listing=listing, quantity=quantity, imei_number=imei_number)

        for attr in attributes:
            attr_id = attr.get('attribute_id') or attr.get('id') or attr.get('attribute')
            if not attr_id:
                continue
            attr_obj = get_object_or_404(AttributeMaster, id=attr_id)
            ListingUnitAttribute.objects.create(
                listing_unit=unit,
                attribute=attr_obj,
                value=attr.get('value')
            )

        serializer = ListingUnitSerializer(unit)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_201_CREATED)

    @handle_exceptions
    def list(self, request):
        listing_id = request.query_params.get('listing_id')
        if not listing_id:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "listing_id is required."
            }, status=status.HTTP_400_BAD_REQUEST)

        queryset = ListingUnit.objects.filter(listing_id=listing_id)
        serializer = ListingUnitSerializer(queryset, many=True)

        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_200_OK)
