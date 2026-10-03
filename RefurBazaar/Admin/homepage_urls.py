"""
Admin/homepage_urls.py

Included in the root urls.py as:

    path('admin-homepage-api/', include('Admin.homepage_urls')),

Public:
    GET  /admin-homepage-api/config/

Admin CRUD (staff only, JSON API — matches static/js/admin/homepage_admin.js):
    /admin-homepage-api/hero-slides/           GET list / POST create
    /admin-homepage-api/hero-slides/<pk>/      GET / PUT / DELETE
    (same pattern for all resources below)

The admin page itself (HTML) is served separately at /admin-homepage/ by
FrontEnd's AdminHomePageViewSet.
"""

from django.urls import path
from .homepage_views import *

# ── Public ──────────────────────────────────────────────────────────
public_patterns = [
    path('config/', HomepageConfigView.as_view(), name='homepage-config'),
]

# ── Admin CRUD helpers ───────────────────────────────────────────────
def crud(view_class):
    """Return two url patterns: collection + detail."""
    return [
        path('', view_class.as_view()),
        path('<int:pk>/', view_class.as_view()),
    ]

from .homepage_views import (
    AdminHeroSlidesView, AdminTrustItemsView, AdminCategoriesView,
    AdminProductSectionsView, AdminSectionItemsView, AdminSpotlightView,
    AdminPriceRangeView, AdminShopByPriceView, AdminTestimonialsView,
    AdminFAQsView, AdminStatsView, AdminNavLinksView,
    AdminPartnerCTAView, AdminRenewedBannerView, AdminPromoBannerView,
)

admin_api_patterns = [
    *[path(f'hero-slides/{p}', v) for p, v in [
        ('',           AdminHeroSlidesView.as_view()),
        ('<int:pk>/',  AdminHeroSlidesView.as_view()),
    ]],
    *[path(f'trust-items/{p}', v) for p, v in [
        ('',           AdminTrustItemsView.as_view()),
        ('<int:pk>/',  AdminTrustItemsView.as_view()),
    ]],
    *[path(f'categories/{p}', v) for p, v in [
        ('',           AdminCategoriesView.as_view()),
        ('<int:pk>/',  AdminCategoriesView.as_view()),
    ]],
    *[path(f'product-sections/{p}', v) for p, v in [
        ('',           AdminProductSectionsView.as_view()),
        ('<int:pk>/',  AdminProductSectionsView.as_view()),
    ]],
    *[path(f'section-items/{p}', v) for p, v in [
        ('',           AdminSectionItemsView.as_view()),
        ('<int:pk>/',  AdminSectionItemsView.as_view()),
    ]],
    *[path(f'spotlight/{p}', v) for p, v in [
        ('',           AdminSpotlightView.as_view()),
        ('<int:pk>/',  AdminSpotlightView.as_view()),
    ]],
    *[path(f'price-range-cards/{p}', v) for p, v in [
        ('',           AdminPriceRangeView.as_view()),
        ('<int:pk>/',  AdminPriceRangeView.as_view()),
    ]],
    *[path(f'shop-by-price/{p}', v) for p, v in [
        ('',           AdminShopByPriceView.as_view()),
        ('<int:pk>/',  AdminShopByPriceView.as_view()),
    ]],
    *[path(f'testimonials/{p}', v) for p, v in [
        ('',           AdminTestimonialsView.as_view()),
        ('<int:pk>/',  AdminTestimonialsView.as_view()),
    ]],
    *[path(f'faqs/{p}', v) for p, v in [
        ('',           AdminFAQsView.as_view()),
        ('<int:pk>/',  AdminFAQsView.as_view()),
    ]],
    *[path(f'stats/{p}', v) for p, v in [
        ('',           AdminStatsView.as_view()),
        ('<int:pk>/',  AdminStatsView.as_view()),
    ]],
    *[path(f'nav-links/{p}', v) for p, v in [
        ('',           AdminNavLinksView.as_view()),
        ('<int:pk>/',  AdminNavLinksView.as_view()),
    ]],
    *[path(f'partner-cta/{p}', v) for p, v in [
        ('',           AdminPartnerCTAView.as_view()),
        ('<int:pk>/',  AdminPartnerCTAView.as_view()),
    ]],
    *[path(f'renewed-banner/{p}', v) for p, v in [
        ('',           AdminRenewedBannerView.as_view()),
        ('<int:pk>/',  AdminRenewedBannerView.as_view()),
    ]],
    *[path(f'promo-banner/{p}', v) for p, v in [
        ('',           AdminPromoBannerView.as_view()),
        ('<int:pk>/',  AdminPromoBannerView.as_view()),
    ]],
]

# NOTE: the admin HTML page itself is served by FrontEnd's
# AdminHomePageViewSet (registered as 'admin-homepage' in FrontEnd/urls.py),
# which renders templates/admin/homepage.html. This module only exposes the
# JSON API the page's JS (static/js/admin/homepage_admin.js) talks to.
urlpatterns = public_patterns + admin_api_patterns
