from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from UserDetail.models import User
from Product.models import ListingUnit


class ShoppingCart(models.Model):
    """
    Shopping cart for both guest and authenticated users.
    Guest carts use session_id, authenticated carts use user FK.
    """
    cart_id = models.CharField(max_length=100, unique=True, editable=False)
    session_id = models.CharField(
        max_length=255, 
        null=True, 
        blank=True,
        help_text="Session ID for guest users (CSRF token)"
    )
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='carts',
        help_text="User for authenticated carts"
    )
    active_cart = models.BooleanField(
        default=True,
        help_text="Only one active cart per user/session"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session_id', 'active_cart']),
            models.Index(fields=['user', 'active_cart']),
        ]

    def __str__(self):
        if self.user:
            return f"Cart {self.cart_id} - User: {self.user.email}"
        return f"Cart {self.cart_id} - Guest: {self.session_id[:10]}..."

    def get_total_items(self):
        """Returns total number of items in cart"""
        return self.items.count()

    def get_total_price(self):
        """Calculate total price of all items in cart"""
        return sum(item.listing_unit.price for item in self.items.all())


class ShoppingCartItem(models.Model):
    """
    Individual items in a cart. Each CartItem references a unique ListingUnit.
    No quantity field since each ListingUnit is unique (one physical device).
    """
    cart = models.ForeignKey(
        ShoppingCart, 
        on_delete=models.CASCADE, 
        related_name='items'
    )
    listing_unit = models.ForeignKey(
        ListingUnit, 
        on_delete=models.CASCADE,
        related_name='cart_items'
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['cart', 'listing_unit']
        ordering = ['-added_at']
        indexes = [
            models.Index(fields=['cart', 'listing_unit']),
        ]

    def __str__(self):
        return f"{self.cart.cart_id} - {self.listing_unit}"

    def clean(self):
        """Validate that listing unit is available before adding to cart"""
        from django.core.exceptions import ValidationError
        
        if not self.listing_unit.is_available:
            raise ValidationError("This listing unit is not available.")
        
        if self.listing_unit.is_sold:
            raise ValidationError("This listing unit has already been sold.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
