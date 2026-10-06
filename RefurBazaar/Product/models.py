from decimal import Decimal, ROUND_HALF_UP
from django.db import models
from django.db.models import Max
from django.core.validators import MinValueValidator
from UserDetail.models import User
import uuid
from django.utils import timezone
from datetime import timedelta


class Brand(models.Model):
    """Brands like Apple, Samsung, Lenovo"""
    name = models.CharField(max_length=100, unique=True)
    logo = models.ImageField(upload_to='brands/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class ProductModel(models.Model):
    """Specific device models like iPhone 16 Pro, Galaxy S24"""
    CATEGORY_CHOICES = [
        ('mobile', 'Mobile'),
        ('tablet', 'Tablet'),
        ('laptop', 'Laptop'),
        ('accessory', 'Accessory'),
    ]
    
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='models')
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True)    
    image = models.ImageField(upload_to='product_models/', blank=True, null=True)
    release_year = models.IntegerField(blank=True, null=True)
    price_min = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True,
        help_text="Guide/reference refurb price range (lower bound) — extracted from catalog data. Refurbishers still set their own unit price."
    )
    price_max = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True,
        help_text="Guide/reference refurb price range (upper bound) — extracted from catalog data. Refurbishers still set their own unit price."
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['brand', 'name']
        unique_together = ['brand', 'name', 'category']
    
    def __str__(self):
        return f"{self.brand.name} {self.name}"

