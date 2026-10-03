"""
ShipRocket API client.

Modular wrapper around the ShipRocket external API so that warehouse
(pickup location) creation, rate checks, order creation, AWB assignment,
pickup scheduling and tracking can each be called independently and
re-triggered safely (e.g. retrying a failed warehouse creation from the
admin dashboard, or refreshing tracking status on an order detail page).

Reads credentials/mode dynamically from Django settings (SHIPROCKET_MODE,
SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD) so switching sandbox <-> production
only requires changing environment variables, no code changes.
"""
import requests
from django.conf import settings
from django.core.cache import cache

CACHE_KEY = "shiprocket_auth_token_{mode}"


class ShiprocketAPIException(Exception):
    pass


class ShiprocketClient:
    def __init__(self):
        self.mode = getattr(settings, 'SHIPROCKET_MODE', 'sandbox')
        self.base_url = getattr(settings, 'SHIPROCKET_BASE_URL', 'https://apiv2.shiprocket.in/v1/external').rstrip('/')
        self.email = getattr(settings, 'SHIPROCKET_EMAIL', '')
        self.password = getattr(settings, 'SHIPROCKET_PASSWORD', '')

        if not self.email or not self.password:
            raise ShiprocketAPIException(
                f"ShipRocket credentials are not configured for mode '{self.mode}'. "
                f"Set the SHIPROCKET_EMAIL/SHIPROCKET_PASSWORD "
                f"(or SHIPROCKET_SANDBOX_EMAIL/SHIPROCKET_SANDBOX_PASSWORD) environment variables."
            )

    # -------------------------
    # AUTH
    # -------------------------
    def _get_token(self):
        cache_key = CACHE_KEY.format(mode=self.mode)
        token = cache.get(cache_key)
        if token:
            return token

        try:
            # r = requests.post(
            #     f"{self.base_url}/auth/login",
            #     json={"email": self.email, "password": self.password},
            #     timeout=15,
            # )
            print(f"{self.base_url}/auth/login")
            r = requests.request(method="POST", url=f"{self.base_url}/auth/login", json={"email": self.email, "password": self.password}, headers={"Content-Type": "application/json"}, timeout=15)
            print(r.text)
        except requests.RequestException as e:
            print("befor auth only")
            raise ShiprocketAPIException(f"Could not reach ShipRocket: {e}")

        if r.status_code != 200:
            print("failed at auth only")
            raise ShiprocketAPIException(f"ShipRocket auth failed: {r.text}")

        data = r.json()
        token = data.get("token")
        if not token:
            raise ShiprocketAPIException(f"ShipRocket auth response missing token: {data}")

        # Token is valid for 10 days; cache for 9 to stay safe.
        cache.set(cache_key, token, timeout=9 * 24 * 60 * 60)
        print(token)
        return token

    def _headers(self):
        return {
            "Authorization": f"Bearer {self._get_token()}",
            "Content-Type": "application/json",
        }

    def _request(self, method, endpoint, params=None, json_body=None, retry_on_auth_fail=True):
        try:
            r = requests.request(
                method,
                f"{self.base_url}{endpoint}",
                headers=self._headers(),
                params=params,
                json=json_body,
                timeout=20,
            )
        except requests.RequestException as e:
            raise ShiprocketAPIException(f"ShipRocket request failed: {e}")

        if r.status_code == 401 and retry_on_auth_fail:
            cache.delete(CACHE_KEY.format(mode=self.mode))
            return self._request(method, endpoint, params, json_body, retry_on_auth_fail=False)

        if r.status_code not in (200, 201, 422):
            raise ShiprocketAPIException(f"ShipRocket API error ({r.status_code}): {r.text}")

        try:
            body = r.json()
        except ValueError:
            raise ShiprocketAPIException(f"ShipRocket returned a non-JSON response: {r.text}")

        # ShipRocket sometimes returns 200/422 with an "errors" or "message" key on failure.
        if r.status_code == 422 or (isinstance(body, dict) and body.get("status_code") == 422):
            raise ShiprocketAPIException(f"ShipRocket validation error: {body}")

        return body

    # -------------------------
    # WAREHOUSE / PICKUP LOCATION
    # -------------------------
    def add_pickup_location(self, *, pickup_location, name, email, phone, address,
                             city, state, pin_code, country="India", address_2=""):
        """Registers a refurbisher's address as a ShipRocket pickup location (warehouse)."""
        payload = {
            "pickup_location": pickup_location[:36],
            "name": name,
            "email": email,
            "phone": phone,
            "address": address,
            "address_2": address_2,
            "city": city,
            "state": state,
            "country": country,
            "pin_code": pin_code,
        }
        return self._request("POST", "/settings/company/addpickup", json_body=payload)

    # -------------------------
    # RATES / SERVICEABILITY
    # -------------------------
    def check_serviceability(self, *, pickup_postcode, delivery_postcode, weight, cod=0, declared_value=None):
        params = {
            "pickup_postcode": pickup_postcode,
            "delivery_postcode": delivery_postcode,
            "weight": weight,
            "cod": 1 if cod else 0,
        }
        if declared_value is not None:
            params["declared_value"] = declared_value
        return self._request("GET", "/courier/serviceability/", params=params)

    # -------------------------
    # ORDERS
    # -------------------------
    def create_adhoc_order(self, payload):
        return self._request("POST", "/orders/create/adhoc", json_body=payload)

    def assign_awb(self, *, shipment_id, courier_id=None):
        payload = {"shipment_id": shipment_id}
        if courier_id:
            payload["courier_id"] = courier_id
        return self._request("POST", "/courier/assign/awb", json_body=payload)

    def generate_pickup(self, *, shipment_ids, pickup_date=None):
        payload = {"shipment_id": shipment_ids if isinstance(shipment_ids, list) else [shipment_ids]}
        if pickup_date:
            payload["pickup_date"] = [pickup_date] if isinstance(pickup_date, str) else pickup_date
        return self._request("POST", "/courier/generate/pickup", json_body=payload)

    def cancel_order(self, order_ids):
        payload = {"ids": order_ids if isinstance(order_ids, list) else [order_ids]}
        return self._request("POST", "/orders/cancel", json_body=payload)

    # -------------------------
    # TRACKING
    # -------------------------
    def track_by_awb(self, awb_code):
        return self._request("GET", f"/courier/track/awb/{awb_code}")

    def track_by_shipment_id(self, shipment_id):
        return self._request("GET", f"/courier/track/shipment/{shipment_id}")
