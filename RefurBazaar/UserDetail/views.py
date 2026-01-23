from rest_framework import status, viewsets
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import login
from datetime import timedelta
import random

from .models import *
from .serializers import *
from utils.decorators import *


class OtpAuthViewSet(viewsets.ViewSet):
    @handle_exceptions
    def create(self, request):
        """Generate OTP"""
        mobile = request.data.get("mobile")
        if not mobile:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Mobile number is required."
            }, status=status.HTTP_400_BAD_REQUEST)

        otp = ''.join(random.choices('0123456789', k=6))
        print(f"OTP: {otp} to {mobile}")
        otp_obj = OTPVerification.objects.create(
            mobile=mobile, otp=otp,
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": {"otp_id": otp_obj.id, "otp": otp}, "error": None
        }, status=status.HTTP_201_CREATED)

    @handle_exceptions
    def update(self, request, pk):
        """Verify OTP and Create/Update User"""
        otp_id = pk
        otp = request.data.get("otp")
        role = request.data.get("role")  # admin/customer/refurbisher

        if not otp_id or not otp or not role:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "otp_id, otp, and role are required."
            }, status=status.HTTP_400_BAD_REQUEST)

        otp_obj = OTPVerification.objects.filter(id=otp_id).first()
        if not otp_obj:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Invalid OTP ID."
            }, status=status.HTTP_404_NOT_FOUND)

        if otp_obj.is_verified or otp_obj.otp != otp or otp_obj.expires_at < timezone.now():
            return Response({
                "success": True, "user_not_logged_in": False, "user_unauthorized": False,
                "data": {"otp_verified": False, "message": "Invalid or expired OTP."},
                "error": None
            }, status=status.HTTP_200_OK)

        otp_obj.is_verified = True
        otp_obj.save()

        user, created = User.objects.get_or_create(
            contact_number=otp_obj.mobile,
            defaults={"role": role}
        )

        login(request, user)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": {"otp_verified": True, "user_id": user.user_id, "new_user": created},
            "error": None
        }, status=status.HTTP_200_OK)


class UserDetailViewSet(viewsets.ViewSet):
    @handle_exceptions
    @check_authentication()
    def list(self, request):
        """
        API: Get user details
        If the user is a refurbisher, include their company profile as well.
        """
        user = request.user
        user_data = UserSerializer(user).data

        company_data = None
        if user.role == 'refurbisher':
            company = getattr(user, 'company_profile', None)
            if company:
                company_data = CompanyProfileSerializer(company).data

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "user": user_data,
                "company_profile": company_data
            },
            "error": None
        }, status=status.HTTP_200_OK)


    @handle_exceptions
    @check_authentication()
    def update(self, request, pk=None):
        """Update user profile and optionally create or update CompanyProfile"""
        user = request.user
        role = user.role

        # --- Update base user info ---
        user.first_name = request.data.get('first_name', user.first_name)
        user.last_name = request.data.get('last_name', user.last_name)
        user.email = request.data.get('email', user.email)
        user.alternate_phone = request.data.get('alternate_phone', user.alternate_phone)
        user.save()

        # --- If refurbisher, handle CompanyProfile ---
        if role == 'refurbisher':
            # Check if company profile exists for this refurbisher
            company_profile = getattr(user, 'company_profile', None)

            if company_profile:
                # Update existing profile - handle both FILES and DATA
                serializer = CompanyProfileSerializer(
                    company_profile, 
                    data=request.data, 
                    partial=True,
                    context={'request': request}
                )
            else:
                # Create new profile
                data = request.data.copy()
                data['user'] = user.id
                serializer = CompanyProfileSerializer(
                    data=data,
                    context={'request': request}
                )

            if serializer.is_valid():
                company_profile = serializer.save()
                # Check if profile is complete
                is_complete = company_profile.check_profile_completion()
            else:
                return Response({
                    "success": False,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": None,
                    "error": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

        # Return updated user and company profile data
        user_data = UserSerializer(user).data
        company_data = None
        if role == 'refurbisher':
            company = getattr(user, 'company_profile', None)
            if company:
                company_data = CompanyProfileSerializer(company).data

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "message": "User details updated successfully.",
                "user": user_data,
                "company_profile": company_data
            },
            "error": None
        }, status=status.HTTP_200_OK)
