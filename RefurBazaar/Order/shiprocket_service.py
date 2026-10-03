"""
Creates the actual ShipRocket shipment for a single OrderItem, once the
refurbisher has: (1) selected a courier + pickup date, and (2) submitted
IMEI + photos (verify-item). Kept separate from the ShiprocketClient so it
can be re-run safely (idempotent) if it partially fails.
"""
from django.utils import timezone
from utils.shiprocket_api import ShiprocketClient, ShiprocketAPIException


def create_shiprocket_shipment(order_item):
    """
    Creates the ShipRocket adhoc order, assigns the refurbisher's chosen
    courier (AWB), and schedules pickup for the chosen date.
    Returns (success: bool, error: str | None). Never raises.
    """
    order = order_item.order
    profile = getattr(order_item.refurbisher, 'company_profile', None)

    if not profile or not profile.shiprocket_warehouse_created or not profile.shiprocket_pickup_code:
        order_item.shiprocket_last_error = "Refurbisher has no ShipRocket warehouse (pickup location) yet."
        order_item.save(update_fields=['shiprocket_last_error'])
        return False, order_item.shiprocket_last_error

    if not order_item.shiprocket_courier_id or not order_item.pickup_scheduled_date:
        order_item.shiprocket_last_error = "Pickup time and courier must be confirmed before creating the shipment."
        order_item.save(update_fields=['shiprocket_last_error'])
        return False, order_item.shiprocket_last_error

    if order_item.shiprocket_order_id and order_item.shiprocket_awb_code:
        # Already fully created — nothing to do.
        return True, None

    listing_unit = order_item.listing_unit
    model = listing_unit.listing.model

    try:
        client = ShiprocketClient()

        if not order_item.shiprocket_order_id:
            payload = {
                "order_id": f"{order.order_id}-{order_item.id}",
                "order_date": timezone.now().strftime("%Y-%m-%d %H:%M"),
                "pickup_location": profile.shiprocket_pickup_code,
                "billing_customer_name": order.first_name,
                "billing_last_name": order.last_name or "",
                "billing_address": order.shipping_address,
                "billing_city": order.shipping_city,
                "billing_pincode": order.shipping_pincode,
                "billing_state": order.shipping_state,
                "billing_country": "India",
                "billing_email": order.email,
                "billing_phone": order.phone,
                "shipping_is_billing": True,
                "order_items": [{
                    "name": f"{model.brand.name} {model.name}",
                    "sku": f"UNIT-{listing_unit.id}",
                    "units": 1,
                    "selling_price": str(order_item.price_at_purchase),
                }],
                "payment_method": "COD" if order.payment_method == "cod" else "Prepaid",
                "sub_total": str(order_item.price_at_purchase),
                "length": float(order_item.box_length or 20),
                "breadth": float(order_item.box_breadth or 15),
                "height": float(order_item.box_height or 8),
                "weight": float(order_item.box_weight or 0.5),
            }
            create_response = client.create_adhoc_order(payload)
            order_item.shiprocket_order_id = str(create_response.get("order_id", ""))
            order_item.shiprocket_shipment_id = str(create_response.get("shipment_id", ""))
            order_item.save(update_fields=['shiprocket_order_id', 'shiprocket_shipment_id'])

        if order_item.shiprocket_shipment_id and not order_item.shiprocket_awb_code:
            awb_response = client.assign_awb(
                shipment_id=order_item.shiprocket_shipment_id,
                courier_id=order_item.shiprocket_courier_id,
            )
            awb_data = awb_response.get("response", {}).get("data", {}) if isinstance(awb_response, dict) else {}
            order_item.shiprocket_awb_code = str(awb_data.get("awb_code", "")) or order_item.shiprocket_awb_code
            if awb_data.get("courier_name"):
                order_item.shiprocket_courier_name = awb_data["courier_name"]
            order_item.save(update_fields=['shiprocket_awb_code', 'shiprocket_courier_name'])

            # Best-effort pickup scheduling — don't fail the whole shipment if this errors.
            try:
                client.generate_pickup(
                    shipment_ids=[order_item.shiprocket_shipment_id],
                    pickup_date=order_item.pickup_scheduled_date.strftime("%Y-%m-%d"),
                )
            except ShiprocketAPIException as e:
                order_item.shiprocket_last_error = f"Pickup scheduling failed (shipment created): {e}"

        order_item.shiprocket_status = "AWB Assigned" if order_item.shiprocket_awb_code else "Order Created"
        order_item.shiprocket_tracking_url = (
            f"https://shiprocket.co/tracking/{order_item.shiprocket_awb_code}"
            if order_item.shiprocket_awb_code else None
        )
        order_item.shiprocket_last_synced_at = timezone.now()
        order_item.save(update_fields=[
            'shiprocket_status', 'shiprocket_tracking_url', 'shiprocket_last_synced_at', 'shiprocket_last_error'
        ])

        # Mirror onto the parent Order's existing tracking_number/courier_name/tracking_url
        # fields so the customer-facing order page (which reads at the order level) shows
        # this automatically. Note: for orders with items from multiple refurbishers, this
        # reflects the most recently shipped item only — a known limitation for now.
        if order_item.shiprocket_awb_code:
            order.tracking_number = order_item.shiprocket_awb_code
            order.courier_name = order_item.shiprocket_courier_name
            order.tracking_url = order_item.shiprocket_tracking_url
            if order.status in ('pending', 'confirmed', 'processing'):
                order.status = 'shipped'
            order.save(update_fields=['tracking_number', 'courier_name', 'tracking_url', 'status', 'updated_at'])

        return True, order_item.shiprocket_last_error

    except ShiprocketAPIException as e:
        order_item.shiprocket_last_error = str(e)
        order_item.save(update_fields=['shiprocket_last_error'])
        return False, str(e)


def refresh_tracking(order_item):
    """Pulls the latest status from ShipRocket for an item that already has an AWB."""
    if not order_item.shiprocket_awb_code:
        return False, "No AWB assigned yet."
    try:
        client = ShiprocketClient()
        response = client.track_by_awb(order_item.shiprocket_awb_code)
        tracking_data = response.get("tracking_data", {}) if isinstance(response, dict) else {}
        status_text = tracking_data.get("shipment_track", [{}])[0].get("current_status") if tracking_data.get("shipment_track") else None
        if status_text:
            order_item.shiprocket_status = status_text
        order_item.shiprocket_last_synced_at = timezone.now()
        order_item.shiprocket_last_error = None
        order_item.save(update_fields=['shiprocket_status', 'shiprocket_last_synced_at', 'shiprocket_last_error'])
        return True, None
    except ShiprocketAPIException as e:
        order_item.shiprocket_last_error = str(e)
        order_item.save(update_fields=['shiprocket_last_error'])
        return False, str(e)
