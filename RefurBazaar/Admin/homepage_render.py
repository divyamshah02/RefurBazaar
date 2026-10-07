"""
Admin/homepage_render.py

Builds the template context for the server-rendered dynamic homepage
(/dy_homepage). Every product card is resolved live from a real
Product.ListingUnit, so price, image, specs and availability are always
current. Admin overrides on a section item (name, price, badge ...) win
when they are filled in.
"""

from .models import (
    PromoBanner, HeroBannerSlide, TrustStripItem, CategoryCard,
    ProductSection, ProductSectionItem, SpotlightProduct,
    PriceRangeCard, ShopByPriceSlide, TestimonialCard,
    FAQItem, StatItem, PartnerCTABanner, RenewedBanner, HomepageSectionText,
)

FALLBACK_IMAGE = '/static/images/new logo/Recarvit Logo edited-nobg.png'

DEFAULT_TEXTS = {
    'categories':    dict(eyebrow='', heading='SHOP BY CATEGORY', subheading=''),
    'spotlight':     dict(eyebrow='FEATURED PRODUCT OF THE DAY', heading="Today's Spotlight",
                          subheading='Handpicked daily — the deepest discount and biggest savings on a flagship unit'),
    'price_range':   dict(eyebrow='', heading='Find Your Price Range', subheading=''),
    'shop_by_price': dict(eyebrow='', heading='Shop by Price', subheading=''),
    'testimonials':  dict(eyebrow='', heading='What Our Customers Say', subheading=''),
    'faq':           dict(eyebrow='', heading='Frequently Asked Questions', subheading=''),
}

COLOR_MAP = {
    'space gray': '#53565a', 'space grey': '#53565a', 'graphite': '#41424c',
    'midnight': '#1f2a37', 'starlight': '#f0e5d3', 'rose gold': '#e0bfb8',
    'gold': '#e6c98f', 'silver': '#d9dadb', 'pacific blue': '#2f6e8a',
    'sierra blue': '#9bb5ce', 'alpine green': '#4c5f4c', 'deep purple': '#5a4a6f',
    'phantom black': '#1c1c1e', 'natural titanium': '#b8b3a8', 'titanium': '#b8b3a8',
}


def inr(value):
    """Format a number with Indian digit grouping: 1234567 -> ₹12,34,567."""
    try:
        n = int(round(float(value)))
    except (TypeError, ValueError):
        return ''
    s = str(abs(n))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        s = ','.join(parts) + ',' + tail
    return f"₹{'-' if n < 0 else ''}{s}"


def rel_url(field):
    if field and hasattr(field, 'url'):
        try:
            return field.url
        except Exception:
            return None
    return None


def css_color(name):
    key = (name or '').strip().lower()
    if not key:
        return None
    return COLOR_MAP.get(key) or key.replace(' ', '')


def _unit_attrs(unit):
    """Return {lowercase attribute name: value} for a listing unit."""
    out = {}
    for ua in unit.attributes.select_related('attribute').all():
        out[ua.attribute.name.strip().lower()] = ua.value
    return out


def _pick(attrs, *needles):
    for name, value in attrs.items():
        if any(n in name for n in needles):
            return value
    return ''


def _spec_parts(unit, attrs):
    storage = _pick(attrs, 'storage', 'rom', 'ssd', 'hdd')
    ram = _pick(attrs, 'ram', 'memory')
    parts = []
    if storage:
        parts.append(storage)
    if ram and ram != storage:
        parts.append(ram if 'ram' in ram.lower() else f"{ram} RAM")
    return parts


def _primary_image(model):
    from Product.models import ProductModelImage
    image = (ProductModelImage.objects.filter(product_model=model, is_primary=True).first()
             or ProductModelImage.objects.filter(product_model=model).first())
    return rel_url(image.image) if image else rel_url(model.image)


def _discount(price, original):
    try:
        price, original = float(price), float(original)
    except (TypeError, ValueError):
        return 0
    if original > price > 0:
        return int(round((original - price) / original * 100))
    return 0


def _live_unit(unit_id):
    if not unit_id:
        return None
    from Product.models import ListingUnit
    return (ListingUnit.objects
            .select_related('listing', 'listing__model', 'listing__model__brand')
            .filter(pk=unit_id).first())


def build_card(item):
    """Resolve one ProductSectionItem into a display-ready dict, or None to skip."""
    unit = _live_unit(item.listing_unit_id)
    card = {
        'title': '', 'image': None, 'specs': '', 'price': '', 'original': '',
        'badge': '', 'badge_style': item.badge_style, 'url': '/shop/',
        'colors': [], 'sold_out': False,
    }
    if unit:
        model = unit.listing.model
        attrs = _unit_attrs(unit)
        specs = _spec_parts(unit, attrs) or [unit.get_condition_display()]
        color = css_color(_pick(attrs, 'colo'))
        original = model.price_max if model.price_max and float(model.price_max) > float(unit.price) else None
        discount = _discount(unit.price, original)
        card.update(
            title=f"{model.brand.name} {model.name}".strip(),
            image=_primary_image(model),
            specs=' | '.join(specs),
            price=inr(unit.price),
            original=inr(original) if original else '',
            badge=f"-{discount}%" if discount else '',
            url=f"/product/{unit.id}/",
            colors=[color] if color else [],
            sold_out=bool(unit.is_sold or not unit.is_available),
        )
    elif not item.display_name:
        return None

    if item.display_name:
        card['title'] = item.display_name
    override_image = rel_url(item.display_image)
    if override_image:
        card['image'] = override_image
    if item.specs_text:
        card['specs'] = item.specs_text
    if item.display_price:
        card['price'] = item.display_price
    if item.original_price:
        card['original'] = item.original_price
    if item.badge_text:
        card['badge'] = item.badge_text
    if item.link_url:
        card['url'] = item.link_url
    card['image'] = card['image'] or FALLBACK_IMAGE
    return card


