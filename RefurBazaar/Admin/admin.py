"""
Homepage content — Django Admin registration.

Registers every model from Admin/models.py with a tailored ModelAdmin so
staff can manage all homepage content directly from /admin/ as a fallback
to the custom JS admin panel at /admin-homepage/.
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import (
    PromoBanner,
    HeroBannerSlide,
    TrustStripItem,
    CategoryCard,
    ProductSection,
    ProductSectionItem,
    SpotlightProduct,
    PriceRangeCard,
    ShopByPriceSlide,
    TestimonialCard,
    FAQItem,
    StatItem,
    NavCategoryLink,
    PartnerCTABanner,
    RenewedBanner,
)


# ─────────────────────────────────────────────
# 1. Promo Banner
# ─────────────────────────────────────────────
@admin.register(PromoBanner)
class PromoBannerAdmin(admin.ModelAdmin):
    list_display  = ('text', 'is_active')
    list_editable = ('is_active',)
    search_fields = ('text',)


# ─────────────────────────────────────────────
# 2. Hero Carousel Slides
# ─────────────────────────────────────────────
@admin.register(HeroBannerSlide)
class HeroBannerSlideAdmin(admin.ModelAdmin):
    list_display  = ('order', 'heading', 'bg_style', 'tag_text', 'is_active', 'image_preview')
    list_display_links = ('heading',)
    list_editable = ('order', 'is_active')
    list_filter   = ('bg_style', 'is_active')
    search_fields = ('heading', 'tag_text', 'body_text')
    ordering      = ('order',)
    fieldsets = (
        ('Slide Settings', {
            'fields': ('order', 'is_active', 'bg_style'),
        }),
        ('Tag / Badge', {
            'fields': ('tag_text', 'tag_style'),
        }),
        ('Copy', {
            'fields': ('heading', 'body_text'),
        }),
        ('Primary Button', {
            'fields': ('btn1_text', 'btn1_url', 'btn1_style'),
        }),
        ('Secondary Button', {
            'fields': ('btn2_text', 'btn2_url', 'btn2_style'),
        }),
        ('Product Image', {
            'fields': ('image', 'image_max_width'),
        }),
        ('Floating Badges', {
            'fields': ('badge_top_right', 'badge_bottom_center', 'badge_circle'),
        }),
    )

    @admin.display(description='Preview')
    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height:50px;border-radius:4px;" />',
                obj.image.url,
            )
        return '—'


# ─────────────────────────────────────────────
# 3. Trust Strip
# ─────────────────────────────────────────────
@admin.register(TrustStripItem)
class TrustStripItemAdmin(admin.ModelAdmin):
    list_display  = ('order', 'title', 'subtitle', 'icon', 'is_active')
    list_display_links = ('title',)
    list_editable = ('order', 'is_active')
    search_fields = ('title', 'subtitle')
    ordering      = ('order',)


# ─────────────────────────────────────────────
# 4. Category Cards
# ─────────────────────────────────────────────
@admin.register(CategoryCard)
class CategoryCardAdmin(admin.ModelAdmin):
    list_display  = ('order', 'name', 'badge_text', 'badge_style', 'product_count', 'starting_price', 'is_active')
    list_display_links = ('name',)
    list_editable = ('order', 'is_active')
    search_fields = ('name', 'badge_text')
    ordering      = ('order',)


# ─────────────────────────────────────────────
# 5. Product Sections + inline items
# ─────────────────────────────────────────────
class ProductSectionItemInline(admin.TabularInline):
    model         = ProductSectionItem
    extra         = 1
    fields        = (
        'order', 'product_model_id', 'display_name',
        'badge_text', 'specs_text', 'display_price', 'original_price',
        'link_url', 'is_active',
    )
    ordering      = ('order',)
    show_change_link = True


@admin.register(ProductSection)
class ProductSectionAdmin(admin.ModelAdmin):
    list_display  = ('order', 'title', 'section_type', 'bg_style', 'show_timer', 'is_active')
    list_display_links = ('title',)
    list_editable = ('order', 'is_active')
    list_filter   = ('section_type', 'is_active')
    search_fields = ('title',)
    ordering      = ('order',)
    inlines       = [ProductSectionItemInline]
    fieldsets = (
        ('Section Settings', {
            'fields': ('order', 'is_active', 'title', 'section_type', 'bg_style', 'show_timer'),
        }),
        ('See All Link', {
            'fields': ('see_all_url', 'see_all_text'),
        }),
        ('Certified Section Promo Card', {
            'classes': ('collapse',),
            'fields': (
                'promo_badge', 'promo_heading', 'promo_btn_text',
                'promo_btn_url', 'promo_image', 'promo_style',
            ),
        }),
    )


@admin.register(ProductSectionItem)
class ProductSectionItemAdmin(admin.ModelAdmin):
    list_display  = ('section', 'order', 'display_name', 'product_model_id', 'display_price', 'is_active')
    list_editable = ('order', 'is_active')
    list_filter   = ('section', 'is_active')
    search_fields = ('display_name',)
    ordering      = ('section', 'order')


# ─────────────────────────────────────────────
# 6. Spotlight Product
# ─────────────────────────────────────────────
@admin.register(SpotlightProduct)
class SpotlightProductAdmin(admin.ModelAdmin):
    list_display  = ('display_name', 'brand_label', 'price', 'discount_pct', 'is_active')
    list_editable = ('is_active',)
    search_fields = ('display_name', 'brand_label')


# ─────────────────────────────────────────────
# 7. Price Range Cards
# ─────────────────────────────────────────────
@admin.register(PriceRangeCard)
class PriceRangeCardAdmin(admin.ModelAdmin):
    list_display  = ('order', 'tier', 'label', 'description', 'is_dark', 'is_active')
    list_display_links = ('tier',)
    list_editable = ('order', 'is_dark', 'is_active')
    search_fields = ('tier', 'label')
    ordering      = ('order',)


# ─────────────────────────────────────────────
# 8. Shop By Price Slides
# ─────────────────────────────────────────────
@admin.register(ShopByPriceSlide)
class ShopByPriceSlideAdmin(admin.ModelAdmin):
    list_display  = ('order', 'label_line1', 'label_line2', 'link_url', 'is_active')
    list_display_links = ('label_line1',)
    list_editable = ('order', 'is_active')
    ordering      = ('order',)


# ─────────────────────────────────────────────
# 9. Testimonials
# ─────────────────────────────────────────────
@admin.register(TestimonialCard)
class TestimonialCardAdmin(admin.ModelAdmin):
    list_display  = ('order', 'name', 'initials', 'location', 'product_bought', 'rating', 'is_active')
    list_display_links = ('name',)
    list_editable = ('order', 'rating', 'is_active')
    search_fields = ('name', 'product_bought', 'review_text')
    ordering      = ('order',)


# ─────────────────────────────────────────────
# 10. FAQs
# ─────────────────────────────────────────────
@admin.register(FAQItem)
class FAQItemAdmin(admin.ModelAdmin):
    list_display  = ('order', 'question', 'is_active')
    list_display_links = ('question',)
    list_editable = ('order', 'is_active')
    search_fields = ('question', 'answer')
    ordering      = ('order',)


# ─────────────────────────────────────────────
# 11. Stat Counters
# ─────────────────────────────────────────────
@admin.register(StatItem)
class StatItemAdmin(admin.ModelAdmin):
    list_display  = ('order', 'label', 'target_value', 'suffix', 'is_active')
    list_display_links = ('label',)
    list_editable = ('order', 'is_active')
    ordering      = ('order',)


# ─────────────────────────────────────────────
# 12. Secondary Nav Category Links
# ─────────────────────────────────────────────
@admin.register(NavCategoryLink)
class NavCategoryLinkAdmin(admin.ModelAdmin):
    list_display  = ('order', 'label', 'url', 'highlight_class', 'is_active')
    list_display_links = ('url',)
    list_editable = ('order', 'highlight_class', 'is_active')
    search_fields = ('label', 'url')
    ordering      = ('order',)


# ─────────────────────────────────────────────
# 13. Partner CTA Banner
# ─────────────────────────────────────────────
@admin.register(PartnerCTABanner)
class PartnerCTABannerAdmin(admin.ModelAdmin):
    list_display = ('heading', 'subtext', 'btn_text', 'btn_url', 'is_active')
    list_editable = ('is_active',)


# ─────────────────────────────────────────────
# 14. Renewed Banner
# ─────────────────────────────────────────────
@admin.register(RenewedBanner)
class RenewedBannerAdmin(admin.ModelAdmin):
    list_display = ('heading', 'cta_text', 'is_active')
    list_editable = ('is_active',)
