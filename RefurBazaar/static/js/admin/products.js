'use strict';
/* products.js — default product catalog */

let _prCsrf, _prUrls, _prAll = [], _prFiltered = [], _prPage = 1;
const _prPageSize = 25;
let _prBrands = [], _prAttrs = [];

const CAT_LABELS = { mobile: 'Mobile', laptop: 'Laptop', tablet: 'Tablet', accessory: 'Accessory' };

/* ─── Entry ─────────────────────────────────────────────────────── */
function InitProducts(csrf, urls) {
  _prCsrf = csrf; _prUrls = urls;
  loadBrandsForFilter();
  loadProducts();

  let debounce;
  document.getElementById('q').addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { _prPage = 1; applyFilter(); }, 280);
  });
  document.getElementById('f-category').addEventListener('change', () => { _prPage = 1; applyFilter(); });
  document.getElementById('f-brand').addEventListener('change', () => { _prPage = 1; applyFilter(); });
  document.getElementById('f-active').addEventListener('change', () => { _prPage = 1; applyFilter(); });

  // When category changes in modal, reload attr options
  document.getElementById('mprod-category').addEventListener('change', () => {
    loadAttrsForModal(document.getElementById('mprod-category').value);
  });
}

/* ─── Load brands for filter + modal ───────────────────────────── */
async function loadBrandsForFilter() {
  const [ok, res] = await callApi('GET', _prUrls.brandsUrl, null, _prCsrf);
  if (!ok || !res.success) return;
  _prBrands = res.data || [];
  const sel = document.getElementById('f-brand');
  const msel = document.getElementById('mprod-brand');
  const opts = _prBrands.filter(b => b.is_active).map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  sel.innerHTML += opts;
  msel.innerHTML = `<option value="">Select brand…</option>` + opts;
}

/* ─── Load products ─────────────────────────────────────────────── */
async function loadProducts() {
  const body = document.getElementById('tbl-body');
  body.innerHTML = `<tr><td colspan="7" style="padding:36px;text-align:center">
    <div class="skeleton" style="height:13px;width:50%;margin:0 auto 10px"></div>
    <div class="skeleton" style="height:13px;width:35%;margin:0 auto"></div>
  </td></tr>`;

  const [ok, res] = await callApi('GET', _prUrls.listUrl, null, _prCsrf);
  if (!ok || !res.success) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><h4>Failed to load products</h4></div></td></tr>`;
    return;
  }
  _prAll = res.data || [];
  set('s-total', _prAll.length.toLocaleString('en-IN'));
  set('s-active', _prAll.filter(p => p.is_active).length.toLocaleString('en-IN'));
  set('s-mobile', _prAll.filter(p => p.category === 'mobile').length.toLocaleString('en-IN'));
  set('s-laptop', _prAll.filter(p => p.category === 'laptop').length.toLocaleString('en-IN'));
  set('s-tablet', _prAll.filter(p => p.category === 'tablet').length.toLocaleString('en-IN'));
  applyFilter();
}

/* ─── Filter ────────────────────────────────────────────────────── */
function applyFilter() {
  const q = document.getElementById('q').value.toLowerCase();
  const cat = document.getElementById('f-category').value;
  const bid = document.getElementById('f-brand').value;
  const act = document.getElementById('f-active').value;
  _prFiltered = _prAll.filter(p => {
    if (q && !(p.name || '').toLowerCase().includes(q) && !(p.brand_name || '').toLowerCase().includes(q)) return false;
    if (cat && p.category !== cat) return false;
    if (bid && String(p.brand) !== bid && String(p.brand_id) !== bid) return false;
    if (act === 'true' && !p.is_active) return false;
    if (act === 'false' && p.is_active) return false;
    return true;
  });
  renderTable();
}

/* ─── Render ────────────────────────────────────────────────────── */
function renderTable() {
  const tbody = document.getElementById('tbl-body');
  const start = (_prPage - 1) * _prPageSize;
  const slice = _prFiltered.slice(start, start + _prPageSize);

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-box"></i><h4>No products found</h4><p>Try adjusting your filters or add a product</p></div></td></tr>`;
    renderPag(); return;
  }
  tbody.innerHTML = slice.map(p => {
    const attrCount = p.model_attributes?.length ?? p.attribute_count ?? 0;
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          ${p.image
        ? `<img src="${p.image}" alt="${p.name}" style="width:36px;height:36px;object-fit:contain;border-radius:6px;border:1px solid var(--border)">`
        : `<div style="width:36px;height:36px;border-radius:6px;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-box" style="color:var(--text-muted);font-size:13px"></i></div>`
      }
          <span class="fw-600">${p.name}</span>
        </div>
      </td>
      <td>${p.brand_name || '—'}</td>
      <td><span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted)">${CAT_LABELS[p.category] || p.category || '—'}</span></td>
      <td class="text-muted">${p.release_year || '—'}</td>
      <td class="text-muted">${attrCount} attrs</td>
      <td><span class="badge ${p.is_active ? 'badge-green' : 'badge-gray'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <button class="btn btn-ghost btn-sm" onclick="editProduct(${p.id})"><i class="fa-solid fa-pen"></i> Edit</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  renderPag();
}

