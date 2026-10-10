(function () {
    'use strict';

    document.getElementById('dh-year').textContent = new Date().getFullYear();

    const root = document.getElementById('dh-root');
    const esc = (s) => (s == null ? '' : String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

    fetch('/admin-homepage-api/config/')
        .then(r => r.json())
        .then(res => {
            if (!res.success) throw new Error(res.error || 'Failed to load homepage');
            render(res.data);
        })
        .catch(err => {
            console.log('dy_homepage load error:', err);
            root.innerHTML = `<div class="dh-loading"><p>Could not load homepage content. Please try again later.</p></div>`;
        });

    function render(d) {
        const sections = [];

        if (d.promo_banner) sections.push(renderPromo(d.promo_banner));
        if (d.hero_slides?.length) sections.push(renderHero(d.hero_slides));
        if (d.trust_items?.length) sections.push(renderTrust(d.trust_items));
        if (d.categories?.length) sections.push(renderCategories(d.categories));
        if (d.nav_links?.length) renderNav(d.nav_links);

        (d.product_sections || []).forEach((sec, i) => sections.push(renderProductSection(sec, i)));

        if (d.spotlight) sections.push(renderSpotlight(d.spotlight));
        if (d.price_range_cards?.length) sections.push(renderPriceRange(d.price_range_cards));
        if (d.shop_by_price?.length) sections.push(renderShopByPrice(d.shop_by_price));
        if (d.renewed_banner) sections.push(renderRenewed(d.renewed_banner));
        if (d.stats?.length) sections.push(renderStats(d.stats));
        if (d.testimonials?.length) sections.push(renderTestimonials(d.testimonials));
        if (d.partner_cta) sections.push(renderPartnerCta(d.partner_cta));
        if (d.faqs?.length) sections.push(renderFaqs(d.faqs));

        root.innerHTML = sections.join('');
        wireHero();
        wireFaqs();
    }

    function renderNav(links) {
        const el = document.getElementById('dh-nav-links');
        el.innerHTML = links.map(l => `<a href="${esc(l.url || '#')}">${esc(l.label)}</a>`).join('');
    }

    function renderPromo(p) {
        return `<div class="dh-promo">${esc(p.text || '')}</div>`;
    }

    function renderHero(slides) {
        return `
        <section class="dh-section dh-container">
            <div class="dh-hero">
                ${slides.map((s, i) => `
                    <div class="dh-hero-slide ${i === 0 ? 'active' : ''}" style="background-image:url('${esc(s.image || '')}')">
                        <div class="dh-hero-content">
                            ${s.tag_text ? `<span class="dh-prod-badge" style="position:static;display:inline-block;margin-bottom:10px;">${esc(s.tag_text)}</span>` : ''}
                            <h2>${esc(s.heading)}</h2>
                            <p>${esc(s.body_text || '')}</p>
                            ${s.btn1_text ? `<a href="${esc(s.btn1_url || '#')}" class="dh-btn dh-btn-primary">${esc(s.btn1_text)}</a>` : ''}
                            ${s.btn2_text ? `<a href="${esc(s.btn2_url || '#')}" class="dh-btn dh-btn-ghost" style="margin-left:10px;">${esc(s.btn2_text)}</a>` : ''}
                        </div>
                    </div>`).join('')}
                ${slides.length > 1 ? `<div class="dh-hero-dots">${slides.map((_, i) => `<span data-i="${i}" class="${i === 0 ? 'active' : ''}"></span>`).join('')}</div>` : ''}
            </div>
        </section>`;
    }

    function wireHero() {
        const slides = document.querySelectorAll('.dh-hero-slide');
        const dots = document.querySelectorAll('.dh-hero-dots span');
        if (!slides.length) return;
        let idx = 0;
        function show(i) {
            idx = i;
            slides.forEach((s, j) => s.classList.toggle('active', j === i));
            dots.forEach((dd, j) => dd.classList.toggle('active', j === i));
        }
        dots.forEach(dot => dot.addEventListener('click', () => show(parseInt(dot.dataset.i, 10))));
        if (slides.length > 1) {
            setInterval(() => show((idx + 1) % slides.length), 5000);
        }
    }

    function renderTrust(items) {
        return `
        <div class="dh-container">
            <div class="dh-trust">
                ${items.map(t => `<div class="dh-trust-item"><i class="bi ${esc(t.icon || 'bi-check-circle')}"></i> ${esc(t.text)}</div>`).join('')}
            </div>
        </div>`;
    }

    function renderCategories(cats) {
        return `
        <section class="dh-section dh-container">
            <div class="dh-section-head"><div><h2>Shop by Category</h2></div></div>
            <div class="dh-cat-grid">
                ${cats.map(c => `
                    <a href="${esc(c.link_url || '#')}" class="dh-cat-card">
                        ${c.image ? `<img src="${esc(c.image)}" alt="${esc(c.name)}">` : ''}
                        <span>${esc(c.name)}</span>
                    </a>`).join('')}
            </div>
        </section>`;
    }

    function productCard(p) {
        const price = p.display_price;
        const mrp = p.original_price;
        return `
        <a href="${esc(p.link_url || '#')}" class="dh-prod-card">
            <div class="dh-prod-img-wrap">
                ${p.sold_out ? `<span class="dh-prod-badge" style="background:#999;">Sold Out</span>` : (p.badge_text ? `<span class="dh-prod-badge">${esc(p.badge_text)}</span>` : '')}
                ${p.display_image ? `<img src="${esc(p.display_image)}" alt="${esc(p.display_name)}">` : ''}
            </div>
            <div class="dh-prod-body">
                <p class="dh-prod-name">${esc(p.display_name)}</p>
                ${p.specs_text ? `<p class="dh-prod-specs">${esc(p.specs_text)}</p>` : ''}
                <div class="dh-prod-price-row">
                    <span class="dh-prod-price">${esc(price)}</span>
                    ${mrp ? `<span class="dh-prod-mrp">${esc(mrp)}</span>` : ''}
                </div>
            </div>
        </a>`;
    }

    function renderProductSection(sec, i) {
        const items = sec.items || [];
        if (!items.length) return '';
        return `
        <section class="dh-section dh-container ${i % 2 === 1 ? 'dh-tint' : ''}">
            <div class="dh-section-head">
                <div><h2>${esc(sec.title)}</h2>${sec.subtitle ? `<p>${esc(sec.subtitle)}</p>` : ''}</div>
                ${sec.view_all_url ? `<a href="${esc(sec.view_all_url)}" class="dh-section-link">View All &rarr;</a>` : ''}
            </div>
            <div class="dh-prod-row">${items.map(productCard).join('')}</div>
        </section>`;
    }

    function renderSpotlight(s) {
        return `
        <section class="dh-section dh-container">
            <div class="dh-spotlight">
                <div class="dh-spotlight-img">${s.display_image ? `<img src="${esc(s.display_image)}" alt="${esc(s.display_name)}">` : ''}</div>
                <div class="dh-spotlight-info">
                    ${s.brand_label ? `<div class="dh-spotlight-brand">${esc(s.brand_label)}</div>` : ''}
                    <h3>${esc(s.display_name)}</h3>
                    ${s.specs?.length ? `<div class="dh-spotlight-specs">${s.specs.map(sp => `<span>${esc(sp)}</span>`).join('')}</div>` : ''}
                    <div class="dh-spotlight-price">${esc(s.price)}${s.original_price ? `<span class="mrp">${esc(s.original_price)}</span>` : ''}</div>
                    ${s.save_amount ? `<div class="dh-spotlight-save">You save ${esc(s.save_amount)}</div>` : ''}
                    <a href="${esc(s.link_url || '#')}" class="dh-btn dh-btn-primary">Buy Now</a>
                </div>
            </div>
        </section>`;
    }

    function renderPriceRange(cards) {
        return `
        <section class="dh-section dh-container">
            <div class="dh-pr-grid">
                ${cards.map(c => `
                    <a href="${esc(c.link_url || '#')}" class="dh-pr-card ${c.is_dark ? 'dark' : ''}">
                        <div class="dh-pr-tier">${esc(c.tier)}</div>
                        <div class="dh-pr-label">${esc(c.label)}</div>
                        <div class="dh-pr-desc">${esc(c.description)}</div>
                        <div class="dh-pr-link">${esc(c.link_text || 'Browse →')}</div>
                    </a>`).join('')}
            </div>
        </section>`;
    }

    function renderShopByPrice(slides) {
        return `
        <section class="dh-section dh-container dh-tint">
            <div class="dh-section-head"><div><h2>Shop by Price</h2></div></div>
            <div class="dh-sbp-row">
                ${slides.map(s => `
                    <a href="${esc(s.link_url || '#')}" class="dh-sbp-card">
                        ${s.image ? `<img src="${esc(s.image)}">` : ''}
                        <div class="l1">${esc(s.label_line1)}</div>
                        <div class="l2">${esc(s.label_line2)}</div>
                    </a>`).join('')}
            </div>
        </section>`;
    }

    function renderRenewed(b) {
        return `
        <section class="dh-section dh-container">
            <div class="dh-renewed">
                <h2>${esc(b.heading)}</h2>
                <p>${esc(b.subtext || '')}</p>
                ${b.cta_text ? `<a href="/shop/" class="dh-btn dh-btn-primary">${esc(b.cta_text)}</a>` : ''}
            </div>
        </section>`;
    }

    function renderStats(stats) {
        return `
        <section class="dh-section dh-container">
            <div class="dh-stats-grid">
                ${stats.map(s => `<div><div class="dh-stat-num">${esc(s.number)}</div><div class="dh-stat-label">${esc(s.label)}</div></div>`).join('')}
            </div>
        </section>`;
    }

    function renderTestimonials(items) {
        return `
        <section class="dh-section dh-container dh-tint">
            <div class="dh-section-head"><div><h2>What Our Customers Say</h2></div></div>
            <div class="dh-test-row">
                ${items.map(t => `
                    <div class="dh-test-card">
                        <div class="dh-test-stars">${'★'.repeat(t.rating || 5)}</div>
                        <p class="dh-test-quote">${esc(t.quote)}</p>
                        <div class="dh-test-author">${esc(t.author)}</div>
                        ${t.role ? `<div class="dh-test-role">${esc(t.role)}</div>` : ''}
                    </div>`).join('')}
            </div>
        </section>`;
    }

    function renderPartnerCta(p) {
        return `
        <section class="dh-section dh-container">
            <div class="dh-partner">
                <h2>${esc(p.heading)}</h2>
                <p>${esc(p.subtext || '')}</p>
                <a href="${esc(p.btn_url || '/partner-application')}" class="dh-btn dh-btn-primary">${esc(p.btn_text || 'Apply Now')}</a>
            </div>
        </section>`;
    }

    function renderFaqs(faqs) {
        return `
        <section class="dh-section dh-container">
            <div class="dh-section-head"><div><h2>Frequently Asked Questions</h2></div></div>
            <div class="dh-faq-list">
                ${faqs.map(f => `
                    <div class="dh-faq-item">
                        <div class="dh-faq-q">${esc(f.question)} <i class="bi bi-chevron-down"></i></div>
                        <div class="dh-faq-a">${esc(f.answer)}</div>
                    </div>`).join('')}
            </div>
        </section>`;
    }

    function wireFaqs() {
        document.querySelectorAll('.dh-faq-item').forEach(item => {
            item.querySelector('.dh-faq-q').addEventListener('click', () => item.classList.toggle('open'));
        });
    }
})();
