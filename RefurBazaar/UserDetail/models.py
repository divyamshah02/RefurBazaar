from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta
import random
import string


def generate_user_id(role_code):
    while True:
        first_digit = random.choice(string.digits[1:])
        remaining_digits = ''.join(random.choices(string.digits, k=9))
        user_id = role_code + first_digit + remaining_digits
        if not User.objects.filter(user_id=user_id).exists():
            return user_id


class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('customer', 'Customer'),
        ('refurbisher', 'Refurbisher'),
    ]

    role = models.CharField(max_length=12, choices=ROLE_CHOICES)
    user_id = models.CharField(max_length=12, unique=True)

    # name = models.CharField(max_length=255, blank=True, null=True)
    first_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    contact_number = models.CharField(max_length=15, unique=True)
    email = models.EmailField(null=True, blank=True)
    alternate_phone = models.CharField(max_length=15, null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    active_user = models.BooleanField(default=True)

    USERNAME_FIELD = 'contact_number'
    REQUIRED_FIELDS = ['role', 'username']

    def __str__(self):
        return f"{self.first_name or 'Unnamed'} ({self.role})"

    def save(self, *args, **kwargs):
        if not self.user_id:
            role_codes = {
                'admin': 'AD',
                'customer': 'CU',
                'refurbisher': 'RF',
            }

            if not self.role:
                raise ValueError("Role must be set before saving User")

            self.user_id = generate_user_id(role_code=role_codes[self.role])
            self.username = self.user_id

        super().save(*args, **kwargs)


class CompanyProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='company_profile')

    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    contact_number = models.CharField(max_length=15, null=True, blank=True)
    business_type = models.CharField(max_length=255, null=True, blank=True)
    company_name = models.CharField(max_length=255, null=True, blank=True)
    gst_registration_no = models.CharField(max_length=50, null=True, blank=True)
    business_license = models.CharField(max_length=255, null=True, blank=True)
    address_line_1 = models.CharField(max_length=255, null=True, blank=True)
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    pincode = models.CharField(max_length=10, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    return_address_line_1 = models.CharField(max_length=255, null=True, blank=True)
    return_address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    alternate_contact_number = models.CharField(max_length=15, blank=True, null=True)

    gst_certificate = models.FileField(upload_to='company_docs/gst_certificates/', null=True, blank=True)
    business_license_file = models.FileField(upload_to='company_docs/business_licenses/', null=True, blank=True)
    identity_proof = models.FileField(upload_to='company_docs/identity_proofs/', null=True, blank=True)
    address_proof = models.FileField(upload_to='company_docs/address_proofs/', null=True, blank=True)

    account_holder_name = models.CharField(max_length=255, null=True, blank=True)
    account_number = models.CharField(max_length=50, null=True, blank=True)
    ifsc_code = models.CharField(max_length=20, null=True, blank=True)
    bank_name = models.CharField(max_length=255, null=True, blank=True)
    branch_name = models.CharField(max_length=255, null=True, blank=True)

    # Profile validation fields
    is_approved = models.BooleanField(default=False, help_text="Admin approval status")
    is_profile_complete = models.BooleanField(default=False, help_text="Whether all required fields are filled")
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_profiles')

    # Rejection / resubmission tracking
    is_rejected = models.BooleanField(default=False, help_text="Whether the profile is currently in a rejected state")
    rejection_reason = models.TextField(null=True, blank=True, help_text="Latest reason provided by admin for rejection")
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='rejected_profiles')
    resubmitted_at = models.DateTimeField(null=True, blank=True, help_text="When the refurbisher last requested a re-review")

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.company_name or 'Unnamed Company'} ({self.user.user_id})"
    
    def check_profile_completion(self):
        """Check if all required fields are filled"""
        required_fields = [
            self.first_name, self.last_name, self.email, self.contact_number,
            self.business_type, self.company_name, self.gst_registration_no,
            self.address_line_1, self.city, self.state, self.pincode,
            self.return_address_line_1,
            self.gst_certificate, self.identity_proof, self.address_proof,
            self.account_holder_name, self.account_number, self.ifsc_code,
            self.bank_name, self.branch_name
        ]
        is_complete = all(field for field in required_fields)
        self.is_profile_complete = is_complete
        self.save(update_fields=['is_profile_complete'])
        return is_complete


class ApprovalReviewLog(models.Model):
    """
    Full audit trail of a refurbisher's approval journey — every rejection
    (with admin's reason), every resubmission (with refurbisher's reply),
    and every approval is recorded here so admins can see the complete history.
    """
    ACTION_CHOICES = [
        ('rejected', 'Rejected'),
        ('approved', 'Approved'),
        ('resubmitted', 'Resubmitted'),
    ]

    company_profile = models.ForeignKey(CompanyProfile, on_delete=models.CASCADE, related_name='review_logs')
    action = models.CharField(max_length=15, choices=ACTION_CHOICES)
    reason = models.TextField(null=True, blank=True, help_text="Admin's rejection reason, or refurbisher's reply message")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='review_logs_created')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_action_display()} - {self.company_profile} @ {self.created_at}"


class OTPVerification(models.Model):
    mobile = models.CharField(max_length=15)
    otp = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    attempt_count = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"{self.mobile} - {self.otp}"


class Address(models.Model):
    """
    Separate table to store multiple addresses for customers.
    We link using user_id string to allow compatibility with order model.
    """
    user_id = models.CharField(max_length=12)  # links to User.user_id
    address_line = models.TextField()
    city = models.CharField(max_length=50)
    state = models.CharField(max_length=50)
    pincode = models.CharField(max_length=10)
    address_name = models.CharField(max_length=100, blank=True, null=True)  # e.g. Home, Office
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.address_name or 'Address'} - {self.city}, {self.state}"
