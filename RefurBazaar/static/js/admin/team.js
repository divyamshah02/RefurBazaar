'use strict';
/* team.js — Admin team (user) management */

let _tmCsrf, _tmUrls, _tmAll = [], _tmFiltered = [], _tmCurrentUserId = null;

/* ─── Entry ─────────────────────────────────────────────────────── */
function InitTeam(csrf, urls, currentUserId) {
  _tmCsrf = csrf; _tmUrls = urls; _tmCurrentUserId = currentUserId;
  loadTeam();

  let debounce;
  document.getElementById('q').addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(applyFilter, 250);
  });
  document.getElementById('f-active').addEventListener('change', applyFilter);
}

/* ─── Load + Stats ──────────────────────────────────────────────── */
async function loadTeam() {
  const [ok, res] = await callApi('GET', _tmUrls.listUrl, null, _tmCsrf);
  if (!ok || !res.success) {
    document.getElementById('tbl-body').innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><h4>Failed to load admin team</h4></div></td></tr>`;
    return;
  }
  _tmAll = res.data || [];
  set('s-total',    _tmAll.length.toLocaleString('en-IN'));
  set('s-active',   _tmAll.filter(a => a.active_user !== false).length.toLocaleString('en-IN'));
  set('s-inactive', _tmAll.filter(a => a.active_user === false).length.toLocaleString('en-IN'));
  applyFilter();
}

/* ─── Filter + Render ───────────────────────────────────────────── */
function applyFilter() {
  const q      = document.getElementById('q').value.toLowerCase();
  const active = document.getElementById('f-active').value;
  _tmFiltered = _tmAll.filter(a => {
    const name = `${a.first_name||''} ${a.last_name||''}`.toLowerCase();
    if (q && !(name.includes(q) || (a.contact_number||'').includes(q) || (a.email||'').toLowerCase().includes(q))) return false;
    const isActive = a.active_user !== false;
    if (active === 'true'  && !isActive) return false;
    if (active === 'false' &&  isActive) return false;
    return true;
  });
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('tbl-body');
  if (!_tmFiltered.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-user-shield"></i><h4>No admins found</h4><p>Click "Add Admin" to create the first account</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = _tmFiltered.map(a => {
    const name     = `${a.first_name||''} ${a.last_name||''}`.trim() || 'Unnamed';
    const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const color    = avatarColor(name);
    const isActive = a.active_user !== false;
    const isSelf   = a.user_id === _tmCurrentUserId;
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar" style="background:${color};flex-shrink:0">${initials}</div>
          <div>
            <div class="fw-600">${name}${isSelf ? ' <span class="badge badge-blue" style="margin-left:4px">You</span>' : ''}</div>
            <div class="text-muted fs-12">${a.user_id || ''}</div>
          </div>
        </div>
      </td>
      <td class="mono">${a.contact_number || '—'}</td>
      <td class="text-muted">${a.email || '—'}</td>
      <td><span class="badge ${isActive ? 'badge-green' : 'badge-gray'}">${isActive ? 'Active' : 'Inactive'}</span></td>
      <td class="text-muted fs-12">${fmtDate(a.created_at)}</td>
      <td>
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <button class="btn btn-ghost btn-sm" onclick="editAdmin(${a.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-ghost btn-sm" onclick="promptPassword(${a.id},'${escStr(name)}')" title="Change Password"><i class="fa-solid fa-key"></i></button>
          <button class="btn btn-ghost btn-sm" onclick="toggleActive(${a.id})" title="${isActive ? 'Deactivate' : 'Activate'}" ${isSelf ? 'disabled' : ''}>
            <i class="fa-solid ${isActive ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
          </button>
          <button class="btn btn-danger btn-sm" onclick="promptDelete(${a.id},'${escStr(name)}')" title="Remove" ${isSelf ? 'disabled' : ''}><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ─── Create / Edit ─────────────────────────────────────────────── */
function openCreateAdmin() {
  set('madmin-title', 'Add Admin');
  set('madmin-subtitle', 'Create a new administrator account');
  document.getElementById('madmin-id').value         = '';
  document.getElementById('madmin-first-name').value = '';
  document.getElementById('madmin-last-name').value  = '';
  document.getElementById('madmin-contact').value    = '';
  document.getElementById('madmin-email').value      = '';
  document.getElementById('madmin-password').value   = '';
  document.getElementById('madmin-password-group').style.display = '';
  document.getElementById('madmin-password').placeholder = 'Minimum 8 characters';
  openModal('modal-admin');
}

function editAdmin(id) {
  const admin = _tmAll.find(a => a.id === id);
  if (!admin) return;
  set('madmin-title', 'Edit Admin');
  set('madmin-subtitle', 'Update administrator details');
  document.getElementById('madmin-id').value         = admin.id;
  document.getElementById('madmin-first-name').value = admin.first_name || '';
  document.getElementById('madmin-last-name').value  = admin.last_name || '';
  document.getElementById('madmin-contact').value    = admin.contact_number || '';
  document.getElementById('madmin-email').value      = admin.email || '';
  document.getElementById('madmin-password-group').style.display = 'none';
  openModal('modal-admin');
}

async function saveAdmin() {
  const id         = document.getElementById('madmin-id').value;
  const firstName  = document.getElementById('madmin-first-name').value.trim();
  const lastName   = document.getElementById('madmin-last-name').value.trim();
  const contact    = document.getElementById('madmin-contact').value.trim();
  const email      = document.getElementById('madmin-email').value.trim();
  const password   = document.getElementById('madmin-password').value;

  if (!firstName) { showToast('First name is required', 'error'); return; }
  if (!contact) { showToast('Mobile number is required', 'error'); return; }
  if (!id && (!password || password.length < 8)) { showToast('Password must be at least 8 characters', 'error'); return; }

  const btn = document.getElementById('madmin-save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';

  let ok, res;
  if (id) {
    const payload = { first_name: firstName, last_name: lastName, contact_number: contact, email };
    [ok, res] = await callApi('PATCH', `${_tmUrls.updateUrl}${id}/`, payload, _tmCsrf);
  } else {
    const payload = { first_name: firstName, last_name: lastName, contact_number: contact, email, password };
    [ok, res] = await callApi('POST', _tmUrls.createUrl, payload, _tmCsrf);
  }

  btn.disabled = false; btn.textContent = 'Save Admin';

  if (ok && res.success) {
    closeModal('modal-admin');
    showToast(id ? 'Admin updated' : 'Admin created', 'success');
    loadTeam();
  } else {
    showToast(errText(res) || 'Failed to save admin', 'error');
  }
}

/* ─── Activate / Deactivate ─────────────────────────────────────── */
async function toggleActive(id) {
  const admin = _tmAll.find(a => a.id === id);
  if (!admin) return;
  const nextActive = !(admin.active_user !== false);
  const [ok, res] = await callApi('PATCH', `${_tmUrls.updateUrl}${id}/`, { active_user: nextActive }, _tmCsrf);
  if (ok && res.success) {
    showToast(nextActive ? 'Admin activated' : 'Admin deactivated', 'success');
    loadTeam();
  } else {
    showToast(errText(res) || 'Failed to update status', 'error');
  }
}

/* ─── Password change ───────────────────────────────────────────── */
function promptPassword(id, name) {
  document.getElementById('mpass-id').value = id;
  set('mpass-sub', name);
  document.getElementById('mpass-new').value = '';
  document.getElementById('mpass-confirm').value = '';
  openModal('modal-password');
}

async function savePassword() {
  const id = document.getElementById('mpass-id').value;
  const pass = document.getElementById('mpass-new').value;
  const confirm = document.getElementById('mpass-confirm').value;

  if (!pass || pass.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
  if (pass !== confirm) { showToast('Passwords do not match', 'error'); return; }

  const btn = document.getElementById('mpass-save-btn');
  btn.disabled = true; btn.textContent = 'Updating…';

  const [ok, res] = await callApi('POST', `${_tmUrls.passwordUrl}${id}/`, { password: pass }, _tmCsrf);

  btn.disabled = false; btn.textContent = 'Update Password';

  if (ok && res.success) {
    closeModal('modal-password');
    showToast('Password updated', 'success');
  } else {
    showToast(errText(res) || 'Failed to update password', 'error');
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
  btn.disabled = true; btn.textContent = 'Removing…';
  const [ok, res] = await callApi('DELETE', `${_tmUrls.deleteUrl}${_delId}/`, null, _tmCsrf);
  btn.disabled = false; btn.textContent = 'Remove';
  if (ok && res.success) {
    closeModal('modal-delete');
    showToast('Admin removed', 'success');
    loadTeam();
  } else {
    showToast(errText(res) || 'Failed to remove admin', 'error');
  }
}

function set(id, v) { const el=document.getElementById(id); if(el) el.textContent=v; }
function escStr(s) { return (s||'').replace(/'/g, "\\'"); }
function errText(res) {
  if (!res) return '';
  if (typeof res.error === 'string') return res.error;
  if (res.error && typeof res.error === 'object') return Object.values(res.error).flat().join(' ');
  return res.message || '';
}
