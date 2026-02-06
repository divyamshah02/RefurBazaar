from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Min, Max, Count, Q
from .models import *
from .serializers import *
from utils.decorators import *
import pandas as pd
from django.db import transaction


class BrandViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        """Get all brands, optionally filtered by category"""
        category = request.query_params.get('category')
        
        if category:
            # Get brands that have models in this category
            brands = Brand.objects.filter(models__category=category, models__is_active=True).distinct()
        else:
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
    
    @action(detail=False, methods=['get'])
    @handle_exceptions
    def categories(self, request):
        """Return available categories"""
        categories = [
            {"value": choice[0], "label": choice[1]} 
            for choice in ProductModel.CATEGORY_CHOICES
        ]
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": categories, "error": None
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='shop')
    @handle_exceptions
    def shop(self, request):
        """
        Shop page endpoint with filters and aggregations
        Query params:
         - category: Filter by category
         - brand_ids: Comma-separated brand IDs
         - min_price: Minimum price filter
         - max_price: Maximum price filter
         - conditions: Comma-separated conditions (excellent,good,fair)
         - sort_by: featured, price_low, price_high, newest
        """
        category = request.query_params.get('category', 'mobile')
        brand_ids = request.query_params.get('brand_ids', '')
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        conditions = request.query_params.get('conditions', '')
        sort_by = request.query_params.get('sort_by', 'featured')
        
        # Base queryset - get product models with active listings
        queryset = ProductModel.objects.filter(
            is_active=True,
            category=category,
            listings__status='active',
            listings__units__is_available=True,
            listings__units__is_sold=False
        ).distinct()
        print("Base Queryset:", queryset)
        
        # Apply brand filter
        if brand_ids:
            brand_id_list = [int(bid) for bid in brand_ids.split(',') if bid.strip()]
            if brand_id_list:
                queryset = queryset.filter(brand_id__in=brand_id_list)
        
        # Build filter for listing units with proper relationship path
        units_filter = Q(
            listings__status='active',
            listings__units__is_available=True,
            listings__units__is_sold=False
        )
        
        # Apply price filters
        if min_price:
            units_filter &= Q(listings__units__price__gte=float(min_price))
        if max_price:
            units_filter &= Q(listings__units__price__lte=float(max_price))
        
        # Apply condition filters
        if conditions:
            condition_list = [c.strip() for c in conditions.split(',') if c.strip()]
            if condition_list:
                units_filter &= Q(listings__units__condition__in=condition_list)
        
        # Filter models that match the criteria
        queryset = queryset.filter(units_filter).distinct()
        
        # Annotate with min price for each model
        queryset = queryset.annotate(
            min_price=Min('listings__units__price', filter=Q(
                listings__status='active',
                listings__units__is_available=True,
                listings__units__is_sold=False
            ))
        )
        
        # Apply sorting
        if sort_by == 'price_low':
            queryset = queryset.order_by('min_price')
        elif sort_by == 'price_high':
            queryset = queryset.order_by('-min_price')
        elif sort_by == 'newest':
            queryset = queryset.order_by('-created_at')
        else:  # featured
            queryset = queryset.order_by('brand__name', 'name')
        
        # Serialize products with min_price
        products = []
        for model in queryset:
            data = ProductModelSerializer(model).data
            data['min_price'] = float(model.min_price) if model.min_price else 0
            products.append(data)
        
        # Get available brands for this category with counts
        brands = Brand.objects.filter(
            models__category=category,
            models__is_active=True,
            models__listings__status='active',
            models__listings__units__is_available=True,
            models__listings__units__is_sold=False
        ).annotate(
            product_count=Count('models', distinct=True)
        ).distinct().order_by('name')
        
        brands_data = [
            {
                'id': brand.id,
                'name': brand.name,
                'count': brand.product_count
            }
            for brand in brands
        ]
        
        # Get condition counts for this category
        condition_counts = ListingUnit.objects.filter(
            listing__model__category=category,
            listing__status='active',
            is_available=True,
            is_sold=False
        ).values('condition').annotate(count=Count('id'))
        
        conditions_data = {item['condition']: item['count'] for item in condition_counts}
        
        # Get price range for this category
        price_range = ListingUnit.objects.filter(
            listing__model__category=category,
            listing__status='active',
            is_available=True,
            is_sold=False
        ).aggregate(
            min_price=Min('price'),
            max_price=Max('price')
        )
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "products": products,
                "brands": brands_data,
                "conditions": conditions_data,
                "price_range": price_range,
                "total_count": len(products)
            },
            "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='detail')
    @handle_exceptions
    def product_detail(self, request, pk=None):  # Renamed from 'detail' to 'product_detail' to avoid naming conflict with detail=True parameter
        """
        Get detailed product information including:
        - Product model details
        - Available attributes for this product
        - Available attribute values from listing units
        """
        product_model = get_object_or_404(ProductModel, id=pk, is_active=True)
        
        # Serialize product model
        product_data = ProductModelSerializer(product_model).data
        
        # Get attributes for this product model
        model_attributes = ProductModelAttribute.objects.filter(
            product_model=product_model
        ).select_related('attribute')
        
        attributes_data = []
        for pm_attr in model_attributes:
            attr = pm_attr.attribute
            
            # Get unique values for this attribute from available listing units
            available_values = ListingUnitAttribute.objects.filter(
                listing_unit__listing__model=product_model,
                listing_unit__listing__status='active',
                listing_unit__is_available=True,
                listing_unit__is_sold=False,
                attribute=attr
            ).values_list('value', flat=True).distinct().order_by('value')
            
            attributes_data.append({
                'id': attr.id,
                'name': attr.name,
                'data_type': attr.data_type,
                'possible_values': attr.possible_values,
                'is_required': pm_attr.is_required,
                'is_filter': pm_attr.is_filter,
                'available_values': list(available_values)
            })
        
        # Get price range for this product
        price_range = ListingUnit.objects.filter(
            listing__model=product_model,
            listing__status='active',
            is_available=True,
            is_sold=False
        ).aggregate(
            min_price=Min('price'),
            max_price=Max('price')
        )
        
        # Get available conditions
        conditions = ListingUnit.objects.filter(
            listing__model=product_model,
            listing__status='active',
            is_available=True,
            is_sold=False
        ).values('condition').annotate(
            count=Count('id'),
            min_price=Min('price')
        ).order_by('condition')
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "product": product_data,
                "attributes": attributes_data,
                "price_range": price_range,
                "conditions": list(conditions)
            },
            "error": None
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'], url_path='available-units')
    @handle_exceptions
    def available_units(self, request, pk=None):
        """
        Get available listing units for a product based on selected attributes
        Query params:
         - condition: Filter by condition
         - attribute filters: Pass as attribute_<id>=<value>
        """
        product_model = get_object_or_404(ProductModel, id=pk, is_active=True)
        
        # Base queryset
        queryset = ListingUnit.objects.filter(
            listing__model=product_model,
            listing__status='active',
            is_available=True,
            is_sold=False
        ).select_related('listing', 'listing__refurbisher')
        
        # Apply condition filter
        condition = request.query_params.get('condition')
        if condition:
            queryset = queryset.filter(condition=condition)
        
        # Apply attribute filters
        attribute_filters = {}
        for key, value in request.query_params.items():
            if key.startswith('attribute_'):
                attr_id = key.replace('attribute_', '')
                attribute_filters[attr_id] = value
        
        # Filter by attributes
        for attr_id, attr_value in attribute_filters.items():
            queryset = queryset.filter(
                attributes__attribute_id=attr_id,
                attributes__value=attr_value
            )
        
        # Get distinct units (in case of multiple attribute filters)
        queryset = queryset.distinct().order_by('price')
        
        # Serialize with refurbisher details
        units_data = []
        for unit in queryset:
            unit_data = {
                'id': unit.id,
                'unit_number': unit.unit_number,
                'price': float(unit.price),
                'condition': unit.condition,
                'condition_display': unit.get_condition_display(),
                'refurbisher': {
                    'id': unit.listing.refurbisher.user_id,
                    'name': unit.listing.refurbisher.first_name,
                    'email': unit.listing.refurbisher.email
                },
                'attributes': [
                    {
                        'name': attr.attribute.name,
                        'value': attr.value
                    }
                    for attr in unit.attributes.all()
                ]
            }
            units_data.append(unit_data)
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "units": units_data,
                "total_count": len(units_data)
            },
            "error": None
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
    @check_refurbisher_profile()
    def create(self, request):
        """
        Create Listing with units and attributes.
        Expected payload:
        {
          "model_id": int,
          "units": [
            {
              "price": 12000,
              "condition": "excellent",
              "attributes": [{"attribute_id": 1, "value": "128GB"}, ...]
            }
          ]
        }
        """
        
        model_id = request.data.get('model_id')
        units = request.data.get('units', [])

        if not model_id:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Missing required field: model_id."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not units or len(units) == 0:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "At least one unit is required."
            }, status=status.HTTP_400_BAD_REQUEST)

        model = get_object_or_404(ProductModel, id=model_id)
        refurbisher = request.user

        # Total quantity is just the number of units (each unit = 1 device)
        total_quantity = len(units)

        # Create listing without price_per_unit and condition
        listing = Listing.objects.create(
            model=model,
            refurbisher=refurbisher,
            total_quantity=total_quantity
        )

        # Create units with individual prices and conditions
        for unit_data in units:
            unit_price = unit_data.get('price')
            unit_condition = unit_data.get('condition')
            attributes = unit_data.get('attributes', [])
            
            if not unit_price:
                listing.delete()  # Rollback
                return Response({
                    "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                    "data": None, "error": "Price is required for each unit."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not unit_condition:
                listing.delete()  # Rollback
                return Response({
                    "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                    "data": None, "error": "Condition is required for each unit."
                }, status=status.HTTP_400_BAD_REQUEST)

            unit = ListingUnit.objects.create(
                listing=listing,
                price=unit_price,
                condition=unit_condition
            )

            # Create attributes for this unit
            for attr in attributes:
                attr_id = attr.get('attribute_id') or attr.get('id')
                if not attr_id:
                    continue
                attr_obj = get_object_or_404(AttributeMaster, id=attr_id)
                ListingUnitAttribute.objects.create(
                    listing_unit=unit,
                    attribute=attr_obj,
                    value=attr.get('value')
                )

        serializer = ListingSerializer(listing)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_201_CREATED)
    
    @handle_exceptions
    @check_refurbisher_profile()
    def list(self, request):
        model_id = request.query_params.get('model_id')
        status_filter = request.query_params.get('status')

        queryset = Listing.objects.filter(refurbisher=request.user).select_related(
            'model', 'model__brand', 'refurbisher'
        ).prefetch_related('units', 'units__attributes')
        
        if model_id:
            queryset = queryset.filter(model_id=model_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        serializer = ListingSerializer(queryset, many=True)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    def retrieve(self, request, pk=None):
        """Get single listing details with all units"""
        listing = get_object_or_404(
            Listing.objects.select_related('model', 'model__brand', 'refurbisher')
            .prefetch_related('units', 'units__attributes', 'units__attributes__attribute'),
            pk=pk
        )
        serializer = ListingSerializer(listing)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role='refurbisher')
    def update(self, request, pk=None):
        """Update listing (partial update supported)"""
        listing = get_object_or_404(Listing, pk=pk, refurbisher=request.user)
        
        # Allow updating status only
        if 'status' in request.data:
            listing.status = request.data['status']
        
        listing.save()
        serializer = ListingSerializer(listing)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role='refurbisher')
    def destroy(self, request, pk=None):
        """Delete listing and all its units"""
        listing = get_object_or_404(Listing, pk=pk, refurbisher=request.user)
        listing.delete()
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": None, "error": None
        }, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    @handle_exceptions
    @check_authentication(required_role='refurbisher')
    def add_unit(self, request, pk=None):
        """Add a new unit to existing listing"""
        listing = get_object_or_404(Listing, pk=pk, refurbisher=request.user)
        
        price = request.data.get('price')
        condition = request.data.get('condition')
        attributes = request.data.get('attributes', [])
        
        if not price:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Price is required."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not condition:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Condition is required."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create unit
        unit = ListingUnit.objects.create(
            listing=listing,
            price=price,
            condition=condition
        )
        
        # Create attributes
        for attr in attributes:
            attr_id = attr.get('attribute') or attr.get('attribute_id')
            if not attr_id:
                continue
            attr_obj = get_object_or_404(AttributeMaster, id=attr_id)
            ListingUnitAttribute.objects.create(
                listing_unit=unit,
                attribute=attr_obj,
                value=attr.get('value')
            )
        
        # Update listing total quantity
        listing.total_quantity = listing.units.count()
        listing.save()
        
        serializer = ListingUnitSerializer(unit)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='update_unit/(?P<unit_id>[^/.]+)')
    @handle_exceptions
    @check_authentication(required_role='refurbisher')
    def update_unit(self, request, pk=None, unit_id=None):
        """Update a specific unit"""
        listing = get_object_or_404(Listing, pk=pk, refurbisher=request.user)
        unit = get_object_or_404(ListingUnit, pk=unit_id, listing=listing)
        
        # Update allowed fields
        if 'is_available' in request.data:
            unit.is_available = request.data['is_available']
        if 'is_sold' in request.data:
            unit.is_sold = request.data['is_sold']
        if 'price' in request.data:
            unit.price = request.data['price']
        if 'condition' in request.data:
            unit.condition = request.data['condition']
        
        # Update attributes if provided
        if 'attributes' in request.data:
            # Delete existing attributes
            unit.attributes.all().delete()
            
            # Create new attributes
            for attr in request.data['attributes']:
                attr_id = attr.get('attribute') or attr.get('attribute_id')
                if not attr_id:
                    continue
                attr_obj = get_object_or_404(AttributeMaster, id=attr_id)
                ListingUnitAttribute.objects.create(
                    listing_unit=unit,
                    attribute=attr_obj,
                    value=attr.get('value')
                )
        
        unit.save()
        
        serializer = ListingUnitSerializer(unit)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": serializer.data, "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], url_path='delete_unit/(?P<unit_id>[^/.]+)')
    @handle_exceptions
    @check_authentication(required_role='refurbisher')
    def delete_unit(self, request, pk=None, unit_id=None):
        """Delete a specific unit"""
        listing = get_object_or_404(Listing, pk=pk, refurbisher=request.user)
        unit = get_object_or_404(ListingUnit, pk=unit_id, listing=listing)
        
        unit.delete()
        
        # Update listing total quantity
        listing.total_quantity = listing.units.count()
        listing.save()
        
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": None, "error": None
        }, status=status.HTTP_204_NO_CONTENT)


class ListingUnitViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication(required_role='refurbisher')
    def create(self, request):
        """
        Create ListingUnit and its ListingUnitAttribute rows.
        Expected payload:
        {
          "listing_id": int,
          "price": decimal,
          "condition": string,
          "attributes": [ {"attribute_id": 1, "value": "128GB"}, ... ]
        }
        """
        listing_id = request.data.get('listing_id')
        price = request.data.get('price')
        condition = request.data.get('condition')
        attributes = request.data.get('attributes', [])

        if not price or not condition:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Price and condition are required."
            }, status=status.HTTP_400_BAD_REQUEST)

        listing = get_object_or_404(Listing, id=listing_id, refurbisher=request.user)

        unit = ListingUnit.objects.create(
            listing=listing,
            price=price,
            condition=condition
        )

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


class Seed_oldDataViewSet(viewsets.ViewSet):
    """
    Seed initial data for testing.
    Usage: POST /api/products/seed-data/seed/
    """

    @handle_exceptions
    def list(self, request):
        """Seed initial brands, models, and attributes"""
        
        # Create Brands
        brands_data = [
            'Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi',
            'Dell', 'HP', 'Lenovo', 'Asus', 'Microsoft'
        ]
        
        brands = {}
        for brand_name in brands_data:
            brand, _ = Brand.objects.get_or_create(name=brand_name)
            brands[brand_name] = brand
        
        # Create Attributes for each category
        mobile_attrs = [
            ('Color', 'choice', ['Space Gray', 'Silver', 'Gold', 'Blue', 'Green', 'Red', 'Black', 'White']),
            ('Storage', 'choice', ['64GB', '128GB', '256GB', '512GB', '1TB']),
            ('RAM', 'choice', ['4GB', '6GB', '8GB', '12GB', '16GB']),
        ]
        
        laptop_attrs = [
            ('RAM', 'choice', ['8GB', '16GB', '32GB', '64GB']),
            ('Storage', 'choice', ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD']),
            ('Processor', 'choice', ['Intel i5', 'Intel i7', 'Intel i9', 'AMD Ryzen 5', 'AMD Ryzen 7', 'M1', 'M2', 'M3']),
            ('GPU', 'choice', ['Integrated', 'NVIDIA GTX 1650', 'NVIDIA RTX 3060', 'NVIDIA RTX 4070', 'AMD Radeon']),
            ('Screen Size', 'choice', ['13 inch', '14 inch', '15 inch', '16 inch', '17 inch']),
        ]
        
        tablet_attrs = [
            ('Color', 'choice', ['Space Gray', 'Silver', 'Gold', 'Blue', 'Green']),
            ('Storage', 'choice', ['64GB', '128GB', '256GB', '512GB', '1TB']),
            ('Screen Size', 'choice', ['10 inch', '11 inch', '12.9 inch']),
        ]
        
        # Create AttributeMaster entries
        attr_masters = {}
        
        for name, data_type, values in mobile_attrs:
            attr, _ = AttributeMaster.objects.get_or_create(
                category='mobile',
                name=name,
                defaults={'data_type': data_type, 'possible_values': values}
            )
            attr_masters[f'mobile_{name}'] = attr
        
        for name, data_type, values in laptop_attrs:
            attr, _ = AttributeMaster.objects.get_or_create(
                category='laptop',
                name=name,
                defaults={'data_type': data_type, 'possible_values': values}
            )
            attr_masters[f'laptop_{name}'] = attr
        
        for name, data_type, values in tablet_attrs:
            attr, _ = AttributeMaster.objects.get_or_create(
                category='tablet',
                name=name,
                defaults={'data_type': data_type, 'possible_values': values}
            )
            attr_masters[f'tablet_{name}'] = attr
        
        # Create Product Models
        models_data = [
            # Mobile
            {'brand': 'Apple', 'name': 'iPhone 16 Pro', 'category': 'mobile'},
            {'brand': 'Apple', 'name': 'iPhone 15 Pro', 'category': 'mobile'},
            {'brand': 'Apple', 'name': 'iPhone 14', 'category': 'mobile'},
            {'brand': 'Samsung', 'name': 'Galaxy S24 Ultra', 'category': 'mobile'},
            {'brand': 'Samsung', 'name': 'Galaxy S23', 'category': 'mobile'},
            {'brand': 'Google', 'name': 'Pixel 8 Pro', 'category': 'mobile'},
            {'brand': 'OnePlus', 'name': 'OnePlus 12', 'category': 'mobile'},
            
            # Laptop
            {'brand': 'Apple', 'name': 'MacBook Air M3', 'category': 'laptop'},
            {'brand': 'Apple', 'name': 'MacBook Pro 14" M3', 'category': 'laptop'},
            {'brand': 'Dell', 'name': 'XPS 13', 'category': 'laptop'},
            {'brand': 'Dell', 'name': 'XPS 15', 'category': 'laptop'},
            {'brand': 'HP', 'name': 'Spectre x360', 'category': 'laptop'},
            {'brand': 'Lenovo', 'name': 'ThinkPad X1 Carbon', 'category': 'laptop'},
            {'brand': 'Asus', 'name': 'ZenBook 14', 'category': 'laptop'},
            
            # Tablet
            {'brand': 'Apple', 'name': 'iPad Pro 12.9"', 'category': 'tablet'},
            {'brand': 'Apple', 'name': 'iPad Air', 'category': 'tablet'},
            {'brand': 'Samsung', 'name': 'Galaxy Tab S9', 'category': 'tablet'},
            {'brand': 'Microsoft', 'name': 'Surface Pro 9', 'category': 'tablet'},
        ]
        
        created_models = []
        for model_data in models_data:
            brand = brands[model_data['brand']]
            model, created = ProductModel.objects.get_or_create(
                brand=brand,
                name=model_data['name'],
                category=model_data['category'],
                defaults={'is_active': True}
            )
            
            if created:
                created_models.append(model)
                
                # Link attributes to this model
                if model.category == 'mobile':
                    ProductModelAttribute.objects.get_or_create(
                        product_model=model,
                        attribute=attr_masters['mobile_Color'],
                        defaults={'is_required': True}
                    )
                    ProductModelAttribute.objects.get_or_create(
                        product_model=model,
                        attribute=attr_masters['mobile_Storage'],
                        defaults={'is_required': True}
                    )
                    ProductModelAttribute.objects.get_or_create(
                        product_model=model,
                        attribute=attr_masters['mobile_RAM'],
                        defaults={'is_required': False}
                    )
                
                elif model.category == 'laptop':
                    ProductModelAttribute.objects.get_or_create(
                        product_model=model,
                        attribute=attr_masters['laptop_RAM'],
                        defaults={'is_required': True}
                    )
                    ProductModelAttribute.objects.get_or_create(
                        product_model=model,
                        attribute=attr_masters['laptop_Storage'],
                        defaults={'is_required': True}
                    )
                    ProductModelAttribute.objects.get_or_create(
                        product_model=model,
                        attribute=attr_masters['laptop_Processor'],
                        defaults={'is_required': True}
                    )
                    ProductModelAttribute.objects.get_or_create(
                        product_model=model,
                        attribute=attr_masters['laptop_GPU'],
                        defaults={'is_required': False}
                    )
                    ProductModelAttribute.objects.get_or_create(
                        product_model=model,
                        attribute=attr_masters['laptop_Screen Size'],
                        defaults={'is_required': False}
                    )
                
                elif model.category == 'tablet':
                    ProductModelAttribute.objects.get_or_create(
                        product_model=model,
                        attribute=attr_masters['tablet_Color'],
                        defaults={'is_required': True}
                    )
                    ProductModelAttribute.objects.get_or_create(
                        product_model=model,
                        attribute=attr_masters['tablet_Storage'],
                        defaults={'is_required': True}
                    )
                    ProductModelAttribute.objects.get_or_create(
                        product_model=model,
                        attribute=attr_masters['tablet_Screen Size'],
                        defaults={'is_required': False}
                    )
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "message": "Seed data created successfully",
                "brands_created": len(brands),
                "models_created": len(created_models),
                "attributes_created": len(attr_masters)
            },
            "error": None
        }, status=status.HTTP_201_CREATED)


