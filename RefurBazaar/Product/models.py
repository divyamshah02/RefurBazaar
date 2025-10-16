from django.db import models
from django.utils import timezone
from UserDetail.models import User

# -----------------------------
# 1. Brand (Predefined)
# -----------------------------
class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


# -----------------------------
# 2. ProductModel (Predefined Device Master)
# -----------------------------
class ProductModel(models.Model):
    CATEGORY_CHOICES = [
        ('mobile', 'Mobile'),
        ('laptop', 'Laptop'),
        ('tablet', 'Tablet'),
        ('accessory', 'Accessory'),
    ]

    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='models')
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    base_specs = models.JSONField(default=dict, blank=True, null=True)  # RAM, processor, etc.
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='product_models/', null=True, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.brand.name} {self.name}"


# -----------------------------
# 3. AttributeMaster (Dynamic Attribute Definitions)
# -----------------------------
class AttributeMaster(models.Model):
    DATA_TYPE_CHOICES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('choice', 'Choice'),
    ]

    category = models.CharField(max_length=50, choices=ProductModel.CATEGORY_CHOICES)
    name = models.CharField(max_length=100)  # e.g., Color, Storage, RAM
    data_type = models.CharField(max_length=20, choices=DATA_TYPE_CHOICES)
    possible_values = models.JSONField(default=list, blank=True, null=True)  # e.g., ["64GB", "128GB"]

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('category', 'name')

    def __str__(self):
        return f"{self.category} - {self.name}"


# -----------------------------
# 4. ProductModelAttribute (Links model ↔ attributes)
# -----------------------------
class ProductModelAttribute(models.Model):
    product_model = models.ForeignKey(ProductModel, on_delete=models.CASCADE, related_name='attributes')
    attribute = models.ForeignKey(AttributeMaster, on_delete=models.CASCADE, related_name='model_links')
    is_required = models.BooleanField(default=False)

    class Meta:
        unique_together = ('product_model', 'attribute')

    def __str__(self):
        return f"{self.product_model.name} - {self.attribute.name}"


# -----------------------------
# 5. Listing (Refurbisher’s Listing)
# -----------------------------
class Listing(models.Model):
    CONDITION_CHOICES = [
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('fair', 'Fair'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('sold_out', 'Sold Out'),
    ]

    model = models.ForeignKey(ProductModel, on_delete=models.CASCADE, related_name='listings')
    refurbisher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listings')

    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    total_quantity = models.PositiveIntegerField(default=0)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.refurbisher.name} - {self.model.name} ({self.condition})"


# -----------------------------
# 6. ListingUnit (Specific Device Batch)
# -----------------------------
class ListingUnit(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='units')
    quantity = models.PositiveIntegerField(default=1)

    imei_number = models.CharField(max_length=50, null=True, blank=True)
    image = models.ImageField(upload_to='listing_units/', null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Unit #{self.id} of {self.listing.model.name}"


# -----------------------------
# 7. ListingUnitAttribute (Dynamic attribute values)
# -----------------------------
class ListingUnitAttribute(models.Model):
    listing_unit = models.ForeignKey(ListingUnit, on_delete=models.CASCADE, related_name='attributes')
    attribute = models.ForeignKey(AttributeMaster, on_delete=models.CASCADE)
    value = models.CharField(max_length=255)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [
            models.Index(fields=['attribute', 'value']),
        ]

    def __str__(self):
        return f"{self.listing_unit.id} - {self.attribute.name}: {self.value}"
