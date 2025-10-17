from django.db import models
from django.core.validators import MinValueValidator
from UserDetail.models import User
import uuid


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
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['brand', 'name']
        unique_together = ['brand', 'name', 'category']
    
    def __str__(self):
        return f"{self.brand.name} {self.name}"


class AttributeMaster(models.Model):
    """Master list of attributes like Storage, Color, RAM, Processor"""
    CATEGORY_CHOICES = [
        ('mobile', 'Mobile'),
        ('tablet', 'Tablet'),
        ('laptop', 'Laptop'),
        ('accessory', 'Accessory'),
    ]
    
    DATA_TYPE_CHOICES = [
        ('text', 'Text'),
        ('choice', 'Choice'),
        ('number', 'Number'),
    ]
    
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    name = models.CharField(max_length=100)
    data_type = models.CharField(max_length=20, choices=DATA_TYPE_CHOICES, default='text')
    possible_values = models.JSONField(
        default=list,
        blank=True,
        help_text="List of possible values for choice type attributes"
    )
    is_active = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['category', 'display_order', 'name']
        unique_together = ['category', 'name']
    
    def __str__(self):
        return f"{self.category} - {self.name}"


class ProductModelAttribute(models.Model):
    """Links ProductModel with AttributeMaster and defines if required"""
    product_model = models.ForeignKey(ProductModel, on_delete=models.CASCADE, related_name='model_attributes')
    attribute = models.ForeignKey(AttributeMaster, on_delete=models.CASCADE, related_name='product_models')
    is_required = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['product_model', 'attribute']
    
    def __str__(self):
        return f"{self.product_model} - {self.attribute.name}"


class Listing(models.Model):
    """Product listing by refurbisher"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('sold', 'Sold'),
        ('inactive', 'Inactive'),
    ]
    
    CONDITION_CHOICES = [
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('fair', 'Fair'),
    ]
    
    listing_id = models.CharField(max_length=50, unique=True, editable=False)
    model = models.ForeignKey(ProductModel, on_delete=models.CASCADE, related_name='listings')
    refurbisher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listings')
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    total_quantity = models.IntegerField(validators=[MinValueValidator(1)])
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
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


class ListingUnit(models.Model):
    """Individual units within a listing with specific attributes"""
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='units')
    unit_number = models.IntegerField(null=True, blank=True)
    quantity = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], null=True, blank=True)
    is_available = models.BooleanField(default=True)
    is_sold = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['unit_number']
        unique_together = ['listing', 'unit_number']
    
    def save(self, *args, **kwargs):
        if not self.unit_number:
            max_unit = ListingUnit.objects.filter(listing=self.listing).aggregate(
                models.Max('unit_number')
            )['unit_number__max']
            self.unit_number = (max_unit or 0) + 1
        
        if self.price is None:
            self.price = self.listing.price_per_unit
            
        super().save(*args, **kwargs)
    
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
