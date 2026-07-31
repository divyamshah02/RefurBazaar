from django.db import models
from django.core.validators import MinValueValidator


# ─────────────────────────────────────────────
# 1.  TOP PROMO BANNER (the green strip at top)
# ─────────────────────────────────────────────
class PromoBanner(models.Model):
    """Single active promo strip above the navbar."""
    text = models.CharField(max_length=300)
    is_active = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Promo Banner"

    def __str__(self):
        return self.text[:60]


# ─────────────────────────────────────────────
# 2.  HERO CAROUSEL SLIDES
# ─────────────────────────────────────────────
class HeroBannerSlide(models.Model):
    TAG_STYLE_CHOICES = [
        ('tag-green',  'Green'),
        ('tag-dark',   'Dark'),
        ('tag-light',  'Light'),
    ]
    BG_STYLE_CHOICES = [
        ('rc-slide-dark',   'Dark (black)'),
        ('rc-slide-light',  'Light (white)'),
        ('rc-slide-green',  'Green'),
        ('rc-slide-repair', 'Repair (dark + green text)'),
    ]

    order           = models.PositiveIntegerField(default=0)
    is_active       = models.BooleanField(default=True)

    # Background
    bg_style        = models.CharField(max_length=30, choices=BG_STYLE_CHOICES, default='rc-slide-dark')

    # Tag / badge above heading
    tag_text        = models.CharField(max_length=80, blank=True)
    tag_style       = models.CharField(max_length=30, choices=TAG_STYLE_CHOICES, default='tag-green')

    # Main copy
    heading         = models.CharField(max_length=200)
    body_text       = models.TextField(blank=True)

    # Buttons (up to 2)
    btn1_text       = models.CharField(max_length=60, blank=True)
    btn1_url        = models.CharField(max_length=200, blank=True)
    btn1_style      = models.CharField(max_length=60, default='btn rc-btn-primary')

    btn2_text       = models.CharField(max_length=60, blank=True)
    btn2_url        = models.CharField(max_length=200, blank=True)
    btn2_style      = models.CharField(max_length=60, default='btn rc-btn-text')

    # Product image
    image           = models.ImageField(upload_to='homepage/hero/', blank=True, null=True)
    image_max_width = models.CharField(max_length=20, blank=True, help_text='e.g. 500px or fit-content')

    # Floating badges on image
    badge_top_right         = models.CharField(max_length=80, blank=True)
    badge_bottom_center     = models.CharField(max_length=80, blank=True)
    badge_circle            = models.CharField(max_length=80, blank=True, help_text='Circular badge text (e.g. "Up to 70% OFF")')

    class Meta:
        ordering = ['order']
        verbose_name = "Hero Slide"

    def __str__(self):
        return f"Slide {self.order}: {self.heading[:50]}"


# ─────────────────────────────────────────────
# 3.  TRUST STRIP (4 items below hero)
# ─────────────────────────────────────────────
class TrustStripItem(models.Model):
    icon    = models.CharField(max_length=80, default='fas fa-check-circle', help_text='FontAwesome class')
    title   = models.CharField(max_length=100)
    subtitle= models.CharField(max_length=100, blank=True)
    order   = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']
        verbose_name = "Trust Strip Item"

    def __str__(self):
        return self.title