class SeedDataViewSet(viewsets.ViewSet):
    """
    Seed data directly from 'device_catalog_parent_child' Excel file.
    """

    @handle_exceptions
    def list(self, request):
        file_path = r"C:\Users\Divyam Shah\OneDrive\Desktop\Dynamic Labz\Clients\Clients\EcoReco\RefurBazaar\RefurBazaar\Product\Copy of device_catalog_parent_child(1) (1).xlsx"
        df = pd.read_excel(file_path, sheet_name="Sheet1")

        df = df.fillna('')

        created_brands, created_models, created_attrs = 0, 0, 0

        with transaction.atomic():
            for _, meta_row in df[df['row_type'] == 'META'].iterrows():
                brand_name = str(meta_row['brand']).strip()
                category = str(meta_row['category']).lower().strip()
                model_name = str(meta_row['model_name']).strip()
                processor = str(meta_row['processor']).strip()
                generation = str(meta_row['generation']).strip()
                os = str(meta_row['os']).strip()
                screen_size = str(meta_row['screen_size']).strip()
                touch = str(meta_row['touch']).strip()
                accessories = str(meta_row['accessories']).strip()
                description = str(meta_row['description']).strip()

                if not brand_name or not model_name:
                    continue

                # Create Brand
                brand, _ = Brand.objects.get_or_create(name=brand_name)
                created_brands += 1

                # Create ProductModel
                product, created = ProductModel.objects.get_or_create(
                    brand=brand,
                    name=model_name,
                    category=category,
                    defaults={
                        "description": description or f"{brand_name} {model_name} {processor} {generation}",
                        "is_active": True
                    }
                )
                if created:
                    created_models += 1

                # Create common attributes (processor, generation, etc.)
                common_attrs = {
                    "Processor": processor,
                    "Generation": generation,
                    "OS": os,
                    "Screen Size": screen_size,
                    "Touch": touch,
                    "Accessories": accessories,
                }

                for attr_name, attr_value in common_attrs.items():
                    if not attr_value:
                        continue

                    attr_obj, _ = AttributeMaster.objects.get_or_create(
                        category=category,
                        name=attr_name,
                        defaults={
                            "data_type": "choice",
                            "possible_values": [attr_value],
                            "is_active": True,
                        }
                    )
                    if attr_value not in attr_obj.possible_values:
                        attr_obj.possible_values.append(attr_value)
                        attr_obj.save(update_fields=["possible_values"])
                        created_attrs += 1

                    ProductModelAttribute.objects.get_or_create(
                        product_model=product,
                        attribute=attr_obj,
                        defaults={"is_required": False}
                    )

                # Add all child ATTR rows for this model
                child_rows = df[(df['row_type'] == 'ATTR') & (df['model_name'] == model_name)]
                for _, attr_row in child_rows.iterrows():
                    ram = str(attr_row['ram']).strip()
                    storage = str(attr_row['storage']).strip()
                    color = str(attr_row['color']).strip()
                    grade = str(attr_row['Grade']).strip()

                    for attr_name, attr_value in {
                        "RAM": ram,
                        "Storage": storage,
                        "Color": color,
                        "Grade": grade
                    }.items():
                        if not attr_value:
                            continue

                        attr_obj, _ = AttributeMaster.objects.get_or_create(
                            category=category,
                            name=attr_name,
                            defaults={
                                "data_type": "choice",
                                "possible_values": [attr_value],
                                "is_active": True,
                            }
                        )

                        if attr_value not in attr_obj.possible_values:
                            attr_obj.possible_values.append(attr_value)
                            attr_obj.save(update_fields=["possible_values"])
                            created_attrs += 1

                        ProductModelAttribute.objects.get_or_create(
                            product_model=product,
                            attribute=attr_obj,
                            defaults={"is_required": True}
                        )

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "message": "Excel seed data processed successfully.",
                "brands_created": created_brands,
                "models_created": created_models,
                "attributes_created_or_updated": created_attrs,
            },
            "error": None
        }, status=status.HTTP_201_CREATED)

