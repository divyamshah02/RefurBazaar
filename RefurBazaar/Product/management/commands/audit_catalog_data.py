from django.core.management.base import BaseCommand
from django.db.models import Count, F

from Product.models import ListingUnitAttribute, ProductModel, ProductModelAttribute


class Command(BaseCommand):
    help = (
        "Report customer-visible catalog data that cannot be right: specifications from another "
        "category (e.g. phone-only 'Neural Engine' on a tablet) and products without any image. "
        "Read-only by default. Use --deactivate to hide the reported products from customers; "
        "their listings, units and order history are kept."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--model-ids', nargs='+', type=int,
            help="Only check these product model ids (the number in /product/<id>/).",
        )
        parser.add_argument(
            '--deactivate', action='store_true',
            help="Mark the reported products inactive so they disappear from the shop and product pages.",
        )

    def handle(self, *args, **options):
        scope = options.get('model_ids')
        model_filter = {'id__in': scope} if scope else {}

        flagged = {}

        # 1. Specifications defined on a model that belong to a different category.
        wrong_model_attrs = (
            ProductModelAttribute.objects
            .filter(**{f'product_model__{k}': v for k, v in model_filter.items()})
            .exclude(attribute__category=F('product_model__category'))
            .select_related('product_model', 'product_model__brand', 'attribute')
        )
        for link in wrong_model_attrs:
            flagged.setdefault(link.product_model_id, {"model": link.product_model, "problems": set()})[
                "problems"
            ].add(f"spec '{link.attribute.name}' belongs to category '{link.attribute.category}'")

        # 2. Values already saved on units for such specifications.
        wrong_unit_attrs = (
            ListingUnitAttribute.objects
            .filter(**{f'listing_unit__listing__model__{k}': v for k, v in model_filter.items()})
            .exclude(attribute__category=F('listing_unit__listing__model__category'))
            .select_related('listing_unit__listing__model__brand', 'attribute')
        )
        for unit_attr in wrong_unit_attrs:
            model = unit_attr.listing_unit.listing.model
            flagged.setdefault(model.id, {"model": model, "problems": set()})["problems"].add(
                f"unit value for '{unit_attr.attribute.name}' belongs to category '{unit_attr.attribute.category}'"
            )

        # 3. Customer-visible products with no image at all.
        no_image = (
            ProductModel.objects
            .filter(is_active=True, **model_filter)
            .annotate(image_count=Count('images'))
            .filter(image_count=0, image__isnull=True)
            .select_related('brand')
        )
        for model in no_image:
            flagged.setdefault(model.id, {"model": model, "problems": set()})["problems"].add("no image")

        if not flagged:
            self.stdout.write(self.style.SUCCESS("No mismatched catalog data found."))
            return

        self.stdout.write(self.style.WARNING(f"{len(flagged)} product(s) need attention:\n"))
        for model_id, info in sorted(flagged.items()):
            model = info["model"]
            state = "active" if model.is_active else "inactive"
            self.stdout.write(f"  /product/{model_id}/  {model.brand.name} {model.name} [{model.category}, {state}]")
            for problem in sorted(info["problems"]):
                self.stdout.write(f"      - {problem}")
        self.stdout.write(
            "\nImages cannot be compared automatically: open each product and confirm the photo matches the model."
        )

        if options['deactivate']:
            ids = [i for i, info in flagged.items() if info["model"].is_active]
            updated = ProductModel.objects.filter(id__in=ids).update(is_active=False)
            self.stdout.write(self.style.SUCCESS(
                f"\nDeactivated {updated} product(s). Fix their images/specifications in the admin panel, then "
                "mark them active again."
            ))
        else:
            self.stdout.write("\nRe-run with --deactivate to hide these products from customers (nothing is deleted).")
