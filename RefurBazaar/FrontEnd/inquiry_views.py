import re

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from utils.rate_limit import client_ip, hit_limit

from .models import Inquiry

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^[0-9+()\-\s]{7,20}$")
KINDS = {kind for kind, _ in Inquiry.KIND_CHOICES}
MAX_DETAIL_KEYS = 30
MAX_DETAIL_LENGTH = 1000


def _fail(message, http_status=status.HTTP_400_BAD_REQUEST):
    return Response(
        {"success": False, "user_not_logged_in": False, "user_unauthorized": False, "data": None, "error": message},
        status=http_status,
    )


class InquiryView(APIView):
    """POST /inquiry/ - stores a contact, enterprise or seller-application submission."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        ip = client_ip(request)
        if hit_limit("inquiry-ip", ip, 10, 3600):
            return _fail("Too many submissions. Please try again later.", status.HTTP_429_TOO_MANY_REQUESTS)

        data = request.data
        kind = (data.get("kind") or "").strip()
        name = (data.get("name") or "").strip()[:150]
        email = (data.get("email") or "").strip().lower()
        phone = (data.get("phone") or "").strip()
        subject = (data.get("subject") or "").strip()[:200]
        message = (data.get("message") or "").strip()[:5000]

        if kind not in KINDS:
            return _fail("Unknown form type.")
        if not name:
            return _fail("Name is required.")
        if not email and not phone:
            return _fail("Please provide an email address or phone number.")
        if email and not EMAIL_RE.match(email):
            return _fail("Please enter a valid email address.")
        if phone and not PHONE_RE.match(phone):
            return _fail("Please enter a valid phone number.")

        raw_details = data.get("details")
        details = {}
        if isinstance(raw_details, dict):
            for key, value in list(raw_details.items())[:MAX_DETAIL_KEYS]:
                if isinstance(value, (list, tuple)):
                    value = ", ".join(str(v) for v in value)
                details[str(key)[:60]] = str(value)[:MAX_DETAIL_LENGTH]

        inquiry = Inquiry.objects.create(
            kind=kind, name=name, email=email, phone=phone,
            subject=subject, message=message, details=details, ip_address=ip,
        )
        return Response(
            {"success": True, "user_not_logged_in": False, "user_unauthorized": False,
             "data": {"id": inquiry.id}, "error": None},
            status=status.HTTP_201_CREATED,
        )
