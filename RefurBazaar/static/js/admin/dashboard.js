'use strict';

/* shared status badge helper used by other pages too */
const ORDER_STATUS_MAP = {
  pending:    { label:'Pending',    cls:'badge-yellow' },
  confirmed:  { label:'Confirmed',  cls:'badge-blue'   },
  processing: { label:'Processing', cls:'badge-orange'  },
  shipped:    { label:'Shipped',    cls:'badge-purple'  },
  delivered:  { label:'Delivered',  cls:'badge-green'   },
  cancelled:  { label:'Cancelled',  cls:'badge-red'     },
};
function orderStatusBadge(s) {
  const m = ORDER_STATUS_MAP[s] || { label: s || '—', cls:'badge-gray' };
  return `<span class="badge ${m.cls}">${m.label}</span>`;
}

/* ─── Entry point ───────────────────────────────────────────────── */
function InitDashboard(csrf, urls) {
  loadStats(csrf, urls.statsUrl);
  loadRecentOrders(csrf, urls.ordersUrl);
  loadPendingRefurbishers(csrf, urls.pendingUrl);
}

/* ─── Stats cards ───────────────────────────────────────────────── */
async function loadStats(csrf, url) {
  const [ok, res] = await callApi('GET', url, null, csrf);
  if (!ok || !res.success) return;
  const d = res.data;
  set('s-revenue',      fmtCurrency(d.total_revenue));
  set('s-orders',       num(d.total_orders));
  set('s-orders-today', num(d.orders_today));
  set('s-refurbishers', num(d.total_refurbishers));
  set('s-pending',      num(d.pending_refurbishers));
  set('s-customers',    num(d.total_customers));
  const badge = document.getElementById('sb-pending-count');
  if (badge && (d.pending_refurbishers || 0) > 0) {
    badge.textContent = d.pending_refurbishers;
    badge.style.display = 'inline-flex';
  }
}

/* ─── Recent orders ─────────────────────────────────────────────── */
async function loadRecentOrders(csrf, url) {
  const tbody = document.getElementById('recent-orders-body');
  const [ok, res] = await callApi('GET', url, null, csrf);
  const rows = res?.data?.results || res?.data || [];
  if (!ok || !res.success || !rows.length) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state"><i class="fa-solid fa-box-open"></i><h4>No orders yet</h4></div>
    </td></tr>`;
    return;
  }
  tbody.innerHTML = rows.slice(0, 10).map(o => {
    const cust = `${o.first_name||''} ${o.last_name||''}`.trim() || '—';
    return `<tr style="cursor:pointer" onclick="location.href='/admin-order-detail/${o.order_id}/'">
      <td><span class="mono">${o.order_id}</span></td>
      <td>
        <div class="fw-600">${cust}</div>
        <div class="text-muted fs-12">${o.phone || ''}</div>
      </td>
      <td class="text-muted">${o.item_count ?? (o.items?.length ?? '—')}</td>
      <td class="fw-600">${fmtCurrency(o.total_amount)}</td>
      <td>${orderStatusBadge(o.status)}</td>
      <td class="text-muted fs-12">${fmtDate(o.created_at)}</td>
    </tr>`;
  }).join('');
}

/* ─── Pending refurbishers ──────────────────────────────────────── */
async function loadPendingRefurbishers(csrf, url) {
  const container = document.getElementById('pending-list');
  const [ok, res] = await callApi('GET', url, null, csrf);
  const items = res?.data?.results || res?.data || [];
  if (!ok || !res.success || !items.length) {
    container.innerHTML = `<div class="empty-state" style="padding:36px 20px">
      <i class="fa-solid fa-circle-check" style="color:var(--green);font-size:32px"></i>
      <h4>All caught up</h4><p>No pending approvals</p>
    </div>`;
    return;
  }
  container.innerHTML = items.slice(0, 6).map(r => {
    const name     = `${r.first_name||''} ${r.last_name||''}`.trim() || 'Unnamed';
    const company  = r.company_profile?.company_name || r.business_name || '—';
    const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const color    = avatarColor(name);
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 20px;border-bottom:1px solid var(--border-light)">
      <div class="avatar" style="background:${color}">${initials}</div>
      <div style="flex:1;min-width:0">
        <div class="fw-600 fs-13 truncate">${name}</div>
        <div class="text-muted fs-12 truncate">${company}</div>
      </div>
      <a href="/admin-refurbisher-detail/${r.user_id}/" class="btn btn-warning btn-sm">Review</a>
    </div>`;
  }).join('');
}

/* ─── Tiny helpers ──────────────────────────────────────────────── */
function set(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function num(n) { return (n || 0).toLocaleString('en-IN'); }
