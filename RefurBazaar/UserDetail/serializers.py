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

    PLACEHOLDER_WORDS = {'test', 'testing', 'demo', 'dummy', 'sample', 'xxx', 'abc', 'na', 'n/a', 'none', 'null', 'city', 'state'}

    def _validate_pincode(self, value, label):
        value = (value or '').strip()
        if not value:
            return value
        if not (value.isdigit() and len(value) == 6 and value[0] != '0'):
            raise serializers.ValidationError({label: 'Enter a valid 6-digit PIN code.'})
        if len(set(value)) == 1:
            raise serializers.ValidationError({label: 'This PIN code looks like a placeholder. Enter the real PIN code.'})
        return value

    def _check_text(self, value, label, min_length, errors):
        value = (value or '').strip()
        if not value:
            return
        words = {w.strip('.,').lower() for w in value.split()}
        if len(value) < min_length:
            errors[label] = f'Enter a complete value (at least {min_length} characters).'
        elif words & self.PLACEHOLDER_WORDS:
            errors[label] = 'This looks like placeholder text. Enter the real details.'

    def validate(self, attrs):
        errors = {}
        for field, label, min_length in (
            ('address_line_1', 'address_line_1', 8),
            ('return_address_line_1', 'return_address_line_1', 8),
            ('city', 'city', 3),
            ('state', 'state', 3),
        ):
            if field in attrs:
                self._check_text(attrs.get(field), label, min_length, errors)
        for field in ('pincode', 'return_pincode'):
            if field in attrs:
                try:
                    attrs[field] = self._validate_pincode(attrs.get(field), field)
                except serializers.ValidationError as exc:
                    errors.update(exc.detail)
        if errors:
            raise serializers.ValidationError(errors)
        return attrs



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
