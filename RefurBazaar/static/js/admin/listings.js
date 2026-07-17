'use strict';
/* listings.js — list page */

let _lsCsrf, _lsUrls, _lsPage = 1, _lsPageSize = 20;

const LISTING_STATUS = {
  active:   { label:'Active',    cls:'badge-green'  },
  draft:    { label:'Draft',     cls:'badge-gray'   },
  sold:     { label:'Sold Out',  cls:'badge-orange' },
  inactive: { label:'Inactive',  cls:'badge-red'    },
};
function listingBadge(s) {
  const m = LISTING_STATUS[s] || { label: s||'—', cls:'badge-gray' };
  return `<span class="badge ${m.cls}">${m.label}</span>`;
}

/* ─── Entry ─────────────────────────────────────────────────────── */
function InitListings(csrf, urls) {
  _lsCsrf = csrf; _lsUrls = urls;
  loadStats();
  loadList();

  let debounce;
  document.getElementById('q').addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { _lsPage = 1; loadList(); }, 320);
  });
  document.getElementById('f-status').addEventListener('change',   () => { _lsPage=1; loadList(); });
  document.getElementById('f-category').addEventListener('change', () => { _lsPage=1; loadList(); });
}

/* ─── Stats ─────────────────────────────────────────────────────── */
async function loadStats() {
  const [ok, res] = await callApi('GET', _lsUrls.statsUrl, null, _lsCsrf);
  if (!ok || !res.success) return;
  const d = res.data;
  set('s-total',  num(d.total_listings  ?? d.listings_total));
  set('s-active', num(d.active_listings ?? d.listings_active));
  set('s-draft',  num(d.draft_listings  ?? d.listings_draft));
  set('s-sold',   num(d.sold_listings   ?? d.listings_sold));
}

/* ─── List ──────────────────────────────────────────────────────── */
async function loadList() {
  const body = document.getElementById('tbl-body');
  body.innerHTML = `<tr><td colspan="8" style="padding:36px;text-align:center">
    <div class="skeleton" style="height:13px;width:50%;margin:0 auto 10px"></div>
    <div class="skeleton" style="height:13px;width:35%;margin:0 auto"></div>
  </td></tr>`;

  const params = new URLSearchParams({ page: _lsPage, page_size: _lsPageSize });
  const q    = document.getElementById('q').value.trim();
  const st   = document.getElementById('f-status').value;
  const cat  = document.getElementById('f-category').value;
  if (q)   params.set('search', q);
  if (st)  params.set('status', st);
  if (cat) params.set('category', cat);

  const [ok, res] = await callApi('GET', `${_lsUrls.listUrl}?${params}`, null, _lsCsrf);
  if (!ok || !res.success) {
    body.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><h4>Failed to load</h4></div></td></tr>`;
    return;
  }

  const data = res.data;
  const rows = data.results || data || [];
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-layer-group"></i><h4>No listings found</h4><p>Try adjusting your search or filters</p></div></td></tr>`;
    renderPag(0); return;
  }
  console.log('Listings:', rows.length, 'rows');
  console.log('Listings data:', rows);
  
  let listing_table_data = rows.map((l, index) => {
  // let listing_table_data = rows.map(l => {
    try {
      const product   = `${l.brand_name||''} ${l.model_name||''}`.trim() || '—';
      const refurName = `${l.refurbisher_first_name||''} ${l.refurbisher_last_name||''}`.trim() || '—';
      const s         = l.status || 'draft';
      const lid       = l.listing_id || l.id;
  
      // Compute price from units array (cheapest available unit)
      const unitPrices = (l.units || []).map(u => parseFloat(u.price)).filter(p => !isNaN(p));
      const priceStr   = unitPrices.length
        ? fmtCurrency(Math.min(...unitPrices))
        : '—';
      console.log(product);
      console.log(refurName);
      console.log(s);
      console.log(lid);
      console.log(unitPrices);
      console.log(priceStr);
      return `<tr>
        <td>
          <div class="fw-600">${product}</div>
          <div class="text-muted fs-12 mono">${lid}</div>
        </td>
        <td>${refurName}</td>
        <td>${l.category || '—'}</td>
        <td class="fw-600">${priceStr}</td>
        <td>${l.total_quantity ?? '—'}</td>
        <td>${listingBadge(s)}</td>
        <td class="text-muted fs-12">${fmtDate(l.created_at)}</td>
        <td><div style="display:flex;gap:6px;justify-content:flex-end">
          <a href="/admin-listing-detail/${lid}/" class="btn btn-ghost btn-sm"><i class="fa-solid fa-eye"></i> View</a>
        </div></td>
      </tr>`;
    } catch(err) {
        console.error("Error on row", index, l, err);
        return "";
    }
  }).join('');

  console.log('Listing table data:', listing_table_data);
  body.innerHTML = listing_table_data

  renderPag(data.count || rows.length);
}

/* ─── Pagination ────────────────────────────────────────────────── */
function renderPag(total) {
  const pages = Math.ceil(total / _lsPageSize);
  const info  = document.getElementById('pag-info');
  const btns  = document.getElementById('pag-btns');
  const start = (_lsPage-1)*_lsPageSize+1;
  const end   = Math.min(_lsPage*_lsPageSize, total);
  info.textContent = total ? `Showing ${start}–${end} of ${total}` : '';
  if (pages <= 1) { btns.innerHTML=''; return; }
  btns.innerHTML = `
    <button class="btn btn-ghost btn-sm" ${_lsPage===1?'disabled':''} onclick="_lsPage--;loadList()"><i class="fa-solid fa-chevron-left"></i></button>
    <span class="text-muted fs-12" style="padding:0 6px;line-height:30px">Page ${_lsPage} of ${pages}</span>
    <button class="btn btn-ghost btn-sm" ${_lsPage>=pages?'disabled':''} onclick="_lsPage++;loadList()"><i class="fa-solid fa-chevron-right"></i></button>`;
}

function set(id, v) { const el=document.getElementById(id); if(el) el.textContent=v; }
function num(n) { return (n||0).toLocaleString('en-IN'); }
