"""
Django management command: seed_catalog
Usage:
    python manage.py seed_catalog
    python manage.py seed_catalog --dry-run          # preview only, no DB writes
    python manage.py seed_catalog --category laptop  # only one category
    python manage.py seed_catalog --reset-attrs       # recompute possible_values on ProductModelAttribute rows

What it does (in order):
  1. Reads  data/seed_data.json  (produced by parse_catalog.mjs)
  2. Creates Brand rows                 — skips if name already exists
  3. Creates ProductModel rows          — skips if (brand, name, category) already exists
  4. Creates AttributeMaster rows       — name+category label only, skips if already exists
  5. Creates ProductModelAttribute rows — stores data_type + possible_values PER PRODUCT;
                                          skips if (product_model, attribute) already exists

The script NEVER deletes existing rows.  Running it multiple times is safe.
"""

import json
import os
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
# Attributes that should be filterable on the customer side
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

# ---------------------------------------------------------------------------
# Helper: decide the data_type and possible_values for a single attribute
# value string on a specific product.
# - If the value contains "/" and looks like a multi-option list → choice
# - If it looks purely numeric → number
# - Otherwise → text (no possible_values needed)
# ---------------------------------------------------------------------------
def _derive_type_and_values(val_str: str):
    """Return (data_type, possible_values_list) for a raw attribute value."""
    if "/" in val_str and len(val_str) < 200:
        parts = sorted({p.strip() for p in val_str.split("/") if p.strip()})
        if len(parts) > 1:
            return "choice", parts

    # Pure number check
    try:
        float(val_str.replace(",", "").strip())
        return "number", []
    except ValueError:
        pass

    return "text", []


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
            help="Re-scan all models and refresh data_type/possible_values on ProductModelAttribute rows.",
        )

    # ------------------------------------------------------------------
    def handle(self, *args, **options):
        dry_run     = options["dry_run"]
        only_cat    = options["category"]
        reset_attrs = options["reset_attrs"]

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
            "brands_created":  0,
            "brands_skipped":  0,
            "models_created":  0,
            "models_skipped":  0,
            "attrs_created":   0,
            "attrs_skipped":   0,
            "pma_created":     0,
            "pma_skipped":     0,
            "pma_updated":     0,
        }

        # ------------------------------------------------------------------
        # PHASE 1 — Brands
        # ------------------------------------------------------------------
        self.stdout.write("\n--- Phase 1: Brands ---")

        brand_cache = {}  # brand_name -> Brand instance

        for b in brands_raw:
            key = b["name"]
            if key in brand_cache:
                continue

            if dry_run:
                existing = Brand.objects.filter(name=key).first()
                brand_cache[key] = existing or type("Brand", (), {"id": None, "name": key})()
                stats["brands_created" if not existing else "brands_skipped"] += 1
                continue

            brand_obj, created = Brand.objects.get_or_create(
                name=key, defaults={"is_active": True}
            )
            brand_cache[key] = brand_obj
            if created:
                stats["brands_created"] += 1
                self.stdout.write(f"  + Brand: {key}")
            else:
                stats["brands_skipped"] += 1

        self.stdout.write(
            f"  Brands: {stats['brands_created']} created, "
            f"{stats['brands_skipped']} already existed."
        )

        # ------------------------------------------------------------------
        # PHASE 2 — AttributeMaster (name + category label only — no type/values)
        # We still scan all models to collect the full attribute name set first.
        # ------------------------------------------------------------------
        self.stdout.write("\n--- Phase 2: AttributeMaster (label registry) ---")

        # attr_name_registry[db_cat] = {attr_name: display_order}
        attr_name_registry: dict[str, dict[str, int]] = {}

        for m in models_raw:
            db_cat = CATEGORY_MAP[m["category"]]
            if db_cat not in attr_name_registry:
                attr_name_registry[db_cat] = {}
            for attr_name in m.get("attributes", {}).keys():
                if attr_name and attr_name not in attr_name_registry[db_cat]:
                    attr_name_registry[db_cat][attr_name] = len(attr_name_registry[db_cat])

        attr_master_cache = {}  # (db_cat, attr_name) -> AttributeMaster instance

        for db_cat, name_order in attr_name_registry.items():
            for attr_name, display_order in name_order.items():
                cache_key = (db_cat, attr_name)

                if dry_run:
                    existing = AttributeMaster.objects.filter(
                        category=db_cat, name=attr_name
                    ).first()
                    attr_master_cache[cache_key] = existing or type(
                        "AM", (), {"id": None, "name": attr_name}
                    )()
                    stats["attrs_created" if not existing else "attrs_skipped"] += 1
                    continue

                am, created = AttributeMaster.objects.get_or_create(
                    category=db_cat,
                    name=attr_name,
                    defaults={
                        "is_active":     True,
                        "display_order": display_order,
                    },
                )
                attr_master_cache[cache_key] = am
                if created:
                    stats["attrs_created"] += 1
                else:
                    stats["attrs_skipped"] += 1

        self.stdout.write(
            f"  AttributeMaster: {stats['attrs_created']} created, "
            f"{stats['attrs_skipped']} already existed."
        )

        # ------------------------------------------------------------------
        # PHASE 3 — ProductModel + ProductModelAttribute
        # data_type and possible_values are stored HERE, per product.
        # ------------------------------------------------------------------
        self.stdout.write("\n--- Phase 3: ProductModel + ProductModelAttribute ---")

        for m in models_raw:
            brand_name  = m["brand"]
            db_cat      = CATEGORY_MAP[m["category"]]
            launch_year = m.get("launch_year")
            brand_obj   = brand_cache.get(brand_name)

            if brand_obj is None:
                self.stdout.write(
                    self.style.WARNING(
                        f"  WARN: Brand '{brand_name}' not in cache — "
                        f"skipping model '{m['name']}'"
                    )
                )
                continue

            if dry_run:
                existing = ProductModel.objects.filter(
                    brand__name=brand_name, name=m["name"], category=db_cat
                ).first()
                stats["models_created" if not existing else "models_skipped"] += 1
                for attr_name, attr_val in m.get("attributes", {}).items():
                    if attr_val is not None and str(attr_val).strip():
                        stats["pma_created"] += 1
                continue

            with transaction.atomic():
                pm, pm_created = ProductModel.objects.get_or_create(
                    brand=brand_obj,
                    name=m["name"],
                    category=db_cat,
                    defaults={"release_year": launch_year, "is_active": True},
                )

                if pm_created:
                    stats["models_created"] += 1
                    self.stdout.write(f"  + Model: {brand_name} {m['name']} [{db_cat}]")
                else:
                    stats["models_skipped"] += 1

                # For each attribute on this model, create/update the PMA row
                # with the type and allowed values derived from THIS model's value.
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
                                "not in cache — skipping."
                            )
                        )
                        continue

                    data_type, possible_values = _derive_type_and_values(val_str)

                    pma, pma_created = ProductModelAttribute.objects.get_or_create(
                        product_model=pm,
                        attribute=am,
                        defaults={
                            "is_required":     True,
                            "is_filter":       attr_name in FILTER_ATTRS,
                            "data_type":       data_type,
                            "possible_values": possible_values,
                        },
                    )

                    if pma_created:
                        stats["pma_created"] += 1
                    else:
                        stats["pma_skipped"] += 1
                        # Optionally refresh type/values if --reset-attrs passed
                        if reset_attrs:
                            pma.data_type = data_type
                            pma.possible_values = possible_values
                            pma.save(update_fields=["data_type", "possible_values"])
                            stats["pma_updated"] += 1

        self.stdout.write(
            f"  ProductModel: {stats['models_created']} created, "
            f"{stats['models_skipped']} already existed."
        )
        self.stdout.write(
            f"  ProductModelAttribute: {stats['pma_created']} created, "
            f"{stats['pma_updated']} updated, "
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
            f"{stats['attrs_skipped']:>4} skipped\n"
            f"  ProductModelAttr:     {stats['pma_created']:>4} created  "
            f"{stats['pma_updated']:>4} updated  "
            f"{stats['pma_skipped']:>4} skipped\n"
        )
