from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Q
from django.contrib.auth import login, authenticate
from datetime import timedelta
import secrets

OTP_RESEND_COOLDOWN_SECONDS = 30
OTP_MAX_ATTEMPTS = 5

from .models import *
from .serializers import *
from utils.decorators import *
from utils.email_service import send_otp_email


EMAIL_LOGIN_ROLES = ("customer", "refurbisher")


def _email_role_conflict(email, role):
    """Return an error message if `email` already belongs to an account with a different role."""
    existing_user = User.objects.filter(email__iexact=email).exclude(role=role).first()
    if not existing_user:
        return None
    return (
        f"This email is already registered as a {existing_user.get_role_display()} "
        f"(ID: {existing_user.user_id}), not as a {dict(User.ROLE_CHOICES).get(role, role.title())}. "
        f"Please log in through the {existing_user.get_role_display()} portal instead."
    )


def _find_refurbisher_by_email(email):
    """Find a refurbisher by login email, linking legacy mobile-only accounts via their company profile email."""
    user = User.objects.filter(email__iexact=email, role="refurbisher").first()
    if user:
        return user
    legacy = User.objects.filter(
        role="refurbisher", company_profile__email__iexact=email
    ).filter(Q(email__isnull=True) | Q(email="")).first()
    if legacy:
        legacy.email = email
        legacy.save(update_fields=["email"])
    return legacy


ADMIN_ONLY_PROFILE_FIELDS = (
    'is_approved', 'is_profile_complete', 'is_rejected', 'rejection_reason',
    'shiprocket_pickup_code', 'shiprocket_warehouse_created',
    'shiprocket_warehouse_created_at', 'shiprocket_warehouse_response',
    'shiprocket_warehouse_error', 'user',
)


class OtpAuthViewSet(viewsets.ViewSet):
    @handle_exceptions
    def create(self, request):
        """Generate OTP for email (customer/refurbisher) or mobile login."""
        mobile = request.data.get("mobile")
        email = (request.data.get("email") or "").strip().lower()
        role = (request.data.get("role") or "customer").strip().lower()

        if not mobile and not email:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Email or mobile number is required."
            }, status=status.HTTP_400_BAD_REQUEST)

        if email:
            import re
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
                return Response({
                    "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                    "data": None, "error": "Please enter a valid email address."
                }, status=status.HTTP_400_BAD_REQUEST)

            if role not in EMAIL_LOGIN_ROLES:
                return Response({
                    "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                    "data": None, "error": "Email login is only available for customers and refurbishers."
                }, status=status.HTTP_400_BAD_REQUEST)

            # If this email already belongs to an account with a different
            # role, say so instead of silently creating a duplicate identity.
            conflict = _email_role_conflict(email, role)
            if conflict:
                return Response({
                    "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                    "data": None, "error": conflict
                }, status=status.HTTP_400_BAD_REQUEST)

        destination_filter = {"email": email} if email else {"mobile": mobile}
        last_otp = OTPVerification.objects.filter(**destination_filter).order_by('-created_at').first()
        if last_otp and (timezone.now() - last_otp.created_at).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Please wait a few seconds before requesting another OTP."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        otp = ''.join(secrets.choice('0123456789') for _ in range(6))
        otp_obj = OTPVerification.objects.create(
            mobile=mobile or None, email=email or None, otp=otp,
            expires_at=timezone.now() + timedelta(minutes=5)
        )

        if email:
            if not send_otp_email(email, otp, purpose="login"):
                otp_obj.delete()
                return Response({
                    "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                    "data": None,
                    "error": "We could not send the verification email. Please try again in a moment."
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        else:
            print(f"OTP: {otp} to {mobile}")

        response_data = {"otp_id": otp_obj.id}
        if mobile and not email:
            response_data["otp"] = otp

        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": response_data, "error": None
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

        # Admins sign in with a password only; OTP can never grant admin access.
        if role not in EMAIL_LOGIN_ROLES:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": True,
                "data": None, "error": "OTP login is only available for customers and refurbishers."
            }, status=status.HTTP_403_FORBIDDEN)

        otp_obj = OTPVerification.objects.filter(id=otp_id).first()
        if not otp_obj:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Invalid OTP ID."
            }, status=status.HTTP_404_NOT_FOUND)

        if otp_obj.attempt_count >= OTP_MAX_ATTEMPTS:
            return Response({
                "success": True, "user_not_logged_in": False, "user_unauthorized": False,
                "data": {"otp_verified": False, "message": "Too many incorrect attempts. Please request a new OTP."},
                "error": None
            }, status=status.HTTP_200_OK)

        if otp_obj.is_verified or otp_obj.otp != otp or otp_obj.expires_at < timezone.now():
            otp_obj.attempt_count += 1
            otp_obj.save(update_fields=['attempt_count'])
            return Response({
                "success": True, "user_not_logged_in": False, "user_unauthorized": False,
                "data": {"otp_verified": False, "message": "Invalid or expired OTP."},
                "error": None
            }, status=status.HTTP_200_OK)

        if otp_obj.email:
            if role not in EMAIL_LOGIN_ROLES:
                return Response({
                    "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                    "data": None, "error": "Email login is only available for customers and refurbishers."
                }, status=status.HTTP_400_BAD_REQUEST)
            conflict = _email_role_conflict(otp_obj.email, role)
            if conflict:
                return Response({
                    "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                    "data": None, "error": conflict
                }, status=status.HTTP_400_BAD_REQUEST)

        if otp_obj.mobile and not otp_obj.email:
            existing_mobile_user = User.objects.filter(contact_number=otp_obj.mobile).first()
            if existing_mobile_user and existing_mobile_user.role != role:
                return Response({
                    "success": False, "user_not_logged_in": False, "user_unauthorized": True,
                    "data": None,
                    "error": (
                        f"This number belongs to a {existing_mobile_user.get_role_display()} account. "
                        f"Please log in through the {existing_mobile_user.get_role_display()} portal."
                    )
                }, status=status.HTTP_403_FORBIDDEN)

        otp_obj.is_verified = True
        otp_obj.save()


        if otp_obj.email:
            user = _find_refurbisher_by_email(otp_obj.email) if role == "refurbisher" else None
            created = False
            if not user:
                user, created = User.objects.get_or_create(
                    email=otp_obj.email,
                    defaults={"role": role}
                )
        else:
            user, created = User.objects.get_or_create(
                contact_number=otp_obj.mobile,
                defaults={"role": role}
            )

        if not user.active_user:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": True,
                "data": None, "error": "This account has been deactivated. Please contact support."
            }, status=status.HTTP_403_FORBIDDEN)

        login(request, user)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": {"otp_verified": True, "user_id": user.user_id, "new_user": created},
            "error": None
        }, status=status.HTTP_200_OK)


