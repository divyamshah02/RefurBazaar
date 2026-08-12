from rest_framework import serializers
from .models import *


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "role", "user_id", "first_name", "last_name", "contact_number", "email", "alternate_phone", "created_at", "active_user"]

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if 'contact_number' in rep:
            rep['contact_number'] = str(rep['contact_number']).replace("+91", "")
        return rep


class CompanyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyProfile
        fields = '__all__'


class ApprovalReviewLogSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    created_by_role = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalReviewLog
        fields = ['id', 'company_profile', 'action', 'reason', 'created_by', 'created_by_name', 'created_by_role', 'created_at']

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        name = f"{obj.created_by.first_name or ''} {obj.created_by.last_name or ''}".strip()
        return name or obj.created_by.user_id

    def get_created_by_role(self, obj):
        return obj.created_by.role if obj.created_by else None


class OTPVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTPVerification
        fields = '__all__'


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'user_id', 'address_line', 'city', 'state', 'pincode', 'address_name', 'is_default', 'created_at']
        read_only_fields = ['user_id', 'created_at']
