// ============================================================
//  lcboEntry.js – LCBO top-level module
// ============================================================

const LCBOModule = (() => {
  const LCBO_COLS = [
    { field: 'date', format: 'date' },
    { field: 'vendorName', class: 'vendor-wrap' },
    { field: 'invoiceNo' },
    { field: 'creditEnding' },
    { field: 'amount', format: 'money', class: 'text-right' },
    { field: 'hst', format: 'money', class: 'text-right' },
    { field: 'total', format: 'money', class: 'text-right' },
  ];

  const PAYMENT_COLS = [
    { field: 'date', format: 'date' },
    { field: 'purpose', class: 'vendor-wrap' },
    { field: 'amount', format: 'money', class: 'text-right' },
  ];

  const LCBO_MODAL_FIELDS = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'vendorName', label: 'Vendor', type: 'text', required: true, readonly: true },
    { name: 'invoiceNo', label: 'Invoice #', type: 'text', required: true },
    { name: 'creditEnding', label: 'Credit Ending', type: 'text', placeholder: 'Last digits' },
    { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true },
    { name: 'hst', label: 'HST', type: 'number', step: '0.01', defaultValue: '0' },
    { name: 'total', label: 'Total', type: 'number', step: '0.01', readonly: true },
  ];

  const PAYMENT_MODAL_FIELDS = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'purpose', label: 'Purpose', type: 'text', required: true, wide: true },
    { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true },
  ];

  let stores = [];
  let selectedStoreId = null;
  let selectedYear = new Date().getFullYear();
  let selectedMonth = new Date().getMonth() + 1;
  let monthState = null;
  const storeYearSummary = new Map();

  function el(id) {
    return document.getElementById(id);
  }

  function numeric(value) {
    return parseFloat(value) || 0;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function parseDateMonth(dateValue) {
    return parseInt(String(dateValue || '').slice(5, 7), 10) || 0;
  }

  function currentStore() {
    return stores.find(store => store.id === selectedStoreId) || null;
  }

  function selectedPeriodLabel() {
    return `${MONTHS[selectedMonth - 1]} ${selectedYear}`;
  }

  function defaultDateForSelection() {
    const now = new Date();
    if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1) return today();
    return `${selectedYear}-${pad(selectedMonth)}-01`;
  }

  function endDateForSelection() {
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    return `${selectedYear}-${pad(selectedMonth)}-${pad(lastDay)}`;
  }

  function computeStoreSummary(lcboRows, paymentRows) {
    const monthLcboTotals = Array(12).fill(0);
    const monthPaymentTotals = Array(12).fill(0);

    (lcboRows || []).forEach(row => {
      const monthIndex = parseDateMonth(row.date) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        monthLcboTotals[monthIndex] += numeric(row.amount) + numeric(row.hst);
      }
    });

    (paymentRows || []).forEach(row => {
      const monthIndex = parseDateMonth(row.date) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        monthPaymentTotals[monthIndex] += numeric(row.amount);
      }
    });

    const quarters = [];
    for (let q = 0; q < 4; q += 1) {
      const start = q * 3;
      const lcboTotal = monthLcboTotals[start] + monthLcboTotals[start + 1] + monthLcboTotals[start + 2];
      const ccTotal = monthPaymentTotals[start] + monthPaymentTotals[start + 1] + monthPaymentTotals[start + 2];
      quarters.push({
        quarterLabel: `Q${q + 1} (${MONTHS[start].slice(0, 3)}-${MONTHS[start + 2].slice(0, 3)})`,
        lcboTotal,
        ccTotal,
        diff: lcboTotal - ccTotal,
      });
    }

    const lcboYearTotal = monthLcboTotals.reduce((sum, value) => sum + value, 0);
    const ccYearTotal = monthPaymentTotals.reduce((sum, value) => sum + value, 0);
    return {
      monthLcboTotals,
      monthPaymentTotals,
      quarters,
      lcboYearTotal,
      ccYearTotal,
      yearDiff: lcboYearTotal - ccYearTotal,
    };
  }

  async function loadStores() {
    stores = await DataStore.getStores();
    if (!stores.length) {
      selectedStoreId = null;
      return;
    }
    if (!selectedStoreId || !stores.some(store => store.id === selectedStoreId)) {
      const activeStore = DataStore.getActiveStore();
      selectedStoreId = stores.some(store => store.id === activeStore) ? activeStore : stores[0].id;
    }
  }

  async function loadStoreYearSummary() {
    storeYearSummary.clear();
    await Promise.all(stores.map(async store => {
      const [lcboRows, ccRows] = await Promise.all([
        DataStore.getLCBOEntriesForStore(store.id, { year: selectedYear }),
        DataStore.getCCPaymentsForStore(store.id, { year: selectedYear }),
      ]);
      storeYearSummary.set(store.id, computeStoreSummary(lcboRows, ccRows));
    }));
  }

  async function refreshMonthState() {
    if (!selectedStoreId) {
      monthState = null;
      render();
      return;
    }
    monthState = await DataStore.getLCBOModuleMonth(selectedStoreId, selectedYear, selectedMonth);
    render();
  }

  async function refreshAllState() {
    await loadStores();
    await loadStoreYearSummary();
    syncStoreDropdowns();
    if (el('lcboYear')) el('lcboYear').value = selectedYear;
    await refreshMonthState();
  }

  function setLCBOFormTotal() {
    const amount = numeric(el('lcboFormAmount')?.value);
    const hst = numeric(el('lcboFormHst')?.value);
    const totalEl = el('lcboFormTotal');
    if (totalEl) totalEl.value = formatEditableNumber(amount + hst);
  }

  function syncStoreDropdowns() {
    const dropdownIds = ['lcboFormStore', 'lcboCcStore'];
    dropdownIds.forEach(id => {
      const select = el(id);
      if (!select) return;
      const currentValue = parseInt(select.value || '0', 10);
      select.innerHTML = '';
      stores.forEach(store => {
        const option = document.createElement('option');
        option.value = String(store.id);
        option.textContent = store.name;
        if (store.id === (currentValue || selectedStoreId)) option.selected = true;
        select.appendChild(option);
      });
      if (!select.value && selectedStoreId) select.value = String(selectedStoreId);
    });
  }

  function resetLCBOForm() {
    if (el('lcboFormStore') && selectedStoreId) el('lcboFormStore').value = String(selectedStoreId);
    if (el('lcboFormDate')) el('lcboFormDate').value = defaultDateForSelection();
    if (el('lcboFormVendor')) el('lcboFormVendor').value = 'LCBO';
    if (el('lcboFormInvoice')) el('lcboFormInvoice').value = '';
    if (el('lcboFormCreditEnding')) el('lcboFormCreditEnding').value = '';
    if (el('lcboFormAmount')) el('lcboFormAmount').value = '';
    if (el('lcboFormHst')) el('lcboFormHst').value = '0';
    setLCBOFormTotal();
  }

  function resetPaymentForm() {
    if (el('lcboCcStore') && selectedStoreId) el('lcboCcStore').value = String(selectedStoreId);
    if (el('lcboCcDate')) el('lcboCcDate').value = defaultDateForSelection();
    if (el('lcboCcPurpose')) el('lcboCcPurpose').value = '';
    if (el('lcboCcAmount')) el('lcboCcAmount').value = '';
  }

  function summaryForSelectedStore() {
    return storeYearSummary.get(selectedStoreId) || {
      monthLcboTotals: Array(12).fill(0),
      monthPaymentTotals: Array(12).fill(0),
      quarters: [],
      lcboYearTotal: 0,
      ccYearTotal: 0,
      yearDiff: 0,
    };
  }

  function renderStoreOverview() {
    const container = el('lcboStoreOverviewRow');
    if (!container) return;
    const totalEl = el('lcboStoreOverviewTotal');
    if (!stores.length) {
      container.innerHTML = '<div class="empty-row">No stores found</div>';
      if (totalEl) totalEl.textContent = fmt(0);
      return;
    }

    let combined = 0;
    container.innerHTML = stores.map(store => {
      const summary = storeYearSummary.get(store.id);
      const total = summary ? summary.lcboYearTotal : 0;
      combined += total;
      const active = store.id === selectedStoreId ? 'active' : '';
      return `
        <button class="lcbo-store-tile ${active}" data-store-id="${store.id}">
          <strong>${escapeHtml(store.name)}</strong>
          <span>${fmt(total)}</span>
        </button>
      `;
    }).join('');
    if (totalEl) totalEl.textContent = fmt(combined);
  }

  function renderQuarterlySummary() {
    const title = el('lcboQuarterlyTitle');
    const tbody = el('lcboQuarterlyTbody');
    if (!tbody) return;
    const store = currentStore();
    const summary = summaryForSelectedStore();
    if (title) {
      title.textContent = `📊 Quarterly Summary${store ? ` - ${store.name} (${selectedYear})` : ''}`;
    }

    if (!store) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Select a store to view quarterly summary</td></tr>';
      updateFooter({
        lcboQuarterlyTotalLcbo: fmt(0),
        lcboQuarterlyTotalCc: fmt(0),
        lcboQuarterlyTotalDiff: fmt(0),
      });
      return;
    }

    tbody.innerHTML = summary.quarters.map(item => `
      <tr>
        <td class="lcbo-quarter-cell">${item.quarterLabel}</td>
        <td class="text-right">${fmt(item.lcboTotal)}</td>
        <td class="text-right">${fmt(item.ccTotal)}</td>
        <td class="text-right ${item.diff < 0 ? 'lcbo-diff-negative' : 'lcbo-diff-positive'}">${fmt(item.diff)}</td>
      </tr>
    `).join('');
    updateFooter({
      lcboQuarterlyTotalLcbo: fmt(summary.lcboYearTotal),
      lcboQuarterlyTotalCc: fmt(summary.ccYearTotal),
      lcboQuarterlyTotalDiff: fmt(summary.yearDiff),
    });
  }

  function renderMonthCards() {
    const container = el('lcboMonthCards');
    if (!container) return;
    const summary = summaryForSelectedStore();
    container.innerHTML = MONTHS.map((monthName, index) => {
      const month = index + 1;
      const total = summary.monthLcboTotals[index] || 0;
      const active = month === selectedMonth ? 'active' : '';
      return `
        <button class="lcbo-month-card ${active}" data-month="${month}">
          <strong>${monthName.slice(0, 3)}</strong>
          <span>${fmt(total)}</span>
        </button>
      `;
    }).join('');
  }

  function renderPeriodLabel() {
    const label = el('lcboSelectedPeriod');
    if (!label) return;
    const store = currentStore();
    label.textContent = store ? `${store.name} - ${selectedPeriodLabel()}` : selectedPeriodLabel();
  }

  function renderMonthlyTables() {
    const lcboRows = monthState?.lcboRecords || [];
    const paymentRows = monthState?.creditCardPayments || [];
    buildTable('lcboModuleRecordsTbody', lcboRows, LCBO_COLS);
    buildTable('lcboModulePaymentsTbody', paymentRows, PAYMENT_COLS);
    updateFooter({
      lcboModuleFootAmount: fmt(sumField(lcboRows, 'amount')),
      lcboModuleFootHst: fmt(sumField(lcboRows, 'hst')),
      lcboModuleFootTotal: fmt(sumField(lcboRows, 'total')),
      lcboModulePaymentsFootAmount: fmt(sumField(paymentRows, 'amount')),
    });
  }

  function renderMonthlyActions() {
    const workflow = monthState?.workflow || {};
    const totals = monthState?.totals || {};
    const statusBadge = el('lcboMonthStatusBadge');
    if (statusBadge) {
      statusBadge.className = 'lcbo-status-badge';
      if (workflow.status === 'VALIDATED') statusBadge.classList.add('validated');
      if (workflow.status === 'POSTED_TO_CASH_DEBIT') statusBadge.classList.add('posted');
      if (!workflow.status || workflow.status === 'PENDING_VALIDATION') statusBadge.classList.add('pending');
      statusBadge.textContent = workflow.statusLabel || 'Pending Validation';
    }

    const difference = numeric(totals.difference);
    if (el('lcboMonthLcboTotalText')) {
      el('lcboMonthLcboTotalText').textContent = `LCBO Monthly Total: ${fmt(totals.lcboTotal || 0)}`;
    }
    if (el('lcboMonthDifferenceText')) {
      const diffEl = el('lcboMonthDifferenceText');
      diffEl.textContent = `Difference / Balance: ${fmt(difference)}`;
      diffEl.classList.remove('lcbo-diff-negative', 'lcbo-diff-positive');
      diffEl.classList.add(difference < 0 ? 'lcbo-diff-negative' : 'lcbo-diff-positive');
    }
    if (el('lcboPendingAmountText')) {
      el('lcboPendingAmountText').textContent = `Pending Amount (LCBO - Credit Cards): ${fmt(difference)}`;
    }

    const actions = monthState?.actions || {};
    if (el('lcboPostBtn')) el('lcboPostBtn').disabled = workflow.status === 'POSTED_TO_CASH_DEBIT';
    if (el('lcboAdjustBtn')) el('lcboAdjustBtn').disabled = !actions.canReverse;
  }

  function render() {
    renderStoreOverview();
    renderQuarterlySummary();
    renderMonthCards();
    renderPeriodLabel();
    renderMonthlyTables();
    renderMonthlyActions();
  }

  function lcboPayloadFromForm() {
    const storeId = parseInt(el('lcboFormStore')?.value || '0', 10);
    const date = (el('lcboFormDate')?.value || '').trim();
    const invoiceNo = (el('lcboFormInvoice')?.value || '').trim();
    const creditEnding = (el('lcboFormCreditEnding')?.value || '').trim();
    const amount = parseFloat(el('lcboFormAmount')?.value || '0');
    const hst = parseFloat(el('lcboFormHst')?.value || '0');
    if (!storeId || !date || !invoiceNo || amount <= 0 || hst < 0) {
      throw new Error('Store, date, invoice number, amount, and non-negative HST are required.');
    }
    return {
      storeId,
      payload: { date, vendorName: 'LCBO', invoiceNo, creditEnding, amount, hst },
    };
  }

  function paymentPayloadFromForm() {
    const storeId = parseInt(el('lcboCcStore')?.value || '0', 10);
    const date = (el('lcboCcDate')?.value || '').trim();
    const purpose = (el('lcboCcPurpose')?.value || '').trim();
    const amount = parseFloat(el('lcboCcAmount')?.value || '0');
    if (!storeId || !date || !purpose || amount <= 0) {
      throw new Error('Store, date, purpose, and a positive amount are required.');
    }
    return {
      storeId,
      payload: { date, purpose, amount },
    };
  }

  async function addLCBORecord() {
    const { storeId, payload } = lcboPayloadFromForm();
    await DataStore.addLCBOEntryForStore(storeId, payload);
    resetLCBOForm();
    await refreshAllState();
    showToast('LCBO record added');
  }

  async function addCardPayment() {
    const { storeId, payload } = paymentPayloadFromForm();
    await DataStore.addCCPaymentForStore(storeId, payload);
    resetPaymentForm();
    await refreshAllState();
    showToast('Credit card payment added');
  }

  async function editLCBORecord(id) {
    const record = (monthState?.lcboRecords || []).find(row => row.id === id);
    if (!record) return;
    openModal('Edit LCBO Record', LCBO_MODAL_FIELDS, { ...record, vendorName: 'LCBO' }, async values => {
      const amount = parseFloat(values.amount || '0');
      const hst = parseFloat(values.hst || '0');
      if (!values.date || !values.invoiceNo?.trim() || amount <= 0 || hst < 0) {
        throw new Error('Date, invoice number, amount, and non-negative HST are required.');
      }
      await DataStore.updateLCBOEntry(id, {
        date: values.date,
        vendorName: 'LCBO',
        invoiceNo: values.invoiceNo.trim(),
        creditEnding: (values.creditEnding || '').trim(),
        amount,
        hst,
      });
      await refreshAllState();
      showToast('LCBO record updated');
    });
  }

  async function deleteLCBORecord(id) {
    if (!confirm('Delete this LCBO record?')) return;
    await DataStore.deleteLCBOEntry(id);
    await refreshAllState();
    showToast('LCBO record deleted', 'info');
  }

  async function editCardPayment(id) {
    const record = (monthState?.creditCardPayments || []).find(row => row.id === id);
    if (!record) return;
    openModal('Edit Credit Card Payment', PAYMENT_MODAL_FIELDS, { ...record }, async values => {
      const amount = parseFloat(values.amount || '0');
      if (!values.date || !values.purpose?.trim() || amount <= 0) {
        throw new Error('Date, purpose, and a positive amount are required.');
      }
      await DataStore.updateCCPayment(id, {
        date: values.date,
        purpose: values.purpose.trim(),
        amount,
      });
      await refreshAllState();
      showToast('Credit card payment updated');
    });
  }

  async function deleteCardPayment(id) {
    if (!confirm('Delete this credit card payment?')) return;
    await DataStore.deleteCCPayment(id);
    await refreshAllState();
    showToast('Credit card payment deleted', 'info');
  }

  async function postValidatedMonth() {
    let workflow = monthState?.workflow || {};
    const totals = monthState?.totals || {};
    if (workflow.status === 'PENDING_VALIDATION') {
      const recommended = numeric(totals.recommendedValidatedAmount || totals.lcboTotal || 0);
      if (recommended <= 0) {
        throw new Error('Cannot post because validated amount is zero. Add LCBO records first.');
      }
      monthState = await DataStore.validateLCBOMonth({
        storeId: selectedStoreId,
        year: selectedYear,
        month: selectedMonth,
        validatedAmount: recommended,
        notes: '',
      });
      await loadStoreYearSummary();
      workflow = monthState?.workflow || {};
    }
    const store = currentStore();
    openModal(
      'Post LCBO Payment to Cash/Debit',
      [
        { name: 'storeName', label: 'Store', type: 'text', readonly: true, wide: true },
        { name: 'period', label: 'Month', type: 'text', readonly: true, wide: true },
        { name: 'validatedAmount', label: 'Validated Amount', type: 'number', readonly: true },
        { name: 'paymentType', label: 'Post To', type: 'select', required: true, options: [{ value: 'CASH', label: 'Cash Payments' }, { value: 'DEBIT', label: 'Debit (Bank Payments)' }] },
        { name: 'paymentDate', label: 'Payment Date', type: 'date', required: true },
        { name: 'notes', label: 'Posting Notes (Optional)', type: 'text', wide: true },
      ],
      {
        storeName: store?.name || '',
        period: selectedPeriodLabel(),
        validatedAmount: workflow.validatedAmount || 0,
        paymentType: 'CASH',
        paymentDate: endDateForSelection(),
      },
      async values => {
        monthState = await DataStore.postLCBOMonth({
          storeId: selectedStoreId,
          year: selectedYear,
          month: selectedMonth,
          paymentType: values.paymentType,
          paymentDate: values.paymentDate,
          notes: (values.notes || '').trim(),
        });
        await loadStoreYearSummary();
        render();
        await Promise.all([MonthlyEntry.refreshAll(), Reports.refreshAll()]);
        showToast('LCBO payment posted');
      },
    );
  }

  async function reversePostedMonth() {
    const workflow = monthState?.workflow || {};
    const postedRef = workflow.postedPayment
      ? `${workflow.postedPayment.resource} #${workflow.postedPayment.recordId}`
      : 'Posted record';
    openModal(
      'Make LCBO Adjustment (Reverse Posted Entry)',
      [
        { name: 'period', label: 'Month', type: 'text', readonly: true, wide: true },
        { name: 'postedRef', label: 'Posted Entry', type: 'text', readonly: true, wide: true },
        { name: 'reason', label: 'Adjustment / Reversal Reason (Optional)', type: 'text', wide: true },
      ],
      {
        period: selectedPeriodLabel(),
        postedRef,
      },
      async values => {
        monthState = await DataStore.reverseLCBOMonth({
          storeId: selectedStoreId,
          year: selectedYear,
          month: selectedMonth,
          reason: (values.reason || '').trim(),
        });
        await loadStoreYearSummary();
        render();
        await Promise.all([MonthlyEntry.refreshAll(), Reports.refreshAll()]);
        showToast('LCBO posted entry reversed', 'info');
      },
    );
  }

  async function makeAdjustment() {
    const status = monthState?.workflow?.status || 'PENDING_VALIDATION';
    if (status === 'POSTED_TO_CASH_DEBIT') {
      await reversePostedMonth();
      return;
    }
    throw new Error('Adjustments are available only after posting.');
  }

  async function executeAction(action) {
    try {
      await action();
    } catch (error) {
      showToast(error.message || 'Unable to complete action', 'error');
    }
  }

  function bindEvents() {
    el('lcboFormAmount')?.addEventListener('input', setLCBOFormTotal);
    el('lcboFormHst')?.addEventListener('input', setLCBOFormTotal);
    el('lcboFormSaveBtn')?.addEventListener('click', () => executeAction(addLCBORecord));
    el('lcboFormResetBtn')?.addEventListener('click', resetLCBOForm);

    el('lcboCcSaveBtn')?.addEventListener('click', () => executeAction(addCardPayment));
    el('lcboCcResetBtn')?.addEventListener('click', resetPaymentForm);

    el('lcboYear')?.addEventListener('change', async event => {
      selectedYear = parseInt(event.target.value, 10);
      await executeAction(refreshAllState);
      resetLCBOForm();
      resetPaymentForm();
    });

    el('lcboStoreOverviewRow')?.addEventListener('click', async event => {
      const button = event.target.closest('button[data-store-id]');
      if (!button) return;
      selectedStoreId = parseInt(button.dataset.storeId, 10);
      await executeAction(refreshMonthState);
      resetLCBOForm();
      resetPaymentForm();
    });

    el('lcboMonthCards')?.addEventListener('click', async event => {
      const button = event.target.closest('button[data-month]');
      if (!button) return;
      selectedMonth = parseInt(button.dataset.month, 10);
      await executeAction(refreshMonthState);
      resetLCBOForm();
      resetPaymentForm();
    });

    el('lcboModuleRecordsTbody')?.addEventListener('click', async event => {
      const row = event.target.closest('tr');
      if (!row) return;
      const id = parseInt(row.dataset.id, 10);
      if (!id) return;
      if (event.target.classList.contains('btn-edit')) await executeAction(() => editLCBORecord(id));
      if (event.target.classList.contains('btn-delete')) await executeAction(() => deleteLCBORecord(id));
    });

    el('lcboModulePaymentsTbody')?.addEventListener('click', async event => {
      const row = event.target.closest('tr');
      if (!row) return;
      const id = parseInt(row.dataset.id, 10);
      if (!id) return;
      if (event.target.classList.contains('btn-edit')) await executeAction(() => editCardPayment(id));
      if (event.target.classList.contains('btn-delete')) await executeAction(() => deleteCardPayment(id));
    });

    el('lcboPostBtn')?.addEventListener('click', () => executeAction(postValidatedMonth));
    el('lcboAdjustBtn')?.addEventListener('click', () => executeAction(makeAdjustment));
  }

  async function init() {
    if (!el('panel-lcbo')) return;
    populateYearSelect('lcboYear');
    selectedYear = parseInt(el('lcboYear')?.value || `${selectedYear}`, 10);
    bindEvents();
    await refreshAllState();
    resetLCBOForm();
    resetPaymentForm();
  }

  async function refresh() {
    if (!el('panel-lcbo')) return;
    await refreshAllState();
  }

  return { init, refresh };
})();
