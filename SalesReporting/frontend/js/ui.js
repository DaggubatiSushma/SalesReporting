// ============================================================
//  ui.js – Shared UI utilities: modal, toast, table helpers
// ============================================================

// ---- Formatting ----
function formatEditableNumber(n) {
  const v = parseFloat(n) || 0;
  return Math.abs(v) < 0.0000001 ? '0' : v.toFixed(2);
}

function fmt(n) {
  const v = parseFloat(n) || 0;
  if (Math.abs(v) < 0.0000001) return '0';
  return v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtPct(n) {
  const v = parseFloat(n) || 0;
  return `${Math.abs(v) < 0.0000001 ? '0' : v.toFixed(2)}%`;
}
function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${m}/${day}/${y}`;
}
function sumField(arr, field) {
  return arr.reduce((s, r) => s + (parseFloat(r[field]) || 0), 0);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

// ---- Toast ----
function showToast(msg, type = 'success') {
  const tc = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${msg}</span>`;
  tc.appendChild(t);
  setTimeout(() => t.classList.add('toast-show'), 10);
  setTimeout(() => {
    t.classList.remove('toast-show');
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

// ---- Modal ----
let _modalCallback = null;

function openModal(title, fields, values = {}, callback) {
  document.getElementById('modalTitle').textContent = title;
  _modalCallback = callback;

  const body = document.getElementById('modalBody');
  body.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'modal-form-grid';

  fields.forEach(f => {
    const g = document.createElement('div');
    g.className = 'form-group' + (f.wide ? ' col-span-2' : '');

    const lbl = document.createElement('label');
    lbl.textContent = f.label;
    lbl.htmlFor = 'mf_' + f.name;

    let input;
    if (f.type === 'select') {
      input = document.createElement('select');
      input.className = 'form-control';
      (f.options || []).forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value ?? opt;
        o.textContent = opt.label ?? opt;
        input.appendChild(o);
      });
    } else {
      input = document.createElement('input');
      input.type = f.type || 'text';
      if (f.step) input.step = f.step;
      if (f.placeholder) input.placeholder = f.placeholder;
      if (f.readonly) input.readOnly = true;
      input.className = 'form-control';
    }

    input.id = 'mf_' + f.name;
    input.name = f.name;
    if (f.required) input.required = true;

    const val = values[f.name];
    if (val !== undefined && val !== null) input.value = val;
    else if (f.defaultValue !== undefined) input.value = f.defaultValue;

    // Auto-compute helper totals used by multiple modal forms
    if (f.name === 'amount' || f.name === 'hst' || f.name === 'sales') {
      input.addEventListener('input', () => computeTotal(body));
    }

    g.appendChild(lbl);
    g.appendChild(input);
    body.appendChild(g);
  });

  // compute initial total
  computeTotal(body);

  document.getElementById('modalOverlay').classList.add('active');
  const first = body.querySelector('input:not([readonly]), select');
  if (first) first.focus();
}

function computeTotal(body) {
  const totalEl = body.querySelector('[name="total"]');
  if (!totalEl) return;

  const salesEl = body.querySelector('[name="sales"]');
  if (salesEl) {
    const sales = parseFloat(salesEl.value) || 0;
    const hst = parseFloat(body.querySelector('[name="hst"]')?.value) || 0;
    totalEl.value = formatEditableNumber(sales + hst);
    return;
  }

  const amt = parseFloat(body.querySelector('[name="amount"]')?.value) || 0;
  const hst = parseFloat(body.querySelector('[name="hst"]')?.value) || 0;
  totalEl.value = formatEditableNumber(amt + hst);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  _modalCallback = null;
}

function getModalValues() {
  const body = document.getElementById('modalBody');
  const inputs = body.querySelectorAll('input, select');
  const vals = {};
  inputs.forEach(i => { vals[i.name] = i.value; });
  return vals;
}

function validateModal() {
  const body = document.getElementById('modalBody');
  const inputs = body.querySelectorAll('[required]');
  let ok = true;
  inputs.forEach(i => {
    if (!i.value.trim()) {
      i.classList.add('invalid');
      ok = false;
    } else {
      i.classList.remove('invalid');
    }
  });
  return ok;
}

// ---- Table builder ----
function buildTable(tbodyId, rows, columns, actions = true) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!rows.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="${columns.length + (actions ? 1 : 0)}" class="empty-row">No records found</td>`;
    tbody.appendChild(tr);
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;

    columns.forEach(col => {
      const td = document.createElement('td');
      if (col.format === 'money')      td.textContent = fmt(row[col.field]);
      else if (col.format === 'date')  td.textContent = fmtDate(row[col.field]);
      else                              td.textContent = row[col.field] ?? '';
      if (col.class) td.className = col.class;
      tr.appendChild(td);
    });

    if (actions) {
      const td = document.createElement('td');
      td.className = 'actions-cell';
      td.innerHTML = `<button class="btn-icon btn-edit" title="Edit">✏️</button><button class="btn-icon btn-delete" title="Delete">🗑️</button>`;
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  });
}

function updateFooter(footerMap) {
  Object.entries(footerMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<strong>${val}</strong>`;
  });
}

// ---- Init modal button handlers ----
function initModal() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
  document.getElementById('modalSave').addEventListener('click', async () => {
    if (!validateModal()) {
      showToast('Please fill required fields', 'error');
      return;
    }
    if (_modalCallback) {
      try {
        await Promise.resolve(_modalCallback(getModalValues()));
        closeModal();
      } catch (error) {
        showToast(error.message || 'Unable to save record', 'error');
      }
    }
  });

  // ---- Prevent scroll from changing number input values ----
  // Handles both static and dynamically created inputs (modals etc.)
  document.addEventListener('wheel', () => {
    if (document.activeElement && document.activeElement.type === 'number') {
      document.activeElement.blur();
    }
  }, { passive: true });
}

// ---- Month/Year dropdown populators ----
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function populateYearSelect(selId, defaultYear) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  const cur = defaultYear || new Date().getFullYear();
  sel.innerHTML = '';
  for (let y = cur + 1; y >= cur - 5; y--) {
    const o = document.createElement('option');
    o.value = y;
    o.textContent = y;
    if (y === cur) o.selected = true;
    sel.appendChild(o);
  }
}

function populateMonthSelect(selId) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  sel.innerHTML = '';
  const cur = new Date().getMonth();
  MONTHS.forEach((m, i) => {
    const o = document.createElement('option');
    o.value = i + 1;
    o.textContent = m;
    if (i === cur) o.selected = true;
    sel.appendChild(o);
  });
}