class AdminPasswordLoginViewSet(viewsets.ViewSet):
    @handle_exceptions
    def create(self, request):
        """Authenticate an admin user with contact number + password."""
        contact_number = (request.data.get('contact_number') or '').strip()
        password = request.data.get('password') or ''

        if not contact_number or not password:
            return Response({
                "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                "data": None, "error": "Contact number and password are required."
            }, status=status.HTTP_400_BAD_REQUEST)

        # contact_number is not the User's USERNAME_FIELD and is not unique, so find
        # admin accounts by number and authenticate against each one's real username.
        normalized_number = ''.join(contact_number.split()).replace('-', '')
        candidates = User.objects.filter(role='admin', contact_number__in={contact_number, normalized_number})
        user = None
        for candidate in candidates:
            user = authenticate(request, username=candidate.username, password=password)
            if user is not None:
                break

        if user is None:
            return Response({
                "success": True, "user_not_logged_in": False, "user_unauthorized": False,
                "data": {"login_success": False, "message": "Invalid contact number or password."},
                "error": None
            }, status=status.HTTP_200_OK)

        if user.role != 'admin':
            return Response({
                "success": True, "user_not_logged_in": False, "user_unauthorized": False,
                "data": {"login_success": False, "message": "This account does not have admin access."},
                "error": None
            }, status=status.HTTP_200_OK)

        if not user.active_user:
            return Response({
                "success": True, "user_not_logged_in": False, "user_unauthorized": False,
                "data": {"login_success": False, "message": "This admin account has been deactivated."},
                "error": None
            }, status=status.HTTP_200_OK)

        login(request, user)
        return Response({
            "success": True, "user_not_logged_in": False, "user_unauthorized": False,
            "data": {"login_success": True, "user_id": user.user_id},
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
        # Email is the login identifier for customers and is intentionally not
        # editable here. Phone number can be updated by the user instead.
        user.first_name = request.data.get('first_name', user.first_name)
        user.last_name = request.data.get('last_name', user.last_name)
        user.alternate_phone = request.data.get('alternate_phone', user.alternate_phone)

        new_contact_number = request.data.get('contact_number')
        if new_contact_number:
            new_contact_number = str(new_contact_number).strip().replace("+91", "")
            if new_contact_number != user.contact_number:
                if not new_contact_number.isdigit() or len(new_contact_number) != 10:
                    return Response({
                        "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                        "data": None, "error": "Please enter a valid 10-digit phone number."
                    }, status=status.HTTP_400_BAD_REQUEST)
                if User.objects.filter(contact_number=new_contact_number).exclude(id=user.id).exists():
                    return Response({
                        "success": False, "user_not_logged_in": False, "user_unauthorized": False,
                        "data": None, "error": "This phone number is already registered with another account."
                    }, status=status.HTTP_400_BAD_REQUEST)
                user.contact_number = new_contact_number

        user.save()

        # --- If refurbisher, handle CompanyProfile ---
        if role == 'refurbisher':
            # Check if company profile exists for this refurbisher
            company_profile = getattr(user, 'company_profile', None)

            # The login email and the (user-editable) phone number are owned by the
            # user record; keep the company profile copy in sync with them.
            profile_data = request.data.copy()
            # Approval / rejection / warehouse fields are admin-controlled; ignore them here.
            for admin_field in ADMIN_ONLY_PROFILE_FIELDS:
                if admin_field in profile_data:
                    del profile_data[admin_field]
            if user.email:
                profile_data['email'] = user.email
            if user.contact_number:
                profile_data['contact_number'] = user.contact_number

            if company_profile:
                # Update existing profile - handle both FILES and DATA
                serializer = CompanyProfileSerializer(
                    company_profile, 
                    data=profile_data, 
                    partial=True,
                    context={'request': request}
                )
            else:
                # Create new profile
                data = profile_data
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

    @action(detail=False, methods=['post'], url_path='resubmit-approval')
    @handle_exceptions
    @check_authentication()
    def resubmit_approval(self, request):
        """
        Refurbisher asks the admin to re-review a rejected profile.
        Optionally includes a reply message addressing the rejection reason.
        Clears the rejected state so the profile moves back to 'pending'.
        """
        user = request.user
        if user.role != 'refurbisher':
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": True,
                "data": None,
                "error": "Only refurbishers can request re-review."
            }, status=status.HTTP_403_FORBIDDEN)

        company_profile = getattr(user, 'company_profile', None)
        if not company_profile:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Company profile not found."
            }, status=status.HTTP_404_NOT_FOUND)

        if not company_profile.is_rejected:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "This profile is not currently rejected."
            }, status=status.HTTP_400_BAD_REQUEST)

        reply = (request.data.get('reply') or '').strip()

        company_profile.is_rejected = False
        company_profile.resubmitted_at = timezone.now()
        company_profile.save()

        ApprovalReviewLog.objects.create(
            company_profile=company_profile,
            action='resubmitted',
            reason=reply or None,
            created_by=user
        )

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "message": "Your profile has been resubmitted for review.",
                "company_profile": CompanyProfileSerializer(company_profile).data
            },
            "error": None
        }, status=status.HTTP_200_OK)


