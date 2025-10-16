from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'otp-api', OtpAuthViewSet, basename='otp-api')
router.register(r'user-detail-api', UserDetailViewSet, basename='user-detail-api')

urlpatterns = [
    path('', include(router.urls)),
]
