// ============================================================
//  monthlyEntry.js – Cash/Bank/Expense/Salary/Other tab logic
// ============================================================

const MonthlyEntry = (() => {
  const CASH_FIELDS = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'vendorName', label: 'Vendor Name', type: 'text', required: true, placeholder: 'Vendor name' },
    { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true, placeholder: '0.00' },
    { name: 'hst', label: 'HST', type: 'number', step: '0.01', placeholder: '0.00', defaultValue: '0' },
    { name: 'total', label: 'Total', type: 'number', step: '0.01', readonly: true },
  ];

  const BANK_FIELDS = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'vendorName', label: 'Vendor Name', type: 'text', required: true, placeholder: 'Vendor name' },
    { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true, placeholder: '0.00' },
    { name: 'hst', label: 'HST', type: 'number', step: '0.01', placeholder: '0.00', defaultValue: '0' },
    { name: 'total', label: 'Total', type: 'number', step: '0.01', readonly: true },
    { name: 'chq', label: 'CHQ #', type: 'text', placeholder: 'Cheque number' },
  ];

  const EXPENSE_FIELDS = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'vendorName', label: 'Vendor Name', type: 'text', required: true, placeholder: 'Vendor name' },
    { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true, placeholder: '0.00' },
    { name: 'hst', label: 'HST', type: 'number', step: '0.01', placeholder: '0.00', defaultValue: '0' },
    { name: 'total', label: 'Total', type: 'number', step: '0.01', readonly: true },
  ];

  const SALARY_FIELDS = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'employee', label: 'Employee', type: 'text', required: true, placeholder: 'Employee name', wide: true },
    { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true, placeholder: '0.00' },
  ];

  const OTHER_INCOME_FIELDS = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'vendorName', label: 'Vendor / Source', type: 'text', required: true, placeholder: 'Source name', wide: true },
    { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true, placeholder: '0.00' },
  ];

  const CASH_COLS = [
    { field: 'date', format: 'date' },
    { field: 'vendorName', class: 'vendor-wrap' },
    { field: 'amount', format: 'money', class: 'text-right' },
    { field: 'hst', format: 'money', class: 'text-right' },
    { field: 'total', format: 'money', class: 'text-right' },
  ];

  const BANK_COLS = [
    { field: 'date', format: 'date' },
    { field: 'vendorName', class: 'vendor-wrap' },
    { field: 'amount', format: 'money', class: 'text-right' },
    { field: 'hst', format: 'money', class: 'text-right' },
    { field: 'chq' },
    { field: 'total', format: 'money', class: 'text-right' },
  ];

  const EXPENSE_COLS = [
    { field: 'date', format: 'date' },
    { field: 'vendorName', class: 'vendor-wrap' },
    { field: 'amount', format: 'money', class: 'text-right' },
    { field: 'hst', format: 'money', class: 'text-right' },
    { field: 'total', format: 'money', class: 'text-right' },
  ];

  const SALARY_COLS = [
    { field: 'date', format: 'date' },
    { field: 'employee' },
    { field: 'amount', format: 'money', class: 'text-right' },
  ];

  const OTHER_COLS = [
    { field: 'date', format: 'date' },
    { field: 'vendorName', class: 'vendor-wrap' },
    { field: 'amount', format: 'money', class: 'text-right' },
  ];

  function getFilterPeriod() {
    const now = new Date();
    return {
      month: parseInt(document.getElementById('entryFilterMonth')?.value, 10) || (now.getMonth() + 1),
      year: parseInt(document.getElementById('entryFilterYear')?.value, 10) || now.getFullYear(),
    };
  }

  function defaultDate() {
    const { year, month } = getFilterPeriod();
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }

  function calcTotal(record) {
    record.total = formatEditableNumber((parseFloat(record.amount) || 0) + (parseFloat(record.hst) || 0));
    return record;
  }

  async function fetchRows(fetchByMonthFn) {
    const { year, month } = getFilterPeriod();
    return fetchByMonthFn(year, month);
  }

  async function renderCashTable() {
    const rows = (await fetchRows(DataStore.getCashPaymentsByMonth))
      .map(calcTotal)
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    buildTable('cashPayTbody', rows, CASH_COLS);
    updateFooter({
      cashFoot_amt: fmt(sumField(rows, 'amount')),
      cashFoot_hst: fmt(sumField(rows, 'hst')),
      cashFoot_total: fmt(sumField(rows, 'total')),
    });
  }

  async function renderBankTable() {
    const rows = (await fetchRows(DataStore.getBankPaymentsByMonth))
      .map(calcTotal)
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    buildTable('bankPayTbody', rows, BANK_COLS);
    updateFooter({
      bankFoot_amt: fmt(sumField(rows, 'amount')),
      bankFoot_hst: fmt(sumField(rows, 'hst')),
      bankFoot_total: fmt(sumField(rows, 'total')),
    });
  }

  async function renderExpenseTable() {
    const rows = (await fetchRows(DataStore.getExpensesByMonth))
      .map(calcTotal)
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    buildTable('expTbody', rows, EXPENSE_COLS);
    updateFooter({
      expFoot_amt: fmt(sumField(rows, 'amount')),
      expFoot_hst: fmt(sumField(rows, 'hst')),
      expFoot_total: fmt(sumField(rows, 'total')),
    });
  }

  async function renderSalaryTable() {
    const rows = (await fetchRows(DataStore.getSalariesByMonth))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    buildTable('salTbody', rows, SALARY_COLS);
    updateFooter({ salFoot_amt: fmt(sumField(rows, 'amount')) });
  }

  async function renderOtherIncomeTable() {
    const rows = (await fetchRows(DataStore.getOtherIncomeByMonth))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    buildTable('otherIncTbody', rows, OTHER_COLS);
    updateFooter({ otherFoot_amt: fmt(sumField(rows, 'amount')) });
  }

  async function refreshAll() {
    await Promise.all([
      renderCashTable(),
      renderBankTable(),
      renderExpenseTable(),
      renderSalaryTable(),
      renderOtherIncomeTable(),
    ]);
  }

  function makeAddHandler(title, fields, addFn, refreshFn, toastText) {
    return () => openModal(title, fields, { date: defaultDate() }, async values => {
      calcTotal(values);
      await addFn(values);
      await refreshFn();
      showToast(toastText);
    });
  }

  function makeEditHandler(fetchByMonthFn, updateFn, renderFn, title, fields, useTotal = true) {
    return async id => {
      const records = await fetchRows(fetchByMonthFn);
      const record = records.find(row => String(row.id) === String(id));
      if (!record) return;

      openModal(`Edit ${title}`, fields, useTotal ? calcTotal({ ...record }) : { ...record }, async values => {
        if (useTotal) calcTotal(values);
        await updateFn(id, values);
        await renderFn();
        showToast(`${title} updated`);
      });
    };
  }

  function makeDeleteHandler(deleteFn, renderFn, label) {
    return async id => {
      if (!confirm(`Delete this ${label}?`)) return;
      await deleteFn(id);
      await renderFn();
      showToast(`${label} deleted`, 'info');
    };
  }

  const addCash = makeAddHandler('Cash Payment', CASH_FIELDS, DataStore.addCashPayment, renderCashTable, 'Cash payment added');
  const editCash = makeEditHandler(DataStore.getCashPaymentsByMonth, DataStore.updateCashPayment, renderCashTable, 'Cash Payment', CASH_FIELDS, true);
  const deleteCash = makeDeleteHandler(DataStore.deleteCashPayment, renderCashTable, 'cash payment');

  const addBank = makeAddHandler('Bank Payment', BANK_FIELDS, DataStore.addBankPayment, renderBankTable, 'Bank payment added');
  const editBank = makeEditHandler(DataStore.getBankPaymentsByMonth, DataStore.updateBankPayment, renderBankTable, 'Bank Payment', BANK_FIELDS, true);
  const deleteBank = makeDeleteHandler(DataStore.deleteBankPayment, renderBankTable, 'bank payment');

  const addExpense = makeAddHandler('Expense', EXPENSE_FIELDS, DataStore.addExpense, renderExpenseTable, 'Expense added');
  const editExpense = makeEditHandler(DataStore.getExpensesByMonth, DataStore.updateExpense, renderExpenseTable, 'Expense', EXPENSE_FIELDS, true);
  const deleteExpense = makeDeleteHandler(DataStore.deleteExpense, renderExpenseTable, 'expense');

  const addSalary = makeAddHandler('Salary', SALARY_FIELDS, DataStore.addSalary, renderSalaryTable, 'Salary added');
  const editSalary = makeEditHandler(DataStore.getSalariesByMonth, DataStore.updateSalary, renderSalaryTable, 'Salary', SALARY_FIELDS, false);
  const deleteSalary = makeDeleteHandler(DataStore.deleteSalary, renderSalaryTable, 'salary');

  const addOtherIncome = makeAddHandler('Other Income', OTHER_INCOME_FIELDS, DataStore.addOtherIncome, renderOtherIncomeTable, 'Other income added');
  const editOtherIncome = makeEditHandler(DataStore.getOtherIncomeByMonth, DataStore.updateOtherIncome, renderOtherIncomeTable, 'Other Income', OTHER_INCOME_FIELDS, false);
  const deleteOtherIncome = makeDeleteHandler(DataStore.deleteOtherIncome, renderOtherIncomeTable, 'other income');

  function delegate(tbodyId, editFn, deleteFn) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.addEventListener('click', async event => {
      const row = event.target.closest('tr');
      if (!row) return;
      if (event.target.classList.contains('btn-edit')) await editFn(row.dataset.id);
      if (event.target.classList.contains('btn-delete')) await deleteFn(row.dataset.id);
    });
  }

  function bindButton(id, handler) {
    document.getElementById(id)?.addEventListener('click', handler);
  }

  function initFilterRefresh() {
    const onFilterChange = async () => { await refreshAll(); };
    document.getElementById('entryFilterYear')?.addEventListener('change', onFilterChange);
    document.getElementById('entryFilterMonth')?.addEventListener('change', onFilterChange);
  }

  async function init() {
    bindButton('addCashBtn', addCash);
    bindButton('addBankBtn', addBank);
    bindButton('addExpBtn', addExpense);
    bindButton('addSalBtn', addSalary);
    bindButton('addOtherBtn', addOtherIncome);

    delegate('cashPayTbody', editCash, deleteCash);
    delegate('bankPayTbody', editBank, deleteBank);
    delegate('expTbody', editExpense, deleteExpense);
    delegate('salTbody', editSalary, deleteSalary);
    delegate('otherIncTbody', editOtherIncome, deleteOtherIncome);

    initFilterRefresh();
    await refreshAll();
  }

  return { init, refreshAll };
})();
