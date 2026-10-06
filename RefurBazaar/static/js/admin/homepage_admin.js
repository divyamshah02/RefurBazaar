'use strict';
/**
 * homepage_admin.js
 * Admin manager for the dynamic homepage (/dy_homepage).
 *  - Every section is editable from a drawer with a live "how it will look" preview.
 *  - Image fields upload through multipart FormData and show a preview before saving.
 *  - Products come from real listing units (inventory picker), never typed by hand.
 */
const HP = (() => {

    let csrf, base;
    let activeTab = 'hero';
    let itemFilter = '';
    let sections = [];
    const rowsCache = {};
    const modal = { resource: null, id: null, images: {}, objectUrls: {}, newUrl: {}, live: null, results: [], timer: null };

    // ── Helpers ───────────────────────────────────────────────────
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const rich = s => esc(s).replace(/&lt;(\/?)(br|b|strong|em|i)\s*\/?&gt;/gi, (m, sl, t) => `<${sl}${t.toLowerCase()}>`);
    const trunc = (s, n = 60) => (s && s.length > n ? s.slice(0, n) + '…' : (s || ''));
    const inr = n => '₹' + Math.round(Number(n)).toLocaleString('en-IN');
    const csvToArr = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
    const specsOf = v => (Array.isArray(v.specs) ? v.specs : csvToArr(v.specs_csv));

    function toast(msg, kind = '') {
        const el = document.createElement('div');
        el.className = 'hp-toast ' + kind;
        el.textContent = msg;
        $('hp-toasts').appendChild(el);
        setTimeout(() => el.remove(), 3500);
    }

    async function api(method, path, body) {
        const opts = { method, headers: { 'X-CSRFToken': csrf }, credentials: 'same-origin' };
        if (body instanceof FormData) {
            opts.body = body;
        } else if (body) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        try {
            const res = await fetch(base + path, opts);
            const json = await res.json().catch(() => null);
            if (!json) return { success: false, error: `Request failed (${res.status})` };
            return json;
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }

    // ── Form field builders ───────────────────────────────────────
    const F = {
        text: (n, l, v, o = {}) => `<div class="form-group"><label for="f-${n}">${l}${o.req ? ' *' : ''}</label>
            <input class="input-field" id="f-${n}" name="${n}" value="${esc(v)}"${o.req ? ' required' : ''}${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.max ? ` maxlength="${o.max}"` : ''}>
            ${o.help ? `<span class="hp-help">${o.help}</span>` : ''}</div>`,
        num: (n, l, v, o = {}) => `<div class="form-group"><label for="f-${n}">${l}</label>
            <input class="input-field" id="f-${n}" type="number" name="${n}" value="${esc(v)}" step="${o.step || 1}"${o.min != null ? ` min="${o.min}"` : ''}${o.max != null ? ` max="${o.max}"` : ''}>
            ${o.help ? `<span class="hp-help">${o.help}</span>` : ''}</div>`,
        area: (n, l, v, o = {}) => `<div class="form-group"><label for="f-${n}">${l}${o.req ? ' *' : ''}</label>
            <textarea class="input-field" id="f-${n}" name="${n}" rows="${o.rows || 3}"${o.req ? ' required' : ''}>${esc(v)}</textarea>
            ${o.help ? `<span class="hp-help">${o.help}</span>` : ''}</div>`,
        sel: (n, l, opts, v, o = {}) => `<div class="form-group"><label for="f-${n}">${l}</label>
            <select class="input-field" id="f-${n}" name="${n}">${opts.map(([val, lab]) => `<option value="${esc(val)}"${String(v ?? '') === String(val) ? ' selected' : ''}>${esc(lab)}</option>`).join('')}</select>
            ${o.help ? `<span class="hp-help">${o.help}</span>` : ''}</div>`,
        sw: (n, l, on) => `<label class="hp-switch"><input type="checkbox" name="${n}"${on ? ' checked' : ''}><span class="hp-slider"></span><span>${l}</span></label>`,
        row: (...c) => `<div class="form-row-2">${c.join('')}</div>`,
        sec: t => `<div class="hp-section-title">${t}</div>`,
        hidden: (n, v) => `<input type="hidden" name="${n}" value="${esc(v)}">`,
        adv: (t, inner, open) => `<details class="hp-adv"${open ? ' open' : ''}><summary>${t}</summary><div class="hp-adv-body">${inner}</div></details>`,
        img: (n, l, url, help) => `<div class="form-group hp-img" data-name="${n}" data-current="${esc(url || '')}">
            <label>${l}</label>
            <div class="hp-drop">
                <input type="file" accept="image/*" name="${n}" aria-label="${esc(l)}">
                <div class="hp-drop-ui"><i class="fa-solid fa-cloud-arrow-up"></i><span><b>Click to upload</b> or drag and drop</span><span>PNG, JPG or WEBP · up to 5 MB</span></div>
            </div>
            <div class="hp-img-preview" hidden>
                <img alt="Selected image preview">
                <div class="hp-img-info"><b></b><span class="hp-img-size"></span><span class="hp-tag"></span></div>
                <button type="button" class="btn btn-ghost btn-sm" data-img-remove>Remove</button>
            </div>
            <input type="hidden" name="clear_${n}" value="false">
            ${help ? `<span class="hp-help">${help}</span>` : ''}</div>`,
    };

    const common = d => F.row(
        F.num('order', 'Display order', d.order ?? 0, { help: 'Lower numbers appear first. You can also reorder with the arrows in the list.' }),
        `<div class="form-group"><label>Visibility</label>${F.sw('is_active', 'Show on homepage', d.is_active !== false)}</div>`
    );
    const visibility = d => `<div class="form-group"><label>Visibility</label>${F.sw('is_active', 'Show on homepage', d.is_active !== false)}</div>`;

    // ── Live preview renderers ────────────────────────────────────
    const bgClass = b => ({ 'rc-slide-light': 'pv-light', 'rc-slide-green': 'pv-green' }[b] || 'pv-dark');
    const noImg = t => `<div class="pv-noimg">${t || 'No image yet'}</div>`;
    const cardImg = v => (v ? `<img src="${esc(v)}" alt="">` : '<span class="hp-help">No image</span>');

    const PV = {
        'hero-slides': v => `<div class="pv-hero ${bgClass(v.bg_style)}">
            <div class="pv-hero-text">
                ${v.tag_text ? `<span class="pv-pill ${esc(v.tag_style || 'tag-green')}">${esc(v.tag_text)}</span>` : ''}
                <h3>${esc(v.heading) || 'Your headline appears here'}</h3>
                ${v.body_text ? `<p>${rich(v.body_text)}</p>` : ''}
                <div class="pv-btns">
                    ${v.btn1_text ? `<span class="pv-b1">${esc(v.btn1_text)}</span>` : ''}
                    ${v.btn2_text ? `<span class="pv-b2">${esc(v.btn2_text)}</span>` : ''}
                </div>
            </div>
            <div class="pv-hero-img">
                ${v.image ? `<img src="${esc(v.image)}" alt="" style="${v.image_max_width ? `max-width:min(100%,${esc(v.image_max_width)})` : ''}">` : noImg('Slide image')}
                ${v.badge_top_right ? `<span class="pv-corner">${esc(v.badge_top_right)}</span>` : ''}
                ${v.badge_circle ? `<span class="pv-circle">${rich(v.badge_circle)}</span>` : ''}
                ${v.badge_bottom_center ? `<span class="pv-bottom">${esc(v.badge_bottom_center)}</span>` : ''}
            </div></div>`,

        'trust-items': v => `<div class="pv-trust"><i class="${esc(v.icon || 'fas fa-check-circle')}"></i>
            <div><b>${esc(v.title) || 'Title'}</b><span>${esc(v.subtitle)}</span></div></div>`,

        'nav-links': v => `<span class="pv-nav ${esc(v.highlight_class)}">${esc(v.label) || 'Link label'}</span>`,

        'categories': v => `<div class="pv-cat">
            ${v.badge_text ? `<span class="pv-badge ${esc(v.badge_style || 'bg-dark')}">${esc(v.badge_text)}</span>` : ''}
            <div class="pv-card-img">${cardImg(v.image)}</div>
            <div class="pv-cat-body"><b>${esc(v.name) || 'Category name'}</b>
            <span>${esc(v.product_count)}${v.product_count && v.starting_price ? ' · ' : ''}${v.starting_price ? 'from ' + esc(v.starting_price) : ''}</span></div></div>`,

        'product-sections': v => `<div class="pv-head row" style="background:#fff;border-radius:10px;padding:12px 14px">
            <div><h3 style="font-size:17px;margin:0">${esc(v.title) || 'Section title'}</h3>${v.subtitle ? `<p>${esc(v.subtitle)}</p>` : ''}</div>
            ${v.see_all_url || v.see_all_text ? `<a>${esc(v.see_all_text || 'See all')} →</a>` : ''}</div>
            ${v.promo_heading || v.promo_image ? `<div class="pv-sect-promo ${esc(v.promo_style)}">
                ${v.promo_badge ? `<span class="pv-pill tag-light">${esc(v.promo_badge)}</span>` : ''}
                <div style="font-weight:800;margin:6px 0">${esc(v.promo_heading)}</div>
                ${v.promo_image ? `<img src="${esc(v.promo_image)}" alt="" style="max-height:70px;max-width:100%;display:block;margin-bottom:6px">` : ''}
                ${v.promo_btn_text ? `<span class="pv-b1">${esc(v.promo_btn_text)}</span>` : ''}</div>` : ''}`,

        'section-items': v => `<div class="pv-card">
            ${v.badge_text ? `<span class="pv-badge" style="${esc(v.badge_style)}">${esc(v.badge_text)}</span>` : ''}
            <div class="pv-card-img">${cardImg(v.display_image)}</div>
            <h6>${esc(v.display_name) || 'Pick a listing'}</h6>
            <small>${esc(v.specs_text)}</small>
            <div class="pv-price">${esc(v.display_price) || '₹—'}${v.original_price ? `<s>${esc(v.original_price)}</s>` : ''}</div></div>`,

        'spotlight': v => `<div class="pv-spot">
            <div class="pv-card-img">${cardImg(v.display_image)}</div>
            <div class="pv-spot-body">
                <span class="pv-eyebrow">${esc(v.brand_label) || 'Brand'}</span>
                <h5>${esc(v.display_name) || 'Pick a listing'}</h5>
                <div class="pv-chips">${specsOf(v).map(s => `<span class="pv-chip">${esc(s)}</span>`).join('')}</div>
                <div class="pv-price" style="font-size:20px">${esc(v.price) || '₹—'}${v.original_price ? `<s>${esc(v.original_price)}</s>` : ''}</div>
                ${Number(v.discount_pct) ? `<span class="pv-save">${esc(v.discount_pct)}% off${v.save_amount ? ' · Save ' + esc(v.save_amount) : ''}</span>` : ''}
                ${Number(v.available_count) ? `<small style="display:block;margin-top:6px;color:#6b7280">${esc(v.available_count)} available</small>` : ''}
            </div></div>`,

        'price-range-cards': v => `<div class="pv-tier ${v.is_dark === true || v.is_dark === 'true' ? 'dark' : ''}">
            <small>${esc(v.tier) || 'TIER'}</small><h5>${esc(v.label) || 'Price label'}</h5>
            <p>${esc(v.description)}</p><span>${esc(v.link_text || 'Browse →')}</span></div>`,

        'shop-by-price': v => `<div class="pv-sbp"><div class="pv-circle-img">${v.image ? `<img src="${esc(v.image)}" alt="">` : '<i class="fa-regular fa-image"></i>'}</div>
            <small>${esc(v.label_line1)}</small><b>${esc(v.label_line2) || '₹—'}</b></div>`,

        'testimonials': v => `<div class="pv-quote"><div class="pv-stars">${'★'.repeat(Math.min(5, Math.max(1, Number(v.rating) || 5)))}</div>
            <p>${esc(v.review_text) || 'Review text appears here.'}</p>
            <div class="pv-who"><span class="pv-av">${esc(v.initials)}</span>
            <div><b>${esc(v.name) || 'Customer'}</b><div style="color:#6b7280">${esc(v.location)}${v.product_bought ? ' · ' + esc(v.product_bought) : ''}</div></div></div></div>`,

        'faqs': v => `<div class="pv-faq"><b>${esc(v.question) || 'Question'}</b><p>${rich(v.answer) || 'Answer'}</p></div>`,

        'stats': v => `<div class="pv-stat"><b>${esc(v.target_value ?? 0)}${esc(v.suffix)}</b><span>${esc(v.label) || 'Label'}</span></div>`,

        'promo-banner': v => `<div class="pv-strip">${esc(v.text) || 'Promo text'}</div>`,

        'renewed-banner': v => `<div class="pv-cta renewed"><h4>${esc(v.heading) || 'Heading'}</h4><p>${esc(v.subtext)}</p>${v.cta_text ? `<span>${esc(v.cta_text)}</span>` : ''}</div>`,

        'partner-cta': v => `<div class="pv-cta"><h4>${esc(v.heading) || 'Heading'}</h4><p>${esc(v.subtext)}</p>${v.btn_text ? `<span>${esc(v.btn_text)}</span>` : ''}</div>`,

        'section-texts': v => `<div class="pv-head" style="background:#fff;border-radius:10px;padding:16px">
            ${v.eyebrow ? `<span class="pv-eyebrow">${esc(v.eyebrow)}</span>` : ''}<h3>${esc(v.heading) || 'Section heading'}</h3>${v.subheading ? `<p>${esc(v.subheading)}</p>` : ''}</div>`,
    };

    // ── Resource forms ────────────────────────────────────────────
    const ACTIVE_ONLY = d => visibility(d);

    function pickedInner(d) {
        return d.listing_unit_id
            ? `${d.display_image ? `<img src="${esc(d.display_image)}" alt="">` : ''}
               <div class="hp-picked-info"><b>${esc(d.display_name)}</b><span>Listing unit #${esc(d.listing_unit_id)}</span></div>`
            : 'No listing selected yet — search your inventory below.';
    }

    const picker = d => `${F.hidden('listing_unit_id', d.listing_unit_id)}${F.hidden('product_model_id', d.product_model_id)}
        <div class="form-group"><label for="hp-listing-q">Listing from your inventory *</label>
            <div class="hp-picked${d.listing_unit_id ? '' : ' empty'}" id="hp-picked">${pickedInner(d)}</div>
            <input class="input-field" type="search" id="hp-listing-q" placeholder="Search brand or model, e.g. iPhone 14" autocomplete="off">
            <div class="hp-results" id="hp-results" hidden></div>
            <span class="hp-help">Only live, unsold units appear here. Choosing one fills the name, image, price and specs — you can still edit every field below.</span>
        </div>`;

    const SECTION_TYPES = [['hot_deals', 'Hot Deals (slider with timer)'], ['end_of_year', 'End of Year (slider)'], ['recommended', 'Recommended (slider)'],
        ['featured', 'Featured (slider)'], ['certified_iphones', 'Certified iPhones (grid + promo card)'], ['certified_samsung', 'Certified Samsung (grid + promo card)']];

    const FORMS = {
        'hero-slides': d => `${common(d)}
            ${F.sec('Background and tag')}
            ${F.row(
                F.sel('bg_style', 'Slide background', [['rc-slide-dark', 'Dark (charcoal)'], ['rc-slide-light', 'Light (off-white)'], ['rc-slide-green', 'Brand green'], ['rc-slide-repair', 'Repair (dark)']], d.bg_style || 'rc-slide-dark', { help: 'Colour of the whole banner.' }),
                F.sel('tag_style', 'Tag style', [['tag-green', 'Green'], ['tag-dark', 'Dark'], ['tag-light', 'Light']], d.tag_style || 'tag-green'))}
            ${F.text('tag_text', 'Tag text', d.tag_text, { ph: 'e.g. NEW ARRIVAL', help: 'Small pill shown above the headline.' })}
            ${F.sec('Text')}
            ${F.text('heading', 'Headline', d.heading, { req: true, help: 'Large text on the left of the banner.' })}
            ${F.area('body_text', 'Body text', d.body_text, { help: 'Paragraph under the headline. Basic HTML such as &lt;br&gt; and &lt;b&gt; is allowed.' })}
            ${F.sec('Buttons')}
            ${F.row(F.text('btn1_text', 'Primary button text', d.btn1_text), F.text('btn1_url', 'Primary button link', d.btn1_url, { ph: '/shop/' }))}
            ${F.row(F.text('btn2_text', 'Secondary link text', d.btn2_text), F.text('btn2_url', 'Secondary link URL', d.btn2_url))}
            ${F.adv('Advanced button styles', F.row(F.text('btn1_style', 'Primary button CSS classes', d.btn1_style || 'btn rc-btn-primary'), F.text('btn2_style', 'Secondary button CSS classes', d.btn2_style || 'btn rc-btn-text')))}
            ${F.sec('Slide image')}
            ${F.img('image', 'Banner image', d.image, 'Shown on the right side. A transparent PNG or WEBP works best.')}
            ${F.text('image_max_width', 'Image max width', d.image_max_width, { ph: 'e.g. 500px', help: 'Optional. Limits how large the image can grow.' })}
            ${F.sec('Badges on the image')}
            ${F.row(F.text('badge_top_right', 'Top-right badge', d.badge_top_right, { ph: 'e.g. 1 Year Warranty' }), F.text('badge_bottom_center', 'Bottom badge', d.badge_bottom_center, { ph: 'e.g. Free Delivery' }))}
            ${F.text('badge_circle', 'Round badge', d.badge_circle, { ph: 'Up to<br>70%<br>OFF', help: 'Use &lt;br&gt; for line breaks.' })}`,

        'trust-items': d => `${common(d)}
            ${F.text('icon', 'Icon class', d.icon || 'fas fa-check-circle', { help: 'Font Awesome class, e.g. fas fa-shield-alt' })}
            ${F.text('title', 'Title', d.title, { req: true })}
            ${F.text('subtitle', 'Subtitle', d.subtitle)}`,

        'nav-links': d => `${common(d)}
            ${F.text('label', 'Label', d.label, { req: true })}
            ${F.text('url', 'Link URL', d.url, { req: true, ph: '/shop/' })}
            ${F.sel('highlight_class', 'Highlight', [['', 'Normal'], ['highlight-red', 'Red'], ['highlight-blue', 'Blue']], d.highlight_class)}`,

        'categories': d => `${common(d)}
            ${F.text('name', 'Category name', d.name, { req: true })}
            ${F.text('link_url', 'Link URL', d.link_url, { req: true, ph: '/shop/?category=phones' })}
            ${F.img('image', 'Category image', d.image, 'Shown at the top of the category card.')}
            ${F.row(F.text('badge_text', 'Badge text', d.badge_text, { ph: 'e.g. Popular' }), F.sel('badge_style', 'Badge colour', [['bg-dark', 'Dark'], ['bg-success', 'Green']], d.badge_style || 'bg-dark'))}
            ${F.row(F.text('product_count', 'Product count', d.product_count, { ph: '450+' }), F.text('starting_price', 'Starting price', d.starting_price, { ph: '₹12,999' }))}`,

        'product-sections': d => `${common(d)}
            ${F.sec('Heading')}
            ${F.text('title', 'Section title', d.title, { req: true, help: 'Main heading of the section.' })}
            ${F.text('subtitle', 'Sub heading', d.subtitle, { help: 'Optional line shown under the title.' })}
            ${F.row(F.sel('section_type', 'Layout', SECTION_TYPES, d.section_type || 'recommended'),
                F.sel('bg_style', 'Background', [['', 'White'], ['bg-off-white', 'Off white'], ['bg-soft-green', 'Soft green']], d.bg_style))}
            ${F.row(F.text('see_all_text', '"See all" text', d.see_all_text ?? 'See all'), F.text('see_all_url', '"See all" link', d.see_all_url, { ph: '/shop/' }))}
            <div class="form-group"><label>Countdown timer</label>${F.sw('show_timer', 'Show deal timer (Hot Deals layout)', !!d.show_timer)}</div>
            ${F.adv('Promo card (certified layouts only)',
                F.row(F.text('promo_badge', 'Promo badge', d.promo_badge), F.sel('promo_style', 'Promo style', [['iphones-promo', 'iPhones (dark)'], ['samsung-promo', 'Samsung (green)']], d.promo_style || 'iphones-promo'))
                + F.text('promo_heading', 'Promo heading', d.promo_heading)
                + F.row(F.text('promo_btn_text', 'Promo button text', d.promo_btn_text), F.text('promo_btn_url', 'Promo button link', d.promo_btn_url))
                + F.img('promo_image', 'Promo image', d.promo_image, 'Shown inside the promo card.'),
                !!(d.promo_heading || d.promo_image || String(d.section_type || '').startsWith('certified')))}
            <p class="hp-help">After saving, use "Manage items" in the list to choose which listings appear in this section.</p>`,

        'section-items': d => `
            <div class="form-group"><label for="f-section_id">Homepage section *</label>
                <select class="input-field" id="f-section_id" name="section_id" required>
                    ${sections.map(s => `<option value="${s.id}"${String(d.section_id) === String(s.id) ? ' selected' : ''}>${esc(s.title)}</option>`).join('')}
                </select></div>
            ${picker(d)}
            ${F.row(F.num('order', 'Display order', d.order ?? 0), `<div class="form-group"><label>Visibility</label>${F.sw('is_active', 'Show on homepage', d.is_active !== false)}</div>`)}
            ${F.sec('Card content (auto-filled, editable)')}
            ${F.text('display_name', 'Product name', d.display_name)}
            ${F.text('specs_text', 'Specs line', d.specs_text, { ph: '128GB · Excellent' })}
            ${F.row(F.text('display_price', 'Price', d.display_price, { ph: '₹87,999' }), F.text('original_price', 'Original price (struck through)', d.original_price, { ph: '₹1,49,900' }))}
            ${F.row(F.text('badge_text', 'Badge', d.badge_text, { ph: '-54%' }), F.text('badge_style', 'Badge inline CSS', d.badge_style, { ph: 'background:#dc2626' }))}
            ${F.text('link_url', 'Custom link', d.link_url, { help: 'Optional. Leave blank to use the default link.' })}
            ${F.img('display_image', 'Image override', d.image_override, 'Optional. Leave empty to use the listing photo.')}`,

        'spotlight': d => `${visibility(d)}
            ${picker(d)}
            ${F.sec('Spotlight content (auto-filled, editable)')}
            ${F.text('brand_label', 'Brand label', d.brand_label, { help: 'Small green text above the name.' })}
            ${F.text('display_name', 'Product name', d.display_name, { req: true })}
            ${F.text('specs_csv', 'Spec chips', (d.specs || []).join(', '), { help: 'Comma separated, e.g. Core i7, 16GB, 512GB SSD' })}
            ${F.row(F.text('price', 'Price', d.price, { req: true, ph: '₹54,999' }), F.text('original_price', 'Original price', d.original_price))}
            ${F.row(F.num('discount_pct', 'Discount %', d.discount_pct || 0), F.text('save_amount', 'You save', d.save_amount, { ph: '₹32,001' }))}
            ${F.row(F.num('review_count', 'Review count', d.review_count || 0), F.num('available_count', 'Units available', d.available_count || 0))}
            ${F.text('link_url', 'Custom link', d.link_url, { help: 'Optional. Leave blank to open the listing.' })}
            ${F.img('display_image', 'Image override', d.image_override, 'Optional. Leave empty to use the listing photo.')}`,

        'price-range-cards': d => `${common(d)}
            ${F.row(F.text('tier', 'Tier label', d.tier, { ph: 'ENTRY LEVEL' }), F.text('label', 'Price label', d.label, { ph: 'Under ₹20K' }))}
            ${F.text('description', 'Description', d.description)}
            ${F.row(F.text('link_text', 'Link text', d.link_text || 'Browse →'), F.text('link_url', 'Link URL', d.link_url))}
            <div class="form-group"><label>Style</label>${F.sw('is_dark', 'Dark card', !!d.is_dark)}</div>`,

        'shop-by-price': d => `${common(d)}
            ${F.row(F.text('label_line1', 'Label line 1', d.label_line1, { ph: 'Under' }), F.text('label_line2', 'Label line 2', d.label_line2, { ph: '₹6,999' }))}
            ${F.text('link_url', 'Link URL', d.link_url)}
            ${F.img('image', 'Slide image', d.image, 'Round image above the label.')}`,

        'testimonials': d => `${common(d)}
            ${F.row(F.text('initials', 'Initials', d.initials, { max: 4, ph: 'AK' }), F.num('rating', 'Rating (1–5)', d.rating || 5, { min: 1, max: 5 }))}
            ${F.row(F.text('name', 'Customer name', d.name), F.text('location', 'Location', d.location))}
            ${F.row(F.text('product_bought', 'Product bought', d.product_bought), F.text('product_icon', 'Product icon class', d.product_icon || 'fas fa-mobile-alt'))}
            ${F.area('review_text', 'Review text', d.review_text, { req: true, rows: 4 })}`,

        'faqs': d => `${common(d)}
            ${F.text('question', 'Question', d.question, { req: true })}
            ${F.area('answer', 'Answer', d.answer, { req: true, rows: 5, help: 'Basic HTML such as &lt;br&gt; and &lt;b&gt; is allowed.' })}`,

        'stats': d => `${common(d)}
            ${F.text('label', 'Label', d.label, { req: true })}
            ${F.row(F.num('target_value', 'Target value', d.target_value ?? 0, { step: 'any' }), F.num('decimals', 'Decimals', d.decimals || 0))}
            ${F.text('suffix', 'Suffix', d.suffix, { ph: '+ or %' })}`,

        'promo-banner': d => `${visibility(d)}${F.text('text', 'Banner text', d.text, { req: true, help: 'Shown in the thin strip at the very top of the page.' })}`,

        'renewed-banner': d => `${visibility(d)}
            ${F.text('heading', 'Heading', d.heading)}${F.text('subtext', 'Subtext', d.subtext)}${F.text('cta_text', 'Button text', d.cta_text)}`,

        'partner-cta': d => `${visibility(d)}
            ${F.text('heading', 'Heading', d.heading)}${F.text('subtext', 'Subtext', d.subtext)}
            ${F.row(F.text('btn_text', 'Button text', d.btn_text || 'Apply Now'), F.text('btn_url', 'Button link', d.btn_url || '/partner-application'))}`,

        'section-texts': d => `${F.hidden('key', d.key)}${visibility(d)}
            <p class="hp-help">Editing: <b>${esc(HEADING_LABELS[d.key] || d.key)}</b></p>
            ${F.text('eyebrow', 'Small label above the heading', d.eyebrow)}
            ${F.text('heading', 'Heading', d.heading, { req: true })}
            ${F.text('subheading', 'Sub heading', d.subheading, { help: 'Optional line under the heading.' })}`,
    };

    const HEADING_LABELS = { categories: 'Shop by Category', spotlight: "Today's Spotlight", price_range: 'Find Your Price Range', shop_by_price: 'Shop by Price', testimonials: 'Testimonials', faq: 'FAQ' };
    const RES_LABEL = { 'hero-slides': 'hero slide', 'trust-items': 'trust item', 'nav-links': 'nav link', 'categories': 'category', 'product-sections': 'product section',
        'section-items': 'section product', 'spotlight': 'spotlight', 'price-range-cards': 'price range card', 'shop-by-price': 'shop-by-price slide', 'testimonials': 'testimonial',
        'faqs': 'FAQ', 'stats': 'stat', 'promo-banner': 'promo banner', 'renewed-banner': 'renewed banner', 'partner-cta': 'partner banner', 'section-texts': 'section heading' };

    // ── Tab configuration ─────────────────────────────────────────
    const th = (...c) => c;
    const thumb = (u) => u ? `<img class="hp-thumb" src="${esc(u)}" alt="">` : '<div class="hp-thumb-empty"><i class="fa-regular fa-image"></i></div>';
    const sectionTitle = id => (sections.find(s => String(s.id) === String(id)) || {}).title || '—';

    const TABS = [
        { id: 'hero', label: 'Hero Slides', icon: 'fa-image', resource: 'hero-slides', mode: 'cards', ordered: true, add: 'Add slide', title: 'Hero banner slides',
          hint: 'The large rotating banner at the top. Each slide has a tag, headline, body text, two buttons, an image and optional badges. The preview shows exactly where each field lands.',
          meta: r => `<b>${esc(trunc(r.heading, 34))}</b>` },
        { id: 'banners', label: 'Promo & CTA Banners', icon: 'fa-bullhorn', resource: null },
        { id: 'trust', label: 'Trust Strip', icon: 'fa-shield-halved', resource: 'trust-items', ordered: true, add: 'Add item', title: 'Trust strip',
          hint: 'The row of reassurance points under the hero (warranty, delivery, returns).',
          cols: th('Icon', 'Title', 'Subtitle'), row: r => `<td><i class="${esc(r.icon)}"></i></td><td class="hp-cell-title">${esc(r.title)}</td><td>${esc(r.subtitle) || '—'}</td>` },
        { id: 'nav', label: 'Nav Links', icon: 'fa-bars', resource: 'nav-links', ordered: true, add: 'Add link', title: 'Secondary navigation links',
          hint: 'Quick category links shown in the strip below the header.',
          cols: th('Label', 'URL', 'Highlight'), row: r => `<td class="hp-cell-title">${esc(r.label)}</td><td class="text-muted">${esc(r.url)}</td><td>${esc(r.highlight_class || 'Normal')}</td>` },
        { id: 'categories', label: 'Categories', icon: 'fa-table-cells-large', resource: 'categories', mode: 'cards', ordered: true, add: 'Add category', title: 'Category cards',
          hint: 'Cards in the "Shop by Category" grid. Edit the section heading in the Section Headings tab.',
          meta: r => `<b>${esc(r.name)}</b>` },
        { id: 'sections', label: 'Product Sections', icon: 'fa-layer-group', resource: 'product-sections', ordered: true, add: 'Add section', title: 'Product sections',
          hint: 'Each section is a slider or certified grid on the homepage. Set its title and sub heading here, then choose the listings with "Manage items".',
          cols: th('Section', 'Layout', 'Background', 'Products'),
          row: r => `<td><div class="hp-cell-title">${esc(r.title)}</div><div class="hp-cell-sub">${esc(trunc(r.subtitle, 70)) || 'No sub heading'}</div></td>
                     <td><span class="badge badge-gray">${esc(r.section_type)}</span></td><td>${esc(r.bg_style || 'white')}</td>
                     <td><button class="btn btn-ghost btn-sm" data-items="${r.id}">${(r.items || []).length} · Manage items</button></td>` },
        { id: 'items', label: 'Section Products', icon: 'fa-mobile-screen', resource: 'section-items', ordered: true, add: 'Add listing', title: 'Products inside sections',
          hint: 'Pick real listing units from your inventory. Price, image and name come from the listing and update automatically unless you override them.',
          cols: th('Image', 'Product', 'Section', 'Badge', 'Price'),
          row: r => `<td>${thumb(r.display_image)}</td>
                     <td><div class="hp-cell-title">${esc(trunc(r.display_name, 46)) || '—'}</div><div class="hp-cell-sub">${esc(r.specs_text)}${r.sold_out ? ' · <b style="color:#dc2626">Sold out</b>' : ''}</div></td>
                     <td>${esc(sectionTitle(r.section_id))}</td><td>${esc(r.badge_text) || '—'}</td>
                     <td><div class="hp-cell-title">${esc(r.display_price) || '—'}</div>${r.original_price ? `<div class="hp-cell-sub"><s>${esc(r.original_price)}</s></div>` : ''}</td>` },
        { id: 'spotlight', label: 'Spotlight', icon: 'fa-star', resource: 'spotlight', add: 'Set spotlight', title: "Today's spotlight",
          hint: 'One featured listing with a large card. Only the first active spotlight is shown on the homepage.',
          cols: th('Image', 'Product', 'Price', 'Discount', 'Reviews'),
          row: r => `<td>${thumb(r.display_image)}</td><td><div class="hp-cell-title">${esc(trunc(r.display_name, 46))}</div><div class="hp-cell-sub">${esc(r.brand_label)}</div></td>
                     <td>${esc(r.price)}<div class="hp-cell-sub"><s>${esc(r.original_price)}</s></div></td><td>${esc(r.discount_pct)}%</td><td>${esc(r.review_count)}</td>` },
        { id: 'price-range', label: 'Price Range', icon: 'fa-tags', resource: 'price-range-cards', ordered: true, add: 'Add card', title: 'Price range cards',
          hint: 'The "Find Your Price Range" cards, usually one per budget tier.',
          cols: th('Tier', 'Label', 'Description', 'Style'), row: r => `<td>${esc(r.tier)}</td><td class="hp-cell-title">${esc(r.label)}</td><td>${esc(trunc(r.description, 50))}</td><td>${r.is_dark ? 'Dark' : 'Light'}</td>` },
        { id: 'sbp', label: 'Shop by Price', icon: 'fa-indian-rupee-sign', resource: 'shop-by-price', mode: 'cards', ordered: true, add: 'Add slide', title: 'Shop by price slides',
          hint: 'Round price-bracket tiles with an image and two label lines.',
          meta: r => `<b>${esc(r.label_line1)} ${esc(r.label_line2)}</b>` },
        { id: 'stats', label: 'Stats', icon: 'fa-chart-simple', resource: 'stats', ordered: true, add: 'Add stat', title: 'Stat counters',
          hint: 'Animated counters such as "12,000+ phones refurbished".',
          cols: th('Label', 'Value'), row: r => `<td class="hp-cell-title">${esc(r.label)}</td><td>${esc(r.target_value)}${esc(r.suffix)}</td>` },
        { id: 'testimonials', label: 'Testimonials', icon: 'fa-comment-dots', resource: 'testimonials', ordered: true, add: 'Add review', title: 'Customer testimonials',
          hint: 'Reviews shown in the testimonials slider.',
          cols: th('Customer', 'Product', 'Rating'), row: r => `<td><div class="hp-cell-title">${esc(r.name)}</div><div class="hp-cell-sub">${esc(r.location)}</div></td><td>${esc(trunc(r.product_bought, 40))}</td><td>${'★'.repeat(r.rating || 5)}</td>` },
        { id: 'faqs', label: 'FAQs', icon: 'fa-circle-question', resource: 'faqs', ordered: true, add: 'Add FAQ', title: 'Frequently asked questions',
          hint: 'Questions and answers in the FAQ accordion.',
          cols: th('Question'), row: r => `<td>${esc(trunc(r.question, 90))}</td>` },
        { id: 'texts', label: 'Section Headings', icon: 'fa-heading', resource: 'section-texts', noDelete: true, title: 'Section headings',
          hint: 'The small label, heading and sub heading above Categories, Spotlight, Price Range, Shop by Price, Testimonials and FAQ. Turn visibility off to hide a whole section heading.',
          cols: th('Section', 'Heading', 'Small label', 'Sub heading'),
          row: r => `<td class="hp-cell-title">${esc(HEADING_LABELS[r.key] || r.key)}</td><td>${esc(r.heading)}</td><td>${esc(r.eyebrow) || '—'}</td><td>${esc(trunc(r.subheading, 60)) || '—'}</td>` },
    ];

    const BANNER_GROUPS = [
        { resource: 'promo-banner', title: 'Promo banner (top strip)', hint: 'Thin strip above the header. Only the first active banner is shown.', add: 'Add promo banner' },
        { resource: 'renewed-banner', title: 'Renewed banner', hint: 'Dark call-to-action banner promoting refurbished phones. Only the first active banner is shown.', add: 'Add renewed banner' },
        { resource: 'partner-cta', title: 'Partner CTA banner (green)', hint: 'Green strip near the bottom inviting refurbishers to partner. Only the first active banner is shown.', add: 'Add partner banner' },
    ];

    // ── Rendering: panes ──────────────────────────────────────────
    function buildTabs() {
        $('hp-tab-bar').innerHTML = TABS.map(t => `<button type="button" role="tab" class="hp-tab-btn" data-tab="${t.id}"><i class="fa-solid ${t.icon}"></i>${t.label}</button>`).join('');
    }

    function paneShell(tab) {
        if (tab.id === 'banners') {
            return BANNER_GROUPS.map(g => `<div class="panel hp-banner-group" style="padding:0">
                <div class="hp-pane-head"><div><h4>${g.title}</h4><p class="hp-hint">${g.hint}</p></div>
                <div class="hp-head-actions"><button class="btn btn-primary btn-sm" data-add="${g.resource}"><i class="fa-solid fa-plus me-1"></i> ${g.add}</button></div></div>
                <div class="hp-banner-list" id="list-${g.resource}"></div></div>`).join('');
        }
        const filter = tab.id === 'items' ? `<select class="input-field hp-filter" id="item-section-filter" aria-label="Filter by section"><option value="">All sections</option></select>` : '';
        const body = tab.mode === 'cards'
            ? `<div class="hp-cards" id="list-${tab.id}"></div>`
            : `<div class="rb-table-wrap"><table class="rb-table"><thead><tr>${tab.ordered ? '<th>Order</th>' : ''}${tab.cols.map(c => `<th>${c}</th>`).join('')}<th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody id="list-${tab.id}"></tbody></table></div>`;
        return `<div class="panel" style="padding:0"><div class="hp-pane-head"><div><h4>${tab.title}</h4><p class="hp-hint">${tab.hint}</p></div>
            <div class="hp-head-actions">${filter}${tab.add ? `<button class="btn btn-primary btn-sm" data-add="${tab.resource}"><i class="fa-solid fa-plus me-1"></i> ${tab.add}</button>` : ''}</div></div>${body}</div>`;
    }

    function switchTab(id) {
        activeTab = id;
        history.replaceState(null, '', '#' + id);
        document.querySelectorAll('.hp-tab-btn').forEach(b => {
            const on = b.dataset.tab === id;
            b.classList.toggle('active', on);
            b.setAttribute('aria-selected', on);
        });
        const tab = TABS.find(t => t.id === id);
        $('hp-panes').innerHTML = paneShell(tab);
        loadTab(tab);
    }

    const loading = (cols) => `<tr><td colspan="${cols}" style="padding:28px;text-align:center"><div class="skeleton" style="height:12px;width:40%;margin:0 auto"></div></td></tr>`;
    const emptyState = (label, res, cols) => {
        const inner = `<div class="empty-state"><i class="fa-solid fa-inbox"></i><h4>No ${label} yet</h4><p>Create the first one to see it on the homepage.</p></div>`;
        return cols ? `<tr><td colspan="${cols}">${inner}</td></tr>` : inner;
    };

    const statusBtn = (res, r) => `<button class="hp-status" data-toggle="${res}:${r.id}" title="Click to ${r.is_active ? 'hide' : 'show'}">${r.is_active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Hidden</span>'}</button>`;
    const orderCtl = (res, r, i, n) => `<div class="hp-order">
        <button type="button" data-move="${res}:${r.id}:-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up"><i class="fa-solid fa-chevron-up"></i></button>
        <span>${i + 1}</span>
        <button type="button" data-move="${res}:${r.id}:1" ${i === n - 1 ? 'disabled' : ''} aria-label="Move down"><i class="fa-solid fa-chevron-down"></i></button></div>`;
    const editDel = (res, r, noDelete) => `<button class="btn btn-ghost btn-sm" data-edit="${res}:${r.id}" title="Edit" aria-label="Edit"><i class="fa-solid fa-pen"></i></button>
        ${noDelete ? '' : `<button class="btn btn-ghost btn-sm" style="color:var(--red)" data-del="${res}:${r.id}" title="Delete" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>`}`;

    async function loadTab(tab) {
        if (tab.id === 'banners') return loadBanners();
        const host = $('list-' + tab.id);
        if (tab.id === 'items') await loadSections();
        host.innerHTML = tab.mode === 'cards' ? '<div class="skeleton" style="height:120px;grid-column:1/-1"></div>' : loading(tab.cols.length + 3);
        const url = tab.id === 'items' && itemFilter ? `section-items/?section_id=${itemFilter}` : `${tab.resource}/`;
        const r = await api('GET', url);
        if (!r.success) { host.innerHTML = tab.mode === 'cards' ? '<p class="hp-hint" style="padding:20px">Failed to load.</p>' : `<tr><td colspan="${tab.cols.length + 3}" class="hp-hint" style="padding:20px">Failed to load: ${esc(r.error)}</td></tr>`; return; }
        const rows = r.data || [];
        rowsCache[tab.resource] = rows;
        if (!rows.length) { host.innerHTML = tab.mode === 'cards' ? emptyState(tab.title.toLowerCase()) : emptyState(tab.title.toLowerCase(), tab.resource, tab.cols.length + 3); return; }
        if (tab.mode === 'cards') {
            host.innerHTML = rows.map((r, i) => `<div class="hp-card${r.is_active ? '' : ' is-off'}">
                <div class="hp-card-media">${PV[tab.resource](r)}</div>
                <div class="hp-card-foot"><div class="hp-card-meta">${tab.ordered ? orderCtl(tab.resource, r, i, rows.length) : ''}${tab.meta(r)}</div>
                <div class="hp-ctrls">${statusBtn(tab.resource, r)}${editDel(tab.resource, r)}</div></div></div>`).join('');
        } else {
            host.innerHTML = rows.map((r, i) => `<tr>${tab.ordered ? `<td>${orderCtl(tab.resource, r, i, rows.length)}</td>` : ''}${tab.row(r)}<td>${statusBtn(tab.resource, r)}</td>
                <td><div class="hp-ctrls" style="justify-content:flex-end">${editDel(tab.resource, r, tab.noDelete)}</div></td></tr>`).join('');
        }
    }

    async function loadBanners() {
        for (const g of BANNER_GROUPS) {
            const host = $('list-' + g.resource);
            host.innerHTML = '<div class="skeleton" style="height:70px"></div>';
            const r = await api('GET', `${g.resource}/`);
            if (!r.success) { host.innerHTML = `<p class="hp-hint">Failed to load: ${esc(r.error)}</p>`; continue; }
            const rows = r.data || [];
            rowsCache[g.resource] = rows;
            host.innerHTML = rows.length ? rows.map(row => `<div class="hp-banner-row${row.is_active ? '' : ' is-off'}">
                <div class="hp-card-media">${PV[g.resource](row)}</div>
                <div class="hp-card-foot"><div class="hp-card-meta">${statusBtn(g.resource, row)}</div><div class="hp-ctrls">${editDel(g.resource, row)}</div></div></div>`).join('')
                : emptyState('banner');
        }
    }

    async function loadSections() {
        const r = await api('GET', 'product-sections/');
        if (r.success) sections = r.data || [];
        const sel = $('item-section-filter');
        if (sel) {
            sel.innerHTML = '<option value="">All sections</option>' + sections.map(s => `<option value="${s.id}"${String(s.id) === String(itemFilter) ? ' selected' : ''}>${esc(s.title)}</option>`).join('');
        }
    }

    // ── Actions: toggle, move, delete ─────────────────────────────
    async function toggle(res, id) {
        const row = (rowsCache[res] || []).find(r => String(r.id) === String(id));
        if (!row) return;
        const r = await api('PUT', `${res}/${id}/`, { is_active: !row.is_active });
        if (!r.success) return toast(r.error || 'Could not update', 'bad');
        toast(row.is_active ? 'Hidden from homepage' : 'Now visible on homepage', 'ok');
        refresh();
    }

    async function move(res, id, dir) {
        const all = rowsCache[res] || [];
        const row = all.find(r => String(r.id) === String(id));
        if (!row) return;
        const group = res === 'section-items' ? all.filter(r => String(r.section_id) === String(row.section_id)) : all.slice();
        const i = group.findIndex(r => r.id === row.id), j = i + dir;
        if (j < 0 || j >= group.length) return;
        [group[i], group[j]] = [group[j], group[i]];
        const calls = [];
        group.forEach((r, idx) => { if (Number(r.order) !== idx) calls.push(api('PUT', `${res}/${r.id}/`, { order: idx })); });
        const results = await Promise.all(calls);
        if (results.some(x => !x.success)) toast('Some items could not be reordered', 'bad');
        refresh();
    }

    async function del(res, id) {
        if (!confirm('Delete this ' + (RES_LABEL[res] || 'record') + '? This cannot be undone.')) return;
        const r = await api('DELETE', `${res}/${id}/`);
        if (!r.success) return toast(r.error || 'Delete failed', 'bad');
        toast('Deleted', 'ok');
        refresh();
    }

    const refresh = () => loadTab(TABS.find(t => t.id === activeTab));

    // ── Drawer: open / close ──────────────────────────────────────
    async function openModal(resource, data) {
        if (resource === 'section-items') {
            await loadSections();
            if (!sections.length) return toast('Create a product section first, then add listings to it.', 'bad');
        }
        const isEdit = !!(data && data.id);
        const d = data ? { ...data } : { order: (rowsCache[resource] || []).length };
        if (!isEdit && resource === 'section-items' && !d.section_id) d.section_id = itemFilter || sections[0].id;
        Object.assign(modal, { resource, id: isEdit ? data.id : null, images: {}, objectUrls: {}, newUrl: {}, live: (resource === 'section-items' || resource === 'spotlight') ? (d.display_image || null) : null, results: [] });

        $('hp-modal-title').textContent = `${isEdit ? 'Edit' : 'Add'} ${RES_LABEL[resource]}`;
        $('hp-modal-sub').textContent = isEdit ? 'Changes appear on /dy_homepage after saving.' : 'Fill in the details — the preview updates as you type.';
        $('hp-modal-body').innerHTML = `<div class="hp-preview-wrap"><div class="hp-preview-label"><i class="fa-solid fa-eye"></i> Live preview — how it will look</div><div class="hp-preview-box" id="hp-preview"></div></div>
            <form id="hp-modal-form" autocomplete="off">${FORMS[resource](d)}</form>`;
        $('hp-overlay').hidden = false;
        $('hp-drawer').hidden = false;
        document.body.style.overflow = 'hidden';

        const form = $('hp-modal-form');
        form.addEventListener('input', updatePreview);
        form.addEventListener('change', updatePreview);
        form.addEventListener('submit', e => e.preventDefault());
        wireImages();
        wirePicker();
        updatePreview();
        const first = form.querySelector('input:not([type=hidden]):not([type=file]):not([type=checkbox]), select');
        if (first) first.focus({ preventScroll: true });
    }

    function closeModal() {
        Object.values(modal.objectUrls).forEach(u => u && URL.revokeObjectURL(u));
        $('hp-overlay').hidden = true;
        $('hp-drawer').hidden = true;
        document.body.style.overflow = '';
        modal.resource = null; modal.id = null;
    }

    function collect(form) {
        const o = {};
        form.querySelectorAll('[name]').forEach(el => {
            if (el.type === 'file') return;
            o[el.name] = el.type === 'checkbox' ? el.checked : el.value;
        });
        return o;
    }

    let previewFrame = 0;
    function updatePreview() {
        cancelAnimationFrame(previewFrame);
        previewFrame = requestAnimationFrame(() => {
            const form = $('hp-modal-form'), box = $('hp-preview');
            if (!form || !box || !modal.resource) return;
            const v = collect(form);
            Object.keys(modal.images).forEach(k => { v[k] = modal.images[k]; });
            if (!v.display_image && modal.live) v.display_image = modal.live;
            const fn = PV[modal.resource];
            box.innerHTML = fn ? fn(v) : '<div class="pv-empty">No preview for this item.</div>';
        });
    }

    // ── Image uploader with preview ───────────────────────────────
    const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

    function wireImages() {
        document.querySelectorAll('#hp-modal-form .hp-img').forEach(box => {
            const name = box.dataset.name, current = box.dataset.current || '';
            const input = box.querySelector('input[type=file]'), prev = box.querySelector('.hp-img-preview');
            const img = prev.querySelector('img'), nameEl = prev.querySelector('b'), sizeEl = prev.querySelector('.hp-img-size'), tag = prev.querySelector('.hp-tag');
            const clear = box.querySelector(`[name="clear_${name}"]`), drop = box.querySelector('.hp-drop');
            const removeBtn = prev.querySelector('[data-img-remove]');

            const show = (url, label, isNew, size) => {
                img.src = url; nameEl.textContent = label; sizeEl.textContent = size ? fmtSize(size) : '';
                tag.textContent = isNew ? 'New — saves when you click Save' : 'Current image';
                tag.className = 'hp-tag ' + (isNew ? 'new' : 'current');
                removeBtn.textContent = isNew ? 'Discard' : 'Remove';
                prev.hidden = false;
            };
            modal.images[name] = current || null;
            if (current) show(current, 'Current image', false); else prev.hidden = true;

            input.addEventListener('change', () => {
                const f = input.files[0];
                if (!f) return;
                if (!f.type.startsWith('image/')) { toast('Please choose an image file', 'bad'); input.value = ''; return; }
                if (f.size > 5 * 1024 * 1024) { toast('Image must be 5 MB or smaller', 'bad'); input.value = ''; return; }
                if (modal.objectUrls[name]) URL.revokeObjectURL(modal.objectUrls[name]);
                const url = URL.createObjectURL(f);
                modal.objectUrls[name] = url; modal.newUrl[name] = true;
                clear.value = 'false'; modal.images[name] = url;
                show(url, f.name, true, f.size);
                updatePreview();
            });

            removeBtn.addEventListener('click', () => {
                if (modal.newUrl[name]) {
                    input.value = '';
                    URL.revokeObjectURL(modal.objectUrls[name]); modal.objectUrls[name] = null; modal.newUrl[name] = false;
                    clear.value = 'false';
                    if (current) { modal.images[name] = current; show(current, 'Current image', false); }
                    else { modal.images[name] = null; prev.hidden = true; }
                } else {
                    clear.value = 'true'; modal.images[name] = null; prev.hidden = true;
                }
                updatePreview();
            });

            ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, () => drop.classList.add('drag')));
            ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('drag')));
        });
    }

    // ── Inventory listing picker ──────────────────────────────────
    function setField(name, val) {
        const el = $('hp-modal-form').querySelector(`[name="${name}"]`);
        if (el && val !== undefined && val !== null) el.value = val;
    }

    function wirePicker() {
        const q = $('hp-listing-q'), results = $('hp-results');
        if (!q) return;
        const run = async () => {
            results.hidden = false;
            results.innerHTML = '<div class="hp-result-note">Searching…</div>';
            const r = await api('GET', `listing-search/?q=${encodeURIComponent(q.value.trim())}`);
            if (!r.success) { results.innerHTML = `<div class="hp-result-note">${esc(r.error || 'Search failed')}</div>`; return; }
            modal.results = r.data || [];
            results.innerHTML = modal.results.length
                ? modal.results.map((it, i) => `<div class="hp-result" tabindex="0" data-pick="${i}">
                    ${it.image ? `<img src="${esc(it.image)}" alt="">` : '<img alt="">'}
                    <div class="hp-result-main"><b>${esc(it.name)}</b><span>${esc(it.condition)} · ${esc(trunc(it.specs, 50))} · Unit #${it.listing_unit_id}</span></div>
                    <div class="hp-result-price">${inr(it.price)}</div></div>`).join('')
                : '<div class="hp-result-note">No live listings match your search.</div>';
        };
        q.addEventListener('input', () => { clearTimeout(modal.timer); modal.timer = setTimeout(run, 250); });
        q.addEventListener('focus', () => { if (results.hidden) run(); });
        const choose = el => { const row = el.closest('[data-pick]'); if (row) pick(modal.results[Number(row.dataset.pick)]); };
        results.addEventListener('click', e => choose(e.target));
        results.addEventListener('keydown', e => { if (e.key === 'Enter') choose(e.target); });
    }

    function pick(it) {
        if (!it) return;
        const hasMrp = it.mrp && it.mrp > it.price;
        const pct = hasMrp ? Math.round((1 - it.price / it.mrp) * 100) : 0;
        setField('listing_unit_id', it.listing_unit_id);
        setField('product_model_id', it.product_model_id);
        setField('display_name', it.name);
        if (modal.resource === 'section-items') {
            setField('display_price', inr(it.price));
            setField('original_price', hasMrp ? inr(it.mrp) : '');
            setField('badge_text', pct ? `-${pct}%` : '');
            setField('specs_text', [it.condition, it.specs].filter(Boolean).join(' · '));
        } else {
            setField('brand_label', it.brand);
            setField('price', inr(it.price));
            setField('original_price', hasMrp ? inr(it.mrp) : '');
            setField('discount_pct', pct);
            setField('save_amount', hasMrp ? inr(it.mrp - it.price) : '');
            setField('specs_csv', [it.condition, ...String(it.specs || '').split(' · ')].filter(Boolean).join(', '));
        }
        modal.live = it.image || null;
        const picked = $('hp-picked');
        picked.classList.remove('empty');
        picked.innerHTML = pickedInner({ listing_unit_id: it.listing_unit_id, display_name: it.name, display_image: it.image });
        $('hp-results').hidden = true;
        $('hp-listing-q').value = '';
        updatePreview();
    }

    // ── Save ──────────────────────────────────────────────────────
    async function saveModal() {
        const form = $('hp-modal-form');
        if (!form || !modal.resource) return;
        if (!form.reportValidity()) return;
        const res = modal.resource;
        if ((res === 'section-items' || res === 'spotlight') && !form.querySelector('[name="listing_unit_id"]').value) {
            return toast('Pick a listing from your inventory first', 'bad');
        }
        const fd = new FormData();
        form.querySelectorAll('[name]').forEach(el => {
            if (el.type === 'file') { if (el.files[0]) fd.append(el.name, el.files[0]); return; }
            if (el.type === 'checkbox') { fd.append(el.name, el.checked ? 'true' : 'false'); return; }
            if (el.name === 'specs_csv') { fd.append('specs', JSON.stringify(csvToArr(el.value))); return; }
            fd.append(el.name, el.value);
        });
        const btn = $('hp-modal-save');
        btn.disabled = true; btn.textContent = 'Saving…';
        const r = await api('POST', modal.id ? `${res}/${modal.id}/` : `${res}/`, fd);
        btn.disabled = false; btn.textContent = 'Save changes';
        if (!r.success) return toast(r.error || 'Save failed', 'bad');
        toast(modal.id ? 'Changes saved' : 'Created', 'ok');
        closeModal();
        refresh();
    }

    async function edit(res, id) {
        const r = await api('GET', `${res}/${id}/`);
        if (!r.success) return toast(r.error || 'Failed to load record', 'bad');
        openModal(res, r.data);
    }

    // ── Init & event delegation ───────────────────────────────────
    function init(csrfToken, baseUrl) {
        csrf = csrfToken; base = baseUrl;
        buildTabs();

        $('hp-tab-bar').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) switchTab(b.dataset.tab); });
        $('hp-panes').addEventListener('click', e => {
            const t = e.target.closest('[data-add],[data-edit],[data-del],[data-toggle],[data-move],[data-items]');
            if (!t) return;
            if (t.dataset.add) openModal(t.dataset.add);
            else if (t.dataset.edit) { const [res, id] = t.dataset.edit.split(':'); edit(res, id); }
            else if (t.dataset.del) { const [res, id] = t.dataset.del.split(':'); del(res, id); }
            else if (t.dataset.toggle) { const [res, id] = t.dataset.toggle.split(':'); toggle(res, id); }
            else if (t.dataset.move) { const [res, id, dir] = t.dataset.move.split(':'); move(res, id, Number(dir)); }
            else if (t.dataset.items) { itemFilter = t.dataset.items; switchTab('items'); }
        });
        $('hp-panes').addEventListener('change', e => {
            if (e.target.id === 'item-section-filter') { itemFilter = e.target.value; refresh(); }
        });
        $('hp-overlay').addEventListener('click', closeModal);
        $('hp-modal-x').addEventListener('click', closeModal);
        $('hp-modal-cancel').addEventListener('click', closeModal);
        $('hp-modal-save').addEventListener('click', saveModal);
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('hp-drawer').hidden) closeModal(); });

        const start = location.hash.replace('#', '');
        switchTab(TABS.some(t => t.id === start) ? start : 'hero');
    }

    return { init, switchTab, openModal, edit, del, saveModal, closeModal };
})();
