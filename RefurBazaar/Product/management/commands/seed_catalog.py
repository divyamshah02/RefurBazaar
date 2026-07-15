"""
Django management command: seed_catalog
Usage:
    python manage.py seed_catalog
    python manage.py seed_catalog --dry-run          # preview only, no DB writes
    python manage.py seed_catalog --category laptop  # only one category
    python manage.py seed_catalog --reset-attrs       # recompute possible_values for existing AttributeMaster rows

What it does (in order):
  1. Reads  data/seed_data.json  (produced by parse_catalog.mjs)
  2. Creates Brand rows           — skips if name already exists
  3. Creates ProductModel rows    — skips if (brand, name, category) already exists
  4. Creates AttributeMaster rows — skips if (category, name) already exists;
                                    updates possible_values if new values appear
  5. Creates ProductModelAttribute rows — skips if (product_model, attribute) already exists

The script NEVER deletes existing rows.  Running it multiple times is safe.
"""

import json
import os
import sys
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

# ---------------------------------------------------------------------------
# Category mapping:  JSON value  →  Django model choice value
# ---------------------------------------------------------------------------
CATEGORY_MAP = {
    "smartphone": "mobile",
    "laptop":     "laptop",
    "tablet":     "tablet",
    "wearable":   "accessory",
}

# ---------------------------------------------------------------------------
# Attributes that should be treated as filter-able on the customer side
# (kept short — only the most customer-relevant ones)
# ---------------------------------------------------------------------------
FILTER_ATTRS = {
    # Shared
    "Storage Options", "Colour Options", "Screen Size", "Water Resistance",
    # Mobile / Tablet
    "RAM", "Processor", "Display Type", "Battery Capacity", "OS",
    "Fast Charging", "NFC", "SIM Slots",
    # Laptop
    "RAM Options (GB)", "CPU Brand", "CPU Series", "Form Factor",
    "Touch Screen", "Discrete GPU", "Storage Type", "Usage Type",
    # Wearable
    "Sub-Category", "Compatible With", "Battery Life",
}


