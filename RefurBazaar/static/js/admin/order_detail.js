'use strict';

let _odCsrf, _odUrls, _odId, _odData;

const OD_STATUS = {
  pending:    { label: 'Pending Payment', cls: 'badge-yellow'  },
  confirmed:  { label: 'Confirmed',       cls: 'badge-blue'    },
  processing: { label: 'Processing',      cls: 'badge-orange'  },
  shipped:    { label: 'Shipped',         cls: 'badge-purple'  },
  delivered:  { label: 'Delivered',       cls: 'badge-green'   },
  cancelled:  { label: 'Cancelled',       cls: 'badge-red'     },
};

/* ── Init ─────────────────────────────────────────────────────────── */
function InitOrderDetail(csrf, oid, urls) {
  _odCsrf = csrf;
  _odId   = oid;
  _odUrls = urls;
  loadOrder();
}

async function loadOrder() {
  const [ok, res] = await callApi('GET', _odUrls.detailUrl, null, _odCsrf);
  if (!ok || !res.success) {
    showToast('Failed to load order', 'error');
    return;
  }
  _odData = res.data;
  renderOrder(res.data);
}

/* ── Main render ──────────────────────────────────────────────────── */
function renderOrder(o) {
  const oid  = o.order_id || o.id || '—';
  const s    = o.status   || 'pending';
  const m    = OD_STATUS[s] || { label: s, cls: 'badge-gray' };
  const paid = o.payment_received;
  const cust = `${o.first_name || ''} ${o.last_name || ''}`.trim() || '—';

  /* ── Header breadcrumb + status badge ── */
  set('od-crumb', oid);
  set('od-sub',   `Placed ${fmtDateTime(o.created_at)}`);
  html('od-status-badge', `<span class="badge ${m.cls}">${m.label}</span>`);
  show('od-update-btn');

  /* ── Order Items ─────────────────────────────────────────────── */
  const items   = o.items || [];
  const itemsEl = document.getElementById('od-items-list');
  set('od-item-count', `${items.length} item${items.length !== 1 ? 's' : ''}`);

  if (items.length) {
    itemsEl.innerHTML = items.map(renderItem).join('');
  } else {
    itemsEl.innerHTML = `<div class="empty-state" style="padding:32px">
      <i class="fa-solid fa-box"></i><h4>No items found</h4>
    </div>`;
  }

  /* ── Shipping Address ────────────────────────────────────────── */
  set('od-addr-name',     cust);
  set('od-addr-phone',    o.phone          || '—');
  set('od-addr-altphone', o.alternate_phone || '—');
  set('od-addr-street',   o.shipping_address || '—');
  set('od-addr-city',     o.shipping_city    || '—');
  set('od-addr-state',    o.shipping_state   || '—');
  set('od-addr-pin',      o.shipping_pincode || '—');

  /* ── Billing Address (only if different) ────────────────────── */
  if (o.different_billing_address) {
    const billName = `${o.billing_first_name || ''} ${o.billing_last_name || ''}`.trim() || '—';
    set('od-bill-name',   billName);
    set('od-bill-phone',  o.billing_phone    || '—');
    set('od-bill-street', o.billing_address  || '—');
    set('od-bill-city',   o.billing_city     || '—');
    set('od-bill-state',  o.billing_state    || '—');
    set('od-bill-pin',    o.billing_pincode  || '—');
    show('od-billing-panel');
  }

  /* ── Delivery & Notes ────────────────────────────────────────── */
  set('od-delivery-date', o.delivery_date  ? fmtDate(o.delivery_date) : '—');
  set('od-timeslot',      o.timeslot_id    || '—');
  set('od-special',       o.special_instructions || '—');
  set('od-order-note',    o.order_note     || '—');

  /* ── Order Summary sidebar ───────────────────────────────────── */
  set('od-id',     oid);
  set('od-number', o.order_number ? `#${o.order_number}` : '—');
  html('od-meta-status', `<span class="badge ${m.cls}">${m.label}</span>`);
  set('od-date',    fmtDateTime(o.created_at));
  set('od-updated', fmtDateTime(o.updated_at));

  /* ── Payment sidebar ─────────────────────────────────────────── */
  set('od-payment-method', o.payment_method_display || o.payment_method || '—');
  html('od-payment-status', `<span class="badge ${paid ? 'badge-green' : 'badge-yellow'}">${paid ? 'Received' : 'Pending'}</span>`);

  if (o.razorpay_order_id) {
    set('od-rp-order-id', o.razorpay_order_id);
    show('od-rpid-row');
  }
  if (o.razorpay_payment_id) {
    set('od-rp-payment-id', o.razorpay_payment_id);
    show('od-rppid-row');
  }

  set('od-subtotal', fmtCurrency(o.subtotal_amount));
  set('od-shipping', fmtCurrency(o.delivery_charge || 0));

  const tax = parseFloat(o.tax_amount || 0);
  if (tax > 0) {
    set('od-tax', fmtCurrency(tax));
    show('od-tax-row');
  }

  const discount = parseFloat(o.discount_amount || 0);
  if (discount > 0) {
    set('od-discount', `− ${fmtCurrency(discount)}`);
    show('od-discount-row');
  }

  const couponDisc = parseFloat(o.coupon_discount || 0);
  if (couponDisc > 0 || o.coupon_code) {
    set('od-coupon-code',     o.coupon_code || '—');
    set('od-coupon-discount', `− ${fmtCurrency(couponDisc)}`);
    show('od-coupon-row');
  }

  set('od-total', fmtCurrency(o.total_amount));

  /* ── Customer sidebar ────────────────────────────────────────── */
  const av       = document.getElementById('od-cust-avatar');
  const initials = cust.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  av.textContent    = initials;
  av.style.background = avatarColor(cust);

  set('od-cust-name',     cust);
  set('od-cust-email',    o.email           || '—');
  set('od-cust-phone',    o.phone           || '—');
  set('od-cust-altphone', o.alternate_phone || '—');
}

