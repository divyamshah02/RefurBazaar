from django.contrib import admin

from .models import Inquiry


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ("kind", "name", "email", "phone", "subject", "is_handled", "created_at")
    list_filter = ("kind", "is_handled")
    search_fields = ("name", "email", "phone", "subject")
    readonly_fields = ("created_at", "ip_address")
