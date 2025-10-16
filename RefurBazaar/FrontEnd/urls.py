from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()

router.register(r'refurbisher-profile', RefurbisherProfileViewSet, basename='refurbisher-profile')
router.register(r'refurbisher-login', RefurbisherLoginViewSet, basename='refurbisher-login')

urlpatterns = [
    path('', include(router.urls)),
]
