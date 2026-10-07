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
from django.db.models import Q

import json

from .models import (
    PromoBanner, HeroBannerSlide, TrustStripItem, CategoryCard,
    ProductSection, ProductSectionItem, SpotlightProduct,
    PriceRangeCard, ShopByPriceSlide, TestimonialCard,
    FAQItem, StatItem, NavCategoryLink, PartnerCTABanner, RenewedBanner,
    HomepageSectionText
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


def resolve_listing_unit(listing_unit_id, request):
    """Look up a real ListingUnit and return live display data, or None.
    Lazy-imported to avoid a hard cross-app dependency at module load time."""
    if not listing_unit_id:
        return None
    from Product.models import ListingUnit, ProductModelImage
    unit = (ListingUnit.objects
            .select_related('listing', 'listing__model', 'listing__model__brand')
            .filter(pk=listing_unit_id).first())
    if not unit:
        return None
    model = unit.listing.model
    image = ProductModelImage.objects.filter(product_model=model, is_primary=True).first() \
        or ProductModelImage.objects.filter(product_model=model).first()
    return {
        'name':        f"{model.brand.name} {model.name}".strip(),
        'image':       image_url(request, image.image) if image else image_url(request, model.image),
        'price':       f"₹{int(unit.price):,}",
        'original_price_num': model.price_max,
        'condition':   unit.get_condition_display() if hasattr(unit, 'get_condition_display') else unit.condition,
        'is_available': unit.is_available and not unit.is_sold,
        'product_model_id': model.id,
    }


def ok(data=None, status=200):
    return JsonResponse({'success': True, 'data': data or {}}, status=status)


def err(msg, status=400):
    return JsonResponse({'success': False, 'error': msg}, status=status)


def staff_required(fn):
    """Decorator: return 403 unless the logged-in user has the admin role.
    This project uses a custom User.role field ('admin'/'customer'/'refurbisher')
    rather than Django's built-in is_staff flag."""
    def wrapper(self, request, *args, **kwargs):
        user = request.user
        if not user.is_authenticated or getattr(user, 'role', None) != 'admin':
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
    live = resolve_listing_unit(obj.listing_unit_id, request)
    return {
        'id':               obj.id,
        'product_model_id': obj.product_model_id,
        'listing_unit_id':  obj.listing_unit_id,
        'display_name':     obj.display_name or (live['name'] if live else ''),
        'display_image':    image_url(request, obj.display_image) or (live['image'] if live else None),
        'image_override':   image_url(request, obj.display_image),
        'badge_text':       obj.badge_text,
        'badge_style':      obj.badge_style,
        'specs_text':       obj.specs_text or (live['condition'] if live else ''),
        'display_price':    obj.display_price or (live['price'] if live else ''),
        'original_price':   obj.original_price,
        'link_url':         obj.link_url,
        'order':            obj.order,
        'sold_out':         bool(live) and not live['is_available'],
    }


def ser_section(obj, request):
    return {
        'id':           obj.id,
        'title':        obj.title,
        'subtitle':     obj.subtitle,
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
    live = resolve_listing_unit(obj.listing_unit_id, request)
    return {
        'id':               obj.id,
        'brand_label':      obj.brand_label,
        'product_model_id': obj.product_model_id,
        'listing_unit_id':  obj.listing_unit_id,
        'display_name':     obj.display_name or (live['name'] if live else ''),
        'display_image':    image_url(request, obj.display_image) or (live['image'] if live else None),
        'image_override':   image_url(request, obj.display_image),
        'specs':            obj.specs,
        'price':            obj.price or (live['price'] if live else ''),
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


def ser_section_text(obj):
    return {'id': obj.id, 'key': obj.key, 'key_label': obj.get_key_display(),
            'eyebrow': obj.eyebrow, 'heading': obj.heading,
            'subheading': obj.subheading, 'is_active': obj.is_active}


# ─────────────────────────────────────────────────────────────────────
# PUBLIC: Full config endpoint
# ─────────────────────────────────────────────────────────────────────

class AdminListingSearchView(View):
    """Search live, sellable listing units for the homepage product picker.
    GET /admin-homepage-api/listing-search/?q=iphone
    Returns units that are approved, available and not sold."""

    @method_decorator(staff_required)
    def get(self, request):
        from Product.models import ListingUnit, ProductModelImage
        q = request.GET.get('q', '').strip()
        qs = (ListingUnit.objects
              .select_related('listing', 'listing__model', 'listing__model__brand')
              .filter(is_available=True, is_sold=False, listing__status='active'))
        if q:
            qs = qs.filter(
                Q(listing__model__name__icontains=q) |
                Q(listing__model__brand__name__icontains=q)
            )
        qs = qs.order_by('-id')[:40]
        results = []
        for unit in qs:
            model = unit.listing.model
            image = ProductModelImage.objects.filter(product_model=model, is_primary=True).first() \
                or ProductModelImage.objects.filter(product_model=model).first()
            attrs = [ua.value for ua in unit.attributes.select_related('attribute').all()][:4]
            results.append({
                'listing_unit_id': unit.id,
                'product_model_id': model.id,
                'listing_id': unit.listing.listing_id,
                'unit_number': unit.unit_number,
                'name': f"{model.brand.name} {model.name}",
                'price': float(unit.price),
                'mrp': float(model.price_max) if model.price_max else None,
                'brand': model.brand.name,
                'condition': unit.get_condition_display(),
                'specs': ' · '.join(attrs),
                'image': image_url(request, image.image) if image else (image_url(request, model.image)),
            })
        return ok(results)


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
# ─────────────────────���──────────────────────────────────────────���────

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
    image_fields = []          # ImageField names accepted via multipart upload
    order_field = 'order'
    MAX_IMAGE_BYTES = 5 * 1024 * 1024

    def serialise(self, obj, request):
        raise NotImplementedError

    def get_queryset(self):
        return self.model.objects.all().order_by(self.order_field)

    @staticmethod
    def is_multipart(request):
        return (request.content_type or '').startswith('multipart/')

    def get_body(self, request):
        if self.is_multipart(request):
            return request.POST.dict()
        try:
            return json.loads(request.body)
        except Exception:
            return {}

    def coerce(self, obj, name, value):
        """Multipart values arrive as strings — convert them to the model field type."""
        try:
            field = obj._meta.get_field(name)
        except Exception:
            return value
        kind = field.get_internal_type()
        if not isinstance(value, str):
            return value
        text = value.strip()
        if kind == 'BooleanField':
            return text.lower() in ('true', '1', 'on', 'yes')
        if kind in ('IntegerField', 'PositiveIntegerField', 'PositiveSmallIntegerField',
                    'BigIntegerField', 'ForeignKey'):
            if text == '':
                return None if field.null else 0
            return int(float(text))
        if kind == 'FloatField':
            return float(text) if text else 0.0
        if kind == 'JSONField':
            try:
                return json.loads(text) if text else []
            except ValueError:
                return []
        return value

    def apply_fields(self, obj, body):
        for f in self.fields:
            if f in body:
                setattr(obj, f, self.coerce(obj, f, body[f]))

    def apply_images(self, obj, request, body):
        """Handle uploaded files and `clear_<field>` flags. Returns an error string or None."""
        for f in self.image_fields:
            upload = request.FILES.get(f)
            if upload:
                if not (upload.content_type or '').startswith('image/'):
                    return f'{f}: only image files are allowed'
                if upload.size > self.MAX_IMAGE_BYTES:
                    return f'{f}: image must be 5 MB or smaller'
                setattr(obj, f, upload)
            elif str(body.get(f'clear_{f}', '')).lower() in ('true', '1'):
                setattr(obj, f, None)
        return None

    # ── Collection ──────────────────────────────
    @staff_required
    def list(self, request):
        return ok([self.serialise(o, request) for o in self.get_queryset()])

    @staff_required
    def create(self, request):
        body = self.get_body(request)
        obj = self.model()
        try:
            self.apply_fields(obj, body)
            problem = self.apply_images(obj, request, body)
            if problem:
                return err(problem)
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
            # Django does not parse multipart bodies on PUT, so file updates arrive as POST.
            if self.is_multipart(request):
                return self.put(request, pk)
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
        try:
            self.apply_fields(obj, body)
            problem = self.apply_images(obj, request, body)
            if problem:
                return err(problem)
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
    image_fields = ['image']
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
    image_fields = ['image']
    fields = ['name','link_url','badge_text','badge_style','product_count','starting_price','order','is_active']
    def serialise(self, o, r): return ser_category(o, r)


class AdminProductSectionsView(AdminCRUDView):
    model  = ProductSection
    image_fields = ['promo_image']
    fields = ['title','subtitle','section_type','bg_style','see_all_url','see_all_text','show_timer',
              'order','is_active','promo_badge','promo_heading','promo_btn_text','promo_btn_url','promo_style']
    def serialise(self, o, r): return ser_section(o, r)


class AdminSectionItemsView(AdminCRUDView):
    model  = ProductSectionItem
    image_fields = ['display_image']
    fields = ['section_id','product_model_id','listing_unit_id','display_name','badge_text','badge_style',
              'specs_text','display_price','original_price','link_url','order','is_active']
    def serialise(self, o, r): return ser_section_item(o, r)


class AdminSpotlightView(AdminCRUDView):
    model  = SpotlightProduct
    image_fields = ['display_image']
    fields = ['is_active','brand_label','product_model_id','listing_unit_id','display_name','specs','price',
              'original_price','discount_pct','save_amount','review_count','available_count','link_url']
    def serialise(self, o, r): return ser_spotlight(o, r)


class AdminPriceRangeView(AdminCRUDView):
    model  = PriceRangeCard
    fields = ['tier','label','description','link_text','link_url','is_dark','order','is_active']
    def serialise(self, o, r): return ser_price_range(o)


class AdminShopByPriceView(AdminCRUDView):
    model  = ShopByPriceSlide
    image_fields = ['image']
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


class AdminSectionTextsView(AdminCRUDView):
    model       = HomepageSectionText
    order_field = 'id'
    fields = ['key','eyebrow','heading','subheading','is_active']

    def get_queryset(self):
        # Make sure every editable heading has a row so the admin can always edit it.
        from .homepage_render import DEFAULT_TEXTS
        existing = set(HomepageSectionText.objects.values_list('key', flat=True))
        for key, d in DEFAULT_TEXTS.items():
            if key not in existing:
                HomepageSectionText.objects.create(key=key, is_active=True, **d)
        return super().get_queryset()
    def serialise(self, o, r): return ser_section_text(o)


class AdminPromoBannerView(AdminCRUDView):
    model       = PromoBanner
    order_field = 'id'
    fields = ['text','is_active']
    def serialise(self, o, r): return ser_promo(o)
