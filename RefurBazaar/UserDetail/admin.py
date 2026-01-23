from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import *


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("user_id", "contact_number", "first_name", "last_name", "role", "email", "active_user", "created_at")
    list_filter = ("role", "active_user")
    search_fields = ("user_id", "contact_number", "first_name", "last_name", "email")
    ordering = ("-created_at",)

    fieldsets = (
        (None, {"fields": ("contact_number", "password")}),
        (_("Personal info"), {"fields": ("first_name", "last_name", "email", "role", "user_id")}),
        (_("Other details"), {"fields": ("active_user", "created_at")}),
        (_("Permissions"), {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("contact_number", "first_name", "last_name", "email", "role", "password1", "password2"),
        }),
    )

@admin.register(CompanyProfile)
class CompanyProfileAdmin(admin.ModelAdmin):
    list_display = ("company_name", "business_type", "contact_number", "city", "state", "country", "bank_name")
    search_fields = ("company_name", "gst_registration_no", "contact_number", "account_number", "ifsc_code")
    
    fieldsets = (
        ("Company Information", {
            "fields": ("user", "company_name", "business_type", "gst_registration_no", "business_license", "is_approved", "is_profile_complete", "approved_at", "approved_by")
        }),
        ("Contact Details", {
            "fields": ("first_name", "last_name", "email", "contact_number", "alternate_contact_number")
        }),
        ("Address Information", {
            "fields": ("address_line_1", "address_line_2", "pincode", "city", "state", "country", 
                      "return_address_line_1", "return_address_line_2")
        }),
        ("Documents", {
            "fields": ("gst_certificate", "business_license_file", "identity_proof", "address_proof")
        }),
        ("Payment Information", {
            "fields": ("account_holder_name", "account_number", "ifsc_code", "bank_name", "branch_name")
        }),
    )


@admin.register(OTPVerification)
class OtpAdmin(admin.ModelAdmin):
    list_display = ('mobile', 'otp', 'is_verified', 'attempt_count')
