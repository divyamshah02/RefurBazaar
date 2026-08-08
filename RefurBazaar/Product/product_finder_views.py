"""
Product Finder ViewSet
======================
Provides two endpoints consumed by the guided product-finder wizard:

  GET  /product-api/finder/questions/?category=mobile
       Returns the question steps for the guided wizard for a given category.
       Falls back to a universal question set if category is not provided.

  POST /product-api/finder/results/
       Body: { "answers": { "use_case": "PRODUCTIVITY", "budget": "MID", ... }, "category": "laptop" }
       Returns a ranked list of ProductModel objects that match the answers.

Add to urls.py:
    from .product_finder_views import ProductFinderViewSet
    router.register(r'finder', ProductFinderViewSet, basename='finder')

Or wire manually:
    path('finder/questions/', ProductFinderViewSet.as_view({'get': 'questions'})),
    path('finder/results/',   ProductFinderViewSet.as_view({'post': 'results'})),
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Min, Q

# Import your models — adjust the import path to match your project structure
from .models import ProductModel, Listing, ListingUnit, AttributeMaster, ProductModelAttribute


# ──────────────────────────────────────────────────────────────────────────────
# QUESTION DEFINITIONS  (mirrors the JS fallback in product-finder.js)
# ──────────────────────────────────────────────────────────────────────────────

QUESTIONS = {
    "mobile": [
        {
            "id": "use_case",
            "question": "What's this phone mainly for?",
            "options": [
                {"tier": "EVERYDAY",     "label": "Daily Use",          "desc": "Social media, calls, browsing"},
                {"tier": "PHOTOGRAPHY",  "label": "Photography",        "desc": "Great camera, shooting reels"},
                {"tier": "PERFORMANCE",  "label": "Gaming / Heavy Use", "desc": "Intensive apps, heavy gaming"},
                {"tier": "WORK",         "label": "Work & Productivity","desc": "Email, docs, video calls"},
            ],
        },
        {
            "id": "budget",
            "question": "What's your budget?",
            "options": [
                {"tier": "VALUE",    "label": "Under ₹10k",   "desc": "Great everyday phones"},
                {"tier": "MID",      "label": "₹10k – ₹25k",  "desc": "Balanced performance"},
                {"tier": "PREMIUM",  "label": "₹25k – ₹50k",  "desc": "Flagship-level features"},
                {"tier": "FLAGSHIP", "label": "Above ₹50k",   "desc": "Top of the line"},
            ],
        },
        {
            "id": "brand_pref",
            "question": "Any brand preference?",
            "options": [
                {"tier": "APPLE",   "label": "Apple (iPhone)", "desc": "iOS ecosystem"},
                {"tier": "SAMSUNG", "label": "Samsung",        "desc": "Android premium"},
                {"tier": "OTHER",   "label": "Other Android",  "desc": "Motorola, OnePlus, etc."},
                {"tier": "NO_PREF", "label": "No preference",  "desc": "Show me the best deal"},
            ],
        },
    ],
    "laptop": [
        {
            "id": "use_case",
            "question": "What's this laptop mainly for?",
            "options": [
                {"tier": "PRODUCTIVITY", "label": "Work & Office",     "desc": "Email, spreadsheets, meetings"},
                {"tier": "ACADEMICS",    "label": "Study",             "desc": "Assignments, classes, research"},
                {"tier": "EVERYDAY",     "label": "Casual Use",        "desc": "Streaming, browsing, video calls"},
                {"tier": "PERFORMANCE",  "label": "Creative / Design", "desc": "Editing, design, coding"},
            ],
        },
        {
            "id": "budget",
            "question": "What's your budget?",
            "options": [
                {"tier": "VALUE",    "label": "Under ₹20k",   "desc": "Light tasks"},
                {"tier": "MID",      "label": "₹20k – ₹40k",  "desc": "Everyday use"},
                {"tier": "PREMIUM",  "label": "₹40k – ₹70k",  "desc": "Power users"},
                {"tier": "FLAGSHIP", "label": "Above ₹70k",   "desc": "Workstation performance"},
            ],
        },
        {
            "id": "portability",
            "question": "Where will you mostly use it?",
            "options": [
                {"tier": "STATIONARY", "label": "Mostly at home",    "desc": "Desk or dedicated setup"},
                {"tier": "MOBILE",     "label": "I carry it around", "desc": "Campus, office, travel"},
            ],
        },
        {
            "id": "spec_comfort",
            "question": "How comfortable are you with specs?",
            "options": [
                {"tier": "CONCISE",  "label": "Just make it work",  "desc": "Explain recommendations simply"},
                {"tier": "ADVANCED", "label": "I have preferences", "desc": "Show RAM, SSD, and processor details"},
            ],
        },
    ],
    "tablet": [
        {
            "id": "use_case",
            "question": "What will you mainly use it for?",
            "options": [
                {"tier": "MEDIA",        "label": "Media & Entertainment", "desc": "Streaming, reading, games"},
                {"tier": "PRODUCTIVITY", "label": "Work & Study",          "desc": "Notes, documents, email"},
                {"tier": "KIDS",         "label": "Kids & Family",         "desc": "Education apps, parental control"},
                {"tier": "CREATIVE",     "label": "Drawing / Design",      "desc": "Stylus, sketching, art"},
            ],
        },
        {
            "id": "budget",
            "question": "What's your budget?",
            "options": [
                {"tier": "VALUE",    "label": "Under ₹15k",   "desc": "Basic tablet"},
                {"tier": "MID",      "label": "₹15k – ₹35k",  "desc": "Mid-range features"},
                {"tier": "PREMIUM",  "label": "₹35k – ₹70k",  "desc": "Premium performance"},
                {"tier": "FLAGSHIP", "label": "Above ₹70k",   "desc": "Pro-grade"},
            ],
        },
    ],
}

# Budget ranges: tier → (min_price, max_price or None for open-ended)
BUDGET_RANGES = {
    # Mobile
    "VALUE":    (0,      10_000),
    "MID":      (10_001, 25_000),
    "PREMIUM":  (25_001, 50_000),
    "FLAGSHIP": (50_001, None),
    # Laptop overrides (same tier keys, slightly wider ranges)
    # handled by _budget_range_for_category below
}

BUDGET_RANGES_LAPTOP = {
    "VALUE":    (0,      20_000),
    "MID":      (20_001, 40_000),
    "PREMIUM":  (40_001, 70_000),
    "FLAGSHIP": (70_001, None),
}

BUDGET_RANGES_TABLET = {
    "VALUE":    (0,      15_000),
    "MID":      (15_001, 35_000),
    "PREMIUM":  (35_001, 70_000),
    "FLAGSHIP": (70_001, None),
}

# Brand-tier → brand name fragments for ILIKE matching
BRAND_TIERS = {
    "APPLE":   ["apple"],
    "SAMSUNG": ["samsung"],
    "OTHER":   [],   # exclude apple and samsung
    "NO_PREF": [],
}

# Use-case tier → keywords that should match product names or category-level attrs
# These are approximate and can be tuned.
USE_CASE_SORT_WEIGHT = {
    "PERFORMANCE": ["pro", "plus", "ultra", "max", "gaming"],
    "WORK":        ["business", "think", "latitude", "elitebook", "pro"],
    "PHOTOGRAPHY": ["pro", "ultra"],
    "ACADEMICS":   ["basic", "lite", "edu"],
    "CREATIVE":    ["pro", "studio", "creator"],
    "MEDIA":       ["media", "tab", "pad"],
    "KIDS":        ["kids", "fire", "lite"],
}


# ──────────────────────────────────────────────────────────────────────────────
class ProductFinderViewSet(viewsets.ViewSet):
    """
    ViewSet for the guided product-finder wizard.

    Register with router:
        router.register(r'finder', ProductFinderViewSet, basename='finder')

    This gives:
        GET  /product-api/finder/questions/
        POST /product-api/finder/results/
    """

    @action(detail=False, methods=["get"], url_path="questions")
    def questions(self, request):
        """
        Return the question flow for the given category.

        Query params:
          - category (optional): mobile | laptop | tablet
        """
        category = request.query_params.get("category", "").lower().strip()
        qs = QUESTIONS.get(category)

        if not qs:
            # Universal fallback: ask category first, then budget
            qs = [
                {
                    "id": "category",
                    "question": "What kind of device are you looking for?",
                    "options": [
                        {"tier": "mobile",  "label": "Smartphone", "desc": "iOS or Android"},
                        {"tier": "laptop",  "label": "Laptop",     "desc": "Windows or macOS"},
                        {"tier": "tablet",  "label": "Tablet",     "desc": "iPad or Android"},
                    ],
                },
                {
                    "id": "budget",
                    "question": "What's your budget?",
                    "options": [
                        {"tier": "VALUE",    "label": "Under ₹20k",   "desc": "Best value picks"},
                        {"tier": "MID",      "label": "₹20k – ₹50k",  "desc": "Balanced choice"},
                        {"tier": "PREMIUM",  "label": "₹50k – ₹1L",   "desc": "Premium options"},
                        {"tier": "FLAGSHIP", "label": "Above ₹1L",    "desc": "Top-tier"},
                    ],
                },
            ]

        category_labels = {
            "mobile": "PHONE CONCIERGE",
            "laptop": "LAPTOP CONCIERGE",
            "tablet": "TABLET CONCIERGE",
        }

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "questions": qs,
                "category": category or None,
                "category_label": category_labels.get(category, "PRODUCT CONCIERGE"),
            },
            "error": None,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="results")
    def results(self, request):
        """
        Return ranked product recommendations based on wizard answers.

        Body (JSON):
          {
            "answers": {
              "use_case": "PRODUCTIVITY",
              "budget": "MID",
              "portability": "MOBILE",
              "spec_comfort": "ADVANCED",
              "brand_pref": "NO_PREF"
            },
            "category": "laptop"
          }
        """
        answers  = request.data.get("answers", {}) or {}
        category = (request.data.get("category") or "").lower().strip()

        # If the wizard included a category step, use that value
        if not category and "category" in answers:
            category = answers["category"].lower()

        # ── 1. Build base queryset ─────────────────────────────────────────
        qs = ProductModel.objects.filter(is_active=True)
        if category:
            qs = qs.filter(category=category)

        # ── 2. Budget filter ──────────────────────────────────────────────
        budget_tier = answers.get("budget", "")
        if budget_tier:
            budget_ranges = self._budget_ranges_for_category(category)
            price_range = budget_ranges.get(budget_tier)
            if price_range:
                lo, hi = price_range
                # Filter to products that have at least one available unit in range
                unit_q = ListingUnit.objects.filter(
                    is_available=True, is_sold=False,
                    listing__status="active",
                    price__gte=lo,
                )
                if hi is not None:
                    unit_q = unit_q.filter(price__lte=hi)

                matching_model_ids = unit_q.values_list(
                    "listing__model_id", flat=True
                ).distinct()
                qs = qs.filter(id__in=matching_model_ids)

        # ── 3. Brand filter ────────────────────────────────────────────────
        brand_pref = answers.get("brand_pref", "NO_PREF")
        if brand_pref == "APPLE":
            qs = qs.filter(brand__name__icontains="apple")
        elif brand_pref == "SAMSUNG":
            qs = qs.filter(brand__name__icontains="samsung")
        elif brand_pref == "OTHER":
            qs = qs.exclude(brand__name__icontains="apple").exclude(brand__name__icontains="samsung")

        # ── 4. Fetch with min price annotation ────────────────────────────
        qs = qs.prefetch_related("brand", "images").annotate(
            min_price=Min(
                "listings__units__price",
                filter=Q(
                    listings__units__is_available=True,
                    listings__units__is_sold=False,
                    listings__status="active",
                )
            )
        ).filter(min_price__isnull=False)  # only models with stock

        # ── 5. Order / score ──────────────────────────────────────────────
        # Primary sort: budget tier proximity (cheapest first for VALUE/MID, most expensive first for FLAGSHIP)
        if budget_tier in ("FLAGSHIP", "PREMIUM"):
            qs = qs.order_by("-min_price")
        else:
            qs = qs.order_by("min_price")

        products = list(qs[:20])  # fetch top 20 candidates

        # ── 6. Re-rank by use-case keyword matching ───────────────────────
        use_case = answers.get("use_case", "")
        keywords = USE_CASE_SORT_WEIGHT.get(use_case, [])

        def score(p):
            name_lower = (p.brand.name + " " + p.name).lower()
            return sum(1 for kw in keywords if kw in name_lower)

        if keywords:
            products.sort(key=score, reverse=True)

        # ── 7. Portability filter (laptops) — prefer lighter / smaller ────
        portability = answers.get("portability", "")
        if portability == "MOBILE" and category == "laptop":
            # Re-order: prefer models with "thin", "ultrabook", "13", "14" in name
            def portability_score(p):
                n = p.name.lower()
                return sum(1 for kw in ["thin", "ultra", "13", "14", "x1"] if kw in n)
            products.sort(key=portability_score, reverse=True)

        # ── 8. Serialise top N ────────────────────────────────────────────
        top_n = 8
        result = []
        for p in products[:top_n]:
            img = None
            if p.image:
                img = request.build_absolute_uri(p.image.url) if hasattr(p.image, 'url') else str(p.image)
            elif p.images.exists():
                first_img = p.images.first()
                img = request.build_absolute_uri(first_img.image.url) if first_img.image else None

            result.append({
                "id": p.id,
                "name": f"{p.brand.name} {p.name}",
                "image": img,
                "price": str(p.min_price or 0),
                "original_price": None,  # extend if you have an MRP field
                "url": f"/product/{p.id}/",
                "match_reason": self._build_match_reason(p, answers, use_case, budget_tier),
                "category": p.category,
            })

        if not result:
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"products": []},
                "error": None,
            }, status=status.HTTP_200_OK)

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {"products": result},
            "error": None,
        }, status=status.HTTP_200_OK)

    # ── Private Helpers ───────────────────────────────────────────────────────

    def _budget_ranges_for_category(self, category):
        if category == "laptop":
            return BUDGET_RANGES_LAPTOP
        if category == "tablet":
            return BUDGET_RANGES_TABLET
        return BUDGET_RANGES

    def _build_match_reason(self, product, answers, use_case, budget_tier):
        """Generate a short human-readable match reason sentence."""
        reasons = []
        name_lower = (product.brand.name + " " + product.name).lower()

        budget_labels = {
            "VALUE":    "great value",
            "MID":      "balanced price",
            "PREMIUM":  "premium performance",
            "FLAGSHIP": "flagship tier",
        }
        use_labels = {
            "PRODUCTIVITY": "work & productivity",
            "ACADEMICS":    "study & academic use",
            "EVERYDAY":     "everyday tasks",
            "PERFORMANCE":  "power & gaming",
            "PHOTOGRAPHY":  "photography",
            "WORK":         "professional work",
            "CREATIVE":     "creative work",
            "MEDIA":        "media & streaming",
        }

        if budget_tier in budget_labels:
            reasons.append(budget_labels[budget_tier])
        if use_case in use_labels:
            reasons.append(use_labels[use_case])

        if not reasons:
            return "Solid all-rounder for your needs."

        return f"Matched for {' & '.join(reasons)}."
