"""
Homepage seed script — populates all CMS models with the data that was
previously hardcoded in index.html.

Usage (run from the Django project root):
    python manage.py shell < seed_homepage_data.py
    # OR
    python manage.py runscript seed_homepage_data   # if django-extensions is installed

All creates use get_or_create so the script is safe to re-run without
creating duplicates.  It will not overwrite fields you have already
edited in the admin, because it only touches rows it creates freshly
(the 'created' flag check pattern).
"""

import os
import django

# ── Bootstrap Django if run directly (not via manage.py shell) ───────────────
if not os.environ.get('DJANGO_SETTINGS_MODULE'):
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')   # ← adjust to your project
    django.setup()

from Admin.models import (   # ← adjust app label if yours differs
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


def run():
    print("Seeding homepage data …")

    # ─────────────────────────────────────────────────────────────────────
    # 1. PROMO BANNER
    # ─────────────────────────────────────────────────────────────────────
    banner, created = PromoBanner.objects.get_or_create(
        text='GET ₹100 OFF WITH CODE REFUR100 + ₹200 CASHBACK!',
        defaults={'is_active': False},    # disabled by default; activate via admin
    )
    if created:
        print('  ✓ PromoBanner')


    # ─────────────────────────────────────────────────────────────────────
    # 2. HERO SLIDES
    # ─────────────────────────────────────────────────────────────────────
    hero_slides = [
        dict(
            order=1,
            bg_style='rc-slide-dark',
            tag_text='New Arrival',
            tag_style='tag-green',
            heading='The MacBook Air M2.\nNow Actually Affordable.',
            body_text='256GB · 16GB RAM · Recarvit Certified\nStarting ₹59,900 — 40% below new price.',
            btn1_text='Shop MacBooks →',
            btn1_url='/shop/?category=laptop',
            btn1_style='btn rc-btn-primary',
            btn2_text='See All Laptops',
            btn2_url='/shop/?category=laptop',
            btn2_style='btn rc-btn-text',
            image_max_width='500px',
            badge_top_right='6M Warranty ✓',
            badge_bottom_center='40% OFF',
            badge_circle='',
            is_active=True,
        ),
        dict(
            order=2,
            bg_style='rc-slide-light',
            tag_text='Best Sellers',
            tag_style='tag-dark',
            heading='iPhone & Samsung.\nMinus the Premium Price Tag.',
            body_text='Top flagship phones. Up to 40% off new prices.\n50-point tested, 6-month warranty included.',
            btn1_text='Shop Phones →',
            btn1_url='/shop/?category=mobile',
            btn1_style='btn rc-btn-primary',
            btn2_text='Compare Grades',
            btn2_url='#',
            btn2_style='btn rc-btn-outline-dark',
            image_max_width='fit-content',
            badge_top_right='',
            badge_bottom_center='Up to 40% Off',
            badge_circle='',
            is_active=True,
        ),
        dict(
            order=3,
            bg_style='rc-slide-green',
            tag_text='Recarvit Marketplace',
            tag_style='tag-light',
            heading='More Sellers. More Choices.',
            body_text="1,500+ certified devices from India's most trusted refurbishers.",
            btn1_text='Explore All Devices →',
            btn1_url='/shop/',
            btn1_style='btn rc-btn-white',
            btn2_text='',
            btn2_url='',
            btn2_style='',
            image_max_width='',
            badge_top_right='',
            badge_bottom_center='',
            badge_circle='Up to\n70%\nOFF',
            is_active=True,
        ),
        dict(
            order=4,
            bg_style='rc-slide-repair',
            tag_text='',
            tag_style='tag-green',
            heading='Fix More Spend Less',
            body_text='Use code REFGG and get Rs. 200 OFF on first booking',
            btn1_text='BOOK NOW',
            btn1_url='#',
            btn1_style='btn repair-btn-green rounded-pill px-4 py-2',
            btn2_text='',
            btn2_url='',
            btn2_style='',
            image_max_width='',
            badge_top_right='',
            badge_bottom_center='',
            badge_circle='',
            is_active=True,
        ),
    ]

    for slide_data in hero_slides:
        order = slide_data.pop('order')
        obj, created = HeroBannerSlide.objects.get_or_create(
            order=order,
            defaults=slide_data,
        )
        if created:
            print(f'  ✓ HeroBannerSlide order={order}')


    # ─────────────────────────────────────────────────────────────────────
    # 3. TRUST STRIP
    # ─────────────────────────────────────────────────────────────────────
    trust_items = [
        (1, 'fas fa-check-circle', '50-Point Quality Check', 'Every device tested'),
        (2, 'fas fa-shield-alt',   '6-Month Warranty',       'Hardware covered'),
        (3, 'fas fa-box-open',     'Free Delivery',          'Pan-India shipping'),
        (4, 'fas fa-undo',         '7-Day Returns',          'Hassle Free'),
    ]
    for order, icon, title, subtitle in trust_items:
        obj, created = TrustStripItem.objects.get_or_create(
            title=title,
            defaults={'order': order, 'icon': icon, 'subtitle': subtitle, 'is_active': True},
        )
        if created:
            print(f'  ✓ TrustStripItem: {title}')


    # ─────────────────────────────────────────────────────────────────────
    # 4. CATEGORY CARDS
    # ─────────────────────────────────────────────────────────────────────
    categories = [
        dict(order=1, name='iPhones',     link_url='/shop/?category=mobile',    badge_text='Most Popular',   badge_style='bg-dark',    product_count='450+', starting_price='₹12,999'),
        dict(order=2, name='MacBooks',    link_url='/shop/?category=laptop',    badge_text='Best Sellers',   badge_style='bg-success', product_count='320+', starting_price='₹44,999'),
        dict(order=3, name='Samsung',     link_url='/shop/?category=mobile',    badge_text='Top Flagships',  badge_style='bg-dark',    product_count='280+', starting_price='₹9,999'),
        dict(order=4, name='Laptops',     link_url='/shop/?category=laptop',    badge_text='Business Ready', badge_style='bg-success', product_count='215+', starting_price='₹14,999'),
        dict(order=5, name='iPads',       link_url='/shop/?category=tablet',    badge_text='For Students',   badge_style='bg-dark',    product_count='180+', starting_price='₹19,999'),
        dict(order=6, name='Accessories', link_url='/shop/?category=accessory', badge_text='AirPods & More', badge_style='bg-success', product_count='520+', starting_price='₹299'),
    ]
    for cat in categories:
        order = cat.pop('order')
        obj, created = CategoryCard.objects.get_or_create(
            name=cat['name'],
            defaults={**cat, 'order': order, 'is_active': True},
        )
        if created:
            print(f'  ✓ CategoryCard: {cat["name"]}')


    # ─────────────────────────────────────────────────────────────────────
    # 5. PRODUCT SECTIONS
    # ─────────────────────────────────────────────────────────────────────
    sections = [
        dict(
            order=1, title='HOT DEALS', section_type='hot_deals',
            bg_style='', see_all_url='#', see_all_text='View All Deals',
            show_timer=True,
        ),
        dict(
            order=2, title='End of Year Sale', section_type='end_of_year',
            bg_style='bg-off-white', see_all_url='/shop/?category=sale', see_all_text='See All',
            show_timer=False,
        ),
        dict(
            order=3, title='Recommended for You', section_type='recommended',
            bg_style='', see_all_url='/shop/', see_all_text='See All',
            show_timer=False,
        ),
        dict(
            order=4, title='RECARVIT FEATURED', section_type='featured',
            bg_style='', see_all_url='/shop/?category=express', see_all_text='View Featured',
            show_timer=False,
        ),
        dict(
            order=5, title='CERTIFIED RENEWED IPHONES', section_type='certified_iphones',
            bg_style='bg-off-white', see_all_url='/shop/?category=mobile', see_all_text='See all',
            show_timer=False,
            promo_badge='Best Sellers',
            promo_heading='iPhones\nCertified\nRenewed',
            promo_btn_text='Shop Now',
            promo_btn_url='/shop/?category=mobile',
            promo_style='iphones-promo',
        ),
        dict(
            order=6, title='CERTIFIED RENEWED SAMSUNG', section_type='certified_samsung',
            bg_style='bg-soft-green', see_all_url='/shop/?category=mobile', see_all_text='See all',
            show_timer=False,
            promo_badge='Flagship Deals',
            promo_heading='Samsung\nCertified\nRenewed',
            promo_btn_text='Shop Now',
            promo_btn_url='/shop/?category=mobile',
            promo_style='samsung-promo',
        ),
    ]
    for sec in sections:
        section_type = sec['section_type']
        obj, created = ProductSection.objects.get_or_create(
            section_type=section_type,
            defaults={**sec, 'is_active': True},
        )
        if created:
            print(f'  ✓ ProductSection: {sec["title"]}')


    # ─── Product Section Items ────────────────────────────────────────────
    # NOTE: product_model_id values below are PLACEHOLDERS.
    # Replace them with real ProductModel.id values from your Product app.
    # The items are created with is_active=False so they don't appear live
    # until you fill in the real IDs and activate them.

    def _section(t): return ProductSection.objects.get(section_type=t)

    hot_deal_items = [
        dict(order=1, display_name='AirPods Pro (2nd Gen)', badge_text='-50%', badge_style='', specs_text='MagSafe Case',           display_price='₹13,499', original_price='₹26,900', link_url='/shop/?category=accessory', product_model_id=1),
        dict(order=2, display_name='MacBook Air 2017',      badge_text='-60%', badge_style='', specs_text='128GB SSD | 8GB RAM',    display_price='₹28,999', original_price='₹84,900', link_url='/shop/?category=laptop',    product_model_id=2),
        dict(order=3, display_name='Samsung S22 Ultra',     badge_text='-30%', badge_style='', specs_text='256GB | 12GB RAM',       display_price='₹69,999', original_price='₹1,09,900',link_url='/shop/?category=mobile',   product_model_id=3),
        dict(order=4, display_name='MacBook Pro 14"',       badge_text='-54%', badge_style='', specs_text='512GB SSD | 16GB RAM',   display_price='₹74,999', original_price='₹1,69,900',link_url='/shop/?category=laptop',   product_model_id=4),
        dict(order=5, display_name='iPhone 14 Pro',         badge_text='-32%', badge_style='', specs_text='256GB | 6GB RAM',        display_price='₹69,999', original_price='₹1,04,900',link_url='/shop/?category=mobile',   product_model_id=5),
    ]
    sec_hot = _section('hot_deals')
    for item in hot_deal_items:
        obj, created = ProductSectionItem.objects.get_or_create(
            section=sec_hot, order=item['order'],
            defaults={**item, 'is_active': False},
        )
        if created:
            print(f'    ✓ HotDeal item: {item["display_name"]}')

    featured_items = [
        dict(order=1, display_name='iPhone 12 Pro',        badge_text='-39%', badge_style='', specs_text='128GB | 6GB RAM', display_price='₹90,399',   original_price='₹1,49,900', link_url='/shop/?category=mobile', product_model_id=6),
        dict(order=2, display_name='iPhone 12 Pro Max',    badge_text='-37%', badge_style='', specs_text='128GB | 6GB RAM', display_price='₹93,599',   original_price='₹1,49,900', link_url='/shop/?category=mobile', product_model_id=7),
        dict(order=3, display_name='iPhone 13 Pro Max',    badge_text='-22%', badge_style='', specs_text='128GB | 6GB RAM', display_price='₹1,39,199', original_price='₹1,79,900', link_url='/shop/?category=mobile', product_model_id=8),
        dict(order=4, display_name='iPhone 13 Pro',        badge_text='-30%', badge_style='', specs_text='128GB | 6GB RAM', display_price='₹83,999',   original_price='₹1,19,900', link_url='/shop/?category=mobile', product_model_id=9),
        dict(order=5, display_name='iPhone 14 Pro Max',    badge_text='-30%', badge_style='', specs_text='128GB | 6GB RAM', display_price='₹89,900',   original_price='₹1,27,900', link_url='/shop/?category=mobile', product_model_id=10),
    ]
    sec_feat = _section('featured')
    for item in featured_items:
        obj, created = ProductSectionItem.objects.get_or_create(
            section=sec_feat, order=item['order'],
            defaults={**item, 'is_active': False},
        )
        if created:
            print(f'    ✓ Featured item: {item["display_name"]}')

    iphone_items = [
        dict(order=1, display_name='iPhone 12 Pro',     badge_text='', badge_style='', specs_text='128GB | 6GB RAM', display_price='₹87,999',   original_price='₹1,49,900', link_url='/shop/?category=mobile', product_model_id=6),
        dict(order=2, display_name='iPhone 13 Pro Max', badge_text='', badge_style='', specs_text='256GB | 6GB RAM', display_price='₹1,39,199', original_price='₹1,79,900', link_url='/shop/?category=mobile', product_model_id=8),
        dict(order=3, display_name='iPhone 12 Pro Max', badge_text='', badge_style='', specs_text='256GB | 6GB RAM', display_price='₹1,02,399', original_price='₹1,69,900', link_url='/shop/?category=mobile', product_model_id=7),
    ]
    sec_ip = _section('certified_iphones')
    for item in iphone_items:
        obj, created = ProductSectionItem.objects.get_or_create(
            section=sec_ip, order=item['order'],
            defaults={**item, 'is_active': False},
        )
        if created:
            print(f'    ✓ iPhones item: {item["display_name"]}')

    samsung_items = [
        dict(order=1, display_name='Galaxy S22 Ultra',  badge_text='', badge_style='', specs_text='256GB | 8GB RAM',  display_price='₹1,11,999', original_price='₹1,34,900', link_url='/shop/?category=mobile', product_model_id=3),
        dict(order=2, display_name='Galaxy S21 Ultra',  badge_text='', badge_style='', specs_text='256GB | 12GB RAM', display_price='₹95,999',   original_price='₹1,19,900', link_url='/shop/?category=mobile', product_model_id=11),
        dict(order=3, display_name='Galaxy Z Fold 4',   badge_text='', badge_style='', specs_text='512GB | 12GB RAM', display_price='₹2,39,999', original_price='₹2,39,900', link_url='/shop/?category=mobile', product_model_id=12),
    ]
    sec_sam = _section('certified_samsung')
    for item in samsung_items:
        obj, created = ProductSectionItem.objects.get_or_create(
            section=sec_sam, order=item['order'],
            defaults={**item, 'is_active': False},
        )
        if created:
            print(f'    ✓ Samsung item: {item["display_name"]}')


    # ─────────────────────────────────────────────────────────────────────
    # 6. SPOTLIGHT PRODUCT
    # ─────────────────────────────────────────────────────────────────────
    obj, created = SpotlightProduct.objects.get_or_create(
        display_name='Apple MacBook Pro A2141 | Intel i7 | 16" Retina Display | Refurbished',
        defaults=dict(
            is_active=True,
            brand_label='APPLE',
            product_model_id=13,   # ← replace with real ProductModel.id
            specs=['CORE I7', '16GB', '512GB', '16"'],
            price='₹ 41,999',
            original_price='₹ 74,000',
            discount_pct=43,
            save_amount='₹32,001',
            review_count=11,
            available_count=109,
            link_url='/shop/',
        ),
    )
    if created:
        print('  ✓ SpotlightProduct')


    # ─────────────────────────────────────────────────────────────────────
    # 7. PRICE RANGE CARDS
    # ─────────────────────────────────────────────────────────────────────
    price_cards = [
        dict(order=1, tier='ENTRY LEVEL', label='Under ₹20K',   description='Great for basics & students', link_text='Browse Laptops →', link_url='/shop/?max_price=20000',                  is_dark=False),
        dict(order=2, tier='MID RANGE',   label='₹20K – ₹40K',  description='Best value sweet spot',       link_text='Browse Laptops →', link_url='/shop/?min_price=20000&max_price=40000', is_dark=False),
        dict(order=3, tier='PREMIUM',     label='₹40K – ₹70K',  description='Power users & creators',      link_text='Browse Laptops →', link_url='/shop/?min_price=40000&max_price=70000', is_dark=False),
        dict(order=4, tier='FLAGSHIP',    label='Above ₹70K',   description='MacBooks & Pro models',       link_text='Browse Laptops →', link_url='/shop/?min_price=70000',                  is_dark=True),
    ]
    for pc in price_cards:
        order = pc.pop('order')
        obj, created = PriceRangeCard.objects.get_or_create(
            tier=pc['tier'],
            defaults={**pc, 'order': order, 'is_active': True},
        )
        if created:
            print(f'  ✓ PriceRangeCard: {pc["label"]}')


    # ─────────────────────────────────────────────────────────────────────
    # 8. SHOP BY PRICE SLIDES
    # ─────────────────────────────────────────────────────────────────────
    sbp_slides = [
        (1, 'Under', '₹6,999',  '/shop/?max_price=6999'),
        (2, 'Under', '₹11,999', '/shop/?max_price=11999'),
        (3, 'Under', '₹19,999', '/shop/?max_price=19999'),
        (4, 'Under', '₹24,999', '/shop/?max_price=24999'),
        (5, 'Under', '₹29,999', '/shop/?max_price=29999'),
        (6, 'Under', '₹34,999', '/shop/?max_price=34999'),
        (7, 'Above', '₹39,999', '/shop/?min_price=35000'),
    ]
    for order, line1, line2, url in sbp_slides:
        obj, created = ShopByPriceSlide.objects.get_or_create(
            label_line1=line1, label_line2=line2,
            defaults={'order': order, 'link_url': url, 'is_active': True},
        )
        if created:
            print(f'  ✓ ShopByPriceSlide: {line1} {line2}')


    # ─────────────────────────────────────────────────────────────────────
    # 9. TESTIMONIALS
    # ─────────────────────────────────────────────────────────────────────
    testimonials = [
        dict(
            order=1, initials='AK', name='Aryan Kapoor',
            location='Student, New Delhi',
            product_bought='MacBook Air M2', product_icon='fas fa-laptop',
            review_text=(
                'I was going to buy a new MacBook for college. Recarvit had an M2 at ₹59,900 with a '
                '6-month warranty. It arrived in pristine condition. I genuinely cannot tell it was ever used.'
            ),
            rating=5,
        ),
        dict(
            order=2, initials='PS', name='Priya Sharma',
            location='Marketing Manager, Mumbai',
            product_bought='iPhone 14 Pro', product_icon='fas fa-mobile-alt',
            review_text=(
                'The iPhone I received has excellent battery health and zero scratches. I saved over ₹40,000 '
                'compared to buying new. The 7-day return policy gave me the confidence to try it.'
            ),
            rating=5,
        ),
        dict(
            order=3, initials='RM', name='Rahul Mehta',
            location='Software Engineer, Bengaluru',
            product_bought='Samsung Galaxy S23 Ultra', product_icon='fas fa-mobile-alt',
            review_text=(
                'I compared five sellers on Recarvit and chose exactly the grade and storage I wanted. '
                'The grading system is honest — Superb really means Superb. Unlike other platforms.'
            ),
            rating=5,
        ),
        dict(
            order=4, initials='SR', name='Sneha Reddy',
            location='Graphic Designer, Hyderabad',
            product_bought='Dell XPS 15 Laptop', product_icon='fas fa-laptop',
            review_text=(
                'Bought this for design work — runs flawlessly. Packaging was genuinely premium. Had a minor '
                'issue and the warranty process took just 2 days. Fastest support I\'ve experienced.'
            ),
            rating=5,
        ),
    ]
    for t in testimonials:
        order = t.pop('order')
        obj, created = TestimonialCard.objects.get_or_create(
            name=t['name'],
            defaults={**t, 'order': order, 'is_active': True},
        )
        if created:
            print(f'  ✓ Testimonial: {t["name"]}')


    # ─────────────────────────────────────────────────────────────────────
    # 10. FAQs
    # ─────────────────────────────────────────────────────────────────────
    faqs = [
        (1,  'What does "Recarvit Certified" mean?',
             'Every device passes our <strong>50-point quality inspection</strong> — covering battery health, '
             'screen, camera, all ports, sensors, and a certified data wipe. Fails the check? Doesn\'t get listed. Simple.'),
        (2,  'Are refurbished devices original or do they have duplicate parts?',
             '<strong>100% original parts only.</strong> Every device on Recarvit uses genuine manufacturer '
             'components. We verify this during our 50-point check. No duplicate screens, no third-party batteries passed off as original.'),
        (3,  'How do the device grades work?',
             'We use three honest grades: <strong>Superb</strong> (minimal to no visible signs of use), '
             '<strong>Good</strong> (light micro-scratches, invisible in normal use), and <strong>Fair</strong> '
             '(light cosmetic wear, fully functional). What the grade description says is exactly what arrives.'),
        (4,  'Will I get a box and accessories with my device?',
             'It depends on the grade and listing. Every listing clearly states what\'s included — original box, '
             'compatible charger, cable. If it\'s original packaging, we say so. We never mislead on what\'s in the box.'),
        (5,  'Has the device data been wiped before I receive it?',
             'Yes — always. Every device undergoes a <strong>certified factory reset and full data wipe</strong> '
             'as part of our 50-point check. You receive a clean device, set up as if brand new.'),
        (6,  'What is the warranty and return policy?',
             'Every device comes with a <strong>6-month hardware warranty</strong> covering battery, screen, and '
             'internal components. You also get a <strong>7-day no-questions return window</strong> — free pickup included.'),
        (7,  'Can I get a GST invoice for my purchase?',
             'Yes. <strong>GST invoices are available</strong> for all purchases on Recarvit — useful for '
             'professionals and business buyers claiming input tax credit. Select the GST invoice option at checkout and enter your GSTIN.'),
        (8,  'What if my device stops working after the 6-month warranty?',
             'Post-warranty, our support team will help you find the best authorised service option. Many of our '
             'sellers also offer extended warranty plans at checkout — we recommend adding one for complete peace of mind.'),
        (9,  'Is buying refurbished a smart choice?',
             'For most buyers, absolutely yes. You get the same hardware, the same performance, the same operating '
             'system — at <strong>30–70% less</strong> than new. Recarvit certified devices are also environmentally '
             'responsible: each purchase prevents significant E-waste and CO₂ emissions. The only trade-off is you\'re '
             'not the first owner — and on Recarvit, you\'ll barely notice.'),
        (10, 'How is Recarvit different from buying second-hand on OLX or Cashify?',
             'Significant difference. On OLX or Cashify, you\'re typically buying from an individual or a '
             'lightly-checked marketplace — no standardised grading, limited warranty, and little recourse if something\'s '
             'wrong. On Recarvit: every device is <strong>50-point inspected</strong> by a verified professional seller, '
             'graded honestly (Superb/Good/Fair), covered by a <strong>6-month warranty</strong>, and backed by a '
             '<strong>7-day return policy</strong>. You\'re not gambling — you know exactly what you\'re getting.'),
    ]
    for order, question, answer in faqs:
        obj, created = FAQItem.objects.get_or_create(
            question=question,
            defaults={'answer': answer, 'order': order, 'is_active': True},
        )
        if created:
            print(f'  ✓ FAQ {order}: {question[:60]}…')


    # ─────────────────────────────────────────────────────────────────────
    # 11. STAT COUNTERS
    # ─────────────────────────────────────────────────────────────────────
    stats = [
        (1, 12000, 0, '+', 'Happy Buyers'),
        (2,  1500, 0, '+', 'Certified Devices'),
        (3,    30, 0, '+', 'Verified Sellers'),
        (4,   4.9, 1, '★', 'Average Rating'),
        (5,    98, 0, '%', 'On-Time Delivery'),
    ]
    for order, target, decimals, suffix, label in stats:
        obj, created = StatItem.objects.get_or_create(
            label=label,
            defaults={
                'order': order, 'target_value': target,
                'decimals': decimals, 'suffix': suffix, 'is_active': True,
            },
        )
        if created:
            print(f'  ✓ StatItem: {label}')


    # ─────────────────────────────────────────────────────────────────────
    # 12. SECONDARY NAV LINKS
    # ─────────────────────────────────────────────────────────────────────
    nav_links = [
        (1, 'All',         '/shop/',                  ''),
        (2, 'iPhones',     '/shop/?category=mobile',  ''),
        (3, 'Samsung',     '/shop/?category=mobile',  ''),
        (4, 'MacBooks',    '/shop/?category=laptop',  ''),
        (5, 'Laptops',     '/shop/?category=laptop',  ''),
        (6, 'iPads',       '/shop/?category=tablet',  ''),
        (7, 'Accessories', '/shop/?category=accessory',''),
        (8, 'Sale',        '/shop/?category=sale',    'highlight-red'),
    ]
    for order, label, url, highlight in nav_links:
        obj, created = NavCategoryLink.objects.get_or_create(
            label=label,
            defaults={'order': order, 'url': url, 'highlight_class': highlight, 'is_active': True},
        )
        if created:
            print(f'  ✓ NavCategoryLink: {label}')


    # ─────────────────────────────────────────────────────────────────────
    # 13. PARTNER CTA BANNER
    # ─────────────────────────────────────────────────────────────────────
    obj, created = PartnerCTABanner.objects.get_or_create(
        heading='Are you a professional refurbisher looking to grow your business?',
        defaults=dict(
            subtext="Join Recarvit's network of certified partners today.",
            btn_text='Apply Now',
            btn_url='/partner-application',
            is_active=True,
        ),
    )
    if created:
        print('  ✓ PartnerCTABanner')


    # ─────────────────────────────────────────────────────────────────────
    # 14. RENEWED BANNER
    # ─────────────────────────────────────────────────────────────────────
    obj, created = RenewedBanner.objects.get_or_create(
        heading='Recarvit Certified: As Good As New.',
        defaults=dict(
            subtext="We test 50+ checkpoints (Battery, Screen, Camera) so you don't have to.",
            cta_text='See the Checklist',
            is_active=True,
        ),
    )
    if created:
        print('  ✓ RenewedBanner')


    print("\nDone! All homepage data seeded successfully.")
    print(
        "\nNOTE: ProductSectionItem rows were created with is_active=False because\n"
        "product_model_id values are placeholders. Edit them in /admin/ with real\n"
        "ProductModel IDs and set is_active=True when ready."
    )


# ── Allow running directly via: python seed_homepage_data.py ─────────────────
if __name__ == '__main__':
    run()