class AddressViewSet(viewsets.ViewSet):
    """
    CRUD endpoints for customer shipping addresses.
    All actions require the user to be authenticated.
    """

    @handle_exceptions
    @check_authentication()
    def list(self, request):
        """Get all addresses for the current user"""
        addresses = Address.objects.filter(user_id=request.user.user_id)
        serializer = AddressSerializer(addresses, many=True)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication()
    def create(self, request):
        """Create a new address for the current user"""
        serializer = AddressSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        # If this address is marked as default, unset all other defaults first
        if request.data.get('is_default'):
            Address.objects.filter(user_id=request.user.user_id).update(is_default=False)

        address = serializer.save(user_id=request.user.user_id)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": AddressSerializer(address).data,
            "error": None
        }, status=status.HTTP_201_CREATED)

    @handle_exceptions
    @check_authentication()
    def retrieve(self, request, pk=None):
        """Get a single address by ID"""
        try:
            address = Address.objects.get(id=pk, user_id=request.user.user_id)
        except Address.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Address not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = AddressSerializer(address)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication()
    def update(self, request, pk=None):
        """Update an address (full or partial)"""
        try:
            address = Address.objects.get(id=pk, user_id=request.user.user_id)
        except Address.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Address not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = AddressSerializer(address, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        # If marking as default, clear other defaults first
        if request.data.get('is_default'):
            Address.objects.filter(user_id=request.user.user_id).update(is_default=False)

        address = serializer.save()
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": AddressSerializer(address).data,
            "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication()
    def destroy(self, request, pk=None):
        """Delete an address"""
        try:
            address = Address.objects.get(id=pk, user_id=request.user.user_id)
        except Address.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Address not found."
            }, status=status.HTTP_404_NOT_FOUND)

        address.delete()
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {"message": "Address deleted successfully."},
            "error": None
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='set-default')
    @handle_exceptions
    @check_authentication()
    def set_default(self, request, pk=None):
        """Mark an address as the default shipping address"""
        try:
            address = Address.objects.get(id=pk, user_id=request.user.user_id)
        except Address.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Address not found."
            }, status=status.HTTP_404_NOT_FOUND)

        Address.objects.filter(user_id=request.user.user_id).update(is_default=False)
        address.is_default = True
        address.save(update_fields=['is_default'])
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": AddressSerializer(address).data,
            "error": None
        }, status=status.HTTP_200_OK)
