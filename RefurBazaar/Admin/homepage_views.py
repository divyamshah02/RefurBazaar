"""
Homepage/views.py

Public API:
  GET /api/homepage/config/
  Returns ALL homepage configuration in a single JSON payload so the
  frontend can render the page entirely from data.

Admin API (require staff login):
  GET/POST   /api/homepage/<resource>/
  GET/PUT/DELETE /api/homepage/<resource>/<pk>/

Resources: hero-slides, trust-items, categories, product-sections,
           product-section-items, spotlight, price-range-cards,
           shop-by-price, testimonials, faqs, stats, nav-links,
           partner-cta, renewed-banner, promo-banner
"""

from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

import json

from .models import (
    PromoBanner, HeroBannerSlide, TrustStripItem, CategoryCard,
    ProductSection, ProductSectionItem, SpotlightProduct,
    PriceRangeCard, ShopByPriceSlide, TestimonialCard,
    FAQItem, StatItem, NavCategoryLink, PartnerCTABanner, RenewedBanner
)


# ─────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────

def image_url(request, img_field):
    """Return absolute URL or None for an ImageField."""
    if img_field and hasattr(img_field, 'url'):
        try:
            return request.build_absolute_uri(img_field.url)
        except Exception:
            return None
    return None


def ok(data=None, status=200):
    return JsonResponse({'success': True, 'data': data or {}}, status=status)


def err(msg, status=400):
    return JsonResponse({'success': False, 'error': msg}, status=status)


