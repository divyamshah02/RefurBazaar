"""
Order/invoice.py
----------------
Invoice PDF generation for Recarvit orders — matches the
"Recarvit Editable Tax Invoice Template" layout (GST tax invoice format).

GET  /api/orders/invoice/<order_id>/

Requires: pip install reportlab
Logo  : static/images/new logo/Recarvit Logo edited-nobg.png
        (also accepted at Order/static/images/logo.png as fallback)
"""

import os
from io import BytesIO
from decimal import Decimal, ROUND_HALF_UP

from django.http import HttpResponse
from django.conf import settings
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image as RLImage
)
from reportlab.pdfgen import canvas

from Order.models import Order

# ---------------------------------------------------------------------------
# Brand / document colours
# ---------------------------------------------------------------------------
GREEN       = colors.HexColor("#2E7D32")
LIGHT_GREEN = colors.HexColor("#E8F5E9")
DARK_GRAY   = colors.HexColor("#212121")
MID_GRAY    = colors.HexColor("#616161")
LIGHT_GRAY  = colors.HexColor("#F5F5F5")
BORDER_GRAY = colors.HexColor("#BDBDBD")
WHITE       = colors.white

PAGE_W, PAGE_H = A4
MARGIN = 12 * mm

MARKETPLACE_NAME = "Recarvit"
MARKETPLACE_LEGAL_NAME = "Refurbazaar Private Limited"
MARKETPLACE_GSTIN = "27AAPCR1909P1ZN"
MARKETPLACE_ADDRESS = "501, Nilgiri, N. S. Road No. 9, JVPD Scheme, Vile Parle (W), Mumbai, Maharashtra - 400056"
DEFAULT_HSN = "8517"  # Mobile phones / communication devices

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fmt_inr(value):
    """Format Decimal/float as 1,23,456.00 (Indian grouping, no symbol)."""
    try:
        v = Decimal(str(value))
    except Exception:
        v = Decimal("0")
    v = v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    s = f"{v:,.2f}"
    parts = s.split(".")
    integer = parts[0].replace(",", "")
    dec = parts[1]
    neg = integer.startswith("-")
    if neg:
        integer = integer[1:]
    if len(integer) > 3:
        last3 = integer[-3:]
        rest = integer[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        integer = ",".join(groups) + "," + last3
    return f"{'-' if neg else ''}{integer}.{dec}"


_ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
         "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
         "Seventeen", "Eighteen", "Nineteen"]
_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]


