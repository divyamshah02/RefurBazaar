'use strict';
/* refurbishers.js — list page */

let _rfCsrf, _rfUrls, _rfData = { results: [], count: 0 }, _rfPage = 1, _rfPageSize = 20;

const APPROVAL_STATUS = {
  approved: { label: 'Approved', cls: 'badge-green' },
  pending: { label: 'Pending', cls: 'badge-yellow' },
  rejected: { label: 'Rejected', cls: 'badge-red' },
  incomplete: { label: 'Incomplete', cls: 'badge-gray' },
};
function approvalBadge(s) {
  const m = APPROVAL_STATUS[s] || { label: s || '—', cls: 'badge-gray' };
  return `<span class="badge ${m.cls}">${m.label}</span>`;
}

/* ─── Entry point ───────────────────────────────────────────────── */
async function InitRefurbishers(csrf, urls) {
  _rfCsrf = csrf; _rfUrls = urls;
  await loadStats();
  await loadList();

  let debounce;
  document.getElementById('q').addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { _rfPage = 1; loadList(); }, 320);
  });
  document.getElementById('f-status').addEventListener('change', () => { _rfPage = 1; loadList(); });
  document.getElementById('f-active').addEventListener('change', () => { _rfPage = 1; loadList(); });
}

/* ─── Stats ─────────────────────────────────────────────────────── */
async function loadStats() {
  const [ok, res] = await callApi('GET', _rfUrls.statsUrl, null, _rfCsrf);
  if (!ok || !res.success) return;
  const d = res.data;
  console.log('Refurbisher stats:', d);
  set('s-total', d.total_refurbishers);
  set('s-approved', d.approved_refurbishers);
  set('s-pending', d.pending_refurbishers);
  set('s-rejected', d.rejected_refurbishers);
}

