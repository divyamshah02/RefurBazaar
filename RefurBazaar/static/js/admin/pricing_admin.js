'use strict';
/* pricing_admin.js — category commission configuration */

const PricingAdmin = (() => {
  let csrf, base, rows = [];
  const draft = {}; // category -> {commission_type, value, is_active}

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rowFor = cat => rows.find(r => r.category === cat);

  async function init(csrfToken, baseUrl) {
    csrf = csrfToken; base = baseUrl;
    document.getElementById('pc-calc-price').addEventListener('input', renderCalc);
    document.getElementById('pc-calc-cat').addEventListener('change', renderCalc);
    await load();
  }

  async function load() {
    const [ok, res] = await callApi('GET', base, null, csrf);
    if (!ok || !res.success) { showToast('Failed to load commission rules', 'error'); return; }
    rows = res.data;
    rows.forEach(r => { draft[r.category] = { commission_type: r.commission_type, value: r.value, is_active: r.is_active }; });
    render();
    const sel = document.getElementById('pc-calc-cat');
    const current = sel.value;
    sel.innerHTML = rows.map(r => `<option value="${esc(r.category)}">${esc(r.label)}</option>`).join('');
    if (current) sel.value = current;
    renderCalc();
  }

  function isDirty(r) {
    const d = draft[r.category];
    return d.commission_type !== r.commission_type || Number(d.value) !== Number(r.value) || d.is_active !== r.is_active || !r.configured;
  }

  function render() {
    document.getElementById('pc-tbody').innerHTML = rows.map(r => {
      const d = draft[r.category];
      const dirty = isDirty(r) && r.configured;
      const isPct = d.commission_type === 'percentage';
      return `<tr class="${dirty ? 'pc-row-dirty' : ''}" data-cat="${esc(r.category)}">
        <td>
          <div class="fw-600">${esc(r.label)}</div>
          <div class="text-muted fs-12">${r.configured ? 'Updated ' + fmtDate(r.updated_at) : 'No rule set'}</div>
        </td>
        <td>
          <div class="pc-type">
            <button type="button" class="${isPct ? 'on' : ''}" onclick="PricingAdmin.setType('${esc(r.category)}','percentage')">%</button>
            <button type="button" class="${!isPct ? 'on' : ''}" onclick="PricingAdmin.setType('${esc(r.category)}','flat')">₹ Flat</button>
          </div>
        </td>
        <td>
          <input type="number" min="0" ${isPct ? 'max="100"' : ''} step="0.01" class="form-input pc-value" value="${esc(d.value)}"
                 oninput="PricingAdmin.setValue('${esc(r.category)}', this.value)" aria-label="Commission value for ${esc(r.label)}" />
        </td>
        <td>
          <label class="pc-switch"><input type="checkbox" ${d.is_active ? 'checked' : ''} onchange="PricingAdmin.setActive('${esc(r.category)}', this.checked)" /><span></span></label>
        </td>
        <td>
          <div class="fw-600">${r.unit_count}</div>
          ${r.override_count ? `<div class="text-muted fs-12">${r.override_count} custom</div>` : ''}
        </td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn btn-primary btn-sm" onclick="PricingAdmin.save('${esc(r.category)}')" ${!isDirty(r) ? 'disabled' : ''}>Save</button>
          <button class="btn btn-ghost btn-sm" onclick="PricingAdmin.askReprice('${esc(r.category)}')" ${r.configured || r.category === 'default' ? '' : 'disabled'} title="Re-price existing unsold units">Re-price</button>
          ${r.configured && r.category !== 'default' ? `<button class="btn btn-icon btn-sm" onclick="PricingAdmin.remove('${esc(r.category)}')" title="Remove rule (fall back to Default)"><i class="fa-solid fa-rotate-left"></i></button>` : ''}
        </td>
      </tr>`;
    }).join('');
  }

  function setType(cat, type) { draft[cat].commission_type = type; render(); renderCalc(); }
  function setValue(cat, v) {
    draft[cat].value = v;
    const r = rowFor(cat);
    const row = document.querySelector(`tr[data-cat="${cat}"]`);
    if (row) {
      row.classList.toggle('pc-row-dirty', isDirty(r) && r.configured);
      const btn = row.querySelector('.btn-primary');
      if (btn) btn.disabled = !isDirty(r);
    }
    renderCalc();
  }
  function setActive(cat, on) { draft[cat].is_active = on; render(); renderCalc(); }

  async function save(cat) {
    const d = draft[cat];
    const [ok, res] = await callApi('POST', base, { category: cat, commission_type: d.commission_type, value: d.value, is_active: d.is_active }, csrf);
    if (!ok || !res.success) { showToast(res?.error || 'Could not save rule', 'error'); return; }
    showToast('Commission rule saved. Applies to new listings.', 'success');
    await load();
  }

  async function remove(cat) {
    if (!confirm('Remove this rule? The category will use the Default rule.')) return;
    const [ok, res] = await callApi('DELETE', `${base}${cat}/`, null, csrf);
    if (!ok || !res.success) { showToast('Could not remove rule', 'error'); return; }
    showToast('Rule removed', 'success');
    await load();
  }

  function askReprice(cat) {
    const r = rowFor(cat);
    const scope = cat === 'default' ? 'all categories' : r.label;
    document.getElementById('reprice-sub').textContent = scope;
    document.getElementById('reprice-body').innerHTML =
      `Every unsold unit in <strong>${esc(scope)}</strong> will have its commission recalculated from the saved rule (units with a custom commission keep it). The refurbisher's own price is never changed.`;
    document.getElementById('reprice-confirm').onclick = () => reprice(cat);
    openModal('modal-reprice');
  }

  async function reprice(cat) {
    const btn = document.getElementById('reprice-confirm');
    btn.disabled = true;
    const [ok, res] = await callApi('POST', `${base}recalculate/`, { category: cat === 'default' ? 'all' : cat }, csrf);
    btn.disabled = false;
    closeModal('modal-reprice');
    if (!ok || !res.success) { showToast(res?.error || 'Re-pricing failed', 'error'); return; }
    showToast(`${res.data.updated} of ${res.data.checked} units re-priced`, 'success');
    await load();
  }

  function renderCalc() {
    const cat = document.getElementById('pc-calc-cat').value;
    const base_ = parseFloat(document.getElementById('pc-calc-price').value) || 0;
    if (!cat || !draft[cat]) return;
    // Mirror the backend: category rule if active, otherwise Default rule.
    const rule = (draft[cat].is_active && rowFor(cat).configured) ? draft[cat] : (draft.default.is_active ? draft.default : { commission_type: 'percentage', value: 0 });
    const v = parseFloat(rule.value) || 0;
    const com = rule.commission_type === 'flat' ? v : base_ * v / 100;
    document.getElementById('pc-calc-ref').textContent = fmtCurrency(base_);
    document.getElementById('pc-calc-com').textContent = fmtCurrency(com);
    document.getElementById('pc-calc-total').textContent = fmtCurrency(base_ + com);
  }

  return { init, setType, setValue, setActive, save, remove, askReprice };
})();
