from django.db import models


class Inquiry(models.Model):
    KIND_CHOICES = [
        ("contact", "Contact"),
        ("enterprise", "Enterprise"),
        ("seller", "Seller application"),
    ]

    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField(blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    is_handled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_kind_display()} from {self.name}"
