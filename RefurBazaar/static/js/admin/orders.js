'use strict';
/* orders.js — list page */

let _orCsrf, _orUrls, _orPage = 1, _orPageSize = 20;

const ORDER_STATUS = {
  pending:    { label:'Pending',    cls:'badge-yellow'  },
  confirmed:  { label:'Confirmed',  cls:'badge-blue'    },
  processing: { label:'Processing', cls:'badge-orange'  },
  shipped:    { label:'Shipped',    cls:'badge-purple'  },
  delivered:  { label:'Delivered',  cls:'badge-green'   },
  cancelled:  { label:'Cancelled',  cls:'badge-red'     },
};
function orderBadge(s) {
  const m = ORDER_STATUS[s] || { label: s||'—', cls:'badge-gray' };
  return `<span class="badge ${m.cls}">${m.label}</span>`;
}

/* ─── Entry ─────────────────────────────────────────────────────── */
function InitOrders(csrf, urls) {
  _orCsrf = csrf; _orUrls = urls;
  loadStats();
  loadList();

  let debounce;
  document.getElementById('q').addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { _orPage=1; loadList(); }, 320);
  });
  document.getElementById('f-status').addEventListener('change',  () => { _orPage=1; loadList(); });
  document.getElementById('f-payment').addEventListener('change', () => { _orPage=1; loadList(); });
}

/* ─── Stats ─────────────────────────────────────────────────────── */
async function loadStats() {
  const [ok, res] = await callApi('GET', _orUrls.statsUrl, null, _orCsrf);
  if (!ok || !res.success) return;
  const d = res.data;
  set('s-total',     num(d.total_orders));
  set('s-pending',   num(d.pending_orders   ?? d.orders_pending));
  set('s-shipped',   num(d.shipped_orders   ?? d.orders_shipped));
  set('s-delivered', num(d.delivered_orders ?? d.orders_delivered));
  set('s-cancelled', num(d.cancelled_orders ?? d.orders_cancelled));
  set('s-revenue',   fmtCurrency(d.total_revenue));
}

/* ─── List ──────────────────────────────────────────────────────── */
async function loadList() {
  const body = document.getElementById('tbl-body');
  body.innerHTML = `<tr><td colspan="8" style="padding:36px;text-align:center">
    <div class="skeleton" style="height:13px;width:50%;margin:0 auto 10px"></div>
    <div class="skeleton" style="height:13px;width:35%;margin:0 auto"></div>
  </td></tr>`;

  const params  = new URLSearchParams({ page: _orPage, page_size: _orPageSize });
  const q       = document.getElementById('q').value.trim();
  const status  = document.getElementById('f-status').value;
  const payment = document.getElementById('f-payment').value;
  if (q)       params.set('search', q);
  if (status)  params.set('status', status);
  if (payment) params.set('is_paid', payment);

  const [ok, res] = await callApi('GET', `${_orUrls.listUrl}?${params}`, null, _orCsrf);
  if (!ok || !res.success) {
    body.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><h4>Failed to load orders</h4></div></td></tr>`;
    return;
  }

  const data = res.data;
  const rows = data.results || data || [];
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-box-open"></i><h4>No orders found</h4><p>Try adjusting your search or filters</p></div></td></tr>`;
    renderPag(0); return;
  }

  body.innerHTML = rows.map(o => {
    const cust  = `${o.first_name||''} ${o.last_name||''}`.trim() || '—';
    const s     = o.status || 'pending';
    const paid  = o.is_paid || o.payment_status === 'paid';
    return `<tr style="cursor:pointer" onclick="location.href='/admin-order-detail/${o.order_id}/'">
      <td><span class="mono fw-600" style="font-size:12px">${o.order_id}</span></td>
      <td>
        <div class="fw-600">${cust}</div>
        <div class="text-muted fs-12 mono">${o.phone || ''}</div>
      </td>
      <td>${o.item_count ?? (o.items?.length ?? '—')}</td>
      <td class="fw-600">${fmtCurrency(o.total_amount)}</td>
      <td><span class="badge ${paid ? 'badge-green' : 'badge-yellow'}">${paid ? 'Paid' : 'Unpaid'}</span></td>
      <td>${orderBadge(s)}</td>
      <td class="text-muted fs-12">${fmtDate(o.created_at)}</td>
      <td><div style="display:flex;gap:6px;justify-content:flex-end" onclick="event.stopPropagation()">
        <a href="/admin-order-detail/${o.order_id}/" class="btn btn-ghost btn-sm"><i class="fa-solid fa-eye"></i> View</a>
      </div></td>
    </tr>`;
  }).join('');

  renderPag(data.count || rows.length);
}

/* ─── Pagination ────────────────────────────────────────────────── */
function renderPag(total) {
  const pages = Math.ceil(total / _orPageSize);
  const info  = document.getElementById('pag-info');
  const btns  = document.getElementById('pag-btns');
  const start = (_orPage-1)*_orPageSize+1;
  const end   = Math.min(_orPage*_orPageSize, total);
  info.textContent = total ? `Showing ${start}–${end} of ${total}` : '';
  if (pages <= 1) { btns.innerHTML=''; return; }
  btns.innerHTML = `
    <button class="btn btn-ghost btn-sm" ${_orPage===1?'disabled':''} onclick="_orPage--;loadList()"><i class="fa-solid fa-chevron-left"></i></button>
    <span class="text-muted fs-12" style="padding:0 6px;line-height:30px">Page ${_orPage} of ${pages}</span>
    <button class="btn btn-ghost btn-sm" ${_orPage>=pages?'disabled':''} onclick="_orPage++;loadList()"><i class="fa-solid fa-chevron-right"></i></button>`;
}

function set(id, v) { const el=document.getElementById(id); if(el) el.textContent=v; }
function num(n) { return (n||0).toLocaleString('en-IN'); }
