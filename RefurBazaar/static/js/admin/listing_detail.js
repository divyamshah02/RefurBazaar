'use strict';
/* listing_detail.js — completely rewritten */

let _ldCsrf, _ldUrls, _ldId;

const LD_STATUS = {
  active:   { label:'Active',   cls:'badge-green'  },
  draft:    { label:'Draft',    cls:'badge-gray'   },
  sold:     { label:'Sold Out', cls:'badge-orange' },
  inactive: { label:'Inactive', cls:'badge-red'    },
};

function InitListingDetail(csrf, lid, urls) {
  _ldCsrf = csrf; _ldId = lid; _ldUrls = urls;
  loadDetail();
}

async function loadDetail() {
  const [ok, res] = await callApi('GET', _ldUrls.detailUrl, null, _ldCsrf);
  if (!ok || !res.success) { showToast('Failed to load listing', 'error'); return; }
  renderListing(res.data);
}

function renderListing(l) {
  const brand  = l.brand_name  || l.brand  || '—';
  const model  = l.model_name  || l.model  || '—';
  const title  = `${brand} ${model}`.trim();
  const s      = l.status || 'draft';
  const m      = LD_STATUS[s] || { label: s, cls:'badge-gray' };
  const lid    = l.listing_id || l.id;

  set('ld-name-crumb', title);
  document.getElementById('ld-status-badge').innerHTML = `<span class="badge ${m.cls}">${m.label}</span>`;

  // price — derive from cheapest available unit (no top-level price field)
  const unitPrices = (l.units || []).map(u => parseFloat(u.price)).filter(p => !isNaN(p));
  const priceStr   = unitPrices.length ? fmtCurrency(Math.min(...unitPrices)) : '—';

  set('ld-brand',    brand);
  set('ld-model',    model);
  set('ld-category', capFirst(l.category_display || l.category || '—'));
  set('ld-grade',    l.grade || '—');
  set('ld-price',    priceStr);
  set('ld-units',    l.total_quantity ?? '—');

  const attrsEl = document.getElementById('ld-attrs');
  const attrs   = l.attributes || l.specs || [];
  if (attrs.length) {
    attrsEl.innerHTML = attrs.map(a =>
      `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:var(--bg);border:1px solid var(--border);border-radius:20px;font-size:12px;">
        <span style="color:var(--text-muted)">${a.attribute_name||a.name||''}:</span>
        <span class="fw-600">${a.value||'—'}</span>
      </span>`
    ).join('');
  }

  set('ld-imei',      l.imei_number || l.imei || '—');
  set('ld-condition', l.condition_notes || l.condition || '—');
  set('ld-warranty',  l.warranty || '—');

  const photosEl = document.getElementById('ld-photos');
  const photos   = l.photos || l.images || [];
  if (photos.length) {
    photosEl.innerHTML = photos.map(p => {
      const url = typeof p === 'string' ? p : (p.url || p.image || '#');
      return `<img src="${url}" alt="Device photo" class="photo-thumb" onclick="openLightbox('${url}')" />`;
    }).join('');
  }

  set('ld-description', l.description || l.notes || 'No description provided.');

  const rf      = l.refurbisher || {};
  const rfName  = `${rf.first_name||l.refurbisher_first_name||''} ${rf.last_name||l.refurbisher_last_name||''}`.trim() || '—';
  const rfColor = avatarColor(rfName);
  const rfInit  = rfName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const rfId    = rf.user_id || rf.id || l.refurbisher_id || '';
  const rfAv    = document.getElementById('ld-rf-avatar');
  rfAv.textContent = rfInit; rfAv.style.background = rfColor;
  set('ld-rf-name',  rfName);
  set('ld-rf-biz',   rf.business_name || rf.company_name || '—');
  set('ld-rf-phone', rf.contact_number || rf.phone || '—');
  set('ld-rf-email', rf.email || '—');
  if (rfId) document.getElementById('ld-rf-link').href = `/admin-refurbisher-detail/${rfId}/`;

  set('ld-id', lid);
  document.getElementById('ld-meta-status').innerHTML = `<span class="badge ${m.cls}">${m.label}</span>`;
  set('ld-created', fmtDateTime(l.created_at));
  set('ld-updated', fmtDateTime(l.updated_at));
}

function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  openModal('lightbox');
}

function set(id, v) { const el=document.getElementById(id); if(el) el.textContent=v; }
function capFirst(s) { return s ? s.charAt(0).toUpperCase()+s.slice(1) : '—'; }

