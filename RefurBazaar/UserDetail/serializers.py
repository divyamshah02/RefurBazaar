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


class OTPVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTPVerification
        fields = '__all__'


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'user_id', 'address_line', 'city', 'state', 'pincode', 'address_name', 'is_default', 'created_at']
        read_only_fields = ['user_id', 'created_at']
