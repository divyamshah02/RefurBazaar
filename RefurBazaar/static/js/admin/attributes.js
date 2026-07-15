'use strict';
/* attributes.js */

let _atCsrf, _atUrls, _atAll = [], _atFiltered = [];

const CAT_LABELS = { mobile:'Mobile', laptop:'Laptop', tablet:'Tablet', accessory:'Accessory' };
const TYPE_LABELS = { text:'Text', number:'Number', select:'Select', boolean:'Boolean' };

/* ─── Entry ─────────────────────────────────────────────────────── */
function InitAttributes(csrf, urls) {
  _atCsrf = csrf; _atUrls = urls;
  loadAttributes();

  let debounce;
  document.getElementById('q').addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(applyFilter, 250);
  });
  document.getElementById('f-category').addEventListener('change', applyFilter);
  document.getElementById('f-type').addEventListener('change',     applyFilter);
}

/* ─── Load + Stats ──────────────────────────────────────────────── */
async function loadAttributes() {
  const [ok, res] = await callApi('GET', _atUrls.listUrl, null, _atCsrf);
  if (!ok || !res.success) {
    document.getElementById('tbl-body').innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><h4>Failed to load attributes</h4></div></td></tr>`;
    return;
  }
  _atAll = res.data || [];
  set('s-total',  _atAll.length.toLocaleString('en-IN'));
  set('s-mobile', _atAll.filter(a=>a.category==='mobile').length.toLocaleString('en-IN'));
  set('s-laptop', _atAll.filter(a=>a.category==='laptop').length.toLocaleString('en-IN'));
  set('s-tablet', _atAll.filter(a=>a.category==='tablet').length.toLocaleString('en-IN'));
  applyFilter();
}

/* ─── Filter ────────────────────────────────────────────────────── */
function applyFilter() {
  const q   = document.getElementById('q').value.toLowerCase();
  const cat = document.getElementById('f-category').value;
  const typ = document.getElementById('f-type').value;
  _atFiltered = _atAll.filter(a => {
    if (q   && !(a.name||'').toLowerCase().includes(q)) return false;
    if (cat  && a.category !== cat) return false;
    if (typ  && a.data_type !== typ) return false;
    return true;
  });
  renderTable();
}

/* ─── Render ────────────────────────────────────────────────────── */
function renderTable() {
  const tbody = document.getElementById('tbl-body');
  if (!_atFiltered.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-sliders"></i><h4>No attributes found</h4><p>Click "Add Attribute" to create the first one</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = _atFiltered.map(a => {
    const vals = a.possible_values
      ? a.possible_values.slice(0, 4).map(v => `<span style="display:inline-block;padding:2px 7px;background:var(--bg);border:1px solid var(--border);border-radius:12px;font-size:11px">${v}</span>`).join(' ')
        + (a.possible_values.length > 4 ? `<span class="text-muted fs-11"> +${a.possible_values.length-4} more</span>` : '')
      : '<span class="text-muted fs-12">—</span>';
    return `<tr>
      <td class="fw-600">${a.name}</td>
      <td><span class="text-muted fs-12" style="font-weight:600;text-transform:uppercase;letter-spacing:.5px">${CAT_LABELS[a.category]||a.category||'—'}</span></td>
      <td><span class="badge badge-blue">${TYPE_LABELS[a.data_type]||a.data_type||'—'}</span></td>
      <td>${vals}</td>
      <td><span class="badge ${a.is_active !== false ? 'badge-green' : 'badge-gray'}">${a.is_active !== false ? 'Yes' : 'No'}</span></td>
      <td class="text-muted">${a.display_order ?? '—'}</td>
      <td>
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <button class="btn btn-ghost btn-sm" onclick="editAttr(${a.id})"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="btn btn-danger btn-sm" onclick="promptDelete(${a.id},'${escStr(a.name)}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ─── Possible values toggle ────────────────────────────────────── */
function togglePossibleValues() {
  const t   = document.getElementById('mattr-type').value;
  const wrap = document.getElementById('mattr-values-wrap');
  wrap.style.display = t === 'select' ? 'block' : 'none';
}

/* ─── Open create / edit ────────────────────────────────────────── */
function openCreateAttr() {
  set('mattr-title', 'Add Attribute');
  document.getElementById('mattr-id').value        = '';
  document.getElementById('mattr-name').value      = '';
  document.getElementById('mattr-category').value  = '';
  document.getElementById('mattr-type').value      = '';
  document.getElementById('mattr-values').value    = '';
  document.getElementById('mattr-order').value     = '';
  document.getElementById('mattr-active').checked  = true;
  document.getElementById('mattr-values-wrap').style.display = 'none';
  openModal('modal-attr');
}

function editAttr(id) {
  const a = _atAll.find(x => x.id === id);
  if (!a) return;
  set('mattr-title', 'Edit Attribute');
  document.getElementById('mattr-id').value        = a.id;
  document.getElementById('mattr-name').value      = a.name;
  document.getElementById('mattr-category').value  = a.category;
  document.getElementById('mattr-type').value      = a.data_type;
  document.getElementById('mattr-values').value    = Array.isArray(a.possible_values) ? a.possible_values.join(', ') : (a.possible_values||'');
  document.getElementById('mattr-order').value     = a.display_order ?? '';
  document.getElementById('mattr-active').checked  = a.is_active !== false;
  document.getElementById('mattr-values-wrap').style.display = a.data_type === 'select' ? 'block' : 'none';
  openModal('modal-attr');
}

/* ─── Save ──────────────────────────────────────────────────────── */
async function saveAttr() {
  const id       = document.getElementById('mattr-id').value;
  const name     = document.getElementById('mattr-name').value.trim();
  const category = document.getElementById('mattr-category').value;
  const dataType = document.getElementById('mattr-type').value;
  const rawVals  = document.getElementById('mattr-values').value;
  const order    = document.getElementById('mattr-order').value;
  const active   = document.getElementById('mattr-active').checked;

  if (!name || !category || !dataType) {
    showToast('Name, category, and data type are required', 'error'); return;
  }

  const payload = { name, category, data_type: dataType, is_active: active };
  if (dataType === 'select' && rawVals) {
    payload.possible_values = rawVals.split(',').map(v => v.trim()).filter(Boolean);
  }
  if (order !== '') payload.display_order = Number(order);

  const btn = document.getElementById('mattr-save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';

  let ok, res;
  if (id) {
    [ok, res] = await callApi('PATCH', `${_atUrls.updateUrl}${id}/`, payload, _atCsrf);
  } else {
    [ok, res] = await callApi('POST', _atUrls.createUrl, payload, _atCsrf);
  }

  btn.disabled = false; btn.textContent = 'Save Attribute';

  if (ok && res.success) {
    closeModal('modal-attr');
    showToast(id ? 'Attribute updated' : 'Attribute created', 'success');
    loadAttributes();
  } else {
    showToast(res?.message || res?.error || 'Failed to save attribute', 'error');
  }
}

/* ─── Delete ────────────────────────────────────────────────────── */
let _delId = null;
function promptDelete(id, name) {
  _delId = id;
  set('mdel-sub', name);
  document.getElementById('mdel-confirm-btn').onclick = confirmDelete;
  openModal('modal-delete');
}

async function confirmDelete() {
  if (!_delId) return;
  const btn = document.getElementById('mdel-confirm-btn');
  btn.disabled = true; btn.textContent = 'Deleting…';
  const [ok, res] = await callApi('DELETE', `${_atUrls.deleteUrl}${_delId}/`, null, _atCsrf);
  btn.disabled = false; btn.textContent = 'Delete';
  if (ok && res.success) {
    closeModal('modal-delete');
    showToast('Attribute deleted', 'success');
    loadAttributes();
  } else {
    showToast(res?.message || 'Failed to delete attribute', 'error');
  }
}

function set(id, v) { const el=document.getElementById(id); if(el) el.textContent=v; }
function escStr(s) { return (s||'').replace(/'/g, "\\'"); }
