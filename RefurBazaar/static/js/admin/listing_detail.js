'use strict';
/* listing_detail.js — admin listing view with full editing of units, pricing and attributes */

let _ldCsrf, _ldUrls, _ldId, _ldData = null, _editingUnitId = null;

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

function ldEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function InitListingDetail(csrf, lid, urls) {
  _ldCsrf = csrf; _ldId = lid; _ldUrls = urls;
  loadDetail();
}

async function loadDetail() {
  const [ok, res] = await callApi('GET', _ldUrls.manageUrl, null, _ldCsrf);
  if (!ok || !res.success) {
    showToast('Failed to load listing', 'error');
    document.getElementById('ld-units-tbody').innerHTML =
      `<tr><td colspan="8" style="padding:32px;text-align:center"><span class="text-muted fs-13">Failed to load listing data.</span></td></tr>`;
    return;
  }
  renderListing(res.data);
}

/* ─── Main render ────────────────────────────────────────────────── */
function renderListing(l) {
  _ldData = l;
  const brand = l.brand_name || '—';
  const model = l.model_name || '—';
  const title = `${brand} ${model}`.trim();
  const s     = l.status || 'draft';
  const m     = LD_STATUS[s] || { label: s, cls: 'badge-gray' };
  const lid   = l.listing_id || l.id;

  set('ld-name-crumb', title);
  document.getElementById('ld-status-badge').innerHTML = `<span class="badge ${m.cls}">${m.label}</span>`;

  set('ld-brand',    brand);
  set('ld-model',    model);
  set('ld-category', capFirst(l.category_display || l.category || '—'));
  set('ld-units',    l.total_quantity ?? '—');

  const units      = l.units || [];
  const prices     = units.map(u => parseFloat(u.price)).filter(p => !isNaN(p));
  const availCount = units.filter(u => u.is_available && !u.is_sold).length;
  const soldCount  = units.filter(u => u.is_sold).length;
  const holdCount  = units.filter(u => !u.is_available && !u.is_sold).length;

  set('ld-price',         prices.length ? fmtCurrency(Math.min(...prices)) : '—');
  set('ld-available',     availCount);
  set('ld-sum-total',     units.length);
  set('ld-sum-available', availCount);
  set('ld-sum-sold',      soldCount);
  set('ld-sum-hold',      holdCount);

  set('ld-id', lid);
  const statuses = (l.meta && l.meta.statuses && l.meta.statuses.length)
    ? l.meta.statuses : Object.entries(LD_STATUS).map(([value, v]) => ({ value, label: v.label }));
  const sel = document.getElementById('ld-status-select');
  sel.innerHTML = statuses.map(o => `<option value="${ldEsc(o.value)}">${ldEsc(o.label)}</option>`).join('');
  sel.value = s;
  set('ld-created', fmtDateTime(l.created_at));
  set('ld-updated', fmtDateTime(l.updated_at));

  const rfName  = `${l.refurbisher_first_name || ''} ${l.refurbisher_last_name || ''}`.trim() || '—';
  const rfId    = l.refurbisher_id || l.refurbisher || '';
  const rfAv    = document.getElementById('ld-rf-avatar');
  rfAv.textContent = rfName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  rfAv.style.background = avatarColor(rfName);
  set('ld-rf-name',  rfName);
  set('ld-rf-biz',   l.refurbisher_company || '—');
  set('ld-rf-phone', l.refurbisher_phone || '—');
  set('ld-rf-email', l.refurbisher_email || '—');
  if (rfId) document.getElementById('ld-rf-link').href = `/admin-refurbisher-detail/${rfId}/`;

  renderUnits(units);
}

/* ─── Units table ────────────────────────────────────────────────── */
function commissionLabel(u) {
  const type = u.effective_commission_type, val = u.effective_commission_value;
  const rule = type === 'flat' ? fmtCurrency(val) + ' flat' : `${parseFloat(val)}%`;
  return `<div class="fw-600">${fmtCurrency(parseFloat(u.platform_commission || 0))}</div>
          <div class="text-muted fs-12">${rule} · ${u.commission_source === 'unit' ? 'custom' : 'category'}</div>`;
}