/* ─── Pagination ────────────────────────────────────────────────── */
function renderPag() {
  const total = _prFiltered.length;
  const pages = Math.ceil(total / _prPageSize);
  const info = document.getElementById('pag-info');
  const btns = document.getElementById('pag-btns');
  const start = (_prPage - 1) * _prPageSize + 1;
  const end = Math.min(_prPage * _prPageSize, total);
  info.textContent = total ? `Showing ${start}–${end} of ${total}` : '';
  if (pages <= 1) { btns.innerHTML = ''; return; }
  btns.innerHTML = `
    <button class="btn btn-ghost btn-sm" ${_prPage === 1 ? 'disabled' : ''} onclick="_prPage--;renderTable()"><i class="fa-solid fa-chevron-left"></i></button>
    <span class="text-muted fs-12" style="padding:0 6px;line-height:30px">Page ${_prPage} of ${pages}</span>
    <button class="btn btn-ghost btn-sm" ${_prPage >= pages ? 'disabled' : ''} onclick="_prPage++;renderTable()"><i class="fa-solid fa-chevron-right"></i></button>`;
}

/* ─── Create / Edit modal ───────────────────────────────────────── */
function openCreateProduct() {
  set('mprod-title', 'Add Product');
  document.getElementById('mprod-id').value = '';
  document.getElementById('mprod-brand').value = '';
  document.getElementById('mprod-category').value = '';
  document.getElementById('mprod-name').value = '';
  document.getElementById('mprod-year').value = '';
  document.getElementById('mprod-desc').value = '';
  document.getElementById('mprod-active').checked = true;
  document.getElementById('mprod-attrs-list').innerHTML = '<div class="text-muted fs-12" style="padding:12px 0">Select a category to see available attributes</div>';
  _updateAttrCount(0, 0);
  openModal('modal-product');
}

function editProduct(id) {
  const p = _prAll.find(x => x.id === id);
  if (!p) return;
  set('mprod-title', 'Edit Product');
  document.getElementById('mprod-id').value = p.id;
  document.getElementById('mprod-brand').value = p.brand || p.brand_id || '';
  document.getElementById('mprod-category').value = p.category || '';
  document.getElementById('mprod-name').value = p.name || '';
  document.getElementById('mprod-year').value = p.release_year || '';
  document.getElementById('mprod-desc').value = p.description || '';
  document.getElementById('mprod-active').checked = p.is_active;
  // model_attributes is now included in the list response — use it for pre-selection
  if (p.category) loadAttrsForModal(p.category, p.model_attributes || []);
  openModal('modal-product');
}