/* ── Render a single order item row ──────────────────────────────── */
function renderItem(it) {
  const name       = `${it.brand_name || ''} ${it.model_name || ''}`.trim() || '—';
  const img        = it.product_image || '';
  const price      = fmtCurrency(it.price_at_purchase);
  const condition  = it.condition_at_purchase || '—';
  const imei       = it.device_imei || '';
  const fulStatus  = it.fulfillment_status_display || it.fulfillment_status || '—';
  const notes      = it.verification_notes || '';
  const photos     = it.device_photos || [];
  const unit       = it.listing_unit  || {};
  const unitAttrs  = unit.attributes  || [];
  const unitNo     = unit.unit_number ? `Unit #${unit.unit_number}` : '';

  /* Product image thumbnail */
  const thumb = img
    ? `<img src="${img}" alt="${name}"
           style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:pointer;flex-shrink:0"
           onclick="openLightbox('${escStr(img)}')" />`
    : `<div style="width:56px;height:56px;border-radius:8px;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0">
         <i class="fa-solid fa-image" style="color:var(--border)"></i>
       </div>`;

  /* Unit attribute chips */
  const attrChips = unitAttrs.length
    ? unitAttrs.map(a =>
        `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--bg);border:1px solid var(--border-light);border-radius:20px;padding:2px 9px;font-size:11px;color:var(--text-secondary)">
           <span class="text-muted">${escStr(a.attribute_name)}:</span> ${escStr(a.value)}
         </span>`
      ).join('')
    : '';

  /* Device photos strip */
  const photoStrip = photos.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">
        ${photos.map(p => {
          const url = p.photo_url || p.photo || '';
          return url
            ? `<img src="${url}" alt="Device photo"
                    style="width:52px;height:52px;object-fit:cover;border-radius:6px;border:1px solid var(--border);cursor:pointer"
                    onclick="openLightbox('${escStr(url)}')" />`
            : '';
        }).join('')}
      </div>`
    : '';

  /* Fulfillment badge */
  const fulCls = {
    pending: 'badge-yellow', packed: 'badge-blue', shipped: 'badge-purple',
    delivered: 'badge-green', rejected: 'badge-red'
  }[it.fulfillment_status] || 'badge-gray';

  return `
  <div style="padding:16px 20px;border-bottom:1px solid var(--border-light)">
    <div style="display:flex;gap:14px;align-items:flex-start">
      ${thumb}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
          <span class="fw-600 fs-13">${escStr(name)}</span>
          ${unitNo ? `<span class="text-muted fs-12">${escStr(unitNo)}</span>` : ''}
          <span class="badge ${fulCls}" style="margin-left:auto">${escStr(fulStatus)}</span>
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:6px">
          <span class="text-muted fs-12">Condition: <strong style="color:var(--text-primary)">${escStr(condition)}</strong></span>
          ${imei ? `<span class="text-muted fs-12">IMEI: <span class="mono" style="color:var(--text-primary)">${escStr(imei)}</span></span>` : ''}
        </div>
        ${attrChips ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px">${attrChips}</div>` : ''}
        ${notes ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px"><i class="fa-solid fa-note-sticky" style="margin-right:4px"></i>${escStr(notes)}</div>` : ''}
        ${photoStrip}
      </div>
      <div class="fw-600 fs-13" style="white-space:nowrap;margin-left:8px">${price}</div>
    </div>
  </div>`;
}

/* ── Status update modal ─────────────────────────────────────────── */
function openStatusModal() {
  if (!_odData) return;
  const s = _odData.status || 'pending';
  const p = _odData.payment_received ? '1' : '0';
  document.getElementById('sm-status').value  = s;
  document.getElementById('sm-payment').value = p;
  set('sm-order-id-label', `Order ${_odData.order_id || ''}`);
  openModal('status-modal');
}

async function saveOrderStatus() {
  const status           = document.getElementById('sm-status').value;
  const payment_received = document.getElementById('sm-payment').value === '1';
  const btn              = document.getElementById('sm-save-btn');

  btn.disabled    = true;
  btn.textContent = 'Saving…';

  const [ok, res] = await callApi('PATCH', _odUrls.updateUrl, { status, payment_received }, _odCsrf);

  btn.disabled    = false;
  btn.textContent = 'Save Changes';

  if (ok && res.success) {
    closeModal('status-modal');
    _odData = res.data;
    renderOrder(res.data);
    showToast('Order updated successfully', 'success');
  } else {
    showToast(res?.error || 'Failed to update order', 'error');
  }
}

/* ── Lightbox ────────────────────────────────────────────────────── */
function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  openModal('lightbox');
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function set(id, v)  { const el = document.getElementById(id); if (el) el.textContent = v ?? '—'; }
function html(id, v) { const el = document.getElementById(id); if (el) el.innerHTML   = v; }
function show(id)    { const el = document.getElementById(id); if (el) el.style.display = ''; }

function escStr(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function fmtCurrency(v) {
  const n = parseFloat(v || 0);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtDate(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return s; }
}

function fmtDateTime(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return s; }
}