/* ─── List ──────────────────────────────────────────────────────── */
async function loadList() {
  const body = document.getElementById('tbl-body');
  body.innerHTML = `<tr><td colspan="7" style="padding:36px;text-align:center">
    <div class="skeleton" style="height:13px;width:50%;margin:0 auto 10px"></div>
    <div class="skeleton" style="height:13px;width:35%;margin:0 auto"></div>
  </td></tr>`;

  const q = document.getElementById('q').value.trim();
  const status = document.getElementById('f-status').value;
  const active = document.getElementById('f-active').value;
  const params = new URLSearchParams({ page: _rfPage, page_size: _rfPageSize });
  if (q) params.set('search', q);
  if (status) params.set('status', status);
  if (active) params.set('is_active', active);

  const [ok, res] = await callApi('GET', `${_rfUrls.listUrl}?${params}`, null, _rfCsrf);
  if (!ok || !res.success) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><h4>Failed to load</h4><p>Check your connection and try again</p></div></td></tr>`;
    return;
  }

  _rfData = res.data;
  const rows = _rfData.results || _rfData || [];

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-store"></i><h4>No refurbishers found</h4><p>Try adjusting your search or filters</p></div></td></tr>`;
    renderPagination(0);
    return;
  }

  body.innerHTML = rows.map(r => {
    const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || '—';
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const color = avatarColor(name);
    const cp = r.company_profile;
    const company = cp?.company_name || '—';
    const phone = r.contact_number || r.phone || '—';
    const email = r.email || '';
    const listings = r.stats?.total_listings ?? '—';
    const uid = r.user_id || r.id;

    // Derive approval status from company_profile flags
    let approvalStatus;
    if (!cp || !cp.is_profile_complete) approvalStatus = 'incomplete';
    else if (cp.is_approved) approvalStatus = 'approved';
    else if (cp.is_rejected) approvalStatus = 'rejected';
    else approvalStatus = 'pending';

    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar" style="background:${color};flex-shrink:0">${initials}</div>
          <div>
            <div class="fw-600">${name}</div>
            <div class="text-muted fs-12">${email}</div>
          </div>
        </div>
      </td>
      <td>${company}</td>
      <td class="mono">${phone}</td>
      <td>${listings}</td>
      <td>${approvalBadge(approvalStatus)}</td>
      <td class="text-muted fs-12">${fmtDate(r.date_joined || r.created_at)}</td>
      <td>
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <a href="/admin-refurbisher-detail/${uid}/" class="btn btn-ghost btn-sm"><i class="fa-solid fa-eye"></i> View</a>
          ${approvalStatus === 'pending' ? `
            <button class="btn btn-success btn-sm" onclick="promptAction('approve','${uid}','${name}')"><i class="fa-solid fa-check"></i> Approve</button>
            <button class="btn btn-danger btn-sm" onclick="promptAction('reject','${uid}','${name}')"><i class="fa-solid fa-xmark"></i> Reject</button>
          ` : ''}
          ${approvalStatus === 'rejected' ? `
            <button class="btn btn-success btn-sm" onclick="promptAction('approve','${uid}','${name}')"><i class="fa-solid fa-check"></i> Approve</button>
          ` : ''}
          ${approvalStatus === 'approved' ? `
            <button class="btn btn-warning btn-sm" onclick="promptAction('reject','${uid}','${name}')"><i class="fa-solid fa-ban"></i> Revoke</button>
          ` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');

  renderPagination(_rfData.count || rows.length);
}

/* ─── Pagination ────────────────────────────────────────────────── */
function renderPagination(total) {
  const pages = Math.ceil(total / _rfPageSize);
  const info = document.getElementById('pag-info');
  const btns = document.getElementById('pag-btns');
  const start = (_rfPage - 1) * _rfPageSize + 1;
  const end = Math.min(_rfPage * _rfPageSize, total);
  info.textContent = total ? `Showing ${start}–${end} of ${total}` : '';
  if (pages <= 1) { btns.innerHTML = ''; return; }
  btns.innerHTML = `
    <button class="btn btn-ghost btn-sm" ${_rfPage === 1 ? 'disabled' : ''} onclick="_rfPage--;loadList()"><i class="fa-solid fa-chevron-left"></i></button>
    <span class="text-muted fs-12" style="padding:0 6px;line-height:30px">Page ${_rfPage} of ${pages}</span>
    <button class="btn btn-ghost btn-sm" ${_rfPage >= pages ? 'disabled' : ''} onclick="_rfPage++;loadList()"><i class="fa-solid fa-chevron-right"></i></button>`;
}

/* ─── Approve / Reject ──────────────────────────────────────────── */
let _pendingAction = null;
function promptAction(action, userId, name) {
  _pendingAction = { action, userId };
  const isApprove = action === 'approve';
  const icon = document.getElementById('mact-icon');
  icon.className = `modal-header-icon ${isApprove ? 'green' : 'red'}`;
  icon.innerHTML = `<i class="fa-solid ${isApprove ? 'fa-circle-check' : 'fa-ban'}"></i>`;
  set('mact-title', isApprove ? 'Approve Refurbisher' : 'Reject / Revoke Refurbisher');
  set('mact-sub', name);
  set('mact-body', isApprove
    ? `This will grant ${name} access to list products on RefurBazaar.`
    : `This will revoke ${name}'s ability to list products. You can re-approve later.`);
  document.getElementById('mact-reason-wrap').style.display = isApprove ? 'none' : 'block';
  document.getElementById('mact-reason').value = '';
  document.getElementById('mact-reason').placeholder = isApprove ? '' : 'Explain why this refurbisher is being rejected…';
  const confirmBtn = document.getElementById('mact-confirm-btn');
  confirmBtn.className = `btn ${isApprove ? 'btn-success' : 'btn-danger'}`;
  confirmBtn.textContent = isApprove ? 'Approve' : 'Reject';
  confirmBtn.onclick = submitAction;
  openModal('modal-action');
}

async function submitAction() {
  if (!_pendingAction) return;
  const { action, userId } = _pendingAction;
  const reason = document.getElementById('mact-reason').value.trim();

  if (action === 'reject' && !reason) {
    showToast('Please provide a reason for rejection', 'error');
    document.getElementById('mact-reason').focus();
    return;
  }

  const btn = document.getElementById('mact-confirm-btn');
  btn.disabled = true; btn.textContent = 'Processing…';

  const payload = { user_id: userId, action };
  if (reason) payload.reason = reason;
  const newUrl = _rfUrls.approveUrl.replace("uid", userId);
  const [ok, res] = await callApi('POST', newUrl, payload, _rfCsrf);
  btn.disabled = false; btn.textContent = action === 'approve' ? 'Approve' : 'Reject';

  if (ok && res.success) {
    closeModal('modal-action');
    showToast(`Refurbisher ${action === 'approve' ? 'approved' : 'rejected'} successfully`, 'success');
    loadList(); loadStats();
  } else {
    showToast(res?.message || 'Action failed. Please try again.', 'error');
  }
}

function set(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
