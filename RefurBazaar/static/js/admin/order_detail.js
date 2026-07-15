'use strict';
/* order_detail.js — completely rewritten */

let _odCsrf, _odUrls, _odId;

const OD_STATUS = {
  pending:    { label:'Pending',    cls:'badge-yellow'  },
  confirmed:  { label:'Confirmed',  cls:'badge-blue'    },
  processing: { label:'Processing', cls:'badge-orange'  },
  shipped:    { label:'Shipped',    cls:'badge-purple'  },
  delivered:  { label:'Delivered',  cls:'badge-green'   },
  cancelled:  { label:'Cancelled',  cls:'badge-red'     },
};

function InitOrderDetail(csrf, oid, urls) {
  _odCsrf = csrf; _odId = oid; _odUrls = urls;
  loadOrder();
}

async function loadOrder() {
  const [ok, res] = await callApi('GET', _odUrls.detailUrl, null, _odCsrf);
  if (!ok || !res.success) { showToast('Failed to load order', 'error'); return; }
  renderOrder(res.data);
}

function renderOrder(o) {
  const oid   = o.order_id || o.id;
  const s     = o.status || 'pending';
  const m     = OD_STATUS[s] || { label: s, cls:'badge-gray' };
  const paid  = o.is_paid || o.payment_status === 'paid';
  const cust  = `${o.first_name||o.customer_first_name||''} ${o.last_name||o.customer_last_name||''}`.trim() || '—';

  /* Header */
  set('od-crumb', oid);
  set('od-sub',   `Placed ${fmtDate(o.created_at)}`);
  document.getElementById('od-status-badge').innerHTML = `<span class="badge ${m.cls}">${m.label}</span>`;

  /* Order items */
  const items = o.items || o.order_items || [];
  const itemsEl = document.getElementById('od-items-list');
  set('od-item-count', `${items.length} item${items.length !== 1 ? 's' : ''}`);
  if (items.length) {
    itemsEl.innerHTML = items.map(it => {
      const name   = `${it.brand_name||''} ${it.model_name||''}`.trim() || it.product_name || it.title || '—';
      const img    = it.image || it.photo || '';
      const thumb  = img
        ? `<img src="${img}" alt="${name}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:pointer" onclick="openLightbox('${img}')" />`
        : `<div style="width:50px;height:50px;border-radius:8px;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-image" style="color:var(--text-muted)"></i></div>`;
      return `<div style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid var(--border-light)">
        ${thumb}
        <div style="flex:1;min-width:0">
          <div class="fw-600 truncate">${name}</div>
          <div class="text-muted fs-12">Qty: ${it.quantity ?? 1} &nbsp;·&nbsp; Grade: ${it.grade || '—'}</div>
          ${it.imei ? `<div class="text-muted fs-12 mono">IMEI: ${it.imei}</div>` : ''}
        </div>
        <div class="fw-600" style="white-space:nowrap">${fmtCurrency(it.price)}</div>
      </div>`;
    }).join('');
  } else {
    itemsEl.innerHTML = `<div class="empty-state" style="padding:32px"><i class="fa-solid fa-box"></i><h4>No items</h4></div>`;
  }

  /* Shipping address */
  const addr = o.shipping_address || o.address || {};
  set('od-addr-name',   addr.full_name || cust);
  set('od-addr-phone',  addr.phone || o.phone || '—');
  set('od-addr-street', addr.street || addr.address_line1 || '—');
  set('od-addr-city',   addr.city   || '—');
  set('od-addr-state',  addr.state  || '—');
  set('od-addr-pin',    addr.pin    || addr.pincode || addr.zip || '—');

  /* Summary sidebar */
  set('od-id', oid);
  document.getElementById('od-meta-status').innerHTML    = `<span class="badge ${m.cls}">${m.label}</span>`;
  document.getElementById('od-payment-status').innerHTML = `<span class="badge ${paid ? 'badge-green' : 'badge-yellow'}">${paid ? 'Paid' : 'Unpaid'}</span>`;
  set('od-payment-method', o.payment_method || '—');
  set('od-subtotal',  fmtCurrency(o.subtotal  || o.total_amount));
  set('od-shipping',  fmtCurrency(o.shipping_charge || 0));
  set('od-total',     fmtCurrency(o.total_amount));
  set('od-date',      fmtDateTime(o.created_at));
  set('od-updated',   fmtDateTime(o.updated_at));

  /* Customer sidebar */
  const custColor  = avatarColor(cust);
  const custInitials = cust.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const av = document.getElementById('od-cust-avatar');
  av.textContent = custInitials; av.style.background = custColor;
  set('od-cust-name',  cust);
  set('od-cust-email', o.email || o.customer_email || '—');
  set('od-cust-phone', o.phone || o.customer_phone || '—');
}

function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  openModal('lightbox');
}

function set(id, v) { const el=document.getElementById(id); if(el) el.textContent=v; }

