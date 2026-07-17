'use strict';
/* refurbisher_detail.js */

let _rdCsrf, _rdUrls, _rdId, _rdData;

/* ─── Entry point ───────────────────────────────────────────────── */
function InitRefurbisherDetail(csrf, uid, urls) {
  _rdCsrf = csrf; _rdId = uid; _rdUrls = urls;
  initTabs('#rd-tabs');
  loadDetail();
}

/* ─── Load profile ──────────────────────────────────────────────── */
// The detail endpoint returns { user, company_profile, listings, orders }
async function loadDetail() {
  const [ok, res] = await callApi('GET', _rdUrls.detailUrl, null, _rdCsrf);
  if (!ok || !res.success) {
    showToast('Failed to load refurbisher data', 'error');
    return;
  }
  _rdData = res.data;
  // Unpack nested shape
  const u  = _rdData.user        || _rdData;   // fallback: flat shape
  const cp = _rdData.company_profile || {};
  const listings = _rdData.listings || [];
  const orders   = _rdData.orders   || [];
  renderProfile(u, cp, listings, orders);
}

function renderProfile(u, cp, listings, orders) {
  const name    = `${u.first_name||''} ${u.last_name||''}`.trim() || 'Unknown';
  const initials= name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const color   = avatarColor(name);

  // Derive status from company_profile flags
  let status;
  if (!cp || !cp.is_profile_complete) status = 'incomplete';
  else if (cp.is_approved)            status = 'approved';
  else                                status = 'pending';

  // Hero
  const av = document.getElementById('rd-avatar');
  av.textContent = initials; av.style.background = color;
  set('rd-name-crumb', name);
  set('rd-fullname', name);
  set('rd-email', u.email || '—');
  set('rd-phone', u.contact_number || u.phone || '—');

  const statusBadgeMap = { approved:'badge-green', pending:'badge-yellow', rejected:'badge-red', incomplete:'badge-gray' };
  document.getElementById('rd-status-badge').innerHTML =
    `<span class="badge ${statusBadgeMap[status]||'badge-gray'}">${cap(status)}</span>`;

  // Stats (from embedded data)
  set('rd-stat-listings', listings.length.toLocaleString('en-IN'));
  set('rd-stat-orders',   orders.length.toLocaleString('en-IN'));
  const revenue = orders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
  set('rd-stat-revenue',  fmtCurrency(revenue));

  // Profile tab
  set('rd-first-name', u.first_name || '—');
  set('rd-last-name',  u.last_name  || '—');
  set('rd-p-email',    u.email      || '—');
  set('rd-p-phone',    u.contact_number || u.phone || '—');
  set('rd-joined',     fmtDateTime(u.date_joined || u.created_at));
  document.getElementById('rd-active').innerHTML = u.is_active
    ? '<span class="badge badge-green">Active</span>'
    : '<span class="badge badge-red">Inactive</span>';

  set('rd-biz-name', cp.company_name || '—');
  set('rd-gst',      cp.gst_registration_no || cp.gst_number || '—');
  set('rd-pan',      cp.pan_number || '—');
  document.getElementById('rd-approval').innerHTML =
    `<span class="badge ${statusBadgeMap[status]||'badge-gray'}">${cap(status)}</span>`;
  set('rd-acc-no', cp.account_number || '—');
  set('rd-ifsc',   cp.ifsc_code      || '—');

  // Address tab — CompanyProfileSerializer fields
  set('rd-addr-street',  cp.address_line_1 || cp.address_line1 || '—');
  set('rd-addr-city',    cp.city    || '—');
  set('rd-addr-state',   cp.state   || '—');
  set('rd-addr-pin',     cp.pincode || cp.pin || '—');
  set('rd-addr-country', cp.country || 'India');

  // Documents — CompanyProfileSerializer file fields
  const docFields = [
    { key: 'gst_certificate',      label: 'GST Certificate'   },
    { key: 'business_license_file', label: 'Business License' },
    { key: 'identity_proof',        label: 'Identity Proof'   },
    { key: 'address_proof',         label: 'Address Proof'    },
  ];
  const docList = document.getElementById('rd-docs-list');
  const uploaded = docFields.filter(d => cp[d.key]);
  if (uploaded.length) {
    docList.innerHTML = uploaded.map(d =>
      `<a href="${cp[d.key]}" target="_blank" class="doc-chip">
        <i class="fa-solid fa-file-lines"></i> ${d.label}
      </a>`).join('');
  }

  // Approve/Reject buttons
  const btnA = document.getElementById('btn-approve');
  const btnR = document.getElementById('btn-reject');
  if (status === 'pending') {
    btnA.style.display = 'inline-flex';
    btnR.style.display = 'inline-flex';
  } else if (status === 'approved') {
    btnR.style.display = 'inline-flex';
    btnR.innerHTML = '<i class="fa-solid fa-ban"></i> Revoke';
  }
  btnA.onclick = () => promptAction('approve');
  btnR.onclick = () => promptAction('reject');

  // Render sub-tabs with embedded data
  renderListings(listings);
  renderOrders(orders);
}

