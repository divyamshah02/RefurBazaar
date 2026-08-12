"""
Django management command: seed_homepage_content

Usage:
    python manage.py seed_homepage_content
    python manage.py seed_homepage_content --dry-run

What it does:
  Populates every homepage content model (Admin/models.py) with the same
  sections/copy the static homepage currently ships with (promo banner,
  hero slides, trust strip, categories, product sections, spotlight, price
  ranges, testimonials, FAQs, stats, nav links, and the two bottom banners),
  so /admin-homepage/ has real rows to edit instead of an empty panel.

  Product-backed sections (ProductSection items, Spotlight) are linked to
  REAL ProductModel rows already in the DB — run `seed_catalog` and
  `seed_homepage_listings` first so those products actually have live
  listings/prices behind them.

  Idempotent: uses get_or_create keyed on natural fields (order, section_type,
  question, label, etc.) so re-running never creates duplicates.
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed all Homepage content models with the current site's copy, linked to real products where possible."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", default=False)

    def handle(self, *args, **options):
        self.dry_run = options["dry_run"]
        if self.dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no changes will be written.\n"))

        from Admin.models import (
            PromoBanner, HeroBannerSlide, TrustStripItem, CategoryCard,
            ProductSection, ProductSectionItem, SpotlightProduct,
            PriceRangeCard, ShopByPriceSlide, TestimonialCard,
            FAQItem, StatItem, NavCategoryLink, PartnerCTABanner, RenewedBanner,
        )
        from Product.models import ProductModel

        self.counts = {"created": 0, "existing": 0}

        def top_models(category=None, brand_name=None, limit=4):
            qs = ProductModel.objects.filter(is_active=True)
            if category:
                qs = qs.filter(category=category)
            if brand_name:
                qs = qs.filter(brand__name__iexact=brand_name)
            return list(qs.select_related("brand").order_by("-price_max", "id")[:limit])

        # ── 1. Promo banner ──────────────────────────────────────────
        self._get_or_create(
            PromoBanner, lookup={"text": "Recarvit Certified: Free Shipping on All Orders Above ₹999"},
            defaults={"is_active": True},
        )

        # ── 2. Hero slides ───────────────────────────────────────────
        hero_slides = [
            dict(order=0, bg_style="rc-slide-dark", tag_text="Recarvit Certified", tag_style="tag-green",
                 heading="The MacBook Air M2. Now Actually Affordable.",
                 body_text="50-point tested, fully certified, and backed by a 1 year warranty.",
                 btn1_text="Shop MacBooks", btn1_url="/shop?category=laptop&brand=Apple",
                 btn2_text="Learn More", btn2_url="/about",
                 badge_circle="Up to 70% OFF"),
            dict(order=1, bg_style="rc-slide-light", tag_text="Trending", tag_style="tag-dark",
                 heading="iPhone & Samsung. Minus the Premium Price Tag.",
                 body_text="Certified refurbished flagships, tested on 50+ checkpoints before they reach you.",
                 btn1_text="Shop Phones", btn1_url="/shop?category=mobile",
                 btn2_text="See the Checklist", btn2_url="/product-grading-policy",
                 badge_top_right="Bestseller"),
            dict(order=2, bg_style="rc-slide-repair", tag_text="For Professionals", tag_style="tag-green",
                 heading="Lenovo ThinkPad. Built to Last, Priced to Save.",
                 body_text="Enterprise-grade laptops, refurbished and warranty-backed for everyday work.",
                 btn1_text="Shop Laptops", btn1_url="/shop?category=laptop",
                 btn2_text="Talk to Sales", btn2_url="/partner-enterprise"),
        ]
        for s in hero_slides:
            self._get_or_create(HeroBannerSlide, lookup={"order": s["order"]}, defaults=s)

        # ── 3. Trust strip ───────────────────────────────────────────
        trust_items = [
            dict(order=0, icon="fas fa-check-circle", title="Certified Quality", subtitle="50+ point checkpoints"),
            dict(order=1, icon="fas fa-shield-alt", title="1 Year Warranty", subtitle="On every device"),
            dict(order=2, icon="fas fa-truck", title="Free Shipping", subtitle="On orders above ₹999"),
            dict(order=3, icon="fas fa-rotate-left", title="7-Day Returns", subtitle="No questions asked"),
        ]
        for t in trust_items:
            self._get_or_create(TrustStripItem, lookup={"order": t["order"]}, defaults=t)

        # ── 4. Category cards ─────────────────────────────────────────
        categories = [
            dict(order=0, name="Mobiles", link_url="/shop?category=mobile",
                 badge_text="Bestseller", badge_style="bg-success", product_count="450+", starting_price="₹6,999"),
            dict(order=1, name="Laptops", link_url="/shop?category=laptop",
                 badge_text="Trending", badge_style="bg-dark", product_count="220+", starting_price="₹14,999"),
            dict(order=2, name="Tablets", link_url="/shop?category=tablet",
                 badge_text="", badge_style="bg-dark", product_count="90+", starting_price="₹9,999"),
            dict(order=3, name="Accessories", link_url="/shop?category=accessory",
                 badge_text="", badge_style="bg-dark", product_count="130+", starting_price="₹499"),
        ]
        for c in categories:
            self._get_or_create(CategoryCard, lookup={"order": c["order"]}, defaults=c)

        # ── 5. Product sections + items (linked to real products) ──
        sections = [
            dict(section_type="hot_deals", title="Hot Deals", order=0, show_timer=True,
                 see_all_url="/shop?sort=deals", filter=dict(limit=6)),
            dict(section_type="end_of_year", title="End of Year Sale", order=1, bg_style="bg-off-white",
                 see_all_url="/shop?sale=eoy", filter=dict(limit=6)),
            dict(section_type="recommended", title="Recommended for You", order=2,
                 see_all_url="/shop", filter=dict(limit=6)),
            dict(section_type="featured", title="Recarvit Featured", order=3, bg_style="bg-soft-green",
                 see_all_url="/shop?featured=1", filter=dict(limit=6)),
            dict(section_type="certified_iphones", title="Certified Renewed iPhones", order=4,
                 see_all_url="/shop?brand=Apple&category=mobile",
                 promo_badge="Certified", promo_heading="As good as new, half the price.",
                 promo_btn_text="Shop iPhones", promo_btn_url="/shop?brand=Apple&category=mobile",
                 promo_style="iphones-promo",
                 filter=dict(category="mobile", brand_name="Apple", limit=6)),
            dict(section_type="certified_samsung", title="Certified Renewed Samsung", order=5,
                 see_all_url="/shop?brand=Samsung&category=mobile",
                 promo_badge="Certified", promo_heading="Flagship Samsung, refurbished right.",
                 promo_btn_text="Shop Samsung", promo_btn_url="/shop?brand=Samsung&category=mobile",
                 promo_style="samsung-promo",
                 filter=dict(category="mobile", brand_name="Samsung", limit=6)),
        ]

        no_catalog_warned = False
        for s in sections:
            filt = s.pop("filter")
            section = self._get_or_create(ProductSection, lookup={"section_type": s["section_type"]}, defaults=s)
            if section is None:
                continue  # dry-run

            models = top_models(**filt)
            if not models and not no_catalog_warned:
                self.stdout.write(self.style.WARNING(
                    "  ! No ProductModel rows found — run `seed_catalog` and "
                    "`seed_homepage_listings` first so sections have real products."
                ))
                no_catalog_warned = True

            for i, pm in enumerate(models):
                item_defaults = dict(
                    display_name=str(pm), specs_text="", order=i, is_active=True,
                    link_url=f"/product/{pm.id}/",
                )
                self._get_or_create(
                    ProductSectionItem,
                    lookup={"section": section, "product_model_id": pm.id},
                    defaults=item_defaults,
                )

        # ── 6. Spotlight product ─────────────────────────────────────
        spotlight_models = top_models(category="laptop", limit=1)
        if spotlight_models:
            pm = spotlight_models[0]
            self._get_or_create(
                SpotlightProduct, lookup={"product_model_id": pm.id},
                defaults=dict(
                    is_active=True, brand_label=pm.brand.name, product_model_id=pm.id,
                    display_name=str(pm), specs=["CORE I7", "16GB RAM", "512GB SSD"],
                    price="₹ 41,999", original_price="₹ 74,000", discount_pct=43,
                    save_amount="₹32,001", review_count=128, available_count=12,
                    link_url=f"/product/{pm.id}/",
                ),
            )

        # ── 7. Price range cards ──────────────────────────────────────
        price_ranges = [
            dict(order=0, tier="ENTRY LEVEL", label="Under ₹10K", description="Great starter devices",
                 link_url="/shop?max_price=10000"),
            dict(order=1, tier="VALUE", label="₹10K – ₹20K", description="Best value for money",
                 link_url="/shop?min_price=10000&max_price=20000"),
            dict(order=2, tier="PREMIUM", label="₹20K – ₹40K", description="Flagship performance",
                 link_url="/shop?min_price=20000&max_price=40000", is_dark=True),
            dict(order=3, tier="PRO", label="₹40K+", description="Top-tier refurbished devices",
                 link_url="/shop?min_price=40000"),
        ]
        for p in price_ranges:
            self._get_or_create(PriceRangeCard, lookup={"order": p["order"]}, defaults=p)

        # ── 8. Shop by price slides ────────────────────────────────────
        sbp_slides = [
            dict(order=0, label_line1="Under", label_line2="₹6,999", link_url="/shop?max_price=6999"),
            dict(order=1, label_line1="Under", label_line2="₹14,999", link_url="/shop?max_price=14999"),
            dict(order=2, label_line1="Under", label_line2="₹29,999", link_url="/shop?max_price=29999"),
            dict(order=3, label_line1="Under", label_line2="₹49,999", link_url="/shop?max_price=49999"),
        ]
        for sbp in sbp_slides:
            self._get_or_create(ShopByPriceSlide, lookup={"order": sbp["order"]}, defaults=sbp)

        # ── 9. Testimonials ───────────────────────────────────────────
        testimonials = [
            dict(order=0, initials="AK", name="Ankit Kumar", location="Bengaluru",
                 product_bought="MacBook Air M2", product_icon="fas fa-laptop",
                 review_text="Looked and worked like new. Saved almost ₹40,000 vs retail.", rating=5),
            dict(order=1, initials="PS", name="Priya Sharma", location="Mumbai",
                 product_bought="iPhone 13", product_icon="fas fa-mobile-alt",
                 review_text="Battery health was exactly as promised. Great after-sales support.", rating=5),
            dict(order=2, initials="RV", name="Rahul Verma", location="Delhi",
                 product_bought="Galaxy S22", product_icon="fas fa-mobile-alt",
                 review_text="Fast delivery, genuine certification, would buy again.", rating=4),
        ]
        for t in testimonials:
            self._get_or_create(TestimonialCard, lookup={"order": t["order"]}, defaults=t)

        # ── 10. FAQs ───────────────────────────────────────────────────
        faqs = [
            dict(order=0, question="Are Recarvit devices really refurbished, not used?",
                 answer="Every device is tested across 50+ checkpoints (battery, screen, camera, "
                        "ports) and any faulty parts are replaced before it's listed for sale."),
            dict(order=1, question="What warranty do I get?",
                 answer="All Recarvit Certified devices come with a minimum 1 year warranty covering "
                        "manufacturing and functional defects."),
            dict(order=2, question="Can I return my order?",
                 answer="Yes — we offer a 7-day no-questions-asked return window from the date of delivery."),
            dict(order=3, question="How is the price so much lower than retail?",
                 answer="These are professionally refurbished devices, not new units, so you save "
                        "significantly while getting the same certified quality."),
        ]
        for f in faqs:
            self._get_or_create(FAQItem, lookup={"order": f["order"]}, defaults=f)

        # ── 11. Stats ────────────────────────────────────────────────
        stats = [
            dict(order=0, target_value=50000, suffix="+", label="Happy Customers"),
            dict(order=1, target_value=25000, suffix="+", label="Devices Refurbished"),
            dict(order=2, target_value=100, suffix="+", label="Cities Served"),
            dict(order=3, target_value=4.8, decimals=1, label="Average Rating"),
        ]
        for s in stats:
            self._get_or_create(StatItem, lookup={"order": s["order"]}, defaults=s)

        # ── 12. Nav category links ─────────────────────────────────────
        nav_links = [
            dict(order=0, label="Mobiles", url="/shop?category=mobile"),
            dict(order=1, label="Laptops", url="/shop?category=laptop"),
            dict(order=2, label="Tablets", url="/shop?category=tablet"),
            dict(order=3, label="Deals", url="/shop?sort=deals", highlight_class="highlight-red"),
            dict(order=4, label="Sell Your Device", url="/partner-application", highlight_class="highlight-blue"),
        ]
        for n in nav_links:
            self._get_or_create(NavCategoryLink, lookup={"order": n["order"]}, defaults=n)

        # ── 13. Partner CTA banner ─────────────────────────────────────
        self._get_or_create(
            PartnerCTABanner, lookup={"heading": "Become a Recarvit Refurbishing Partner"},
            defaults=dict(
                heading="Become a Recarvit Refurbishing Partner",
                subtext="List your certified refurbished inventory to thousands of buyers.",
                btn_text="Apply Now", btn_url="/partner-application",
            ),
        )

        # ── 14. Renewed banner ─────────────────────────────────────────
        self._get_or_create(
            RenewedBanner, lookup={"heading": "Recarvit Certified: As Good As New."},
            defaults=dict(
                heading="Recarvit Certified: As Good As New.",
                subtext="We test 50+ checkpoints (Battery, Screen, Camera) so you don't have to.",
                cta_text="See the Checklist",
            ),
        )

        self.stdout.write("\n" + "=" * 60)
        if self.dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN complete — nothing was written."))
        else:
            self.stdout.write(self.style.SUCCESS("Homepage content seeded!"))
        self.stdout.write(
            f"  Rows created: {self.counts['created']}, already existed: {self.counts['existing']}\n"
        )

    # ------------------------------------------------------------------
    def _get_or_create(self, model, lookup, defaults):
        """get_or_create wrapper that also honours --dry-run and tracks stats."""
        if self.dry_run:
            existing = model.objects.filter(**lookup).first()
            self.counts["existing" if existing else "created"] += 1
            return existing

        obj, created = model.objects.get_or_create(**lookup, defaults=defaults)
        self.counts["created" if created else "existing"] += 1
        return obj
