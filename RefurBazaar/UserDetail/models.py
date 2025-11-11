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

    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.company_name or 'Unnamed Company'} ({self.user.user_id})"


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