/* ─── Load attrs for modal ──────────────────────────────────────── */
// selectedAttrs: array of { attribute_id, is_required, section, data_type, possible_values }
async function loadAttrsForModal(category, selectedAttrs = []) {
  const container = document.getElementById('mprod-attrs-list');
  container.innerHTML = '<div class="text-muted fs-12" style="padding:8px 0">Loading…</div>';
  if (!category) {
    container.innerHTML = '<div class="text-muted fs-12" style="padding:12px 0">Select a category first</div>';
    return;
  }

  const [ok, res] = await callApi('GET', `${_prUrls.attrsUrl}?category=${category}`, null, _prCsrf);
  if (!ok || !res.success) {
    container.innerHTML = '<div class="text-muted fs-12" style="padding:8px 0">Failed to load attributes</div>';
    return;
  }

  const attrs = res.data || [];
  _prAttrs = attrs;

  // Build lookup by attribute_id — now includes data_type and possible_values per product
  const selectedMap = {};
  for (const ma of selectedAttrs) {
    const aid = ma.attribute_id ?? ma.attribute?.id ?? ma.id;
    selectedMap[String(aid)] = {
      is_required:     ma.is_required,
      section:         ma.section         || 'main',
      data_type:       ma.data_type       || 'text',
      possible_values: ma.possible_values || [],
    };
  }

  if (!attrs.length) {
    container.innerHTML = '<div class="text-muted fs-12" style="padding:12px 0">No attributes defined for this category</div>';
    _updateAttrCount(0, 0);
    return;
  }

  // Count how many are pre-selected (edit mode)
  const preSelected = attrs.filter(a => !!selectedMap[String(a.id)]).length;
  _updateAttrCount(preSelected, attrs.length);

  container.innerHTML = attrs.map(a => {
    const sel     = selectedMap[String(a.id)];
    const checked = sel ? 'checked' : '';
    const show    = sel ? 'flex' : 'none';

    // Per-product settings (defaulting sensibly for new rows)
    const reqChk  = sel?.is_required ? 'checked' : '';
    const section = sel?.section    || 'main';
    const dtype   = sel?.data_type  || 'text';
    const pvals   = (sel?.possible_values || []).join(', ');

    const mainBg  = section === 'main'      ? 'var(--accent)' : 'transparent';
    const mainClr = section === 'main'      ? '#fff'          : 'var(--text-muted)';
    const secBg   = section === 'secondary' ? 'var(--accent)' : 'transparent';
    const secClr  = section === 'secondary' ? '#fff'          : 'var(--text-muted)';

    return `
    <div class="attr-row" style="display:flex;flex-direction:column;border:1px solid var(--border-light);border-radius:8px;background:var(--surface)">
      <!-- Row 1: checkbox + name -->
      <div style="display:flex;align-items:center;gap:10px;padding:9px 12px">
        <input type="checkbox" name="attr" value="${a.id}" ${checked}
               style="width:15px;height:15px;accent-color:var(--accent);flex-shrink:0;cursor:pointer"
               onchange="toggleAttrControls(this)" />
        <span style="flex:1;font-size:13px;font-weight:500">${a.name}</span>
        <span style="font-size:11px;color:var(--text-muted)">${sel ? dtype : ''}</span>
      </div>
      <!-- Row 2: controls bar — type, required, section — shown when ticked -->
      <div class="attr-ctrl-bar" style="display:${show};align-items:center;gap:10px;flex-wrap:wrap;padding:0 12px 10px 37px">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:11px;color:var(--text-muted)">Type:</span>
          <select name="dtype_${a.id}" data-aid="${a.id}"
                  style="font-size:12px;padding:3px 8px;border:1px solid var(--border);border-radius:5px;background:var(--bg);color:var(--text);height:28px;cursor:pointer"
                  onchange="toggleChoiceValues(this, this.dataset.aid)">
            <option value="text"   ${dtype==='text'   ? 'selected':''}>Text</option>
            <option value="number" ${dtype==='number' ? 'selected':''}>Number</option>
            <option value="choice" ${dtype==='choice' ? 'selected':''}>Choice</option>
          </select>
        </div>
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;white-space:nowrap;color:var(--text-muted)">
          <input type="checkbox" name="req" value="${a.id}" ${reqChk}
                 style="width:13px;height:13px;accent-color:var(--accent)" /> Required
        </label>
        <div style="display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden;font-size:11px;font-weight:600;flex-shrink:0">
          <label style="display:flex;align-items:center;padding:4px 10px;cursor:pointer;background:${mainBg};color:${mainClr};transition:background .12s,color .12s">
            <input type="radio" name="sec_${a.id}" value="main" ${section==='main' ? 'checked':''}
                   style="display:none" onchange="updateSectionStyle(this)" /> Main
          </label>
          <label style="display:flex;align-items:center;padding:4px 10px;cursor:pointer;background:${secBg};color:${secClr};transition:background .12s,color .12s">
            <input type="radio" name="sec_${a.id}" value="secondary" ${section==='secondary' ? 'checked':''}
                   style="display:none" onchange="updateSectionStyle(this)" /> 2nd
          </label>
        </div>
      </div>
      <!-- Row 3: choice values — shown only when type = choice -->
      <div id="vals_${a.id}"
           style="display:${show === 'flex' && dtype === 'choice' ? 'flex' : 'none'};align-items:center;gap:8px;padding:0 12px 10px 37px">
        <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">Options (comma-sep):</span>
        <input type="text" name="pvals_${a.id}" value="${pvals}"
               placeholder="e.g. 128GB, 256GB, 512GB"
               style="flex:1;font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:5px;background:var(--bg);color:var(--text)" />
      </div>
    </div>`;
  }).join('');
}