"""
Admin ViewSet for creating default ProductModels (devices) with their attributes.
Add this to your Product app's views.py
"""


class ProductModelAdminViewSet(viewsets.ViewSet):
    """
    Admin endpoints for creating and managing default product models.
    Only admins can create products.
    """

    @handle_exceptions
    @check_authentication(required_role='admin')
    def create(self, request):
        """
        Create a new ProductModel with attributes.
        Expected payload:
        {
            "brand_id": 1,
            "name": "iPhone 16 Pro",
            "category": "mobile",
            "description": "Latest iPhone with Pro features",
            "release_year": 2024,
            "image": <file>,  # Optional, multipart form data
            "attributes": [
                {
                    "attribute_id": 1,
                    "is_required": true
                },
                {
                    "attribute_id": 2,
                    "is_required": true
                }
            ]
        }
        """
        try:
            brand_id = request.data.get('brand_id')
            name = request.data.get('name')
            category = request.data.get('category')
            description = request.data.get('description', '')
            release_year = request.data.get('release_year')
            image = request.FILES.get('image') if hasattr(request, 'FILES') else None
            attributes = request.data.getlist('attributes') if isinstance(request.data.get('attributes'), list) else []

            # Validation
            if not brand_id or not name or not category:
                return Response({
                    "success": False,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": None,
                    "error": "Missing required fields: brand_id, name, category"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check if brand exists
            brand = get_object_or_404(Brand, id=brand_id)

            # Check if product model already exists
            existing = ProductModel.objects.filter(
                brand=brand,
                name=name,
                category=category
            ).first()

            if existing:
                return Response({
                    "success": False,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": None,
                    "error": f"Product model '{name}' already exists for this brand and category"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create ProductModel
            product_model = ProductModel.objects.create(
                brand=brand,
                name=name,
                category=category,
                description=description,
                release_year=release_year if release_year else None,
                image=image,
                is_active=True
            )

            # Parse and add attributes
            # Handle both JSON array strings and dict objects
            import json
            if attributes:
                # If attributes is a list of strings (from form data), parse them
                if isinstance(attributes, list) and len(attributes) > 0 and isinstance(attributes[0], str):
                    try:
                        # Try to parse as JSON
                        parsed_attrs = json.loads(attributes[0])
                        attributes = parsed_attrs if isinstance(parsed_attrs, list) else [parsed_attrs]
                    except:
                        # If it fails, treat as single attribute dict string
                        attributes = []

            for attr_data in attributes:
                attr_id = attr_data.get('attribute_id')
                is_required = attr_data.get('is_required', False)

                if not attr_id:
                    continue

                # Verify attribute exists
                attribute = get_object_or_404(AttributeMaster, id=attr_id)

                # Create ProductModelAttribute link
                ProductModelAttribute.objects.get_or_create(
                    product_model=product_model,
                    attribute=attribute,
                    defaults={'is_required': is_required}
                )

            serializer = ProductModelSerializer(product_model)
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": serializer.data,
                "error": None
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @handle_exceptions
    @check_authentication(required_role='admin')
    def update(self, request, pk=None):
        """
        Update an existing ProductModel and its attributes.
        Partial updates are supported.
        """
        product_model = get_object_or_404(ProductModel, id=pk)

        # Update basic fields
        if 'name' in request.data:
            product_model.name = request.data['name']
        if 'description' in request.data:
            product_model.description = request.data['description']
        if 'release_year' in request.data:
            product_model.release_year = request.data['release_year']
        if 'is_active' in request.data:
            product_model.is_active = request.data['is_active']

        # Handle image upload
        if 'image' in request.FILES:
            product_model.image = request.FILES['image']

        product_model.save()

        # Handle attributes update if provided
        if 'attributes' in request.data:
            attributes = request.data.get('attributes')

            # Parse if needed
            import json
            if isinstance(attributes, str):
                try:
                    attributes = json.loads(attributes)
                except:
                    attributes = []

            # Remove existing attributes
            ProductModelAttribute.objects.filter(product_model=product_model).delete()

            # Add new attributes
            for attr_data in attributes:
                attr_id = attr_data.get('attribute_id')
                is_required = attr_data.get('is_required', False)

                if not attr_id:
                    continue

                attribute = get_object_or_404(AttributeMaster, id=attr_id)
                ProductModelAttribute.objects.get_or_create(
                    product_model=product_model,
                    attribute=attribute,
                    defaults={'is_required': is_required}
                )

        serializer = ProductModelSerializer(product_model)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role='admin')
    def destroy(self, request, pk=None):
        """
        Delete a ProductModel and all its associations.
        """
        product_model = get_object_or_404(ProductModel, id=pk)
        product_model.delete()

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": None,
            "error": None
        }, status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    @handle_exceptions
    def list_by_category(self, request):
        """
        Get all ProductModels for a specific category.
        Query params: category (mobile, laptop, tablet, accessory)
        """
        category = request.query_params.get('category')

        if not category:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "category parameter is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        products = ProductModel.objects.filter(category=category).order_by('brand__name', 'name')
        serializer = ProductModelSerializer(products, many=True)

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    @handle_exceptions
    def get_attributes_for_category(self, request):
        """
        Get all available attributes for a category.
        Query params: category (mobile, laptop, tablet, accessory)
        """
        category = request.query_params.get('category')

        if not category:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "category parameter is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        attributes = AttributeMaster.objects.filter(
            category=category,
            is_active=True
        ).order_by('display_order', 'name')

        attrs_data = [
            {
                'id': attr.id,
                'name': attr.name,
                'data_type': attr.data_type,
                'possible_values': attr.possible_values,
                'display_order': attr.display_order
            }
            for attr in attributes
        ]

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": attrs_data,
            "error": None
        }, status=status.HTTP_200_OK)