def _two_digit_words(n):
    if n < 20:
        return _ONES[n]
    return _TENS[n // 10] + (f" {_ONES[n % 10]}" if n % 10 else "")


def _three_digit_words(n):
    if n >= 100:
        return f"{_ONES[n // 100]} Hundred" + (f" {_two_digit_words(n % 100)}" if n % 100 else "")
    return _two_digit_words(n)


def _amount_in_words(value):
    """Convert a rupee amount to words using the Indian numbering system."""
    try:
        v = int(Decimal(str(value)).to_integral_value(rounding=ROUND_HALF_UP))
    except Exception:
        v = 0
    if v == 0:
        return "Rupees Zero Only"

    crore, v = divmod(v, 10_000_000)
    lakh, v = divmod(v, 100_000)
    thousand, v = divmod(v, 1_000)
    hundred = v

    parts = []
    if crore:
        parts.append(f"{_three_digit_words(crore)} Crore")
    if lakh:
        parts.append(f"{_three_digit_words(lakh)} Lakh")
    if thousand:
        parts.append(f"{_three_digit_words(thousand)} Thousand")
    if hundred:
        parts.append(_three_digit_words(hundred))

    return f"Rupees {' '.join(parts)} Only"


def _logo_path():
    candidates = [
        os.path.join(settings.BASE_DIR, "static", "images", "new logo", "Recarvit Logo edited-nobg.png"),
        os.path.join(settings.BASE_DIR, "static", "images", "logo.png"),
        os.path.join(os.path.dirname(__file__), "static", "images", "logo.png"),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def _get_company_profile(refurbisher_user):
    return getattr(refurbisher_user, "company_profile", None)


# ---------------------------------------------------------------------------
# PDF canvas callback – page numbers + border
# ---------------------------------------------------------------------------

class _NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_page(total)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def _draw_page(self, total):
        self.saveState()
        self.setStrokeColor(GREEN)
        self.setLineWidth(1)
        self.rect(MARGIN * 0.5, MARGIN * 0.5, PAGE_W - MARGIN, PAGE_H - MARGIN)
        self.setFillColor(MID_GRAY)
        self.setFont("Helvetica", 7)
        footer = f"Page {self._pageNumber} of {total}  |  This is a computer generated invoice  |  {MARKETPLACE_NAME}.com"
        self.drawCentredString(PAGE_W / 2, MARGIN * 0.35, footer)
        self.restoreState()


# ---------------------------------------------------------------------------
# Main view
# ---------------------------------------------------------------------------

class InvoiceView(APIView):
    """
    GET /api/orders/invoice/<order_id>/
    Returns a downloadable GST tax-invoice PDF for the given order.
    Accessible without authentication (order_id acts as the token).
    """

    def get(self, request, order_id):
        order = get_object_or_404(Order, order_id=order_id)
        pdf_bytes = self._build_pdf(order)

        filename = f"Recarvit_Invoice_{order.order_id}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    # ------------------------------------------------------------------
    # PDF builder
    # ------------------------------------------------------------------

    def _build_pdf(self, order: Order) -> bytes:
        buf = BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=MARGIN,
            rightMargin=MARGIN,
            topMargin=MARGIN,
            bottomMargin=MARGIN + 6 * mm,
            title=f"Tax Invoice - {order.order_id}",
            author=MARKETPLACE_NAME,
        )

        total_w = PAGE_W - MARGIN * 2
        story = []

        story += self._header_block(order, total_w)
        story.append(Spacer(1, 3 * mm))
        story += self._invoice_meta_block(order, total_w)
        story.append(Spacer(1, 3 * mm))

        # Build one invoice block per seller (Recarvit facilitates GST
        # invoices on behalf of each refurbisher separately).
        items_by_seller = {}
        for item in order.items.select_related(
            "listing_unit__listing__model__brand", "refurbisher"
        ).all():
            rid = item.refurbisher_id
            items_by_seller.setdefault(rid, {"refurbisher": item.refurbisher, "items": []})
            items_by_seller[rid]["items"].append(item)

        seller_groups = list(items_by_seller.values())
        delivery_share = Decimal(str(order.delivery_charge or 0))

        for idx, group in enumerate(seller_groups):
            story += self._seller_dispatch_block(group["refurbisher"], total_w)
            story.append(Spacer(1, 2 * mm))
            story += self._bill_ship_block(order, total_w)
            story.append(Spacer(1, 2 * mm))

            # Only attach delivery charge once, on the last seller block
            group_delivery = delivery_share if idx == len(seller_groups) - 1 else Decimal("0")
            story += self._items_table(group["items"], total_w, group_delivery)
            story.append(Spacer(1, 2 * mm))
            story += self._totals_block(group["items"], group_delivery, group["refurbisher"], total_w)
            story.append(Spacer(1, 5 * mm))

        story += self._declaration_block(total_w)
        story.append(Spacer(1, 3 * mm))
        story += self._footer_block()

        doc.build(story, canvasmaker=_NumberedCanvas)
        return buf.getvalue()

    # ------------------------------------------------------------------
    # Section builders
    # ------------------------------------------------------------------

    def _header_block(self, order: Order, total_w):
        logo_path = _logo_path()
        if logo_path:
            logo = RLImage(logo_path, width=40 * mm, height=13 * mm, kind="proportional")
        else:
            logo = Paragraph(
                f'<font color="#2E7D32" size="16"><b>{MARKETPLACE_NAME.lower()}</b></font>',
                ParagraphStyle("logo_text", fontSize=16, textColor=GREEN, leading=18),
            )
        title_style = ParagraphStyle(
            "inv_title", fontSize=14, textColor=DARK_GRAY, leading=17,
            alignment=TA_RIGHT, fontName="Helvetica-Bold",
        )
        sub_style = ParagraphStyle(
            "inv_sub", fontSize=9, textColor=MID_GRAY, leading=12, alignment=TA_RIGHT,
        )
        right_block = [
            Paragraph("TAX INVOICE", title_style),
            Paragraph("ORIGINAL FOR RECIPIENT", sub_style),
        ]
        t = Table([[logo, right_block]], colWidths=[total_w * 0.45, total_w * 0.55])
        t.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_GRAY),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        return [t]

    def _invoice_meta_block(self, order: Order, total_w):
        label_style = ParagraphStyle("meta_label", fontSize=7.5, textColor=MID_GRAY, leading=10, fontName="Helvetica-Bold")
        value_style = ParagraphStyle("meta_value", fontSize=8.5, textColor=DARK_GRAY, leading=12)

        def cell(label, value):
            return [Paragraph(label, label_style), Paragraph(str(value), value_style)]

        inv_number = order.order_number or order.order_id
        row1 = [
            cell("Invoice No.", inv_number),
            cell("Invoice Date", order.created_at.strftime("%d-%m-%Y")),
            cell("Recarvit Order ID", order.order_id),
            cell("Order Date", order.created_at.strftime("%d-%m-%Y")),
        ]
        row2 = [
            cell("Payment Mode", "Prepaid" if order.payment_received else order.get_payment_method_display()),
            cell("Supply Type", "B2C"),
            cell("Reverse Charge", "No"),
            cell("Currency", "INR"),
        ]
        col_w = total_w / 4
        t = Table([row1, row2], colWidths=[col_w] * 4)
        t.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_GRAY),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, BORDER_GRAY),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        return [t]

    def _seller_dispatch_block(self, refurbisher, total_w):
        head_style = ParagraphStyle("addr_head", fontSize=8, textColor=GREEN, leading=11, fontName="Helvetica-Bold")
        body_style = ParagraphStyle("addr_body", fontSize=8.5, textColor=DARK_GRAY, leading=13)

        cp = _get_company_profile(refurbisher)
        if cp:
            company_name = cp.company_name or f"{refurbisher.first_name} {refurbisher.last_name}"
            gst = cp.gst_registration_no or "N/A"
            addr_parts = filter(None, [cp.address_line_1, cp.address_line_2, cp.city, cp.pincode])
            seller_addr = ", ".join(addr_parts) or "Address not provided"
            seller_state = cp.state or "N/A"
            warehouse_name = getattr(cp, "shiprocket_pickup_location", None) or company_name
        else:
            company_name = f"{refurbisher.first_name} {refurbisher.last_name}"
            gst = "N/A"
            seller_addr = "Address not provided"
            seller_state = "N/A"
            warehouse_name = company_name

        sold_by = [
            Paragraph("SOLD BY / SUPPLIER", head_style),
            Paragraph(f"<b>{company_name}</b>", body_style),
            Paragraph(seller_addr, body_style),
            Paragraph(f"<b>GSTIN:</b> {gst}", body_style),
            Paragraph(f"State: {seller_state}", body_style),
        ]
        dispatch_from = [
            Paragraph("DISPATCH FROM", head_style),
            Paragraph(f"<b>{warehouse_name}</b>", body_style),
            Paragraph(seller_addr, body_style),
            Paragraph(f"State: {seller_state}", body_style),
        ]
        col_w = total_w / 2
        t = Table([[sold_by, dispatch_from]], colWidths=[col_w, col_w])
        t.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_GRAY),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, BORDER_GRAY),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        return [t]

    def _bill_ship_block(self, order: Order, total_w):
        head_style = ParagraphStyle("addr_head2", fontSize=8, textColor=GREEN, leading=11, fontName="Helvetica-Bold")
        body_style = ParagraphStyle("addr_body2", fontSize=8.5, textColor=DARK_GRAY, leading=13)

        if order.different_billing_address and order.billing_address:
            bill_addr = order.billing_address
            bill_city_state = f"{order.billing_city}, {order.billing_state} - {order.billing_pincode}"
        else:
            bill_addr = order.shipping_address
            bill_city_state = f"{order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}"

        bill_to = [
            Paragraph("BILL TO", head_style),
            Paragraph(f"<b>{order.first_name} {order.last_name}</b>", body_style),
            Paragraph(bill_addr, body_style),
            Paragraph(bill_city_state, body_style),
            Paragraph("GSTIN: NA (B2C)", body_style),
        ]
        ship_to = [
            Paragraph("SHIP TO / PLACE OF DELIVERY", head_style),
            Paragraph(f"<b>{order.first_name} {order.last_name}</b>", body_style),
            Paragraph(order.shipping_address, body_style),
            Paragraph(f"{order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}", body_style),
        ]
        col_w = total_w / 2
        t = Table([[bill_to, ship_to]], colWidths=[col_w, col_w])
        t.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_GRAY),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, BORDER_GRAY),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        return [t]

    def _item_tax_breakup(self, price, intra_state):
        """Given a GST-inclusive price, return (taxable_value, cgst, sgst, igst, tax_total)."""
        price = Decimal(str(price))
        gst_rate = Decimal("0.18")
        taxable = (price / (1 + gst_rate)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        tax_total = price - taxable
        if intra_state:
            half = (tax_total / 2).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            return taxable, half, tax_total - half, Decimal("0"), tax_total
        return taxable, Decimal("0"), Decimal("0"), tax_total, tax_total

    def _items_table(self, items, total_w, delivery_charge):
        header_style = ParagraphStyle("hdr", fontSize=7.5, fontName="Helvetica-Bold", textColor=WHITE, leading=10, alignment=TA_CENTER)
        cell_style = ParagraphStyle("cell", fontSize=7.5, textColor=DARK_GRAY, leading=10)
        cell_center = ParagraphStyle("cell_c", parent=cell_style, alignment=TA_CENTER)
        cell_right = ParagraphStyle("cell_r", parent=cell_style, alignment=TA_RIGHT)

        header_row = [Paragraph(h, header_style) for h in
                      ["#", "Description", "HSN", "Qty", "Taxable\nValue", "GST %", "Tax Type", "Tax\nAmount", "Total"]]
        rows = [header_row]

        refurbisher = items[0].refurbisher if items else None
        cp = _get_company_profile(refurbisher) if refurbisher else None
        seller_state = (cp.state or "").strip().lower() if cp else ""
        intra_state = seller_state and seller_state == (items[0].order.shipping_state or "").strip().lower() if items else True

        for idx, item in enumerate(items, 1):
            lu = item.listing_unit
            listing = lu.listing
            model = listing.model
            brand = model.brand.name
            product_name = f"{brand} {model.name}"
            condition = item.condition_at_purchase.title()
            imei_str = f"<br/><font size='6.5' color='#757575'>IMEI: {item.device_imei}</font>" if item.device_imei else ""
            desc = Paragraph(
                f"<b>{product_name}</b><br/><font size='6.5' color='#2E7D32'>Condition: {condition}</font>{imei_str}",
                cell_style,
            )

            taxable, cgst, sgst, igst, tax_total = self._item_tax_breakup(item.price_at_purchase, intra_state)
            tax_type = "CGST+SGST" if intra_state else "IGST"
            tax_line = f"C:{_fmt_inr(cgst)} S:{_fmt_inr(sgst)}" if intra_state else f"IGST: {_fmt_inr(igst)}"

            rows.append([
                Paragraph(str(idx), cell_center),
                desc,
                Paragraph(DEFAULT_HSN, cell_center),
                Paragraph("1", cell_center),
                Paragraph(_fmt_inr(taxable), cell_right),
                Paragraph("18%", cell_center),
                Paragraph(tax_type, cell_center),
                Paragraph(tax_line, cell_right),
                Paragraph(_fmt_inr(item.price_at_purchase), cell_right),
            ])

        if delivery_charge and delivery_charge > 0:
            taxable, cgst, sgst, igst, tax_total = self._item_tax_breakup(delivery_charge, intra_state)
            tax_type = "CGST+SGST" if intra_state else "IGST"
            tax_line = f"C:{_fmt_inr(cgst)} S:{_fmt_inr(sgst)}" if intra_state else f"IGST: {_fmt_inr(igst)}"
            rows.append([
                Paragraph(str(len(items) + 1), cell_center),
                Paragraph("Shipping / Delivery Charges", cell_style),
                Paragraph("9965", cell_center),
                Paragraph("1", cell_center),
                Paragraph(_fmt_inr(taxable), cell_right),
                Paragraph("18%", cell_center),
                Paragraph(tax_type, cell_center),
                Paragraph(tax_line, cell_right),
                Paragraph(_fmt_inr(delivery_charge), cell_right),
            ])

        col_widths = [
            total_w * 0.04, total_w * 0.26, total_w * 0.08, total_w * 0.06,
            total_w * 0.13, total_w * 0.08, total_w * 0.10, total_w * 0.14, total_w * 0.11,
        ]
        t = Table(rows, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), DARK_GRAY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_GRAY),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, BORDER_GRAY),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        return [t]

    def _totals_block(self, items, delivery_charge, refurbisher, total_w):
        label_style = ParagraphStyle("tot_label", fontSize=8, textColor=MID_GRAY, leading=11)
        value_style = ParagraphStyle("tot_value", fontSize=9, textColor=DARK_GRAY, leading=12, fontName="Helvetica-Bold")
        words_style = ParagraphStyle("words", fontSize=8, textColor=DARK_GRAY, leading=12, fontName="Helvetica-Bold")
        note_style = ParagraphStyle("note", fontSize=7, textColor=MID_GRAY, leading=10)

        cp = _get_company_profile(refurbisher)
        seller_state = (cp.state or "").strip().lower() if cp else ""
        intra_state = bool(seller_state) and seller_state == (items[0].order.shipping_state or "").strip().lower() if items else True

        taxable_total = Decimal("0")
        cgst_total = Decimal("0")
        sgst_total = Decimal("0")
        igst_total = Decimal("0")
        grand_total = Decimal("0")

        for item in items:
            taxable, cgst, sgst, igst, _ = self._item_tax_breakup(item.price_at_purchase, intra_state)
            taxable_total += taxable
            cgst_total += cgst
            sgst_total += sgst
            igst_total += igst
            grand_total += Decimal(str(item.price_at_purchase))

        if delivery_charge and delivery_charge > 0:
            taxable, cgst, sgst, igst, _ = self._item_tax_breakup(delivery_charge, intra_state)
            taxable_total += taxable
            cgst_total += cgst
            sgst_total += sgst
            igst_total += igst
            grand_total += Decimal(str(delivery_charge))

        rounded_total = grand_total.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        round_off = rounded_total - grand_total

        words_cell = [
            Paragraph("AMOUNT IN WORDS", ParagraphStyle("awh", fontSize=7.5, textColor=GREEN, leading=10, fontName="Helvetica-Bold")),
            Paragraph(_amount_in_words(rounded_total), words_style),
            Spacer(1, 2 * mm),
            Paragraph("Tax payable under reverse charge: No", note_style),
        ]

        sgst_igst_value = igst_total if igst_total > 0 else sgst_total
        sgst_igst_label = "IGST" if igst_total > 0 else "SGST"

        totals_rows = [
            [Paragraph("Total Taxable Value", label_style), Paragraph(_fmt_inr(taxable_total), value_style)],
            [Paragraph("CGST", label_style), Paragraph(_fmt_inr(cgst_total), value_style)],
            [Paragraph(sgst_igst_label, label_style), Paragraph(_fmt_inr(sgst_igst_value), value_style)],
            [Paragraph("Round Off", label_style), Paragraph(_fmt_inr(round_off), value_style)],
            [Paragraph("INVOICE TOTAL", ParagraphStyle("itl", parent=label_style, textColor=WHITE, fontName="Helvetica-Bold")),
             Paragraph(_fmt_inr(rounded_total), ParagraphStyle("itv", parent=value_style, textColor=WHITE))],
        ]
        totals_tbl = Table(totals_rows, colWidths=[total_w * 0.27, total_w * 0.17])
        totals_tbl.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -2), 0.3, BORDER_GRAY),
            ("INNERGRID", (0, 0), (-1, -2), 0.3, BORDER_GRAY),
            ("BACKGROUND", (0, -1), (-1, -1), GREEN),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ]))

        outer = Table([[words_cell, totals_tbl]], colWidths=[total_w * 0.56, total_w * 0.44])
        outer.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_GRAY),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (0, 0), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (1, 0), (1, 0), 0),
            ("LEFTPADDING", (1, 0), (1, 0), 0),
            ("TOPPADDING", (1, 0), (1, 0), 0),
            ("BOTTOMPADDING", (1, 0), (1, 0), 0),
        ]))
        return [outer]

    def _declaration_block(self, total_w):
        body_style = ParagraphStyle("decl", fontSize=7.5, textColor=MID_GRAY, leading=11)
        sig_style = ParagraphStyle("sig", fontSize=8.5, textColor=DARK_GRAY, leading=13, alignment=TA_CENTER)

        decl = Paragraph(
            f"<b>DECLARATION</b><br/>This tax invoice is generated through the {MARKETPLACE_NAME} marketplace on "
            f"behalf of the supplier stated above. {MARKETPLACE_NAME} / {MARKETPLACE_LEGAL_NAME} acts as the "
            "marketplace facilitator and is not the supplier of the goods.",
            body_style,
        )
        sig = [
            Paragraph("For the Supplier", sig_style),
            Spacer(1, 8 * mm),
            Paragraph("Authorised Signatory", sig_style),
        ]
        t = Table([[decl, sig]], colWidths=[total_w * 0.65, total_w * 0.35])
        t.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_GRAY),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        return [t]

    def _footer_block(self):
        style = ParagraphStyle("foot", fontSize=7.5, textColor=MID_GRAY, leading=11, alignment=TA_CENTER)
        return [Paragraph(
            f"<b>Marketplace Facilitator: {MARKETPLACE_NAME} | Operated by {MARKETPLACE_LEGAL_NAME} | GSTIN: {MARKETPLACE_GSTIN}</b>"
            f"<br/>{MARKETPLACE_ADDRESS}",
            style,
        )]