# ─────────────────────────────────────────────
# 4.  CATEGORY CARDS (Shop by Category)
# ─────────────────────────────────────────────
class CategoryCard(models.Model):
    BADGE_STYLE_CHOICES = [
        ('bg-dark',    'Dark'),
        ('bg-success', 'Green'),
    ]

    name            = models.CharField(max_length=100)
    image           = models.ImageField(upload_to='homepage/categories/', blank=True, null=True)
    link_url        = models.CharField(max_length=200)
    badge_text      = models.CharField(max_length=60, blank=True)
    badge_style     = models.CharField(max_length=30, choices=BADGE_STYLE_CHOICES, default='bg-dark')
    product_count   = models.CharField(max_length=30, blank=True, help_text='e.g. "450+"')
    starting_price  = models.CharField(max_length=30, blank=True, help_text='e.g. "₹12,999"')
    order           = models.PositiveIntegerField(default=0)
    is_active       = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']
        verbose_name = "Category Card"

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────
# 5.  PRODUCT SECTIONS  (sliders + certified grids)
# ─────────────────────────────────────────────
class ProductSection(models.Model):
    SECTION_TYPE_CHOICES = [
        ('hot_deals',            'Hot Deals'),
        ('end_of_year',          'End of Year Sale'),
        ('recommended',          'Recommended for You'),
        ('featured',             'Recarvit Featured'),
        ('certified_iphones',    'Certified Renewed iPhones'),
        ('certified_samsung',    'Certified Renewed Samsung'),
    ]
    BG_STYLE_CHOICES = [
        ('',               'White'),
        ('bg-off-white',   'Off White'),
        ('bg-soft-green',  'Soft Green'),
    ]

    title           = models.CharField(max_length=120)
    section_type    = models.CharField(max_length=30, choices=SECTION_TYPE_CHOICES, unique=True)
    bg_style        = models.CharField(max_length=30, choices=BG_STYLE_CHOICES, blank=True)
    see_all_url     = models.CharField(max_length=200, blank=True)
    see_all_text    = models.CharField(max_length=60, default='See all')
    show_timer      = models.BooleanField(default=False, help_text='Show countdown timer (Hot Deals)')
    order           = models.PositiveIntegerField(default=0)
    is_active       = models.BooleanField(default=True)

    # For certified sections: promo card details
    promo_badge     = models.CharField(max_length=60, blank=True)
    promo_heading   = models.CharField(max_length=120, blank=True)
    promo_btn_text  = models.CharField(max_length=60, blank=True)
    promo_btn_url   = models.CharField(max_length=200, blank=True)
    promo_image     = models.ImageField(upload_to='homepage/sections/', blank=True, null=True)
    promo_style     = models.CharField(max_length=30, blank=True, help_text='iphones-promo or samsung-promo')

    class Meta:
        ordering = ['order']
        verbose_name = "Product Section"

    def __str__(self):
        return self.title


class ProductSectionItem(models.Model):
    """A product card entry within a product section.
    Points to the ProductModel; price/specs are read live from listings at render time.
    Alternatively, they can be overridden here for homepage display purposes."""

    section         = models.ForeignKey(ProductSection, on_delete=models.CASCADE, related_name='items')
    # FK to Product app's ProductModel — stored as int to avoid cross-app import issues
    product_model_id = models.PositiveIntegerField(help_text='ProductModel.id from Product app')
    # Display overrides (optional — if blank, read from ProductModel)
    display_name    = models.CharField(max_length=200, blank=True)
    display_image   = models.ImageField(upload_to='homepage/items/', blank=True, null=True)
    badge_text      = models.CharField(max_length=30, blank=True, help_text='e.g. -54%')
    badge_style     = models.CharField(max_length=80, blank=True, help_text='inline style for badge bg/color')
    specs_text      = models.CharField(max_length=100, blank=True, help_text='e.g. 128GB | 6GB RAM')
    display_price   = models.CharField(max_length=30, blank=True, help_text='Overrides live price')
    original_price  = models.CharField(max_length=30, blank=True)
    link_url        = models.CharField(max_length=200, blank=True)
    order           = models.PositiveIntegerField(default=0)
    is_active       = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']
        verbose_name = "Product Section Item"

    def __str__(self):
        return f"{self.section.title} — item #{self.order}"


# ─────────────────────────────────────────────
# 6.  SPOTLIGHT PRODUCT  (Today's Spotlight)
# ─────────────────────────────────────────────
class SpotlightProduct(models.Model):
    is_active           = models.BooleanField(default=True)
    brand_label         = models.CharField(max_length=60)
    product_model_id    = models.PositiveIntegerField(help_text='ProductModel.id')
    display_name        = models.CharField(max_length=200)
    display_image       = models.ImageField(upload_to='homepage/spotlight/', blank=True, null=True)
    specs               = models.JSONField(default=list, help_text='List of spec pill strings, e.g. ["CORE I7","16GB"]')
    price               = models.CharField(max_length=30, help_text='e.g. ₹ 41,999')
    original_price      = models.CharField(max_length=30)
    discount_pct        = models.PositiveIntegerField(default=0, help_text='e.g. 43')
    save_amount         = models.CharField(max_length=30, blank=True, help_text='e.g. ₹32,001')
    review_count        = models.PositiveIntegerField(default=0)
    available_count     = models.PositiveIntegerField(default=0)
    link_url            = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = "Spotlight Product"

    def __str__(self):
        return self.display_name


# ─────────────────────────────────────────────
# 7.  PRICE RANGE CARDS  (Find Your Price Range)
# ─────────────────────────────────────────────
class PriceRangeCard(models.Model):
    tier            = models.CharField(max_length=30, help_text='e.g. ENTRY LEVEL')
    label           = models.CharField(max_length=40, help_text='e.g. Under ₹20K')
    description     = models.CharField(max_length=100)
    link_text       = models.CharField(max_length=60, default='Browse →')
    link_url        = models.CharField(max_length=200)
    is_dark         = models.BooleanField(default=False, help_text='Dark card style')
    order           = models.PositiveIntegerField(default=0)
    is_active       = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']
        verbose_name = "Price Range Card"

    def __str__(self):
        return self.label


