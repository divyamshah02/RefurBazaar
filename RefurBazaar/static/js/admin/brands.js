'use strict';
/* brands.js */

let _brCsrf, _brUrls, _brAll = [], _brFiltered = [];

/* ─── Entry ─────────────────────────────────────────────────────── */
function InitBrands(csrf, urls) {
  _brCsrf = csrf; _brUrls = urls;
  loadBrands();

  let debounce;
  document.getElementById('q').addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(applyFilter, 250);
  });
  document.getElementById('f-active').addEventListener('change', applyFilter);
}

/* ─── Load + Stats ──────────────────────────────────────────────── */
async function loadBrands() {
  const [ok, res] = await callApi('GET', _brUrls.listUrl, null, _brCsrf);
  if (!ok || !res.success) {
    document.getElementById('tbl-body').innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><h4>Failed to load brands</h4></div></td></tr>`;
    return;
  }
  _brAll = res.data || [];
  set('s-total',    _brAll.length.toLocaleString('en-IN'));
  set('s-active',   _brAll.filter(b => b.is_active).length.toLocaleString('en-IN'));
  set('s-inactive', _brAll.filter(b => !b.is_active).length.toLocaleString('en-IN'));
  applyFilter();
}

/* ─── Filter + Render ───────────────────────────────────────────── */
function applyFilter() {
  const q      = document.getElementById('q').value.toLowerCase();
  const active = document.getElementById('f-active').value;
  _brFiltered = _brAll.filter(b => {
    if (q && !b.name.toLowerCase().includes(q)) return false;
    if (active === 'true'  && !b.is_active) return false;
    if (active === 'false' &&  b.is_active) return false;
    return true;
  });
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('tbl-body');
  if (!_brFiltered.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fa-solid fa-tags"></i><h4>No brands found</h4><p>Click "Add Brand" to create the first one</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = _brFiltered.map(b => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          ${b.logo
            ? `<img src="${b.logo}" alt="${b.name}" style="width:32px;height:32px;object-fit:contain;border-radius:6px;border:1px solid var(--border)">`
            : `<div style="width:32px;height:32px;border-radius:6px;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-tag" style="color:var(--text-muted);font-size:12px"></i></div>`
          }
          <span class="fw-600">${b.name}</span>
        </div>
      </td>
      <td class="text-muted">${(b.model_count ?? '—').toLocaleString?.() ?? '—'}</td>
      <td><span class="badge ${b.is_active ? 'badge-green' : 'badge-gray'}">${b.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <button class="btn btn-ghost btn-sm" onclick="editBrand(${b.id})"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="btn btn-danger btn-sm" onclick="promptDelete(${b.id},'${escStr(b.name)}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

/* ─── Create / Edit ─────────────────────────────────────────────── */
function openCreateBrand() {
  set('mbrand-title', 'Add Brand');
  document.getElementById('mbrand-id').value    = '';
  document.getElementById('mbrand-name').value  = '';
  document.getElementById('mbrand-logo').value  = '';
  document.getElementById('mbrand-active').checked = true;
  openModal('modal-brand');
}

function editBrand(id) {
  const brand = _brAll.find(b => b.id === id);
  if (!brand) return;
  set('mbrand-title', 'Edit Brand');
  document.getElementById('mbrand-id').value        = brand.id;
  document.getElementById('mbrand-name').value      = brand.name;
  document.getElementById('mbrand-logo').value      = brand.logo || '';
  document.getElementById('mbrand-active').checked  = brand.is_active;
  openModal('modal-brand');
}

async function saveBrand() {
  const id     = document.getElementById('mbrand-id').value;
  const name   = document.getElementById('mbrand-name').value.trim();
  const logo   = document.getElementById('mbrand-logo').value.trim();
  const active = document.getElementById('mbrand-active').checked;

  if (!name) { showToast('Brand name is required', 'error'); return; }

  const btn = document.getElementById('mbrand-save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const payload = { name, is_active: active };
  if (logo) payload.logo = logo;

  let ok, res;
  if (id) {
    [ok, res] = await callApi('PATCH', `${_brUrls.updateUrl}${id}/`, payload, _brCsrf);
  } else {
    [ok, res] = await callApi('POST', _brUrls.createUrl, payload, _brCsrf);
  }

  btn.disabled = false; btn.textContent = 'Save Brand';

  if (ok && res.success) {
    closeModal('modal-brand');
    showToast(id ? 'Brand updated' : 'Brand created', 'success');
    loadBrands();
  } else {
    showToast(res?.message || res?.error || 'Failed to save brand', 'error');
  }
}

/* ─── Delete ────────────────────────────────────────────────────── */
let _delId = null;
function promptDelete(id, name) {
  _delId = id;
  set('mdel-sub', name);
  const btn = document.getElementById('mdel-confirm-btn');
  btn.onclick = confirmDelete;
  openModal('modal-delete');
}

async function confirmDelete() {
  if (!_delId) return;
  const btn = document.getElementById('mdel-confirm-btn');
  btn.disabled = true; btn.textContent = 'Deleting…';
  const [ok, res] = await callApi('DELETE', `${_brUrls.deleteUrl}${_delId}/`, null, _brCsrf);
  btn.disabled = false; btn.textContent = 'Delete';
  if (ok && res.success) {
    closeModal('modal-delete');
    showToast('Brand deleted', 'success');
    loadBrands();
  } else {
    showToast(res?.message || 'Failed to delete brand', 'error');
  }
}

function set(id, v) { const el=document.getElementById(id); if(el) el.textContent=v; }
function escStr(s) { return (s||'').replace(/'/g, "\\'"); }
