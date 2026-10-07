"""Admin APIs for commission configuration and full listing/unit management."""
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from Product.models import (
    CommissionConfig, COMMISSION_TYPE_CHOICES, Listing, ListingUnit,
    ListingUnitAttribute, ProductModel, ProductModelAttribute, AttributeMaster,
)
from Product.serializers import ListingSerializer, ListingUnitSerializer
from Product.views import _copy_fixed_attributes_to_unit
from utils.decorators import handle_exceptions, check_authentication

COMMISSION_TYPES = {c[0] for c in COMMISSION_TYPE_CHOICES}
ADMIN_CTX = {'pricing_view': 'admin'}


def _ok(data=None, code=status.HTTP_200_OK):
    return Response({
        "success": True, "user_not_logged_in": False, "user_unauthorized": False,
        "data": data, "error": None,
    }, status=code)


def _fail(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({
        "success": False, "user_not_logged_in": False, "user_unauthorized": False,
        "data": None, "error": message,
    }, status=code)


def _money(value, label, allow_zero=True):
    try:
        amount = Decimal(str(value)).quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError(f"{label} must be a valid number")
    if amount < 0 or (amount == 0 and not allow_zero):
        raise ValueError(f"{label} must be greater than 0" if not allow_zero else f"{label} cannot be negative")
    return amount


def _validate_rule(ctype, value):
    if ctype not in COMMISSION_TYPES:
        raise ValueError("Commission type must be 'percentage' or 'flat'")
    amount = _money(value, "Commission value")
    if ctype == 'percentage' and amount > 100:
        raise ValueError("Percentage commission cannot exceed 100")
    return amount


class AdminPricingViewSet(viewsets.ViewSet):
    """Commission defaults per category (plus a global 'default' row)."""

    @handle_exceptions
    @check_authentication(required_role='admin')
    def list(self, request):
        configs = {c.category: c for c in CommissionConfig.objects.all()}
        stats = {
            row['listing__model__category']: row
            for row in ListingUnit.objects.values('listing__model__category').annotate(
                units=Count('id'),
                overrides=Count('id', filter=Q(commission_type__isnull=False, commission_value__isnull=False)),
            )
        }

        def row(key, label):
            cfg = configs.get(key)
            stat = stats.get(key, {})
            return {
                'category': key,
                'label': label,
                'configured': cfg is not None,
                'commission_type': cfg.commission_type if cfg else 'percentage',
                'value': str(cfg.value) if cfg else '0.00',
                'is_active': cfg.is_active if cfg else True,
                'updated_at': cfg.updated_at if cfg else None,
                'unit_count': stat.get('units', 0),
                'override_count': stat.get('overrides', 0),
            }

        rows = [row(CommissionConfig.DEFAULT_KEY, 'Default (all other categories)')]
        rows += [row(key, label) for key, label in ProductModel.CATEGORY_CHOICES]
        return _ok(rows)

    @handle_exceptions
    @check_authentication(required_role='admin')
    def create(self, request):
        """Create or update the commission rule for a category."""
        category = request.data.get('category')
        valid = {k for k, _ in ProductModel.CATEGORY_CHOICES} | {CommissionConfig.DEFAULT_KEY}
        if category not in valid:
            return _fail("Unknown category")
        try:
            value = _validate_rule(request.data.get('commission_type'), request.data.get('value'))
        except ValueError as e:
            return _fail(str(e))

        cfg, _ = CommissionConfig.objects.update_or_create(
            category=category,
            defaults={
                'commission_type': request.data['commission_type'],
                'value': value,
                'is_active': bool(request.data.get('is_active', True)),
            },
        )
        return _ok({'category': cfg.category, 'commission_type': cfg.commission_type,
                    'value': str(cfg.value), 'is_active': cfg.is_active})

    @handle_exceptions
    @check_authentication(required_role='admin')
    def destroy(self, request, pk=None):
        """Remove a category rule so it falls back to the default row."""
        CommissionConfig.objects.filter(category=pk).delete()
        return _ok({'category': pk})

    @action(detail=False, methods=['post'], url_path='recalculate')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def recalculate(self, request):
        """Re-price existing, unsold units with the current rules.

        Body: {category: 'mobile' | 'all'}. Units keep their refurbisher price;
        only commission and the customer-facing price are recomputed.
        """
        category = request.data.get('category') or 'all'
        units = ListingUnit.objects.filter(is_sold=False).select_related('listing__model')
        if category != 'all':
            units = units.filter(listing__model__category=category)

        changed = 0
        with transaction.atomic():
            for unit in units:
                before = unit.price
                unit.apply_commission()
                if unit.price != before:
                    unit.save(update_fields=['refurbisher_price', 'platform_commission', 'price'])
                    changed += 1
        return _ok({'checked': units.count(), 'updated': changed})


class AdminListingManageViewSet(viewsets.ViewSet):
    """Admin can edit everything on a listing and its units. pk = listing_id."""

    def _listing(self, pk):
        return get_object_or_404(
            Listing.objects.select_related('model__brand', 'refurbisher').prefetch_related('units__attributes__attribute'),
            listing_id=pk,
        )

    def _meta(self, listing):
        attr_defs = ProductModelAttribute.objects.filter(
            product_model=listing.model).select_related('attribute').order_by('id')
        ctype, cvalue = CommissionConfig.resolve(listing.model.category)
        return {
            'attribute_defs': [{
                'attribute_id': p.attribute_id,
                'name': p.attribute.name,
                'is_required': p.is_required,
                'data_type': p.data_type,
                'possible_values': p.possible_values if hasattr(p, 'possible_values') else None,
                'default_value': p.default_value,
            } for p in attr_defs],
            'category_commission': {'type': ctype, 'value': str(cvalue)},
            'conditions': [{'value': v, 'label': l} for v, l in ListingUnit.CONDITION_CHOICES],
            'statuses': [{'value': v, 'label': l} for v, l in Listing.STATUS_CHOICES]
            if hasattr(Listing, 'STATUS_CHOICES') else [],
        }

    def _payload(self, listing):
        listing = self._listing(listing.listing_id)
        data = ListingSerializer(listing, context=ADMIN_CTX).data
        data['meta'] = self._meta(listing)
        return data

    @handle_exceptions
    @check_authentication(required_role='admin')
    def retrieve(self, request, pk=None):
        return _ok(self._payload(self._listing(pk)))

    @handle_exceptions
    @check_authentication(required_role='admin')
    def partial_update(self, request, pk=None):
        listing = self._listing(pk)
        new_status = request.data.get('status')
        if new_status is not None:
            valid = {c[0] for c in Listing._meta.get_field('status').choices}
            if valid and new_status not in valid:
                return _fail("Invalid status")
            listing.status = new_status
            listing.save()
        return _ok(self._payload(listing))

    @handle_exceptions
    @check_authentication(required_role='admin')
    def destroy(self, request, pk=None):
        self._listing(pk).delete()
        return _ok({'listing_id': pk})

    # ── units ────────────────────────────────────────────────────────────
    def _apply_unit_data(self, unit, data):
        """Apply admin edits to a unit. Raises ValueError on bad input."""
        touch_price = False

        if 'refurbisher_price' in data:
            unit.refurbisher_price = _money(data['refurbisher_price'], "Refurbisher price", allow_zero=False)
            touch_price = True

        if 'commission_type' in data or 'commission_value' in data:
            ctype = data.get('commission_type')
            if ctype in (None, '', 'default'):
                unit.commission_type, unit.commission_value = None, None
            else:
                unit.commission_value = _validate_rule(ctype, data.get('commission_value'))
                unit.commission_type = ctype
            touch_price = True

        if 'condition' in data:
            if data['condition'] not in {c[0] for c in ListingUnit.CONDITION_CHOICES}:
                raise ValueError("Invalid condition")
            unit.condition = data['condition']

        if 'is_available' in data:
            unit.is_available = bool(data['is_available'])
        if 'is_sold' in data:
            unit.is_sold = bool(data['is_sold'])

        if touch_price:
            unit.apply_commission()

    def _replace_attributes(self, unit, attributes):
        valid_ids = set(ProductModelAttribute.objects.filter(
            product_model=unit.listing.model).values_list('attribute_id', flat=True))
        cleaned = {}
        for a in attributes or []:
            attr_id = a.get('attribute_id') or a.get('attribute')
            value = str(a.get('value', '')).strip()
            if not attr_id or int(attr_id) not in valid_ids:
                raise ValueError("Attribute does not belong to this product model")
            if value:
                cleaned[int(attr_id)] = value
        unit.attributes.all().delete()
        for attr_id, value in cleaned.items():
            ListingUnitAttribute.objects.create(
                listing_unit=unit, attribute=AttributeMaster.objects.get(pk=attr_id), value=value)
        _copy_fixed_attributes_to_unit(unit, unit.listing.model)

    @action(detail=True, methods=['post'], url_path='add-unit')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def add_unit(self, request, pk=None):
        listing = self._listing(pk)
        data = request.data
        if 'refurbisher_price' not in data:
            return _fail("Refurbisher price is required")
        with transaction.atomic():
            unit = ListingUnit(listing=listing, condition=data.get('condition') or 'good',
                               refurbisher_price=Decimal('0'), price=Decimal('0'))
            try:
                self._apply_unit_data(unit, data)
                unit.apply_commission()
                unit.save()  # new unit: save() prices it, using the override if set
                self._replace_attributes(unit, data.get('attributes'))
            except ValueError as e:
                transaction.set_rollback(True)
                return _fail(str(e))
            listing.total_quantity = listing.units.count()
            listing.save()
        return _ok(self._payload(listing), status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch', 'delete'], url_path=r'units/(?P<unit_id>[0-9]+)')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def unit_detail(self, request, pk=None, unit_id=None):
        listing = self._listing(pk)
        unit = get_object_or_404(ListingUnit, pk=unit_id, listing=listing)

        if request.method == 'DELETE':
            unit.delete()
            listing.total_quantity = listing.units.count()
            listing.save()
            return _ok(self._payload(listing))

        with transaction.atomic():
            try:
                self._apply_unit_data(unit, request.data)
                unit.save()
                if 'attributes' in request.data:
                    self._replace_attributes(unit, request.data.get('attributes'))
            except ValueError as e:
                transaction.set_rollback(True)
                return _fail(str(e))
        return _ok(self._payload(listing))