function renderUnits(units) {
  const tbody = document.getElementById('ld-units-tbody');
  document.getElementById('ld-unit-count').textContent = `${units.length} unit${units.length !== 1 ? 's' : ''}`;

  if (!units.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <i class="fa-solid fa-box-open"></i><h4>No units recorded</h4><p>Use "Add unit" to create one.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = units.map(u => {
    const cond = UNIT_CONDITION[u.condition] || { label: capFirst(u.condition || '—'), cls: 'badge-gray' };
    const attrs = u.attributes || [];
    const statusBadge = u.is_sold ? `<span class="badge badge-red">Sold</span>`
      : !u.is_available ? `<span class="badge badge-orange">On Hold</span>`
      : `<span class="badge badge-green">Available</span>`;
    const chips = attrs.length
      ? attrs.map(a => `<span style="display:inline-flex;gap:4px;padding:2px 8px;background:var(--bg);border:1px solid var(--border-light);border-radius:20px;font-size:11px;white-space:nowrap">
            <span style="color:var(--text-muted)">${ldEsc(a.attribute_name)}:</span><span class="fw-600">${ldEsc(a.value)}</span></span>`).join('')
      : `<span class="text-muted fs-12">—</span>`;

    return `<tr>
      <td class="fw-600 mono">#${u.unit_number ?? '—'}</td>
      <td class="fw-600">${fmtCurrency(parseFloat(u.refurbisher_price ?? u.price))}</td>
      <td>${commissionLabel(u)}</td>
      <td class="fw-600">${fmtCurrency(parseFloat(u.price))}</td>
      <td><span class="badge ${cond.cls}">${cond.label}</span></td>
      <td><div style="display:flex;flex-wrap:wrap;gap:4px">${chips}</div></td>
      <td>${statusBadge}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn btn-icon btn-sm" title="Edit unit" onclick="openUnitModal(${u.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-icon btn-sm" title="Delete unit" onclick="deleteUnit(${u.id})"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

/* ─── Unit editor ────────────────────────────────────────────────── */
function openUnitModal(unitId) {
  if (!_ldData) return;
  _editingUnitId = unitId;
  const meta = _ldData.meta || {};
  const unit = unitId ? (_ldData.units || []).find(u => u.id === unitId) : null;

  set('mu-title', unit ? `Edit unit #${unit.unit_number}` : 'Add unit');
  document.getElementById('mu-condition').innerHTML =
    (meta.conditions || []).map(c => `<option value="${ldEsc(c.value)}">${ldEsc(c.label)}</option>`).join('');

  document.getElementById('mu-price').value     = unit ? (unit.refurbisher_price ?? unit.price) : '';
  document.getElementById('mu-condition').value = unit ? unit.condition : 'good';
  document.getElementById('mu-ctype').value     = unit && unit.commission_type ? unit.commission_type : 'default';
  document.getElementById('mu-cvalue').value    = unit && unit.commission_value != null ? unit.commission_value : '';
  document.getElementById('mu-available').checked = unit ? !!unit.is_available : true;
  document.getElementById('mu-sold').checked      = unit ? !!unit.is_sold : false;

  const current = {};
  (unit?.attributes || []).forEach(a => { current[a.attribute] = a.value; });
  document.getElementById('mu-attrs').innerHTML = (meta.attribute_defs || []).map(d => {
    const val = current[d.attribute_id] ?? (unit ? '' : (d.default_value || ''));
    const label = `${ldEsc(d.name)}${d.is_required ? ' <span style="color:var(--red)">*</span>' : ''}`;
    const field = (d.data_type === 'choice' && Array.isArray(d.possible_values) && d.possible_values.length)
      ? `<select class="form-select mu-attr" data-attr="${d.attribute_id}"><option value="">—</option>${
          d.possible_values.map(v => `<option value="${ldEsc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${ldEsc(v)}</option>`).join('')}</select>`
      : `<input class="form-input mu-attr" data-attr="${d.attribute_id}" value="${ldEsc(val)}" />`;
    return `<div class="form-group" style="margin:0"><label class="form-label">${label}</label>${field}</div>`;
  }).join('') || `<div class="text-muted fs-12">This product model has no attributes.</div>`;

  updateUnitPreview();
  openModal('modal-unit');
}

function updateUnitPreview() {
  const meta = (_ldData && _ldData.meta) || {};
  const price = parseFloat(document.getElementById('mu-price').value) || 0;
  const ctype = document.getElementById('mu-ctype').value;
  const cval  = parseFloat(document.getElementById('mu-cvalue').value) || 0;
  document.getElementById('mu-cvalue').disabled = ctype === 'default';

  let type, value, source;
  if (ctype === 'default') {
    type = meta.category_commission?.type || 'percentage';
    value = parseFloat(meta.category_commission?.value) || 0;
    source = 'Category default';
  } else { type = ctype; value = cval; source = 'Custom for this unit'; }

  const com = type === 'flat' ? value : price * value / 100;
  set('mu-pv-ref', fmtCurrency(price));
  set('mu-pv-com', fmtCurrency(com));
  set('mu-pv-total', fmtCurrency(price + com));
  set('mu-pv-rule', `${source}: ${type === 'flat' ? fmtCurrency(value) + ' flat' : value + '%'}`);
}

async function saveUnit() {
  const price = document.getElementById('mu-price').value;
  if (price === '' || parseFloat(price) <= 0) { showToast('Enter a refurbisher price greater than 0', 'warning'); return; }

  const ctype = document.getElementById('mu-ctype').value;
  if (ctype !== 'default' && document.getElementById('mu-cvalue').value === '') {
    showToast('Enter a commission value or use the category default', 'warning'); return;
  }

  const attributes = [...document.querySelectorAll('.mu-attr')].map(el => ({ attribute_id: parseInt(el.dataset.attr, 10), value: el.value }));
  const missing = (_ldData.meta.attribute_defs || []).filter(d => d.is_required &&
    !attributes.find(a => a.attribute_id === d.attribute_id && String(a.value).trim()));
  if (missing.length) { showToast(`Fill in: ${missing.map(m => m.name).join(', ')}`, 'warning'); return; }

  const body = {
    refurbisher_price: price,
    condition: document.getElementById('mu-condition').value,
    commission_type: ctype,
    commission_value: ctype === 'default' ? null : document.getElementById('mu-cvalue').value,
    is_available: document.getElementById('mu-available').checked,
    is_sold: document.getElementById('mu-sold').checked,
    attributes,
  };

  const btn = document.getElementById('mu-save');
  btn.disabled = true;
  const url = _editingUnitId ? `${_ldUrls.manageUrl}units/${_editingUnitId}/` : `${_ldUrls.manageUrl}add-unit/`;
  const [ok, res] = await callApi(_editingUnitId ? 'PATCH' : 'POST', url, body, _ldCsrf);
  btn.disabled = false;
  if (!ok || !res.success) { showToast(res?.error || 'Could not save unit', 'error'); return; }
  closeModal('modal-unit');
  showToast(_editingUnitId ? 'Unit updated' : 'Unit added', 'success');
  renderListing(res.data);
}

async function deleteUnit(unitId) {
  const unit = _ldData.units.find(u => u.id === unitId);
  if (!confirm(`Delete unit #${unit.unit_number}? This cannot be undone.`)) return;
  const [ok, res] = await callApi('DELETE', `${_ldUrls.manageUrl}units/${unitId}/`, null, _ldCsrf);
  if (!ok || !res.success) { showToast(res?.error || 'Could not delete unit', 'error'); return; }
  showToast('Unit deleted', 'success');
  renderListing(res.data);
}

/* ─── Listing-level actions ──────────────────────────────────────── */
async function saveListingStatus() {
  const btn = document.getElementById('ld-status-save');
  btn.disabled = true;
  const [ok, res] = await callApi('PATCH', _ldUrls.manageUrl, { status: document.getElementById('ld-status-select').value }, _ldCsrf);
  btn.disabled = false;
  if (!ok || !res.success) { showToast(res?.error || 'Could not update status', 'error'); return; }
  showToast('Status updated', 'success');
  renderListing(res.data);
}

async function deleteListing() {
  if (!confirm('Delete this listing and all of its units permanently?')) return;
  const [ok, res] = await callApi('DELETE', _ldUrls.manageUrl, null, _ldCsrf);
  if (!ok || !res.success) { showToast(res?.error || 'Could not delete listing', 'error'); return; }
  window.location.href = '/admin-listings/';
}

/* ─── Lightbox & helpers ─────────────────────────────────────────── */
function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  openModal('lightbox');
}
function set(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}
function capFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
}