class ProductModelImage(models.Model):
    product_model = models.ForeignKey(
        ProductModel,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(upload_to='product_models/')
    is_primary = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order']

    def __str__(self):
        return f"{self.product_model} image"


class AttributeMaster(models.Model):
    """Master list of attribute labels per category — e.g. Storage, Color, RAM.
    Type and allowed values are defined per-product on ProductModelAttribute."""
    CATEGORY_CHOICES = [
        ('mobile', 'Mobile'),
        ('tablet', 'Tablet'),
        ('laptop', 'Laptop'),
        ('accessory', 'Accessory'),
    ]

    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['category', 'display_order', 'name']
        unique_together = ['category', 'name']

    def __str__(self):
        return f"{self.category} - {self.name}"


class ProductModelAttribute(models.Model):
    """Links ProductModel with AttributeMaster.
    Defines how this attribute behaves for THIS specific product — its type,
    allowed values, whether it's required, filterable, and which page section it appears in."""

    SECTION_CHOICES = [
        ('main', 'Main'),
        ('secondary', 'Secondary'),
    ]
    DATA_TYPE_CHOICES = [
        ('text', 'Text'),
        ('choice', 'Choice'),
        ('number', 'Number'),
    ]

    product_model = models.ForeignKey(ProductModel, on_delete=models.CASCADE, related_name='model_attributes')
    attribute = models.ForeignKey(AttributeMaster, on_delete=models.CASCADE, related_name='product_models')
    is_required = models.BooleanField(default=True)
    is_filter = models.BooleanField(default=True, verbose_name="Customer side should it be filterable")
    section = models.CharField(
        max_length=20, choices=SECTION_CHOICES, default='main',
        help_text="Which section of the product detail page this attribute appears in"
    )
    data_type = models.CharField(
        max_length=20, choices=DATA_TYPE_CHOICES, default='text',
        help_text="Input type for this attribute on this product"
    )
    possible_values = models.JSONField(
        default=list, blank=True,
        help_text="Allowed values when data_type is 'choice'"
    )
    default_value = models.CharField(
        max_length=200, blank=True, null=True,
        help_text=(
            "Fixed spec value for this attribute on this product (e.g. Processor, Screen Size). "
            "Only used when is_required is False — the refurbisher is not asked for it, "
            "and it is auto-copied onto every unit of this model's listings."
        )
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['product_model', 'attribute']

    def save(self, *args, **kwargs):
        if self.section == 'main':
            self.is_filter = True
        else:
            self.is_filter = False
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product_model} - {self.attribute.name} ({self.data_type})"


class Listing(models.Model):
    """Product listing by refurbisher"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('sold', 'Sold'),
        ('inactive', 'Inactive'),
    ]
    
    listing_id = models.CharField(max_length=50, unique=True, editable=False)
    model = models.ForeignKey(ProductModel, on_delete=models.CASCADE, related_name='listings')
    refurbisher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listings')
    total_quantity = models.IntegerField(validators=[MinValueValidator(1)])
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.listing_id:
            self.listing_id = f"LST{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.listing_id} - {self.model}"


COMMISSION_TYPE_CHOICES = [
    ('percentage', 'Percentage'),
    ('flat', 'Flat amount'),
]


class CommissionConfig(models.Model):
    """Default platform commission, set by admin per product category.

    `category` is a ProductModel category key (mobile/tablet/...) or the special
    key 'default', which is the fallback for any category without its own row.
    """
    DEFAULT_KEY = 'default'

    category = models.CharField(max_length=20, unique=True)
    commission_type = models.CharField(max_length=12, choices=COMMISSION_TYPE_CHOICES, default='percentage')
    value = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category']

    def __str__(self):
        suffix = '%' if self.commission_type == 'percentage' else ' flat'
        return f"{self.category}: {self.value}{suffix}"

    @classmethod
    def resolve(cls, category):
        """Return (type, value) for a category: category row -> default row -> (percentage, 0)."""
        rows = {c.category: c for c in cls.objects.filter(category__in=[category, cls.DEFAULT_KEY], is_active=True)}
        row = rows.get(category) or rows.get(cls.DEFAULT_KEY)
        if row:
            return row.commission_type, row.value
        return 'percentage', Decimal('0')


def compute_commission(base_price, commission_type, value):
    """Commission amount (2dp) on a refurbisher price."""
    base = Decimal(str(base_price or 0))
    value = Decimal(str(value or 0))
    if commission_type == 'flat':
        amount = value
    else:
        amount = base * value / Decimal('100')
    return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


class ListingUnit(models.Model):
    """Individual units within a listing - each unit represents ONE device.

    price (customer-facing) = refurbisher_price + platform_commission.
    The commission uses the per-unit override when set, otherwise the
    category default from CommissionConfig.
    """
    
    CONDITION_CHOICES = [
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('poor', 'Poor'),
    ]
    
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='units')
    unit_number = models.IntegerField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)],
                                help_text="Customer-facing price = refurbisher_price + platform_commission")
    refurbisher_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)],
        help_text="Price set by the refurbisher (what they earn)")
    platform_commission = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)],
        help_text="Platform commission amount added on top of the refurbisher price")
    commission_type = models.CharField(
        max_length=12, choices=COMMISSION_TYPE_CHOICES, null=True, blank=True,
        help_text="Per-unit override. Leave empty to use the category default.")
    commission_value = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)],
        help_text="Per-unit override value (percent or flat amount)")
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES)
    is_available = models.BooleanField(default=True)
    is_sold = models.BooleanField(default=False)
    half_sold = models.BooleanField(default=False, help_text="Temporarily held during checkout")
    half_sold_at = models.DateTimeField(null=True, blank=True, help_text="When product was marked as half sold")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['unit_number']
        unique_together = ['listing', 'unit_number']
    
    def effective_commission_rule(self):
        """(type, value, source) — unit override first, then category default."""
        if self.commission_type and self.commission_value is not None:
            return self.commission_type, self.commission_value, 'unit'
        ctype, cvalue = CommissionConfig.resolve(self.listing.model.category)
        return ctype, cvalue, 'category'

    def apply_commission(self):
        """Recompute platform_commission and the customer-facing price in memory.

        If refurbisher_price was never set (legacy callers passing only `price`),
        that value is treated as the refurbisher's price.
        """
        if self.refurbisher_price is None:
            self.refurbisher_price = self.price
        ctype, cvalue, _ = self.effective_commission_rule()
        self.platform_commission = compute_commission(self.refurbisher_price, ctype, cvalue)
        self.price = Decimal(str(self.refurbisher_price)) + self.platform_commission

    def save(self, *args, **kwargs):
        if not self.unit_number:
            max_unit = ListingUnit.objects.filter(listing=self.listing).aggregate(
                Max('unit_number')
            )['unit_number__max']
            self.unit_number = (max_unit or 0) + 1

        # Only price brand-new units automatically. Existing units keep their
        # stored price on routine saves (e.g. checkout holds) and are repriced
        # explicitly via apply_commission() when a price/config change is made.
        if self.pk is None:
            self.apply_commission()

        super().save(*args, **kwargs)
    
    def mark_half_sold(self):
        """Mark product as temporarily held during Razorpay order creation"""
        self.half_sold = True
        self.half_sold_at = timezone.now()
        self.is_available = False
        self.save()
    
    def release_half_sold(self):
        """Release temporary hold if payment not completed"""
        self.half_sold = False
        self.half_sold_at = None
        self.is_available = True if not self.is_sold else False
        self.save()
    
    def is_half_sold_expired(self):
        """Check if half_sold hold has expired (10 minutes)"""
        if not self.half_sold or not self.half_sold_at:
            return False
        expiry_time = self.half_sold_at + timedelta(minutes=10)
        return timezone.now() > expiry_time
    
    def __str__(self):
        return f"{self.listing.listing_id} - Unit #{self.unit_number}"


class ListingUnitAttribute(models.Model):
    """Attributes for each listing unit (e.g., Color: Black, Storage: 128GB)"""
    listing_unit = models.ForeignKey(ListingUnit, on_delete=models.CASCADE, related_name='attributes')
    attribute = models.ForeignKey(AttributeMaster, on_delete=models.CASCADE)
    value = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['listing_unit', 'attribute']
    
    def __str__(self):
        return f"{self.listing_unit} - {self.attribute.name}: {self.value}"
