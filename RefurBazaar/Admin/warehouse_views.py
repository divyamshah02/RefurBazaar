from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from UserDetail.models import User, CompanyProfile
from UserDetail.serializers import CompanyProfileSerializer
from utils.decorators import handle_exceptions, check_authentication
from utils.shiprocket_api import ShiprocketClient, ShiprocketAPIException


class RefurbisherWarehouseViewSet(viewsets.ViewSet):
    """
    Kept separate from AdminDashboardViewSet on purpose: this is the ONLY place
    that talks to ShipRocket to register/refresh a refurbisher's warehouse
    (pickup location), so it can be called once right after approval, and
    re-called later (e.g. to retry a failed attempt or after an address change)
    without touching any other admin flow.
    """

    @action(detail=True, methods=['post'], url_path='create-warehouse')
    @handle_exceptions
    @check_authentication(required_role='admin')
    def create_warehouse(self, request, pk=None):
        """Register the refurbisher's business address as a ShipRocket pickup location."""
        refurbisher = get_object_or_404(User, user_id=pk, role='refurbisher')
        profile = getattr(refurbisher, 'company_profile', None)

        if not profile:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "This refurbisher has no company profile"
            }, status=status.HTTP_404_NOT_FOUND)

        if not profile.is_approved:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Refurbisher must be approved before a warehouse can be created"
            }, status=status.HTTP_400_BAD_REQUEST)

        force = str(request.data.get('force', '')).lower() in ('1', 'true', 'yes')
        if profile.shiprocket_warehouse_created and not force:
            return Response({
                "success": True, "user_not_logged_in": False, "user_unauthorized": False,
                "data": CompanyProfileSerializer(profile).data,
                "error": None,
                "message": "Warehouse already created. Pass force=true to re-register."
            }, status=status.HTTP_200_OK)

        required_fields = {
            "address_line_1": profile.address_line_1,
            "city": profile.city,
            "state": profile.state,
            "pincode": profile.pincode,
            "contact_number": profile.contact_number,
        }
        missing = [k for k, v in required_fields.items() if not v]
        if missing:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None,
                "error": f"Refurbisher profile is missing required address fields: {', '.join(missing)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        pickup_code = profile.shiprocket_pickup_code or f"RB{refurbisher.user_id}"
        address = profile.address_line_1
        address_2 = profile.address_line_2 or ""

        try:
            client = ShiprocketClient()
            response = client.add_pickup_location(
                pickup_location=pickup_code,
                name=(profile.company_name or f"{profile.first_name or ''} {profile.last_name or ''}".strip() or refurbisher.user_id),
                email=profile.email or refurbisher.email,
                phone=profile.contact_number,
                address=address,
                address_2=address_2,
                city=profile.city,
                state=profile.state,
                pin_code=profile.pincode,
            )
        except ShiprocketAPIException as e:
            profile.shiprocket_warehouse_error = str(e)
            profile.save(update_fields=['shiprocket_warehouse_error'])
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": f"ShipRocket warehouse creation failed: {e}"
            }, status=status.HTTP_502_BAD_GATEWAY)

        profile.shiprocket_pickup_code = pickup_code
        profile.shiprocket_warehouse_created = True
        profile.shiprocket_warehouse_created_at = timezone.now()
        profile.shiprocket_warehouse_response = response if isinstance(response, dict) else {}
        profile.shiprocket_warehouse_error = None
        profile.save(update_fields=[
            'shiprocket_pickup_code', 'shiprocket_warehouse_created',
            'shiprocket_warehouse_created_at', 'shiprocket_warehouse_response',
            'shiprocket_warehouse_error',
        ])

        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": CompanyProfileSerializer(profile).data, "error": None
        }, status=status.HTTP_201_CREATED)
