// ============================================================
//  salesEntry.js – Daily Entry tab logic
// ============================================================

const SalesEntry = (() => {
  const SALES_FIELDS = [
    { id: 'se_total', key: 'total' },
    { id: 'se_sales', key: 'sales' },
    { id: 'se_hst', key: 'hst' },
    { id: 'se_online', key: 'online' },
    { id: 'se_instant', key: 'instant' },
    { id: 'se_cc', key: 'cc' },
    { id: 'se_gc', key: 'gc' },
    { id: 'se_nonAdd', key: 'nonAdd' },
  ];

  const INCOME_FIELDS = [
    { id: 'inc_mc', key: 'mc' },
    { id: 'inc_visa', key: 'visa' },
    { id: 'inc_debit', key: 'debit' },
    { id: 'inc_cash', key: 'cash' },
  ];

  const LOTTERY_MODAL_FIELDS = [
    { name: 'date', label: 'Date', type: 'date', required: true, wide: true },
    { name: 'lotteryPayment', label: 'Lottery Payment', type: 'number', step: '0.01', defaultValue: '0' },
    { name: 'lotteryIncome', label: 'Lottery Income', type: 'number', step: '0.01', defaultValue: '0' },
  ];

  let existingSalesEntry = null;

  function filterControls() {
    return {
      month: document.getElementById('entryFilterMonth'),
      year: document.getElementById('entryFilterYear'),
    };
  }

  function getFilterPeriod() {
    const controls = filterControls();
    const now = new Date();
    return {
      month: parseInt(controls.month?.value, 10) || (now.getMonth() + 1),
      year: parseInt(controls.year?.value, 10) || now.getFullYear(),
    };
  }

  function getCurrentDate() {
    return document.getElementById('salesDate').value || today();
  }

  function firstDateForFilter() {
    const { year, month } = getFilterPeriod();
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  function nextDateString(dateValue) {
    const current = new Date(`${dateValue}T00:00:00`);
    current.setDate(current.getDate() + 1);
    return current.toISOString().slice(0, 10);
  }

  function setFilterFromDate(dateValue) {
    const controls = filterControls();
    if (!controls.month || !controls.year || !dateValue) return;
    controls.year.value = dateValue.slice(0, 4);
    controls.month.value = String(parseInt(dateValue.slice(5, 7), 10));
  }

  function setSaveStatus(text, className) {
    const status = document.getElementById('seSaveStatus');
    status.textContent = text;
    status.className = `save-status ${className}`;
  }

  function setDateQualityAlert(date, hasExistingEntry) {
    const alert = document.getElementById('salesDataAlert');
    if (!alert) return;
    if (!hasExistingEntry) {
      alert.classList.add('hidden');
      alert.textContent = '';
      return;
    }
    alert.textContent = `Data quality alert: Sales and Income data already exists for ${fmtDate(date)}. Saving now will overwrite that date.`;
    alert.classList.remove('hidden');
  }

  function clearForm() {
    [...SALES_FIELDS, ...INCOME_FIELDS].forEach(field => {
      const element = document.getElementById(field.id);
      if (element) element.value = '';
    });
    syncTotalFromInputs();
  }

  function syncTotalFromInputs() {
    const sales = parseFloat(document.getElementById('se_sales').value) || 0;
    const hst = parseFloat(document.getElementById('se_hst').value) || 0;
    const total = sales + hst;
    document.getElementById('se_total').value = formatEditableNumber(total);
    return total;
  }

  async function loadForDate(date, options = {}) {
    const { populateEntry = true } = options;
    document.getElementById('salesDate').value = date;
    existingSalesEntry = await DataStore.getSalesEntry(date);

    if (!populateEntry) {
      clearForm();
      if (existingSalesEntry) {
        setSaveStatus('Existing data detected', 'unsaved');
        setDateQualityAlert(date, true);
      } else {
        setSaveStatus('Ready for new entry', 'empty');
        setDateQualityAlert(date, false);
      }
      return;
    }

    if (existingSalesEntry) {
      [...SALES_FIELDS, ...INCOME_FIELDS].forEach(field => {
        const element = document.getElementById(field.id);
        if (element) element.value = existingSalesEntry[field.key] ?? '';
      });
      setSaveStatus('Saved entry loaded', 'saved');
      setDateQualityAlert(date, true);
    } else {
      clearForm();
      setSaveStatus('Ready for new entry', 'empty');
      setDateQualityAlert(date, false);
    }

    syncTotalFromInputs();
  }

  function buildEntryPayload(date) {
    const payload = { date };
    [...SALES_FIELDS, ...INCOME_FIELDS].forEach(field => {
      payload[field.key] = parseFloat(document.getElementById(field.id)?.value) || 0;
    });
    payload.total = parseFloat(document.getElementById('se_total').value) || 0;
    return payload;
  }

  async function saveEntry() {
    const date = getCurrentDate();
    if (!date) {
      showToast('Select a date first', 'error');
      return;
    }

    const payload = buildEntryPayload(date);
    const expectedTotal = (payload.sales || 0) + (payload.hst || 0);
    if (Math.abs((payload.total || 0) - expectedTotal) > 0.009) {
      showToast('Total must equal Sales + HST', 'error');
      syncTotalFromInputs();
      return;
    }

    if (existingSalesEntry && !confirm(`Sales and Income data already exists for ${fmtDate(date)}. Save and overwrite this date?`)) {
      showToast('Save cancelled', 'info');
      return;
    }

    await DataStore.saveSalesEntry(payload);
    showToast('Daily record saved');
    const nextDate = nextDateString(date);
    setFilterFromDate(nextDate);
    await loadForDate(nextDate, { populateEntry: false });
    await MonthlyEntry.refreshAll();
  }

  function addLotteryRecord() {
    openModal('Add Lottery Record', LOTTERY_MODAL_FIELDS, { date: getCurrentDate() }, async values => {
      await DataStore.addLotteryRecord(values);
      showToast('Lottery record added');
    });
  }

  async function handleDateChange(date, options = {}) {
    const { populateEntry = true } = options;
    setFilterFromDate(date);
    await loadForDate(date, { populateEntry });
    await MonthlyEntry.refreshAll();
  }

  function attachValidationEvents() {
    ['se_sales', 'se_hst'].forEach(id => {
      document.getElementById(id).addEventListener('input', syncTotalFromInputs);
    });
  }

  function initFilters() {
    populateYearSelect('entryFilterYear');
    populateMonthSelect('entryFilterMonth');

    const onFilterChange = async () => {
      const date = firstDateForFilter();
      await loadForDate(date, { populateEntry: false });
      await MonthlyEntry.refreshAll();
    };

    document.getElementById('entryFilterYear')?.addEventListener('change', onFilterChange);
    document.getElementById('entryFilterMonth')?.addEventListener('change', onFilterChange);
  }

  async function init() {
    initFilters();

    const dateInput = document.getElementById('salesDate');
    const startDate = firstDateForFilter();
    dateInput.value = startDate;
    document.getElementById('se_total').readOnly = true;

    document.getElementById('prevDateBtn').addEventListener('click', async () => {
      const date = new Date(`${dateInput.value || startDate}T00:00:00`);
      date.setDate(date.getDate() - 1);
      await handleDateChange(date.toISOString().slice(0, 10));
    });

    document.getElementById('nextDateBtn').addEventListener('click', async () => {
      const date = new Date(`${dateInput.value || startDate}T00:00:00`);
      date.setDate(date.getDate() + 1);
      await handleDateChange(date.toISOString().slice(0, 10));
    });

    dateInput.addEventListener('change', async () => {
      await handleDateChange(dateInput.value);
    });

    document.getElementById('saveSalesBtn').addEventListener('click', async () => {
      await saveEntry();
    });
    document.getElementById('addLotteryBtn').addEventListener('click', addLotteryRecord);

    attachValidationEvents();
    await loadForDate(startDate, { populateEntry: false });
  }

  async function refresh() {
    await loadForDate(getCurrentDate() || firstDateForFilter(), { populateEntry: false });
  }

  return { init, refresh, getFilterPeriod };
})();