def staff_required(fn):
    """Decorator: return 403 if user is not staff."""
    def wrapper(self, request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_staff:
            return err('Forbidden', 403)
        return fn(self, request, *args, **kwargs)
    return wrapper


# ─────────────────────────────────────────────────────────────────────
# SERIALISER FUNCTIONS  (plain dicts, no DRF dependency)
# ─────────────────────────────────────────────────────────────────────

def ser_promo(obj):
    return {'id': obj.id, 'text': obj.text, 'is_active': obj.is_active}


def ser_hero_slide(obj, request):
    return {
        'id':                   obj.id,
        'order':                obj.order,
        'is_active':            obj.is_active,
        'bg_style':             obj.bg_style,
        'tag_text':             obj.tag_text,
        'tag_style':            obj.tag_style,
        'heading':              obj.heading,
        'body_text':            obj.body_text,
        'btn1_text':            obj.btn1_text,
        'btn1_url':             obj.btn1_url,
        'btn1_style':           obj.btn1_style,
        'btn2_text':            obj.btn2_text,
        'btn2_url':             obj.btn2_url,
        'btn2_style':           obj.btn2_style,
        'image':                image_url(request, obj.image),
        'image_max_width':      obj.image_max_width,
        'badge_top_right':      obj.badge_top_right,
        'badge_bottom_center':  obj.badge_bottom_center,
        'badge_circle':         obj.badge_circle,
    }


def ser_trust(obj):
    return {'id': obj.id, 'icon': obj.icon, 'title': obj.title,
            'subtitle': obj.subtitle, 'order': obj.order}


def ser_category(obj, request):
    return {
        'id':            obj.id,
        'name':          obj.name,
        'image':         image_url(request, obj.image),
        'link_url':      obj.link_url,
        'badge_text':    obj.badge_text,
        'badge_style':   obj.badge_style,
        'product_count': obj.product_count,
        'starting_price':obj.starting_price,
        'order':         obj.order,
    }


def ser_section_item(obj, request):
    return {
        'id':               obj.id,
        'product_model_id': obj.product_model_id,
        'display_name':     obj.display_name,
        'display_image':    image_url(request, obj.display_image),
        'badge_text':       obj.badge_text,
        'badge_style':      obj.badge_style,
        'specs_text':       obj.specs_text,
        'display_price':    obj.display_price,
        'original_price':   obj.original_price,
        'link_url':         obj.link_url,
        'order':            obj.order,
    }


def ser_section(obj, request):
    return {
        'id':           obj.id,
        'title':        obj.title,
        'section_type': obj.section_type,
        'bg_style':     obj.bg_style,
        'see_all_url':  obj.see_all_url,
        'see_all_text': obj.see_all_text,
        'show_timer':   obj.show_timer,
        'order':        obj.order,
        'promo_badge':  obj.promo_badge,
        'promo_heading':obj.promo_heading,
        'promo_btn_text':obj.promo_btn_text,
        'promo_btn_url': obj.promo_btn_url,
        'promo_image':  image_url(request, obj.promo_image),
        'promo_style':  obj.promo_style,
        'items': [ser_section_item(i, request)
                  for i in obj.items.filter(is_active=True)],
    }


def ser_spotlight(obj, request):
    return {
        'id':               obj.id,
        'brand_label':      obj.brand_label,
        'product_model_id': obj.product_model_id,
        'display_name':     obj.display_name,
        'display_image':    image_url(request, obj.display_image),
        'specs':            obj.specs,
        'price':            obj.price,
        'original_price':   obj.original_price,
        'discount_pct':     obj.discount_pct,
        'save_amount':      obj.save_amount,
        'review_count':     obj.review_count,
        'available_count':  obj.available_count,
        'link_url':         obj.link_url,
    }


def ser_price_range(obj):
    return {
        'id':           obj.id,
        'tier':         obj.tier,
        'label':        obj.label,
        'description':  obj.description,
        'link_text':    obj.link_text,
        'link_url':     obj.link_url,
        'is_dark':      obj.is_dark,
        'order':        obj.order,
    }


def ser_sbp(obj, request):
    return {
        'id':           obj.id,
        'image':        image_url(request, obj.image),
        'label_line1':  obj.label_line1,
        'label_line2':  obj.label_line2,
        'link_url':     obj.link_url,
        'order':        obj.order,
    }


def ser_testimonial(obj):
    return {
        'id':            obj.id,
        'initials':      obj.initials,
        'name':          obj.name,
        'location':      obj.location,
        'product_bought':obj.product_bought,
        'product_icon':  obj.product_icon,
        'review_text':   obj.review_text,
        'rating':        obj.rating,
        'order':         obj.order,
    }


def ser_faq(obj):
    return {'id': obj.id, 'question': obj.question,
            'answer': obj.answer, 'order': obj.order}


def ser_stat(obj):
    return {
        'id':            obj.id,
        'target_value':  obj.target_value,
        'decimals':      obj.decimals,
        'suffix':        obj.suffix,
        'label':         obj.label,
        'order':         obj.order,
    }


def ser_nav_link(obj):
    return {
        'id':              obj.id,
        'label':           obj.label,
        'url':             obj.url,
        'highlight_class': obj.highlight_class,
        'order':           obj.order,
    }


def ser_partner_cta(obj):
    return {'id': obj.id, 'heading': obj.heading, 'subtext': obj.subtext,
            'btn_text': obj.btn_text, 'btn_url': obj.btn_url}


def ser_renewed(obj):
    return {'id': obj.id, 'heading': obj.heading,
            'subtext': obj.subtext, 'cta_text': obj.cta_text}


# ─────────────────────────────────────────────────────────────────────
# PUBLIC: Full config endpoint
# ─────────────────────────────────────────────────────────────────────

class HomepageConfigView(View):
    """GET /api/homepage/config/ — returns the full homepage data payload."""

    def get(self, request):
        promo = PromoBanner.objects.filter(is_active=True).first()
        renewed = RenewedBanner.objects.filter(is_active=True).first()
        partner = PartnerCTABanner.objects.filter(is_active=True).first()
        spotlight = SpotlightProduct.objects.filter(is_active=True).first()

        data = {
            'promo_banner':     ser_promo(promo) if promo else None,
            'renewed_banner':   ser_renewed(renewed) if renewed else None,
            'partner_cta':      ser_partner_cta(partner) if partner else None,
            'spotlight':        ser_spotlight(spotlight, request) if spotlight else None,

            'hero_slides':      [ser_hero_slide(s, request)
                                  for s in HeroBannerSlide.objects.filter(is_active=True)],
            'trust_items':      [ser_trust(t)
                                  for t in TrustStripItem.objects.filter(is_active=True)],
            'categories':       [ser_category(c, request)
                                  for c in CategoryCard.objects.filter(is_active=True)],
            'product_sections': [ser_section(s, request)
                                  for s in ProductSection.objects.filter(is_active=True)],
            'price_range_cards':[ser_price_range(p)
                                  for p in PriceRangeCard.objects.filter(is_active=True)],
            'shop_by_price':    [ser_sbp(s, request)
                                  for s in ShopByPriceSlide.objects.filter(is_active=True)],
            'testimonials':     [ser_testimonial(t)
                                  for t in TestimonialCard.objects.filter(is_active=True)],
            'faqs':             [ser_faq(f)
                                  for f in FAQItem.objects.filter(is_active=True)],
            'stats':            [ser_stat(s)
                                  for s in StatItem.objects.filter(is_active=True)],
            'nav_links':        [ser_nav_link(n)
                                  for n in NavCategoryLink.objects.filter(is_active=True)],
        }
        return ok(data)


# ─────────────────────────────────────────────────────────────────────
# GENERIC ADMIN CRUD BASE
# ─────────────────────────────────────────────────────────────────────

@method_decorator(csrf_exempt, name='dispatch')
class AdminCRUDView(View):
    """
    Base class for simple list/create (GET/POST on collection)
    and retrieve/update/delete (GET/PUT/DELETE on detail /<pk>/).
    Subclasses set:
      model         — Django model class
      fields        — list of writable field names
      serialise     — function(obj, request) -> dict
      order_field   — field for queryset ordering
    """
    model = None
    fields = []
    order_field = 'order'

    def serialise(self, obj, request):
        raise NotImplementedError

    def get_queryset(self):
        return self.model.objects.all().order_by(self.order_field)

    def get_body(self, request):
        try:
            return json.loads(request.body)
        except Exception:
            return {}

    def apply_fields(self, obj, body):
        for f in self.fields:
            if f in body:
                setattr(obj, f, body[f])

    # ── Collection ──────────────────────────────
    @staff_required
    def list(self, request):
        return ok([self.serialise(o, request) for o in self.get_queryset()])

    @staff_required
    def create(self, request):
        body = self.get_body(request)
        obj = self.model()
        self.apply_fields(obj, body)
        try:
            obj.save()
        except Exception as e:
            return err(str(e))
        return ok(self.serialise(obj, request), 201)

    def get(self, request, pk=None):
        if pk is None:
            return self.list(request)
        return self.detail(request, pk)

    def post(self, request, pk=None):
        if pk is not None:
            return err('POST not allowed on detail', 405)
        return self.create(request)

    # ── Detail ───────────────────────────────────
    @staff_required
    def detail(self, request, pk):
        obj = get_object_or_404(self.model, pk=pk)
        return ok(self.serialise(obj, request))

    @staff_required
    def put(self, request, pk):
        obj = get_object_or_404(self.model, pk=pk)
        body = self.get_body(request)
        self.apply_fields(obj, body)
        try:
            obj.save()
        except Exception as e:
            return err(str(e))
        return ok(self.serialise(obj, request))

    @staff_required
    def delete(self, request, pk):
        obj = get_object_or_404(self.model, pk=pk)
        obj.delete()
        return ok({'deleted': pk})


# ─────────────────────────────────────────────────────────────────────
# CONCRETE ADMIN VIEWS
# ─────────────────────────────────────────────────────────────────────

class AdminHeroSlidesView(AdminCRUDView):
    model  = HeroBannerSlide
    fields = ['order','is_active','bg_style','tag_text','tag_style','heading','body_text',
              'btn1_text','btn1_url','btn1_style','btn2_text','btn2_url','btn2_style',
              'image_max_width','badge_top_right','badge_bottom_center','badge_circle']
    def serialise(self, o, r): return ser_hero_slide(o, r)


class AdminTrustItemsView(AdminCRUDView):
    model  = TrustStripItem
    fields = ['icon','title','subtitle','order','is_active']
    def serialise(self, o, r): return ser_trust(o)


class AdminCategoriesView(AdminCRUDView):
    model  = CategoryCard
    fields = ['name','link_url','badge_text','badge_style','product_count','starting_price','order','is_active']
    def serialise(self, o, r): return ser_category(o, r)


class AdminProductSectionsView(AdminCRUDView):
    model  = ProductSection
    fields = ['title','section_type','bg_style','see_all_url','see_all_text','show_timer',
              'order','is_active','promo_badge','promo_heading','promo_btn_text','promo_btn_url','promo_style']
    def serialise(self, o, r): return ser_section(o, r)


class AdminSectionItemsView(AdminCRUDView):
    model  = ProductSectionItem
    fields = ['section_id','product_model_id','display_name','badge_text','badge_style',
              'specs_text','display_price','original_price','link_url','order','is_active']
    def serialise(self, o, r): return ser_section_item(o, r)


class AdminSpotlightView(AdminCRUDView):
    model  = SpotlightProduct
    fields = ['is_active','brand_label','product_model_id','display_name','specs','price',
              'original_price','discount_pct','save_amount','review_count','available_count','link_url']
    def serialise(self, o, r): return ser_spotlight(o, r)


class AdminPriceRangeView(AdminCRUDView):
    model  = PriceRangeCard
    fields = ['tier','label','description','link_text','link_url','is_dark','order','is_active']
    def serialise(self, o, r): return ser_price_range(o)


class AdminShopByPriceView(AdminCRUDView):
    model  = ShopByPriceSlide
    fields = ['label_line1','label_line2','link_url','order','is_active']
    def serialise(self, o, r): return ser_sbp(o, r)


class AdminTestimonialsView(AdminCRUDView):
    model  = TestimonialCard
    fields = ['initials','name','location','product_bought','product_icon','review_text','rating','order','is_active']
    def serialise(self, o, r): return ser_testimonial(o)


class AdminFAQsView(AdminCRUDView):
    model  = FAQItem
    fields = ['question','answer','order','is_active']
    def serialise(self, o, r): return ser_faq(o)


class AdminStatsView(AdminCRUDView):
    model  = StatItem
    fields = ['target_value','decimals','suffix','label','order','is_active']
    def serialise(self, o, r): return ser_stat(o)


class AdminNavLinksView(AdminCRUDView):
    model  = NavCategoryLink
    fields = ['label','url','highlight_class','order','is_active']
    def serialise(self, o, r): return ser_nav_link(o)


class AdminPartnerCTAView(AdminCRUDView):
    model       = PartnerCTABanner
    order_field = 'id'
    fields = ['heading','subtext','btn_text','btn_url','is_active']
    def serialise(self, o, r): return ser_partner_cta(o)


class AdminRenewedBannerView(AdminCRUDView):
    model       = RenewedBanner
    order_field = 'id'
    fields = ['heading','subtext','cta_text','is_active']
    def serialise(self, o, r): return ser_renewed(o)


class AdminPromoBannerView(AdminCRUDView):
    model       = PromoBanner
    order_field = 'id'
    fields = ['text','is_active']
    def serialise(self, o, r): return ser_promo(o)
