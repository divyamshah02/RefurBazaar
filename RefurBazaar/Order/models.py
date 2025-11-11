from django.db import models
from django.utils import timezone
from UserDetail.models import User
from Product.models import ListingUnit
import uuid
from datetime import timedelta


class Order(models.Model):
    """Order model for RefurBazaar"""
    STATUS_CHOICES = [
        ('pending', 'Pending Payment'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('razorpay', 'Razorpay'),
        ('cod', 'Cash on Delivery'),
    ]
    
    order_id = models.CharField(max_length=50, unique=True, editable=False)
    order_number = models.PositiveIntegerField(unique=True, null=True, blank=True)
    
    # User identification
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', null=True, blank=True)
    session_id = models.CharField(max_length=255, null=True, blank=True)
    
    # Customer details
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=15)
    alternate_phone = models.CharField(max_length=15, null=True, blank=True)
    
    # Shipping details
    shipping_address = models.TextField()
    shipping_city = models.CharField(max_length=100)
    shipping_state = models.CharField(max_length=100, default='')
    shipping_pincode = models.CharField(max_length=10)
    shipping_address_id = models.IntegerField(null=True, blank=True)
    
    # Billing details (optional)
    different_billing_address = models.BooleanField(default=False)
    billing_first_name = models.CharField(max_length=100, null=True, blank=True)
    billing_last_name = models.CharField(max_length=100, null=True, blank=True)
    billing_address = models.TextField(null=True, blank=True)
    billing_city = models.CharField(max_length=100, null=True, blank=True)
    billing_state = models.CharField(max_length=100, null=True, blank=True)
    billing_pincode = models.CharField(max_length=10, null=True, blank=True)
    billing_phone = models.CharField(max_length=15, null=True, blank=True)
    billing_alternate_phone = models.CharField(max_length=15, null=True, blank=True)
    
    # Delivery details
    delivery_date = models.DateField(null=True, blank=True)
    timeslot_id = models.CharField(max_length=20, null=True, blank=True)
    special_instructions = models.TextField(null=True, blank=True)
    
    # Order amounts
    subtotal_amount = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    coupon_code = models.CharField(max_length=50, null=True, blank=True)
    coupon_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Payment details
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    razorpay_order_id = models.CharField(max_length=100, null=True, blank=True)
    razorpay_payment_id = models.CharField(max_length=100, null=True, blank=True)
    razorpay_signature = models.CharField(max_length=255, null=True, blank=True)
    razorpay_link = models.URLField(null=True, blank=True)
    payment_received = models.BooleanField(default=False)
    
    # Order status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    order_note = models.TextField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.order_id:
            self.order_id = f"ORD{uuid.uuid4().hex[:10].upper()}"
        
        # Auto-increment order_number when status changes to confirmed
        if self.status == 'confirmed' and not self.order_number:
            last_order = Order.objects.filter(order_number__isnull=False).order_by('-order_number').first()
            self.order_number = (last_order.order_number + 1) if last_order else 1000
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.order_id} - {self.first_name} {self.last_name}"


class OrderItem(models.Model):
    """Order items - each item references a unique ListingUnit"""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    listing_unit = models.OneToOneField(ListingUnit, on_delete=models.PROTECT)
    
    # Snapshot data (price at time of purchase)
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)
    condition_at_purchase = models.CharField(max_length=20)
    
    # Refurbisher info
    refurbisher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sold_items')
    refurbisher_name = models.CharField(max_length=200)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"OrderItem {self.id} - {self.order.order_id}"
