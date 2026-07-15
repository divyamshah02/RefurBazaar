'use strict';
/* customers.js */

let _cuCsrf, _cuUrls, _cuPage = 1, _cuPageSize = 20;

/* ─── Entry ─────────────────────────────────────────────────────── */
function InitCustomers(csrf, urls) {
  _cuCsrf = csrf; _cuUrls = urls;
  loadStats();
  loadList();

  let debounce;
  document.getElementById('q').addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { _cuPage=1; loadList(); }, 320);
  });
  document.getElementById('f-orders').addEventListener('change', () => { _cuPage=1; loadList(); });
  document.getElementById('f-active').addEventListener('change', () => { _cuPage=1; loadList(); });
}

/* ─── Stats ─────────────────────────────────────────────────────── */
async function loadStats() {
  const [ok, res] = await callApi('GET', _cuUrls.statsUrl, null, _cuCsrf);
  if (!ok || !res.success) return;
  const d = res.data;
  set('s-total',      num(d.total_customers));
  set('s-with-orders', num(d.customers_with_orders));
  set('s-new-month',  num(d.customers_new_month ?? d.new_customers_this_month));
  set('s-inactive',   num(d.inactive_customers));
}

/* ─── List ──────────────────────────────────────────────────────── */
async function loadList() {
  const body = document.getElementById('tbl-body');
  body.innerHTML = `<tr><td colspan="6" style="padding:36px;text-align:center">
    <div class="skeleton" style="height:13px;width:50%;margin:0 auto 10px"></div>
    <div class="skeleton" style="height:13px;width:35%;margin:0 auto"></div>
  </td></tr>`;

  const params = new URLSearchParams({ page: _cuPage, page_size: _cuPageSize });
  const q       = document.getElementById('q').value.trim();
  const orders  = document.getElementById('f-orders').value;
  const active  = document.getElementById('f-active').value;
  if (q)      params.set('search', q);
  if (orders) params.set('has_orders', orders);
  if (active) params.set('is_active', active);

  const [ok, res] = await callApi('GET', `${_cuUrls.listUrl}?${params}`, null, _cuCsrf);
  if (!ok || !res.success) {
    body.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><h4>Failed to load customers</h4></div></td></tr>`;
    return;
  }

  const data = res.data;
  const rows = data.results || data || [];
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-users"></i><h4>No customers found</h4><p>Try adjusting your search or filters</p></div></td></tr>`;
    renderPag(0); return;
  }

  body.innerHTML = rows.map(c => {
    const name     = `${c.first_name||''} ${c.last_name||''}`.trim() || 'Unknown';
    const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const color    = avatarColor(name);
    const isActive = c.is_active !== false;
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar" style="background:${color};flex-shrink:0">${initials}</div>
          <div>
            <div class="fw-600">${name}</div>
            <div class="text-muted fs-12">${c.email || '—'}</div>
          </div>
        </div>
      </td>
      <td class="mono">${c.phone || c.contact_number || '—'}</td>
      <td class="fw-600">${(c.total_orders || 0).toLocaleString('en-IN')}</td>
      <td class="fw-600">${fmtCurrency(c.total_spent || 0)}</td>
      <td><span class="badge ${isActive ? 'badge-green' : 'badge-gray'}">${isActive ? 'Active' : 'Inactive'}</span></td>
      <td class="text-muted fs-12">${fmtDate(c.date_joined || c.created_at)}</td>
    </tr>`;
  }).join('');

  renderPag(data.count || rows.length);
}

/* ─── Pagination ────────────────────────────────────────────────── */
function renderPag(total) {
  const pages = Math.ceil(total / _cuPageSize);
  const info  = document.getElementById('pag-info');
  const btns  = document.getElementById('pag-btns');
  const start = (_cuPage-1)*_cuPageSize+1;
  const end   = Math.min(_cuPage*_cuPageSize, total);
  info.textContent = total ? `Showing ${start}–${end} of ${total}` : '';
  if (pages <= 1) { btns.innerHTML=''; return; }
  btns.innerHTML = `
    <button class="btn btn-ghost btn-sm" ${_cuPage===1?'disabled':''} onclick="_cuPage--;loadList()"><i class="fa-solid fa-chevron-left"></i></button>
    <span class="text-muted fs-12" style="padding:0 6px;line-height:30px">Page ${_cuPage} of ${pages}</span>
    <button class="btn btn-ghost btn-sm" ${_cuPage>=pages?'disabled':''} onclick="_cuPage++;loadList()"><i class="fa-solid fa-chevron-right"></i></button>`;
}

function set(id, v) { const el=document.getElementById(id); if(el) el.textContent=v; }
function num(n) { return (n||0).toLocaleString('en-IN'); }