/* Show/hide controls when a row checkbox is toggled */
function toggleAttrControls(cb) {
  const row    = cb.closest('.attr-row');
  const aid    = cb.value;
  const ctrlBar = row.querySelector('.attr-ctrl-bar');
  const valsRow = document.getElementById('vals_' + aid);

  if (cb.checked) {
    if (ctrlBar) ctrlBar.style.display = 'flex';
    // Show the choice-values row only if type is already 'choice'
    const dtypeSel = row.querySelector('select[name="dtype_' + aid + '"]');
    if (valsRow) valsRow.style.display = (dtypeSel && dtypeSel.value === 'choice') ? 'flex' : 'none';
  } else {
    if (ctrlBar) ctrlBar.style.display = 'none';
    if (valsRow) valsRow.style.display = 'none';
  }

  // Live-update the selected count badge
  const total    = document.querySelectorAll('input[name="attr"]').length;
  const selected = document.querySelectorAll('input[name="attr"]:checked').length;
  _updateAttrCount(selected, total);
}

/* Update the attr count badge */
function _updateAttrCount(selected, total) {
  const badge = document.getElementById('mprod-attr-count');
  if (!badge) return;
  if (total === 0) { badge.style.display = 'none'; return; }
  badge.style.display = '';
  badge.textContent = `${selected} / ${total} selected`;
  badge.className = `badge ${selected > 0 ? 'badge-blue' : 'badge-gray'}`;
  badge.style.fontSize = '11px';
}

/* Show/hide the choice-values input based on the type selector */
function toggleChoiceValues(select, aid) {
  const valsRow = document.getElementById('vals_' + aid);
  if (!valsRow) return;
  valsRow.style.display = select.value === 'choice' ? 'flex' : 'none';
}

/* Keep section pill colours in sync after a radio click */
function updateSectionStyle(radio) {
  const siblings = document.querySelectorAll(`input[name="${radio.name}"]`);
  siblings.forEach(r => {
    const lbl = r.closest('label');
    lbl.style.background = r.checked ? 'var(--accent)' : 'transparent';
    lbl.style.color       = r.checked ? '#fff'          : 'var(--text-muted)';
  });
}

/* ─── Save product ──────────────────────────────────────────────── */
async function saveProduct() {
  const id       = document.getElementById('mprod-id').value;
  const brand_id = document.getElementById('mprod-brand').value;
  const category = document.getElementById('mprod-category').value;
  const name     = document.getElementById('mprod-name').value.trim();
  const year     = document.getElementById('mprod-year').value;
  const desc     = document.getElementById('mprod-desc').value.trim();
  const active   = document.getElementById('mprod-active').checked;

  if (!brand_id || !category || !name) {
    showToast('Brand, category, and name are required', 'error'); return;
  }

  // Gather selected attributes: required, section, data_type, possible_values
  const checkedAttrs = [...document.querySelectorAll('input[name="attr"]:checked')];
  const requiredIds  = new Set([...document.querySelectorAll('input[name="req"]:checked')].map(i => i.value));

  const attributes = checkedAttrs.map(cb => {
    const aid      = cb.value;
    const row      = cb.closest('.attr-row');
    const secRadio = row ? row.querySelector('input[name="sec_' + aid + '"]:checked') : null;
    const dtypeSel = row ? row.querySelector('select[name="dtype_' + aid + '"]') : null;
    const pvalsEl  = row ? row.querySelector('input[name="pvals_' + aid + '"]') : null;
    const dtype    = dtypeSel ? dtypeSel.value : 'text';
    const pvalsRaw = pvalsEl  ? pvalsEl.value  : '';
    const possible_values = dtype === 'choice'
      ? pvalsRaw.split(',').map(v => v.trim()).filter(Boolean)
      : [];
    return {
      attribute_id:    Number(aid),
      is_required:     requiredIds.has(aid),
      section:         secRadio ? secRadio.value : 'main',
      data_type:       dtype,
      possible_values: possible_values,
    };
  });

  const payload = { brand_id: Number(brand_id), category, name, is_active: active, attributes };
  if (year) payload.release_year = Number(year);
  if (desc) payload.description  = desc;

  const btn = document.getElementById('mprod-save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';

  let ok, res;
  if (id) {
    [ok, res] = await callApi('PATCH', `${_prUrls.createUrl}${id}/`, payload, _prCsrf);
  } else {
    [ok, res] = await callApi('POST', _prUrls.createUrl, payload, _prCsrf);
  }

  btn.disabled = false; btn.textContent = 'Save Product';

  if (ok && res.success) {
    closeModal('modal-product');
    showToast(id ? 'Product updated' : 'Product created', 'success');
    loadProducts();
  } else {
    showToast(res?.message || res?.error || 'Failed to save product', 'error');
  }
}

function set(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
