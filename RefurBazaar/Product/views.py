from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import *
from .serializers import *
from utils.decorators import *


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
        Create Listing with units and attributes.
        Expected payload:
        {
          "model_id": int,
          "units": [
            {
              "quantity": 1,
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

        # Calculate total quantity and average price from units
        total_quantity = sum(unit.get('quantity', 1) for unit in units)
        
        # Calculate average price from all units
        total_price = sum(float(unit.get('price', 0)) * unit.get('quantity', 1) for unit in units)
        avg_price = total_price / total_quantity if total_quantity > 0 else 0
        
        # Use the first unit's condition as the listing condition (or default to 'good')
        listing_condition = units[0].get('condition', 'good') if units else 'good'

        # Create listing
        listing = Listing.objects.create(
            model=model,
            refurbisher=refurbisher,
            price_per_unit=avg_price,
            total_quantity=total_quantity,
            condition=listing_condition
        )

        # Create units and attributes
        for unit_data in units:
            quantity = unit_data.get('quantity', 1)
            unit_price = unit_data.get('price')
            attributes = unit_data.get('attributes', [])

            unit = ListingUnit.objects.create(
                listing=listing,
                quantity=quantity,
                price=unit_price
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
    def list(self, request):
        model_id = request.query_params.get('model_id')
        refurbisher_id = request.query_params.get('refurbisher_id')
        status_filter = request.query_params.get('status')

        queryset = Listing.objects.select_related(
            'model', 'model__brand', 'refurbisher'
        ).prefetch_related('units', 'units__attributes')
        
        if model_id:
            queryset = queryset.filter(model_id=model_id)
        if refurbisher_id:
            queryset = queryset.filter(refurbisher_id=refurbisher_id)
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
        
        # Allow updating specific fields
        allowed_fields = ['price_per_unit', 'condition', 'status']
        for field in allowed_fields:
            if field in request.data:
                setattr(listing, field, request.data[field])
        
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
        attributes = request.data.get('attributes', [])
        
        if not price:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Price is required."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create unit
        unit = ListingUnit.objects.create(
            listing=listing,
            quantity=1,
            price=price
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
        """Update a specific unit (mark as sold, change availability, etc.)"""
        listing = get_object_or_404(Listing, pk=pk, refurbisher=request.user)
        unit = get_object_or_404(ListingUnit, pk=unit_id, listing=listing)
        
        # Update allowed fields
        if 'is_available' in request.data:
            unit.is_available = request.data['is_available']
        if 'is_sold' in request.data:
            unit.is_sold = request.data['is_sold']
        if 'price' in request.data:
            unit.price = request.data['price']
        
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
          "quantity": int,
          "attributes": [ {"attribute_id": 1, "value": "128GB"}, ... ]
        }
        """
        listing_id = request.data.get('listing_id')
        attributes = request.data.get('attributes', [])
        quantity = request.data.get('quantity', 1)

        listing = get_object_or_404(Listing, id=listing_id, refurbisher=request.user)

        unit = ListingUnit.objects.create(listing=listing, quantity=quantity)

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


class SeedDataViewSet(viewsets.ViewSet):
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
