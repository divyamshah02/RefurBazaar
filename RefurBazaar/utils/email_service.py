"""
Resend email service used across the app for:
- OTP login/verification emails (customer account + checkout)
- Order confirmation emails

Requires the RESEND_API_KEY environment variable to be set. If it is not
set, emails are skipped (logged only) instead of raising, so the rest of
the flow (OTP/order creation) still works.
"""
import os
import logging

logger = logging.getLogger(__name__)

FROM_EMAIL = "Recarvit <info@recarvit.com>"


def _get_client():
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY is not set. Skipping email send.")
        return None
    import resend
    resend.api_key = api_key
    return resend


def send_otp_email(to_email, otp, purpose="login"):
    """Send a 6-digit OTP to the given email address."""
    resend = _get_client()
    if not resend:
        return False

    subject = "Your Recarvit Verification Code"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px;">
        <h2 style="color: #2A8C3C; margin-bottom: 4px;">Recarvit</h2>
        <p style="color: #374151; font-size: 15px;">Use the code below to {"verify your email" if purpose == "verify" else "log in to your account"}.</p>
        <div style="background: #f0f7ec; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2A8C3C;">{otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px;">This code expires in 5 minutes. If you did not request this, you can safely ignore this email.</p>
    </div>
    """
    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html,
        })
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}")
        return False


def send_order_confirmation_email(order):
    """Send an order confirmation email once an order is placed/confirmed."""
    resend = _get_client()
    if not resend or not order.email:
        return False

    items_html = ""
    for item in order.items.select_related(
        "listing_unit__listing__model__brand"
    ).all():
        model = item.listing_unit.listing.model
        name = f"{model.brand.name} {model.name}"
        items_html += f"""
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">{name}<br>
                <span style="color:#6b7280; font-size:12px;">Condition: {item.condition_at_purchase.title()}</span>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align:right;">Rs. {item.price_at_purchase}</td>
        </tr>
        """

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #2A8C3C;">Thank you for your order!</h2>
        <p style="color: #374151;">Hi {order.first_name}, your order has been placed successfully.</p>
        <p style="color: #374151;"><b>Order ID:</b> {order.order_id}</p>
        <table style="width:100%; border-collapse: collapse; margin-top: 12px;">
            {items_html}
        </table>
        <table style="width:100%; margin-top: 16px;">
            <tr><td>Subtotal</td><td style="text-align:right;">Rs. {order.subtotal_amount}</td></tr>
            <tr><td>Delivery</td><td style="text-align:right;">Rs. {order.delivery_charge}</td></tr>
            <tr style="font-weight:700;"><td>Total</td><td style="text-align:right;">Rs. {order.total_amount}</td></tr>
        </table>
        <p style="color: #374151; margin-top: 20px;">Shipping to:<br>{order.shipping_address}, {order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}</p>
        <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">You can track your order anytime from your Recarvit account.</p>
    </div>
    """
    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [order.email],
            "subject": f"Order Confirmed - {order.order_id}",
            "html": html,
        })
        return True
    except Exception as e:
        logger.error(f"Failed to send order confirmation email for {order.order_id}: {e}")
        return False