/* ─── Listings sub-tab ──────────────────────────────────────────── */
function renderListings(rows) {
  const tbody = document.getElementById('rd-listings-body');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-layer-group"></i><h4>No listings yet</h4></div></td></tr>`;
    return;
  }
  const STATUS_CLS = { active:'badge-green', draft:'badge-gray', sold:'badge-orange', inactive:'badge-red' };
  tbody.innerHTML = rows.map(l => {
    const name       = `${l.brand_name||''} ${l.model_name||''}`.trim() || '—';
    const s          = l.status || 'draft';
    const unitPrices = (l.units||[]).map(u=>parseFloat(u.price)).filter(p=>!isNaN(p));
    const price      = unitPrices.length ? fmtCurrency(Math.min(...unitPrices)) : '—';
    return `<tr>
      <td class="fw-600">${name}</td>
      <td class="fw-600">${price}</td>
      <td>${l.total_quantity ?? '—'}</td>
      <td><span class="badge ${STATUS_CLS[s]||'badge-gray'}">${cap(s)}</span></td>
      <td class="text-muted fs-12">${fmtDate(l.created_at)}</td>
      <td><a href="/admin-listing-detail/${l.listing_id||l.id}/" class="btn btn-ghost btn-sm"><i class="fa-solid fa-eye"></i></a></td>
    </tr>`;
  }).join('');
}

/* ─── Orders sub-tab ────────────────────────────────────────────── */
function renderOrders(rows) {
  const tbody = document.getElementById('rd-orders-body');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-box-open"></i><h4>No orders yet</h4></div></td></tr>`;
    return;
  }
  const STATUS = { pending:'badge-yellow', confirmed:'badge-blue', processing:'badge-orange', shipped:'badge-purple', delivered:'badge-green', cancelled:'badge-red' };
  tbody.innerHTML = rows.map(o => {
    const cust = `${o.first_name||''} ${o.last_name||''}`.trim() || '—';
    const s    = o.status || 'pending';
    return `<tr>
      <td><span class="mono">${o.order_id}</span></td>
      <td>${cust}</td>
      <td>${o.items?.length ?? '—'}</td>
      <td class="fw-600">${fmtCurrency(o.total_amount)}</td>
      <td><span class="badge ${STATUS[s]||'badge-gray'}">${cap(s)}</span></td>
      <td class="text-muted fs-12">${fmtDate(o.created_at)}</td>
      <td><a href="/admin-order-detail/${o.order_id}/" class="btn btn-ghost btn-sm"><i class="fa-solid fa-eye"></i></a></td>
    </tr>`;
  }).join('');
}

/* ─── Approve / Reject ──────────────────────────────────────────── */
let _action = null;
function promptAction(action) {
  _action = action;
  const name = _rdData ? `${_rdData.first_name||''} ${_rdData.last_name||''}`.trim() : '';
  const isA  = action === 'approve';
  const icon = document.getElementById('mc-icon');
  icon.className = `modal-header-icon ${isA ? 'green' : 'red'}`;
  icon.innerHTML = `<i class="fa-solid ${isA ? 'fa-circle-check' : 'fa-ban'}"></i>`;
  set('mc-title', isA ? 'Approve Refurbisher' : 'Reject / Revoke');
  set('mc-sub', name);
  set('mc-body', isA
    ? `This will grant ${name} access to list products on RefurBazaar.`
    : `This will revoke ${name}'s listing access. You can re-approve them later.`);
  document.getElementById('mc-reason-wrap').style.display = isA ? 'none' : 'block';
  document.getElementById('mc-reason').value = '';
  const btn = document.getElementById('mc-confirm-btn');
  btn.className = `btn ${isA ? 'btn-success' : 'btn-danger'}`;
  btn.textContent = isA ? 'Approve' : 'Reject';
  btn.onclick = submitAction;
  openModal('modal-confirm');
}

async function submitAction() {
  const btn    = document.getElementById('mc-confirm-btn');
  const reason = document.getElementById('mc-reason').value.trim();
  btn.disabled = true; btn.textContent = 'Processing…';

  const payload = { user_id: _rdId, action: _action };
  if (reason) payload.reason = reason;
  const [ok, res] = await callApi('POST', _rdUrls.approveUrl, payload, _rdCsrf);

  btn.disabled = false;
  if (ok && res.success) {
    closeModal('modal-confirm');
    showToast(`Refurbisher ${_action === 'approve' ? 'approved' : 'rejected'} successfully`, 'success');
    loadDetail();
  } else {
    showToast(res?.message || 'Action failed. Please try again.', 'error');
  }
}

/* ─── Helpers ───────────────────────────────────────────────────── */
function set(id, v) {
  const el = document.getElementById(id);
  if (!el) return;
  if (typeof v === 'string' && v.includes('<')) el.innerHTML = v;
  else el.textContent = v;
}
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'; }