def build_sections():
    sections = {}
    for section in ProductSection.objects.filter(is_active=True):
        cards = []
        for item in section.items.filter(is_active=True):
            card = build_card(item)
            if card:
                cards.append(card)
        sections[section.section_type] = {
            'title': section.title,
            'subtitle': section.subtitle,
            'bg_style': section.bg_style,
            'see_all_url': section.see_all_url or '/shop/',
            'see_all_text': section.see_all_text or 'See all',
            'show_timer': section.show_timer,
            'promo_badge': section.promo_badge,
            'promo_heading': section.promo_heading,
            'promo_btn_text': section.promo_btn_text,
            'promo_btn_url': section.promo_btn_url or '/shop/',
            'promo_image': rel_url(section.promo_image),
            'promo_style': section.promo_style,
            'cards': cards,
        }
    return sections


def build_spotlight():
    spot = SpotlightProduct.objects.filter(is_active=True).first()
    if not spot:
        return None
    unit = _live_unit(spot.listing_unit_id)
    data = {
        'brand': spot.brand_label, 'title': spot.display_name, 'image': rel_url(spot.display_image),
        'specs': [s for s in (spot.specs or []) if s], 'price': spot.price,
        'original': spot.original_price, 'discount': spot.discount_pct,
        'save': spot.save_amount, 'reviews': spot.review_count,
        'available': spot.available_count, 'url': spot.link_url or '/shop/',
    }
    if unit:
        model = unit.listing.model
        attrs = _unit_attrs(unit)
        original = model.price_max if model.price_max and float(model.price_max) > float(unit.price) else None
        live_specs = [v for k, v in attrs.items() if v and 'colo' not in k][:4]
        data['title'] = spot.display_name or f"{model.brand.name} {model.name}".strip()
        data['brand'] = spot.brand_label or model.brand.name.upper()
        data['image'] = data['image'] or _primary_image(model)
        data['specs'] = data['specs'] or [s.upper() for s in live_specs]
        data['price'] = spot.price or inr(unit.price)
        if not spot.original_price and original:
            data['original'] = inr(original)
        if not spot.discount_pct:
            data['discount'] = _discount(unit.price, original)
        if not spot.save_amount and original:
            data['save'] = inr(float(original) - float(unit.price))
        if not spot.available_count:
            data['available'] = unit.listing.units.filter(is_available=True, is_sold=False).count()
        data['url'] = spot.link_url or f"/product/{unit.id}/"
    data['image'] = data['image'] or FALLBACK_IMAGE
    return data


def build_texts():
    texts = {k: dict(v, visible=True) for k, v in DEFAULT_TEXTS.items()}
    for row in HomepageSectionText.objects.all():
        texts[row.key] = {
            'eyebrow': row.eyebrow, 'heading': row.heading,
            'subheading': row.subheading, 'visible': row.is_active,
        }
    return texts


def build_homepage_context():
    categories = []
    for c in CategoryCard.objects.filter(is_active=True):
        categories.append({
            'name': c.name, 'image': rel_url(c.image) or FALLBACK_IMAGE, 'url': c.link_url,
            'badge': c.badge_text, 'badge_style': c.badge_style or 'bg-dark',
            'count': c.product_count, 'start': c.starting_price,
        })
    return {
        'promo': PromoBanner.objects.filter(is_active=True).first(),
        'hero_slides': list(HeroBannerSlide.objects.filter(is_active=True)),
        'trust_items': list(TrustStripItem.objects.filter(is_active=True)),
        'renewed': RenewedBanner.objects.filter(is_active=True).first(),
        'categories': categories,
        'spotlight': build_spotlight(),
        'sections': build_sections(),
        'price_cards': list(PriceRangeCard.objects.filter(is_active=True)),
        'sbp_slides': [
            {'image': rel_url(s.image), 'line1': s.label_line1, 'line2': s.label_line2, 'url': s.link_url}
            for s in ShopByPriceSlide.objects.filter(is_active=True)
        ],
        'testimonials': [
            {'initials': t.initials, 'name': t.name, 'location': t.location,
             'product': t.product_bought, 'icon': t.product_icon, 'text': t.review_text,
             'stars': range(max(1, min(5, t.rating)))}
            for t in TestimonialCard.objects.filter(is_active=True)
        ],
        'faqs': list(FAQItem.objects.filter(is_active=True)),
        'stats': list(StatItem.objects.filter(is_active=True)),
        'partner': PartnerCTABanner.objects.filter(is_active=True).first(),
        'texts': build_texts(),
    }