class Command(BaseCommand):
    help = "Seed Brand, ProductModel, AttributeMaster and ProductModelAttribute from data/seed_data.json"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Simulate the import without writing anything to the database.",
        )
        parser.add_argument(
            "--category",
            choices=list(CATEGORY_MAP.keys()),
            default=None,
            help="Import only a single category (smartphone / laptop / tablet / wearable).",
        )
        parser.add_argument(
            "--reset-attrs",
            action="store_true",
            default=False,
            help="Re-scan all models and refresh possible_values on AttributeMaster rows.",
        )

    # ------------------------------------------------------------------
    def handle(self, *args, **options):
        dry_run      = options["dry_run"]
        only_cat     = options["category"]
        reset_attrs  = options["reset_attrs"]

        # Locate the JSON file relative to this repo
        base_dir = os.path.dirname(  # RefurBazaar/
                       os.path.dirname(  # Product/
                           os.path.dirname(  # management/
                               os.path.dirname(  # commands/
                                   os.path.abspath(__file__)))))
        json_path = os.path.join(os.path.dirname(base_dir), "data", "seed_data.json")

        if not os.path.exists(json_path):
            raise CommandError(
                f"seed_data.json not found at {json_path}\n"
                "Run  node parse_catalog.mjs  from the project root first."
            )

        self.stdout.write(f"Loading {json_path} ...")
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        brands_raw = data.get("brands", [])
        models_raw = data.get("models", [])

        # Filter by category if requested
        if only_cat:
            brands_raw = [b for b in brands_raw if b["category"] == only_cat]
            models_raw = [m for m in models_raw if m["category"] == only_cat]
            self.stdout.write(f"Filtering to category: {only_cat}")

        self.stdout.write(
            f"Found {len(brands_raw)} brands, {len(models_raw)} models in JSON."
        )

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no changes will be written.\n"))

        # Import lazily so Django's app registry is ready
        from Product.models import Brand, ProductModel, AttributeMaster, ProductModelAttribute

        # ------------------------------------------------------------------
        # Counters
        # ------------------------------------------------------------------
        stats = {
            "brands_created":    0,
            "brands_skipped":    0,
            "models_created":    0,
            "models_skipped":    0,
            "attrs_created":     0,
            "attrs_updated":     0,
            "attrs_skipped":     0,
            "pma_created":       0,
            "pma_skipped":       0,
        }

        # ------------------------------------------------------------------
        # PHASE 1 — Brands
        # ------------------------------------------------------------------
        self.stdout.write("\n--- Phase 1: Brands ---")

        brand_cache = {}  # "Brand Name|db_category" -> Brand instance

        for b in brands_raw:
            db_cat = CATEGORY_MAP[b["category"]]
            key    = b["name"]

            if key in brand_cache:
                continue  # already resolved in this run

            if dry_run:
                existing = Brand.objects.filter(name=b["name"]).first()
                if existing:
                    brand_cache[key] = existing
                    stats["brands_skipped"] += 1
                else:
                    # Create a fake in-memory object for dry-run navigation
                    brand_cache[key] = type("Brand", (), {"id": None, "name": b["name"]})()
                    stats["brands_created"] += 1
                continue

            brand_obj, created = Brand.objects.get_or_create(
                name=b["name"],
                defaults={"is_active": True},
            )
            brand_cache[key] = brand_obj
            if created:
                stats["brands_created"] += 1
                self.stdout.write(f"  + Brand: {b['name']}")
            else:
                stats["brands_skipped"] += 1

        self.stdout.write(
            f"  Brands: {stats['brands_created']} created, "
            f"{stats['brands_skipped']} already existed."
        )

        # ------------------------------------------------------------------
        # PHASE 2 — AttributeMaster
        # Build a per-category attribute registry so we can collect all
        # possible_values across every model before we write.
        # ------------------------------------------------------------------
        self.stdout.write("\n--- Phase 2: AttributeMaster ---")

        # attr_registry[db_cat][attr_name] = set of values seen across all models
        attr_registry: dict[str, dict[str, set]] = {}

        for m in models_raw:
            db_cat = CATEGORY_MAP[m["category"]]
            if db_cat not in attr_registry:
                attr_registry[db_cat] = {}
            for attr_name, attr_val in m.get("attributes", {}).items():
                if not attr_name or attr_val is None:
                    continue
                val_str = str(attr_val).strip()
                if not val_str:
                    continue
                if attr_name not in attr_registry[db_cat]:
                    attr_registry[db_cat][attr_name] = set()
                # Explode multi-value cells (e.g. "128GB/256GB/512GB") into
                # individual options so possible_values is useful for the UI.
                # We only do this for slash-separated lists that look like
                # storage/RAM/colour options (not general text).
                if "/" in val_str and len(val_str) < 120:
                    parts = [p.strip() for p in val_str.split("/") if p.strip()]
                    attr_registry[db_cat][attr_name].update(parts)
                else:
                    attr_registry[db_cat][attr_name].add(val_str)

        # Now upsert AttributeMaster
        attr_master_cache = {}  # (db_cat, attr_name) -> AttributeMaster instance

        for db_cat, attrs in attr_registry.items():
            # Determine display_order by the order attributes first appear in
            # a representative model of this category
            order_map = {}
            order_idx = 0
            for m in models_raw:
                if CATEGORY_MAP[m["category"]] != db_cat:
                    continue
                for attr_name in m.get("attributes", {}).keys():
                    if attr_name not in order_map:
                        order_map[attr_name] = order_idx
                        order_idx += 1
                break  # one model is enough for ordering

            for attr_name, values_set in attrs.items():
                possible_values = sorted(values_set)
                display_order   = order_map.get(attr_name, 999)
                is_filter       = attr_name in FILTER_ATTRS
                cache_key       = (db_cat, attr_name)

                if dry_run:
                    existing = AttributeMaster.objects.filter(
                        category=db_cat, name=attr_name
                    ).first()
                    if existing:
                        attr_master_cache[cache_key] = existing
                        stats["attrs_skipped"] += 1
                    else:
                        attr_master_cache[cache_key] = type(
                            "AM", (), {"id": None, "name": attr_name}
                        )()
                        stats["attrs_created"] += 1
                    continue

                am, created = AttributeMaster.objects.get_or_create(
                    category=db_cat,
                    name=attr_name,
                    defaults={
                        "data_type":       "text",
                        "possible_values": possible_values,
                        "is_active":       True,
                        "display_order":   display_order,
                    },
                )
                attr_master_cache[cache_key] = am

                if created:
                    stats["attrs_created"] += 1
                else:
                    stats["attrs_skipped"] += 1
                    # Merge any new possible values that weren't there before
                    if reset_attrs or possible_values:
                        existing_set = set(am.possible_values or [])
                        new_vals     = set(possible_values)
                        merged       = sorted(existing_set | new_vals)
                        if merged != sorted(existing_set):
                            am.possible_values = merged
                            am.save(update_fields=["possible_values"])
                            stats["attrs_updated"] += 1

        self.stdout.write(
            f"  AttributeMaster: {stats['attrs_created']} created, "
            f"{stats['attrs_updated']} updated (new values), "
            f"{stats['attrs_skipped']} already existed."
        )

        # ------------------------------------------------------------------
        # PHASE 3 — ProductModel + ProductModelAttribute
        # ------------------------------------------------------------------
        self.stdout.write("\n--- Phase 3: ProductModel + ProductModelAttribute ---")

        # Group models by brand for nicer console output
        for m in models_raw:
            brand_name  = m["brand"]
            db_cat      = CATEGORY_MAP[m["category"]]
            launch_year = m.get("launch_year")
            brand_obj   = brand_cache.get(brand_name)

            if brand_obj is None:
                self.stdout.write(
                    self.style.WARNING(f"  WARN: Brand '{brand_name}' not in cache — skipping model '{m['name']}'")
                )
                continue

            if dry_run:
                existing = ProductModel.objects.filter(
                    brand__name=brand_name,
                    name=m["name"],
                    category=db_cat,
                ).first()
                if existing:
                    stats["models_skipped"] += 1
                else:
                    stats["models_created"] += 1
                # Count PMA entries we would create
                for attr_name, attr_val in m.get("attributes", {}).items():
                    if attr_val is not None and str(attr_val).strip():
                        stats["pma_created"] += 1
                continue

            with transaction.atomic():
                pm, pm_created = ProductModel.objects.get_or_create(
                    brand=brand_obj,
                    name=m["name"],
                    category=db_cat,
                    defaults={
                        "release_year": launch_year,
                        "is_active":    True,
                    },
                )

                if pm_created:
                    stats["models_created"] += 1
                    self.stdout.write(f"  + Model: {brand_name} {m['name']} [{db_cat}]")
                else:
                    stats["models_skipped"] += 1

                # ProductModelAttribute — only for models that were just created
                # OR for models that exist but may be missing some attributes
                for attr_name, attr_val in m.get("attributes", {}).items():
                    if attr_val is None:
                        continue
                    val_str = str(attr_val).strip()
                    if not val_str:
                        continue

                    cache_key = (db_cat, attr_name)
                    am = attr_master_cache.get(cache_key)
                    if am is None:
                        self.stdout.write(
                            self.style.WARNING(
                                f"    WARN: AttributeMaster ({db_cat}, {attr_name}) "
                                "not in cache — skipping attribute."
                            )
                        )
                        continue

                    pma, pma_created = ProductModelAttribute.objects.get_or_create(
                        product_model=pm,
                        attribute=am,
                        defaults={
                            "is_required": True,
                            "is_filter":   attr_name in FILTER_ATTRS,
                        },
                    )

                    if pma_created:
                        stats["pma_created"] += 1
                    else:
                        stats["pma_skipped"] += 1

        self.stdout.write(
            f"  ProductModel: {stats['models_created']} created, "
            f"{stats['models_skipped']} already existed."
        )
        self.stdout.write(
            f"  ProductModelAttribute: {stats['pma_created']} created, "
            f"{stats['pma_skipped']} already existed."
        )

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        self.stdout.write("\n" + "=" * 60)
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN complete — nothing was written."))
        else:
            self.stdout.write(self.style.SUCCESS("Seeding complete!"))

        self.stdout.write(
            f"\n  Brands:               {stats['brands_created']:>4} created  "
            f"{stats['brands_skipped']:>4} skipped\n"
            f"  ProductModels:        {stats['models_created']:>4} created  "
            f"{stats['models_skipped']:>4} skipped\n"
            f"  AttributeMaster:      {stats['attrs_created']:>4} created  "
            f"{stats['attrs_updated']:>4} updated  "
            f"{stats['attrs_skipped']:>4} skipped\n"
            f"  ProductModelAttr:     {stats['pma_created']:>4} created  "
            f"{stats['pma_skipped']:>4} skipped\n"
        )
