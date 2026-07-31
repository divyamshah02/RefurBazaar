'use strict';
/* listing_detail.js */

let _ldCsrf, _ldUrls, _ldId;

const LD_STATUS = {
  active:   { label: 'Active',    cls: 'badge-green'  },
  draft:    { label: 'Draft',     cls: 'badge-gray'   },
  sold:     { label: 'Sold Out',  cls: 'badge-orange' },
  inactive: { label: 'Inactive',  cls: 'badge-red'    },
};

const UNIT_CONDITION = {
  excellent: { label: 'Excellent', cls: 'badge-green'  },
  good:      { label: 'Good',      cls: 'badge-blue'   },
  fair:      { label: 'Fair',      cls: 'badge-yellow' },
  poor:      { label: 'Poor',      cls: 'badge-red'    },
};

function InitListingDetail(csrf, lid, urls) {
  _ldCsrf = csrf; _ldId = lid; _ldUrls = urls;
  loadDetail();
}

async function loadDetail() {
  const [ok, res] = await callApi('GET', _ldUrls.detailUrl, null, _ldCsrf);
  if (!ok || !res.success) {
    showToast('Failed to load listing', 'error');
    document.getElementById('ld-units-tbody').innerHTML =
      `<tr><td colspan="6" style="padding:32px;text-align:center">
        <span class="text-muted fs-13">Failed to load listing data.</span>
      </td></tr>`;
    return;
  }
  renderListing(res.data);
}

/* ─── Main render ────────────────────────────────────────────────── */
function renderListing(l) {
  const brand = l.brand_name || '—';
  const model = l.model_name || '—';
  const title = `${brand} ${model}`.trim();
  const s     = l.status || 'draft';
  const m     = LD_STATUS[s] || { label: s, cls: 'badge-gray' };
  const lid   = l.listing_id || l.id;

  /* Breadcrumb + status badge */
  set('ld-name-crumb', title);
  document.getElementById('ld-status-badge').innerHTML =
    `<span class="badge ${m.cls}">${m.label}</span>`;

  /* Product identity */
  set('ld-brand',    brand);
  set('ld-model',    model);
  set('ld-category', capFirst(l.category_display || l.category || '—'));
  set('ld-units',    l.total_quantity ?? '—');

  /* Derive price and availability from units array */
  const units        = l.units || [];
  const prices       = units.map(u => parseFloat(u.price)).filter(p => !isNaN(p));
  const priceStr     = prices.length ? fmtCurrency(Math.min(...prices)) : '—';
  const availCount   = units.filter(u => u.is_available && !u.is_sold).length;
  const soldCount    = units.filter(u => u.is_sold).length;
  const holdCount    = units.filter(u => !u.is_available && !u.is_sold).length;

  set('ld-price',         priceStr);
  set('ld-available',     availCount);
  set('ld-sum-total',     units.length);
  set('ld-sum-available', availCount);
  set('ld-sum-sold',      soldCount);
  set('ld-sum-hold',      holdCount);

  /* Listing metadata */
  set('ld-id', lid);
  document.getElementById('ld-meta-status').innerHTML =
    `<span class="badge ${m.cls}">${m.label}</span>`;
  set('ld-created', fmtDateTime(l.created_at));
  set('ld-updated', fmtDateTime(l.updated_at));

  /* Refurbisher */
  const rfFirst   = l.refurbisher_first_name || '';
  const rfLast    = l.refurbisher_last_name  || '';
  const rfName    = `${rfFirst} ${rfLast}`.trim() || '—';
  const rfId      = l.refurbisher_id || l.refurbisher || '';
  const rfBiz     = l.refurbisher_company || '—';
  const rfPhone   = l.refurbisher_phone   || '—';
  const rfEmail   = l.refurbisher_email   || '—';
  const rfColor   = avatarColor(rfName);
  const rfInit    = rfName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const rfAv      = document.getElementById('ld-rf-avatar');
  rfAv.textContent = rfInit;
  rfAv.style.background = rfColor;
  set('ld-rf-name',  rfName);
  set('ld-rf-biz',   rfBiz);
  set('ld-rf-phone', rfPhone);
  set('ld-rf-email', rfEmail);
  if (rfId) {
    document.getElementById('ld-rf-link').href = `/admin-refurbisher-detail/${rfId}/`;
  }

  /* Units table */
  renderUnits(units);
}

/* ─── Units table ────────────────────────────────────────────────── */
function renderUnits(units) {
  const tbody      = document.getElementById('ld-units-tbody');
  const countBadge = document.getElementById('ld-unit-count');

  countBadge.textContent = `${units.length} unit${units.length !== 1 ? 's' : ''}`;

  if (!units.length) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <i class="fa-solid fa-box-open"></i>
        <h4>No units recorded</h4>
        <p>This listing has no units added yet.</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = units.map(u => {
    const condMap  = UNIT_CONDITION[u.condition] || { label: capFirst(u.condition || '—'), cls: 'badge-gray' };
    const attrs    = u.attributes || [];

    /* Build availability status badge */
    let statusBadge;
    if (u.is_sold) {
      statusBadge = `<span class="badge badge-red">Sold</span>`;
    } else if (!u.is_available) {
      statusBadge = `<span class="badge badge-orange">On Hold</span>`;
    } else {
      statusBadge = `<span class="badge badge-green">Available</span>`;
    }

    /* Attribute chips for this unit */
    const attrChips = attrs.length
      ? attrs.map(a =>
          `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:var(--bg);border:1px solid var(--border-light);border-radius:20px;font-size:11px;white-space:nowrap;">
            <span style="color:var(--text-muted)">${a.attribute_name || ''}:</span>
            <span class="fw-600">${a.value || '—'}</span>
          </span>`
        ).join('')
      : `<span class="text-muted fs-12">—</span>`;

    return `<tr>
      <td class="fw-600 mono">#${u.unit_number ?? '—'}</td>
      <td class="fw-600">${u.price ? fmtCurrency(parseFloat(u.price)) : '—'}</td>
      <td><span class="badge ${condMap.cls}">${condMap.label}</span></td>
      <td>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${attrChips}
        </div>
      </td>
      <td>${statusBadge}</td>
      <td class="text-muted fs-12">${fmtDate(u.created_at)}</td>
    </tr>`;
  }).join('');
}

/* ─── Lightbox ───────────────────────────────────────────────────── */
function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  openModal('lightbox');
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function set(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}
function capFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
}