# ─────────────────────────────────────────────
# 8.  SHOP BY PRICE SLIDES  (carousel images)
# ─────────────────────────────────────────────
class ShopByPriceSlide(models.Model):
    image           = models.ImageField(upload_to='homepage/sbp/', blank=True, null=True)
    label_line1     = models.CharField(max_length=20, help_text='e.g. Under')
    label_line2     = models.CharField(max_length=20, help_text='e.g. ₹6,999')
    link_url        = models.CharField(max_length=200)
    order           = models.PositiveIntegerField(default=0)
    is_active       = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']
        verbose_name = "Shop By Price Slide"

    def __str__(self):
        return f"{self.label_line1} {self.label_line2}"


# ─────────────────────────────────────────────
# 9.  TESTIMONIALS
# ─────────────────────────────────────────────
class TestimonialCard(models.Model):
    initials        = models.CharField(max_length=4)
    name            = models.CharField(max_length=80)
    location        = models.CharField(max_length=100, blank=True)
    product_bought  = models.CharField(max_length=120)
    product_icon    = models.CharField(max_length=60, default='fas fa-mobile-alt')
    review_text     = models.TextField()
    rating          = models.PositiveSmallIntegerField(default=5, validators=[MinValueValidator(1)])
    order           = models.PositiveIntegerField(default=0)
    is_active       = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']
        verbose_name = "Testimonial"

    def __str__(self):
        return f"{self.name} — {self.product_bought}"


# ─────────────────────────────────────────────
# 10. FAQ ITEMS
# ─────────────────────────────────────────────
class FAQItem(models.Model):
    question        = models.CharField(max_length=300)
    answer          = models.TextField()
    order           = models.PositiveIntegerField(default=0)
    is_active       = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']
        verbose_name = "FAQ Item"

    def __str__(self):
        return self.question[:80]


# ─────────────────────────────────────────────
# 11. STATS COUNTERS  (the rc-stats-section)
# ─────────────────────────────────────────────
class StatItem(models.Model):
    target_value    = models.FloatField(help_text='Numeric target for counter animation')
    decimals        = models.PositiveSmallIntegerField(default=0)
    suffix          = models.CharField(max_length=10, blank=True, help_text='e.g. + or %')
    label           = models.CharField(max_length=80)
    order           = models.PositiveIntegerField(default=0)
    is_active       = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']
        verbose_name = "Stat Counter"

    def __str__(self):
        return self.label


# ─────────────────────────────────────────────
# 12. SECONDARY NAV CATEGORY LINKS
# ─────────────────────────────────────────────
class NavCategoryLink(models.Model):
    HIGHLIGHT_CHOICES = [
        ('',               'Normal'),
        ('highlight-red',  'Red'),
        ('highlight-blue', 'Blue'),
    ]

    label           = models.CharField(max_length=60)
    url             = models.CharField(max_length=200)
    highlight_class = models.CharField(max_length=30, choices=HIGHLIGHT_CHOICES, blank=True)
    order           = models.PositiveIntegerField(default=0)
    is_active       = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']
        verbose_name = "Nav Category Link"

    def __str__(self):
        return self.label


# ─────────────────────────────────────────────
# 13. PARTNER CTA BANNER  (green strip at bottom)
# ─────────────────────────────────────────────
class PartnerCTABanner(models.Model):
    heading         = models.CharField(max_length=200)
    subtext         = models.CharField(max_length=200)
    btn_text        = models.CharField(max_length=60, default='Apply Now')
    btn_url         = models.CharField(max_length=200, default='/partner-application')
    is_active       = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Partner CTA Banner"

    def __str__(self):
        return self.heading[:60]


# ─────────────────────────────────────────────
# 14. RENEWED BANNER  (the "Recarvit Certified" clickable bar)
# ─────────────────────────────────────────────
class RenewedBanner(models.Model):
    heading         = models.CharField(max_length=200, default='Recarvit Certified: As Good As New.')
    subtext         = models.CharField(max_length=200, default='We test 50+ checkpoints (Battery, Screen, Camera) so you don\'t have to.')
    cta_text        = models.CharField(max_length=60, default='See the Checklist')
    is_active       = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Renewed Banner"

    def __str__(self):
        return self.heading[:60]
