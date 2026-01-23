import requests
from django.conf import settings
import json

DELHIVERY_API_TOKEN = "54a324a4a906abfb25cadc01968f69e76f88639f"
# DELHIVERY_BASE_URL = "https://track.delhivery.com"
DELHIVERY_BASE_URL = "https://staging-express.delhivery.com"

# -------------------------
# EXCEPTION
# -------------------------
class DelhiveryAPIException(Exception):
    pass


# -------------------------
# CLIENT
# -------------------------
class DelhiveryClient:

    def __init__(self):
        if not DELHIVERY_API_TOKEN:
            raise DelhiveryAPIException("DELHIVERY_API_TOKEN missing")

        self.base_url = DELHIVERY_BASE_URL.rstrip("/")
        self.token = DELHIVERY_API_TOKEN

        self.json_headers = {
            "Authorization": f"Token {self.token}",
            "Content-Type": "application/json"
        }

    # -------------------------
    # INTERNAL REQUEST
    # -------------------------
    def _get(self, endpoint, params=None):
        r = requests.get(
            f"{self.base_url}{endpoint}",
            headers=self.json_headers,
            params=params,
            timeout=15
        )
        if r.status_code != 200:
            raise DelhiveryAPIException(r.text)
        return r.json()

    # def _post_json(self, endpoint, payload):
    #     r = requests.post(
    #         f"{self.base_url}{endpoint}",
    #         headers=self.json_headers,
    #         json=payload,
    #         timeout=15
    #     )
    #     if r.status_code not in (200, 201):
    #         raise DelhiveryAPIException(r.text)
    #     return r.json()
    
    def _post_json(self, endpoint, payload):
        r = requests.post(
            f"{self.base_url}{endpoint}",
            headers=self.json_headers,
            json=payload,
            timeout=15
        )

        if r.status_code not in (200, 201):
            raise DelhiveryAPIException(r.text)

        # 🔥 Delhivery sometimes returns EMPTY BODY on success
        if not r.text or not r.text.strip():
            return {"success": True}

        # Try JSON, else raw text
        try:
            return r.json()
        except ValueError:
            return {"success": True, "raw": r.text}

    def _sanitize_warehouse(self, warehouse: dict) -> dict:
        required_fields = [
            "name", "address", "city", "state", "pin", "phone",
            "return_address", "return_city", "return_state",
            "return_pin", "return_phone", "email"
        ]

        clean = {}
        for field in required_fields:
            value = warehouse.get(field)
            if value is None:
                raise DelhiveryAPIException(f"Warehouse field missing: {field}")
            clean[field] = str(value).strip()

        return clean

    # -------------------------
    # 1. PINCODE CHECK
    # -------------------------
    def check_pincode(self, pincode):
        return self._get(
            "/c/api/pin-codes/json/",
            params={"filter_codes": pincode}
        )

    # -------------------------
    # 2. WAREHOUSE
    # -------------------------
    def get_warehouses(self):
        return self._get("/api/backend/clientwarehouse/")

    def get_warehouse(self, name):
        warehouses = self.get_warehouses()
        for wh in warehouses:
            if wh.get("name") == name:
                return wh
        raise DelhiveryAPIException("Warehouse not found")

    def create_warehouse(self, warehouse):
        # FORCE everything to string
        payload = {
            "name": str(warehouse["name"]),
            "address": str(warehouse["address"]),
            "city": str(warehouse["city"]),
            "state": str(warehouse["state"]),
            "pin": str(warehouse["pin"]),
            "phone": str(warehouse["phone"]),

            "return_address": str(warehouse["return_address"]),
            "return_city": str(warehouse["return_city"]),
            "return_state": str(warehouse["return_state"]),
            "return_pin": str(warehouse["return_pin"]),
            "return_phone": str(warehouse["return_phone"]),

            "email": str(warehouse["email"]),
        }

        r = requests.post(
            f"{self.base_url}/api/backend/clientwarehouse/create/",
            headers={
                "Authorization": f"Token {self.token}",
                # ⚠️ DO NOT set JSON content-type
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data=payload,   # 🔥 THIS is critical
            timeout=20,
        )

        # Delhivery may return 200 with empty body
        if r.status_code not in (200, 201):
            raise DelhiveryAPIException(r.text)

        # EMPTY BODY = SUCCESS
        if not r.text or not r.text.strip():
            return {"success": True}

        # XML = failure
        if r.text.lstrip().startswith("<"):
            raise DelhiveryAPIException(r.text)

        # JSON success (rare)
        try:
            resp = r.json()
        except ValueError:
            return {"success": True}

        if resp.get("success") is False or resp.get("error"):
            raise DelhiveryAPIException(resp)

        return resp

    def ensure_warehouse(self, warehouse):
        try:
            return self.get_warehouse(warehouse["name"])
        except DelhiveryAPIException:
            return self.create_warehouse(warehouse)

    # -------------------------
    # 3. CREATE SHIPMENT (CMU)
    # -------------------------
    def create_shipment(self, shipment):
        payload = {
            "shipments": [{
                "order": shipment["order_id"],
                "name": shipment["name"],
                "phone": shipment["phone"],
                "add": shipment["address"],
                "city": shipment["city"],
                "state": shipment["state"],
                "pin": shipment["pincode"],
                "country": "India",
                "payment_mode": shipment["payment_mode"],
                "cod_amount": shipment["amount"] if shipment["payment_mode"] == "COD" else 0,
                "quantity": 1,
                "weight": shipment.get("weight", 0.5)
            }],
            "pickup_location": {
                "name": shipment["pickup_location"]
            }
        }

        r = requests.post(
            f"{self.base_url}/api/cmu/create.json",
            headers={
                "Authorization": f"Token {self.token}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={
                "format": "json",
                "data": json.dumps(payload)
            },
            timeout=15
        )

        if r.status_code != 200:
            raise DelhiveryAPIException(r.text)

        resp = r.json()

        packages = resp.get("packages")
        if not packages:
            raise DelhiveryAPIException(f"Shipment failed: {resp.get('rmk')}")

        pkg = packages[0]

        if pkg.get("status") != "Success":
            raise DelhiveryAPIException(pkg.get("rmk"))

        waybill = pkg.get("waybill")
        if not waybill:
            raise DelhiveryAPIException("AWB missing")

        return waybill

    # -------------------------
    # 4. PICKUP REQUEST
    # -------------------------
    def create_pickup(self, pickup_location, packages, weight):
        payload = {
            "pickup_location": pickup_location,
            "expected_package_count": packages,
            "expected_weight": weight
        }
        return self._post_json("/fm/request/new/", payload)

    # -------------------------
    # 5. TRACK
    # -------------------------
    def track(self, awb):
        return self._get(
            "/api/v1/packages/json/",
            params={"waybill": awb}
        )


# -------------------------
# FULL FLOW TEST
# -------------------------
if __name__ == "__main__":

    client = DelhiveryClient()

    # WAREHOUSE = {
    #     "name": "REFURBAZAAR_AHMEDABAD",
    #     "address": "Test Warehouse Address",
    #     "city": "Ahmedabad",
    #     "state": "Gujarat",
    #     "pin": "380001",
    #     "phone": "9999999999",
    #     "email": "ops@refurbazaar.com"
    # }

    WAREHOUSE = {
        "name": "REFURBAZAAR_MUMBAI",
        "address": "Andheri East MIDC",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pin": "400072",
        "phone": "9999999999",

        "return_address": "Andheri East MIDC",
        "return_city": "Mumbai",
        "return_state": "Maharashtra",
        "return_pin": "400072",
        "return_phone": "9999999999",

        "email": "ops@refurbazaar.com"
    }



    SHIPMENT = {
        "order_id": "ORD_TEST_001",
        "name": "Divyam Shah",
        "phone": "9999999999",
        "address": "Customer Address",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "pincode": "380001",
        "payment_mode": "COD",
        "amount": 999,
        "pickup_location": WAREHOUSE["name"],
        "weight": 0.5
    }

    print("\n1️⃣ Ensuring warehouse...")
    client.ensure_warehouse(WAREHOUSE)
    print("✅ Warehouse ready")

    print("\n2️⃣ Checking pincode...")
    print(client.check_pincode(SHIPMENT["pincode"]))

    print("\n3️⃣ Creating shipment...")
    awb = client.create_shipment(SHIPMENT)
    print("✅ AWB:", awb)

    print("\n4️⃣ Scheduling pickup...")
    print(client.create_pickup(
        pickup_location=WAREHOUSE["name"],
        packages=1,
        weight=0.5
    ))

    print("\n5️⃣ Tracking shipment...")
    print(client.track(awb))
