'use strict';
/**
 * homepage_admin.js
 * Admin CRUD manager for all Homepage sections.
 * Uses the same callApi() / badge / table helpers as the rest of the admin.
 */

const HP = (() => {

    let _csrf, _baseUrl;
    let _activeTab = 'hero';
    let _modalResource = null;
    let _modalEditId   = null;
    let _allSections   = [];   // cached section list for item-filter dropdown

    // ── Tab config ────────────────────────────────────────────────
    const TABS = [
        { id: 'hero',        label: 'Hero Slides',       resource: 'hero-slides',       tbl: 'tbl-hero'        },
        { id: 'trust',       label: 'Trust Strip',        resource: 'trust-items',       tbl: 'tbl-trust'       },
        { id: 'nav',         label: 'Nav Links',          resource: 'nav-links',         tbl: 'tbl-nav'         },
        { id: 'categories',  label: 'Categories',         resource: 'categories',        tbl: 'tbl-categories'  },
        { id: 'sections',    label: 'Product Sections',   resource: 'product-sections',  tbl: 'tbl-sections'    },
        { id: 'items',       label: 'Section Items',      resource: 'section-items',     tbl: 'tbl-items'       },
        { id: 'spotlight',   label: 'Spotlight',          resource: 'spotlight',         tbl: 'tbl-spotlight'   },
        { id: 'price-range', label: 'Price Range',        resource: 'price-range-cards', tbl: 'tbl-price-range' },
        { id: 'sbp',         label: 'Shop by Price',      resource: 'shop-by-price',     tbl: 'tbl-sbp'         },
        { id: 'testimonials',label: 'Testimonials',       resource: 'testimonials',      tbl: 'tbl-testimonials'},
        { id: 'faqs',        label: 'FAQs',               resource: 'faqs',              tbl: 'tbl-faqs'        },
        { id: 'stats',       label: 'Stats',              resource: 'stats',             tbl: 'tbl-stats'       },
        { id: 'banners',     label: 'Banners / CTA',      resource: null,                tbl: null              },
    ];

    // ── Helpers ───────────────────────────────────────────────────
    const $ = id => document.getElementById(id);
    const activeBadge  = v => v ? '<span class="badge badge-green">Active</span>'
                                 : '<span class="badge badge-gray">Off</span>';
    const truncate     = (s, n=60) => s && s.length > n ? s.slice(0, n) + '…' : (s || '—');
    const actionBtns   = (res, id) => `
        <div style="display:flex;gap:6px;justify-content:flex-end;">
            <button class="btn btn-ghost btn-sm" onclick="HP.edit('${res}',${id})"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-ghost btn-sm" style="color:var(--error)" onclick="HP.del('${res}',${id})"><i class="fa-solid fa-trash"></i></button>
        </div>`;

    // ── Init ──────────────────────────────────────────────────────
    function init(csrf, baseUrl) {
        _csrf    = csrf;
        _baseUrl = baseUrl;
        buildTabBar();
        switchTab('hero');
    }

    function buildTabBar() {
        // Inject tab buttons if the Django template left them empty
        const bar = document.querySelector('.hp-tab-btn')?.parentElement;
        if (!bar) return;
        if (!document.querySelector('.hp-tab-btn')) {
            bar.innerHTML = TABS.map(t =>
                `<button class="hp-tab-btn" data-tab="${t.id}" onclick="HP.switchTab('${t.id}')">${t.label}</button>`
            ).join('');
        }
        // Inject pane containers if missing (Django may handle this already)
    }

    function switchTab(tabId) {
        _activeTab = tabId;
        // Toggle panes
        document.querySelectorAll('.hp-pane').forEach(p => {
            p.style.display = p.id === `pane-${tabId}` ? '' : 'none';
        });
        // Toggle tab active class
        document.querySelectorAll('.hp-tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tabId);
        });
        // Load data for this tab
        const tab = TABS.find(t => t.id === tabId);
        if (!tab) return;
        if (tabId === 'banners') {
            loadBanners();
        } else if (tabId === 'items') {
            loadSectionsForFilter().then(loadItems);
        } else if (tab.resource) {
            loadTable(tab);
        }
    }

    // ── API wrapper ───────────────────────────────────────────────
    async function api(method, path, body) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': _csrf },
        };
        if (body) opts.body = JSON.stringify(body);
        try {
            const res = await fetch(_baseUrl + path, opts);
            return await res.json();
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }

    // ── Table Loaders ─────────────────────────────────────────────

    async function loadTable(tab) {
        const tbody = $(tab.tbl);
        if (!tbody) return;
        tbody.innerHTML = skeletonRow(6);
        const r = await api('GET', `${tab.resource}/`);
        if (!r.success) { tbody.innerHTML = errRow(6); return; }
        const rows = r.data || [];
        if (!rows.length) { tbody.innerHTML = emptyRow(6, tab.label); return; }
        tbody.innerHTML = rows.map(row => renderRow(tab.resource, row)).join('');
    }

    function renderRow(resource, row) {
        switch (resource) {
            case 'hero-slides': return `<tr>
                <td>${row.order}</td>
                <td><div class="fw-600">${truncate(row.heading, 50)}</div></td>
                <td><span class="badge badge-gray">${row.bg_style}</span></td>
                <td>${row.btn1_text || '—'} / ${row.btn2_text || '—'}</td>
                <td>${activeBadge(row.is_active)}</td>
                <td>${actionBtns(resource, row.id)}</td></tr>`;

            case 'trust-items': return `<tr>
                <td>${row.order}</td>
                <td><i class="${row.icon}"></i></td>
                <td>${row.title}</td>
                <td>${row.subtitle || '—'}</td>
                <td>${activeBadge(row.is_active)}</td>
                <td>${actionBtns(resource, row.id)}</td></tr>`;

            case 'nav-links': return `<tr>
                <td>${row.order}</td>
                <td>${row.label}</td>
                <td class="mono text-muted">${row.url}</td>
                <td>${row.highlight_class || 'normal'}</td>
                <td>${activeBadge(row.is_active)}</td>
                <td>${actionBtns(resource, row.id)}</td></tr>`;

            case 'categories': return `<tr>
                <td>${row.order}</td>
                <td class="fw-600">${row.name}</td>
                <td>${row.badge_text || '—'}</td>
                <td>${row.product_count || '—'}</td>
                <td>${row.starting_price || '—'}</td>
                <td>${activeBadge(row.is_active)}</td>
                <td>${actionBtns(resource, row.id)}</td></tr>`;

            case 'product-sections': return `<tr>
                <td>${row.order}</td>
                <td class="fw-600">${row.title}</td>
                <td><span class="badge badge-gray">${row.section_type}</span></td>
                <td>${row.bg_style || 'white'}</td>
                <td>${(row.items || []).length}</td>
                <td>${activeBadge(row.is_active)}</td>
                <td>${actionBtns(resource, row.id)}</td></tr>`;

            case 'section-items': {
                const img = row.display_image
                    ? `<img src="${row.display_image}" style="width:40px;height:40px;object-fit:contain;border-radius:4px;">`
                    : '—';
                return `<tr>
                    <td>${row.order}</td>
                    <td>${img}</td>
                    <td class="fw-600">${truncate(row.display_name, 40)}</td>
                    <td>${row.section_id || '—'}</td>
                    <td>${row.badge_text || '—'}</td>
                    <td>${row.display_price || '—'}</td>
                    <td>${activeBadge(row.is_active)}</td>
                    <td>${actionBtns(resource, row.id)}</td></tr>`;
            }

            case 'spotlight': return `<tr>
                <td>${row.brand_label}</td>
                <td class="fw-600">${truncate(row.display_name, 50)}</td>
                <td>${row.price}</td>
                <td>${row.original_price}</td>
                <td>${row.discount_pct}%</td>
                <td>${row.review_count}</td>
                <td>${activeBadge(row.is_active)}</td>
                <td>${actionBtns(resource, row.id)}</td></tr>`;

            case 'price-range-cards': return `<tr>
                <td>${row.order}</td>
                <td>${row.tier}</td>
                <td class="fw-600">${row.label}</td>
                <td>${row.description}</td>
                <td class="mono text-muted">${truncate(row.link_url, 30)}</td>
                <td>${row.is_dark ? 'Dark' : 'Light'}</td>
                <td>${activeBadge(row.is_active)}</td>
                <td>${actionBtns(resource, row.id)}</td></tr>`;

            case 'shop-by-price': return `<tr>
                <td>${row.order}</td>
                <td>${row.label_line1} ${row.label_line2}</td>
                <td class="mono text-muted">${truncate(row.link_url, 30)}</td>
                <td>${activeBadge(row.is_active)}</td>
                <td>${actionBtns(resource, row.id)}</td></tr>`;

            case 'testimonials': return `<tr>
                <td>${row.order}</td>
                <td class="fw-600">${row.name}</td>
                <td>${row.location || '—'}</td>
                <td>${truncate(row.product_bought, 40)}</td>
                <td>${'★'.repeat(row.rating || 5)}</td>
                <td>${activeBadge(row.is_active)}</td>
                <td>${actionBtns(resource, row.id)}</td></tr>`;

            case 'faqs': return `<tr>
                <td>${row.order}</td>
                <td>${truncate(row.question, 80)}</td>
                <td>${activeBadge(row.is_active)}</td>
                <td>${actionBtns(resource, row.id)}</td></tr>`;

            case 'stats': return `<tr>
                <td>${row.order}</td>
                <td class="fw-600">${row.label}</td>
                <td>${row.target_value}</td>
                <td>${row.suffix || '—'}</td>
                <td>${activeBadge(row.is_active)}</td>
                <td>${actionBtns(resource, row.id)}</td></tr>`;

            default: return `<tr><td colspan="8">${JSON.stringify(row)}</td></tr>`;
        }
    }

    async function loadBanners() {
        for (const [resource, tblId] of [
            ['promo-banner',  'tbl-promo'],
            ['renewed-banner','tbl-renewed'],
            ['partner-cta',   'tbl-partner'],
        ]) {
            const tbody = $(tblId);
            if (!tbody) continue;
            tbody.innerHTML = skeletonRow(4);
            const r = await api('GET', `${resource}/`);
            if (!r.success) { tbody.innerHTML = errRow(4); continue; }
            const rows = r.data || [];
            if (!rows.length) { tbody.innerHTML = emptyRow(4, resource); continue; }
            tbody.innerHTML = rows.map(row => {
                if (resource === 'promo-banner') return `<tr>
                    <td>${truncate(row.text, 80)}</td>
                    <td>${activeBadge(row.is_active)}</td>
                    <td>${actionBtns(resource, row.id)}</td></tr>`;
                if (resource === 'renewed-banner') return `<tr>
                    <td>${truncate(row.heading, 50)}</td>
                    <td>${truncate(row.subtext, 50)}</td>
                    <td>${row.cta_text}</td>
                    <td>${activeBadge(row.is_active)}</td>
                    <td>${actionBtns(resource, row.id)}</td></tr>`;
                return `<tr>
                    <td>${truncate(row.heading, 50)}</td>
                    <td>${truncate(row.subtext, 50)}</td>
                    <td>${row.btn_text}</td>
                    <td>${activeBadge(row.is_active)}</td>
                    <td>${actionBtns(resource, row.id)}</td></tr>`;
            }).join('');
        }
    }

    async function loadSectionsForFilter() {
        const r = await api('GET', 'product-sections/');
        if (!r.success) return;
        _allSections = r.data || [];
        const sel = $('item-section-filter');
        if (!sel) return;
        sel.innerHTML = '<option value="">— All Sections —</option>'
            + _allSections.map(s => `<option value="${s.id}">${s.title}</option>`).join('');
    }

    async function loadItems() {
        const tbody = $('tbl-items');
        if (!tbody) return;
        tbody.innerHTML = skeletonRow(8);
        const secId = $('item-section-filter')?.value;
        const url = secId ? `section-items/?section_id=${secId}` : 'section-items/';
        const r = await api('GET', url);
        if (!r.success) { tbody.innerHTML = errRow(8); return; }
        const rows = r.data || [];
        if (!rows.length) { tbody.innerHTML = emptyRow(8, 'Section Items'); return; }
        tbody.innerHTML = rows.map(row => renderRow('section-items', row)).join('');
    }

    // ── Modal Forms ───────────────────────────────────────────────

    const FORMS = {
        'hero-slides': (d={}) => `
            <div class="form-row-2">
                <div class="form-group"><label>Order</label><input class="input-field" name="order" type="number" value="${d.order??0}"></div>
                <div class="form-group"><label>Active</label>
                    <select class="input-field" name="is_active">
                        <option value="true" ${d.is_active!==false?'selected':''}>Yes</option>
                        <option value="false" ${d.is_active===false?'selected':''}>No</option>
                    </select>
                </div>
            </div>
            <div class="form-row-2">
                <div class="form-group"><label>Background Style</label>
                    <select class="input-field" name="bg_style">
                        ${['rc-slide-dark','rc-slide-light','rc-slide-green','rc-slide-repair'].map(v=>`<option value="${v}" ${d.bg_style===v?'selected':''}>${v}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Tag Style</label>
                    <select class="input-field" name="tag_style">
                        ${['tag-green','tag-dark','tag-light'].map(v=>`<option value="${v}" ${d.tag_style===v?'selected':''}>${v}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Tag Text</label><input class="input-field" name="tag_text" value="${d.tag_text||''}"></div>
            <div class="form-group"><label>Heading *</label><input class="input-field" name="heading" required value="${d.heading||''}"></div>
            <div class="form-group"><label>Body Text (HTML allowed)</label><textarea class="input-field" name="body_text" rows="3">${d.body_text||''}</textarea></div>
            <div class="form-row-2">
                <div class="form-group"><label>Button 1 Text</label><input class="input-field" name="btn1_text" value="${d.btn1_text||''}"></div>
                <div class="form-group"><label>Button 1 URL</label><input class="input-field" name="btn1_url" value="${d.btn1_url||''}"></div>
            </div>
            <div class="form-group"><label>Button 1 Style (CSS classes)</label><input class="input-field" name="btn1_style" value="${d.btn1_style||'btn rc-btn-primary'}"></div>
            <div class="form-row-2">
                <div class="form-group"><label>Button 2 Text</label><input class="input-field" name="btn2_text" value="${d.btn2_text||''}"></div>
                <div class="form-group"><label>Button 2 URL</label><input class="input-field" name="btn2_url" value="${d.btn2_url||''}"></div>
            </div>
            <div class="form-group"><label>Button 2 Style</label><input class="input-field" name="btn2_style" value="${d.btn2_style||'btn rc-btn-text'}"></div>
            <div class="form-group"><label>Image Max Width (e.g. 500px)</label><input class="input-field" name="image_max_width" value="${d.image_max_width||''}"></div>
            <div class="form-row-2">
                <div class="form-group"><label>Badge Top Right</label><input class="input-field" name="badge_top_right" value="${d.badge_top_right||''}"></div>
                <div class="form-group"><label>Badge Bottom Center</label><input class="input-field" name="badge_bottom_center" value="${d.badge_bottom_center||''}"></div>
            </div>
            <div class="form-group"><label>Badge Circle (e.g. Up to<br>70%<br>OFF)</label><input class="input-field" name="badge_circle" value="${d.badge_circle||''}"></div>
            <p class="text-muted fs-12">Note: Upload images via Django admin or file manager. Enter the image URL via the JSON field if needed.</p>`,

        'trust-items': (d={}) => `
            <div class="form-row-2">
                <div class="form-group"><label>Order</label><input class="input-field" name="order" type="number" value="${d.order??0}"></div>
                <div class="form-group"><label>Active</label>
                    <select class="input-field" name="is_active"><option value="true" ${d.is_active!==false?'selected':''}>Yes</option><option value="false" ${d.is_active===false?'selected':''}>No</option></select>
                </div>
            </div>
            <div class="form-group"><label>FA Icon Class (e.g. fas fa-check-circle)</label><input class="input-field" name="icon" value="${d.icon||'fas fa-check-circle'}"></div>
            <div class="form-group"><label>Title *</label><input class="input-field" name="title" required value="${d.title||''}"></div>
            <div class="form-group"><label>Subtitle</label><input class="input-field" name="subtitle" value="${d.subtitle||''}"></div>`,

        'nav-links': (d={}) => `
            <div class="form-row-2">
                <div class="form-group"><label>Order</label><input class="input-field" name="order" type="number" value="${d.order??0}"></div>
                <div class="form-group"><label>Active</label>
                    <select class="input-field" name="is_active"><option value="true" ${d.is_active!==false?'selected':''}>Yes</option><option value="false" ${d.is_active===false?'selected':''}>No</option></select>
                </div>
            </div>
            <div class="form-group"><label>Label *</label><input class="input-field" name="label" required value="${d.label||''}"></div>
            <div class="form-group"><label>URL *</label><input class="input-field" name="url" required value="${d.url||''}"></div>
            <div class="form-group"><label>Highlight Style</label>
                <select class="input-field" name="highlight_class">
                    <option value="" ${!d.highlight_class?'selected':''}>Normal</option>
                    <option value="highlight-red" ${d.highlight_class==='highlight-red'?'selected':''}>Red</option>
                    <option value="highlight-blue" ${d.highlight_class==='highlight-blue'?'selected':''}>Blue</option>
                </select>
            </div>`,

        'categories': (d={}) => `
            <div class="form-row-2">
                <div class="form-group"><label>Order</label><input class="input-field" name="order" type="number" value="${d.order??0}"></div>
                <div class="form-group"><label>Active</label>
                    <select class="input-field" name="is_active"><option value="true" ${d.is_active!==false?'selected':''}>Yes</option><option value="false" ${d.is_active===false?'selected':''}>No</option></select>
                </div>
            </div>
            <div class="form-group"><label>Category Name *</label><input class="input-field" name="name" required value="${d.name||''}"></div>
            <div class="form-group"><label>Link URL *</label><input class="input-field" name="link_url" required value="${d.link_url||''}"></div>
            <div class="form-row-2">
                <div class="form-group"><label>Badge Text</label><input class="input-field" name="badge_text" value="${d.badge_text||''}"></div>
                <div class="form-group"><label>Badge Style</label>
                    <select class="input-field" name="badge_style">
                        <option value="bg-dark" ${d.badge_style==='bg-dark'?'selected':''}>Dark</option>
                        <option value="bg-success" ${d.badge_style==='bg-success'?'selected':''}>Green</option>
                    </select>
                </div>
            </div>
            <div class="form-row-2">
                <div class="form-group"><label>Product Count (e.g. 450+)</label><input class="input-field" name="product_count" value="${d.product_count||''}"></div>
                <div class="form-group"><label>Starting Price (e.g. ₹12,999)</label><input class="input-field" name="starting_price" value="${d.starting_price||''}"></div>
            </div>`,

        'product-sections': (d={}) => `
            <div class="form-row-2">
                <div class="form-group"><label>Order</label><input class="input-field" name="order" type="number" value="${d.order??0}"></div>
                <div class="form-group"><label>Active</label>
                    <select class="input-field" name="is_active"><option value="true" ${d.is_active!==false?'selected':''}>Yes</option><option value="false" ${d.is_active===false?'selected':''}>No</option></select>
                </div>
            </div>
            <div class="form-group"><label>Title *</label><input class="input-field" name="title" required value="${d.title||''}"></div>
            <div class="form-row-2">
                <div class="form-group"><label>Section Type *</label>
                    <select class="input-field" name="section_type">
                        ${['hot_deals','end_of_year','recommended','featured','certified_iphones','certified_samsung'].map(v=>`<option value="${v}" ${d.section_type===v?'selected':''}>${v}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Background</label>
                    <select class="input-field" name="bg_style">
                        <option value="" ${!d.bg_style?'selected':''}>White</option>
                        <option value="bg-off-white" ${d.bg_style==='bg-off-white'?'selected':''}>Off White</option>
                        <option value="bg-soft-green" ${d.bg_style==='bg-soft-green'?'selected':''}>Soft Green</option>
                    </select>
                </div>
            </div>
            <div class="form-row-2">
                <div class="form-group"><label>See All URL</label><input class="input-field" name="see_all_url" value="${d.see_all_url||''}"></div>
                <div class="form-group"><label>See All Text</label><input class="input-field" name="see_all_text" value="${d.see_all_text||'See all'}"></div>
            </div>
            <div class="form-group"><label>Show Timer (Hot Deals)</label>
                <select class="input-field" name="show_timer"><option value="true" ${d.show_timer?'selected':''}>Yes</option><option value="false" ${!d.show_timer?'selected':''}>No</option></select>
            </div>
            <hr><p class="text-muted fs-12">Certified sections: promo card details</p>
            <div class="form-row-2">
                <div class="form-group"><label>Promo Badge</label><input class="input-field" name="promo_badge" value="${d.promo_badge||''}"></div>
                <div class="form-group"><label>Promo Style</label>
                    <select class="input-field" name="promo_style">
                        <option value="iphones-promo" ${d.promo_style==='iphones-promo'?'selected':''}>iPhones (dark)</option>
                        <option value="samsung-promo" ${d.promo_style==='samsung-promo'?'selected':''}>Samsung (green)</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Promo Heading</label><input class="input-field" name="promo_heading" value="${d.promo_heading||''}"></div>
            <div class="form-row-2">
                <div class="form-group"><label>Promo Button Text</label><input class="input-field" name="promo_btn_text" value="${d.promo_btn_text||''}"></div>
                <div class="form-group"><label>Promo Button URL</label><input class="input-field" name="promo_btn_url" value="${d.promo_btn_url||''}"></div>
            </div>`,

        'section-items': (d={}) => `
            <div class="form-row-2">
                <div class="form-group"><label>Section</label>
                    <select class="input-field" name="section_id">
                        ${_allSections.map(s=>`<option value="${s.id}" ${d.section_id===s.id?'selected':''}>${s.title}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Order</label><input class="input-field" name="order" type="number" value="${d.order??0}"></div>
            </div>
            <div class="form-group"><label>Active</label>
                <select class="input-field" name="is_active"><option value="true" ${d.is_active!==false?'selected':''}>Yes</option><option value="false" ${d.is_active===false?'selected':''}>No</option></select>
            </div>
            <div class="form-group"><label>ProductModel ID (from Product app)</label><input class="input-field" name="product_model_id" type="number" value="${d.product_model_id||''}"></div>
            <div class="form-group"><label>Display Name</label><input class="input-field" name="display_name" value="${d.display_name||''}"></div>
            <div class="form-row-2">
                <div class="form-group"><label>Badge Text (e.g. -54%)</label><input class="input-field" name="badge_text" value="${d.badge_text||''}"></div>
                <div class="form-group"><label>Badge Style (inline CSS)</label><input class="input-field" name="badge_style" value="${d.badge_style||''}"></div>
            </div>
            <div class="form-group"><label>Specs Text (e.g. 128GB | 6GB RAM)</label><input class="input-field" name="specs_text" value="${d.specs_text||''}"></div>
            <div class="form-row-2">
                <div class="form-group"><label>Display Price (e.g. ₹87,999)</label><input class="input-field" name="display_price" value="${d.display_price||''}"></div>
                <div class="form-group"><label>Original Price (e.g. ₹1,49,900)</label><input class="input-field" name="original_price" value="${d.original_price||''}"></div>
            </div>
            <div class="form-group"><label>Link URL</label><input class="input-field" name="link_url" value="${d.link_url||''}"></div>`,

        'spotlight': (d={}) => `
            <div class="form-group"><label>Active</label>
                <select class="input-field" name="is_active"><option value="true" ${d.is_active!==false?'selected':''}>Yes</option><option value="false" ${d.is_active===false?'selected':''}>No</option></select>
            </div>
            <div class="form-row-2">
                <div class="form-group"><label>Brand Label</label><input class="input-field" name="brand_label" value="${d.brand_label||''}"></div>
                <div class="form-group"><label>ProductModel ID</label><input class="input-field" name="product_model_id" type="number" value="${d.product_model_id||''}"></div>
            </div>
            <div class="form-group"><label>Display Name *</label><input class="input-field" name="display_name" required value="${d.display_name||''}"></div>
            <div class="form-group"><label>Specs (JSON array, e.g. ["CORE I7","16GB"])</label><textarea class="input-field" name="specs" rows="2">${JSON.stringify(d.specs||[])}</textarea></div>
            <div class="form-row-2">
                <div class="form-group"><label>Display Price *</label><input class="input-field" name="price" required value="${d.price||''}"></div>
                <div class="form-group"><label>Original Price</label><input class="input-field" name="original_price" value="${d.original_price||''}"></div>
            </div>
            <div class="form-row-2">
                <div class="form-group"><label>Discount %</label><input class="input-field" name="discount_pct" type="number" value="${d.discount_pct||0}"></div>
                <div class="form-group"><label>Save Amount (e.g. ₹32,001)</label><input class="input-field" name="save_amount" value="${d.save_amount||''}"></div>
            </div>
            <div class="form-row-2">
                <div class="form-group"><label>Review Count</label><input class="input-field" name="review_count" type="number" value="${d.review_count||0}"></div>
                <div class="form-group"><label>Available Count</label><input class="input-field" name="available_count" type="number" value="${d.available_count||0}"></div>
            </div>
            <div class="form-group"><label>Link URL</label><input class="input-field" name="link_url" value="${d.link_url||''}"></div>`,

        'price-range-cards': (d={}) => `
            <div class="form-row-2">
                <div class="form-group"><label>Order</label><input class="input-field" name="order" type="number" value="${d.order??0}"></div>
                <div class="form-group"><label>Active</label>
                    <select class="input-field" name="is_active"><option value="true" ${d.is_active!==false?'selected':''}>Yes</option><option value="false" ${d.is_active===false?'selected':''}>No</option></select>
                </div>
            </div>
            <div class="form-row-2">
                <div class="form-group"><label>Tier Label (e.g. ENTRY LEVEL)</label><input class="input-field" name="tier" value="${d.tier||''}"></div>
                <div class="form-group"><label>Price Label (e.g. Under ₹20K)</label><input class="input-field" name="label" value="${d.label||''}"></div>
            </div>
            <div class="form-group"><label>Description</label><input class="input-field" name="description" value="${d.description||''}"></div>
            <div class="form-row-2">
                <div class="form-group"><label>Link Text</label><input class="input-field" name="link_text" value="${d.link_text||'Browse →'}"></div>
                <div class="form-group"><label>Link URL</label><input class="input-field" name="link_url" value="${d.link_url||''}"></div>
            </div>
            <div class="form-group"><label>Dark Card Style</label>
                <select class="input-field" name="is_dark"><option value="true" ${d.is_dark?'selected':''}>Yes</option><option value="false" ${!d.is_dark?'selected':''}>No</option></select>
            </div>`,

        'shop-by-price': (d={}) => `
            <div class="form-row-2">
                <div class="form-group"><label>Order</label><input class="input-field" name="order" type="number" value="${d.order??0}"></div>
                <div class="form-group"><label>Active</label>
                    <select class="input-field" name="is_active"><option value="true" ${d.is_active!==false?'selected':''}>Yes</option><option value="false" ${d.is_active===false?'selected':''}>No</option></select>
                </div>
            </div>
            <div class="form-row-2">
                <div class="form-group"><label>Label Line 1 (e.g. Under)</label><input class="input-field" name="label_line1" value="${d.label_line1||''}"></div>
                <div class="form-group"><label>Label Line 2 (e.g. ₹6,999)</label><input class="input-field" name="label_line2" value="${d.label_line2||''}"></div>
            </div>
            <div class="form-group"><label>Link URL</label><input class="input-field" name="link_url" value="${d.link_url||''}"></div>`,

        'testimonials': (d={}) => `
            <div class="form-row-2">
                <div class="form-group"><label>Order</label><input class="input-field" name="order" type="number" value="${d.order??0}"></div>
                <div class="form-group"><label>Active</label>
                    <select class="input-field" name="is_active"><option value="true" ${d.is_active!==false?'selected':''}>Yes</option><option value="false" ${d.is_active===false?'selected':''}>No</option></select>
                </div>
            </div>
            <div class="form-row-2">
                <div class="form-group"><label>Initials (e.g. AK)</label><input class="input-field" name="initials" maxlength="4" value="${d.initials||''}"></div>
                <div class="form-group"><label>Rating (1-5)</label><input class="input-field" name="rating" type="number" min="1" max="5" value="${d.rating||5}"></div>
            </div>
            <div class="form-row-2">
                <div class="form-group"><label>Full Name</label><input class="input-field" name="name" value="${d.name||''}"></div>
                <div class="form-group"><label>Location</label><input class="input-field" name="location" value="${d.location||''}"></div>
            </div>
            <div class="form-row-2">
                <div class="form-group"><label>Product Bought</label><input class="input-field" name="product_bought" value="${d.product_bought||''}"></div>
                <div class="form-group"><label>Product Icon (FA class)</label><input class="input-field" name="product_icon" value="${d.product_icon||'fas fa-mobile-alt'}"></div>
            </div>
            <div class="form-group"><label>Review Text *</label><textarea class="input-field" name="review_text" rows="4" required>${d.review_text||''}</textarea></div>`,

        'faqs': (d={}) => `
            <div class="form-row-2">
                <div class="form-group"><label>Order</label><input class="input-field" name="order" type="number" value="${d.order??0}"></div>
                <div class="form-group"><label>Active</label>
                    <select class="input-field" name="is_active"><option value="true" ${d.is_active!==false?'selected':''}>Yes</option><option value="false" ${d.is_active===false?'selected':''}>No</option></select>
                </div>
            </div>
            <div class="form-group"><label>Question *</label><input class="input-field" name="question" required value="${d.question||''}"></div>
            <div class="form-group"><label>Answer * (HTML allowed)</label><textarea class="input-field" name="answer" rows="5" required>${d.answer||''}</textarea></div>`,

        'stats': (d={}) => `
            <div class="form-row-2">
                <div class="form-group"><label>Order</label><input class="input-field" name="order" type="number" value="${d.order??0}"></div>
                <div class="form-group"><label>Active</label>
                    <select class="input-field" name="is_active"><option value="true" ${d.is_active!==false?'selected':''}>Yes</option><option value="false" ${d.is_active===false?'selected':''}>No</option></select>
                </div>
            </div>
            <div class="form-group"><label>Label *</label><input class="input-field" name="label" required value="${d.label||''}"></div>
            <div class="form-row-2">
                <div class="form-group"><label>Target Value (e.g. 12000)</label><input class="input-field" name="target_value" type="number" step="any" value="${d.target_value||0}"></div>
                <div class="form-group"><label>Decimals (0 = integer)</label><input class="input-field" name="decimals" type="number" value="${d.decimals||0}"></div>
            </div>
            <div class="form-group"><label>Suffix (e.g. + or %)</label><input class="input-field" name="suffix" value="${d.suffix||''}"></div>`,

        'promo-banner': (d={}) => `
            <div class="form-group"><label>Active</label>
                <select class="input-field" name="is_active"><option value="true" ${d.is_active!==false?'selected':''}>Yes</option><option value="false" ${d.is_active===false?'selected':''}>No</option></select>
            </div>
            <div class="form-group"><label>Banner Text *</label><input class="input-field" name="text" required value="${d.text||''}"></div>`,

        'renewed-banner': (d={}) => `
            <div class="form-group"><label>Active</label>
                <select class="input-field" name="is_active"><option value="true" ${d.is_active!==false?'selected':''}>Yes</option><option value="false" ${d.is_active===false?'selected':''}>No</option></select>
            </div>
            <div class="form-group"><label>Heading</label><input class="input-field" name="heading" value="${d.heading||''}"></div>
            <div class="form-group"><label>Subtext</label><input class="input-field" name="subtext" value="${d.subtext||''}"></div>
            <div class="form-group"><label>CTA Text</label><input class="input-field" name="cta_text" value="${d.cta_text||''}"></div>`,

        'partner-cta': (d={}) => `
            <div class="form-group"><label>Active</label>
                <select class="input-field" name="is_active"><option value="true" ${d.is_active!==false?'selected':''}>Yes</option><option value="false" ${d.is_active===false?'selected':''}>No</option></select>
            </div>
            <div class="form-group"><label>Heading</label><input class="input-field" name="heading" value="${d.heading||''}"></div>
            <div class="form-group"><label>Subtext</label><input class="input-field" name="subtext" value="${d.subtext||''}"></div>
            <div class="form-row-2">
                <div class="form-group"><label>Button Text</label><input class="input-field" name="btn_text" value="${d.btn_text||'Apply Now'}"></div>
                <div class="form-group"><label>Button URL</label><input class="input-field" name="btn_url" value="${d.btn_url||'/partner-application'}"></div>
            </div>`,
    };

    // ── Modal open / save / close ─────────────────────────────────

    function openModal(resource, data) {
        _modalResource = resource;
        _modalEditId   = data?.id || null;
        const formFn   = FORMS[resource];
        if (!formFn) return alert('No form defined for: ' + resource);
        $('hp-modal-title').textContent = (_modalEditId ? 'Edit' : 'Add') + ' — ' + resource;
        $('hp-modal-body').innerHTML = `<form id="hp-modal-form">${formFn(data || {})}</form>`;
        $('hp-modal-overlay').style.display = '';
        $('hp-modal-drawer').style.display  = '';
    }

    async function edit(resource, id) {
        const r = await api('GET', `${resource}/${id}/`);
        if (!r.success) return alert('Failed to load record');
        openModal(resource, r.data);
    }

    async function del(resource, id) {
        if (!confirm('Delete this record?')) return;
        const r = await api('DELETE', `${resource}/${id}/`);
        if (!r.success) return alert('Delete failed: ' + r.error);
        closeModal();
        refreshCurrentTab();
    }

    async function saveModal() {
        const form = $('hp-modal-form');
        if (!form) return;

        // Collect all form fields
        const body = {};
        form.querySelectorAll('[name]').forEach(el => {
            const k = el.name, v = el.value;
            // Coerce booleans
            if (v === 'true')  body[k] = true;
            else if (v === 'false') body[k] = false;
            // Coerce numbers for known number fields
            else if (el.type === 'number') body[k] = v === '' ? null : parseFloat(v);
            // Parse JSON fields
            else if (el.tagName === 'TEXTAREA' && k === 'specs') {
                try { body[k] = JSON.parse(v); } catch { body[k] = []; }
            }
            else body[k] = v;
        });

        const method = _modalEditId ? 'PUT' : 'POST';
        const path   = _modalEditId ? `${_modalResource}/${_modalEditId}/` : `${_modalResource}/`;
        const r = await api(method, path, body);
        if (!r.success) return alert('Save failed: ' + (r.error || JSON.stringify(r)));
        closeModal();
        refreshCurrentTab();
    }

    function closeModal() {
        $('hp-modal-overlay').style.display = 'none';
        $('hp-modal-drawer').style.display  = 'none';
        _modalResource = null;
        _modalEditId   = null;
    }

    function refreshCurrentTab() {
        switchTab(_activeTab);
    }

    // ── Skeleton helpers ──────────────────────────────────────────
    function skeletonRow(cols) {
        return `<tr><td colspan="${cols}" style="padding:32px;text-align:center;">
            <div class="skeleton" style="height:12px;width:50%;margin:0 auto 8px;"></div>
            <div class="skeleton" style="height:12px;width:35%;margin:0 auto;"></div>
        </td></tr>`;
    }
    function emptyRow(cols, label) {
        return `<tr><td colspan="${cols}"><div class="empty-state"><i class="fa-solid fa-inbox"></i><h4>No ${label} found</h4></div></td></tr>`;
    }
    function errRow(cols) {
        return `<tr><td colspan="${cols}"><div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><h4>Failed to load</h4></div></td></tr>`;
    }

    // ── Public API ────────────────────────────────────────────────
    return { init, switchTab, openModal, edit, del, saveModal, closeModal, loadItems };

})();

// ── Tab button CSS (injected) ─────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
.hp-tab-btn {
    background: none; border: none; padding: 12px 18px;
    font-size: 0.875rem; font-weight: 500; color: var(--text-secondary);
    cursor: pointer; white-space: nowrap; border-bottom: 2px solid transparent;
    transition: all 0.2s;
}
.hp-tab-btn:hover { color: var(--text-primary); background: var(--hover-bg); }
.hp-tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media(max-width:600px) { .form-row-2 { grid-template-columns: 1fr; } }
.modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    z-index: 1000; backdrop-filter: blur(2px);
}
.modal-drawer {
    position: fixed; top: 0; right: 0; width: min(540px, 100vw);
    height: 100vh; background: var(--surface); z-index: 1001;
    display: flex; flex-direction: column; box-shadow: -8px 0 32px rgba(0,0,0,0.15);
}
.modal-drawer-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid var(--border-light);
}
.modal-drawer-body {
    flex: 1; overflow-y: auto; padding: 20px;
    display: flex; flex-direction: column; gap: 14px;
}
.modal-drawer-body form { display: flex; flex-direction: column; gap: 14px; }
.modal-drawer-footer {
    display: flex; gap: 10px; justify-content: flex-end;
    padding: 14px 20px; border-top: 1px solid var(--border-light);
}
`;
document.head.appendChild(style);
