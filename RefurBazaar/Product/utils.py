"""
Shared, server-side-only pricing helpers for Product-related features.

These are intentionally kept out of any single app's views.py so that
ShoppingCart and Order (and anything else that needs it) share one source
of truth instead of hardcoding prices independently.
"""
from decimal import Decimal

# Extended warranty price per ProductModel.category. Never trust a
# client-supplied warranty price — always look it up here from the
# listing's category at the moment of add-to-cart / toggle.
WARRANTY_PRICES = {
    'mobile': Decimal('1499.00'),
    'laptop': Decimal('2999.00'),
    'tablet': Decimal('1999.00'),
    'accessory': Decimal('799.00'),
}

DEFAULT_WARRANTY_PRICE = Decimal('999.00')


def get_warranty_price(category):
    """
    Returns the Decimal extended-warranty price for a given
    ProductModel.category value. Falls back to DEFAULT_WARRANTY_PRICE for
    any unrecognized/blank category so this never raises.
    """
    if not category:
        return DEFAULT_WARRANTY_PRICE
    return WARRANTY_PRICES.get(category, DEFAULT_WARRANTY_PRICE)
