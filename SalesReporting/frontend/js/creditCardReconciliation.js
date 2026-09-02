// ============================================================
//  creditCardReconciliation.js – Credit Card Reconciliation
// ============================================================

const CreditCardReconciliation = (() => {
  const STATUS_ALLOCATED = 'ALLOCATED';
  let stores = [];
  let selectedBoard = { type: 'pending', storeId: null };
  const recordsById = new Map();

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function statusLabel(status) {
    if (status === 'ALLOCATED') return 'Allocated';
    if (status === 'REVERSED') return 'Reversed';
    return 'Pending';
  }

  function defaultDate() {
    return new Date().toISOString().slice(0, 10);
  }

  async function loadStores() {
    stores = (await DataStore.getStores()).slice(0, 8);
  }

  function getPayloadFilters() {
    if (selectedBoard.type === 'store' && selectedBoard.storeId) {
      return { board: 'store', storeId: selectedBoard.storeId };
    }
    return { board: 'pending' };
  }

  function updateSummary(summary) {
    const totalEl = el('ccrSummaryTotalCount');
    const pendingEl = el('ccrSummaryPendingAmount');
    const allocatedEl = el('ccrSummaryAllocatedAmount');
    if (totalEl) totalEl.textContent = String(summary.totalTransactions || 0);
    if (pendingEl) pendingEl.textContent = fmt(summary.pendingAmount || 0);
    if (allocatedEl) allocatedEl.textContent = fmt(summary.allocatedAmount || 0);
  }

  function populateStoreSelect() {
    const dedicated = el('ccrDedicatedStore');
    if (!dedicated) return;
    const selected = dedicated.value || '';
    dedicated.innerHTML = '<option value="">Not Assigned</option>';
    stores.forEach(store => {
      dedicated.innerHTML += `<option value="${store.id}">${escapeHtml(store.name)}</option>`;
    });
    dedicated.value = dedicated.querySelector(`option[value="${selected}"]`) ? selected : '';
  }

  function resetEntryForm() {
    el('ccrDate').value = defaultDate();
    el('ccrCard').value = '';
    el('ccrAmount').value = '';
    el('ccrHst').value = '';
    el('ccrMerchant').value = '';
    el('ccrDescription').value = '';
    el('ccrDedicatedStore').value = '';
  }

  function validateEntryInput() {
    const transactionDate = el('ccrDate').value;
    const creditCard = (el('ccrCard').value || '').trim();
    const merchant = (el('ccrMerchant').value || '').trim();
    const amount = parseFloat(el('ccrAmount').value || '0');
    const hst = parseFloat(el('ccrHst').value || '0');
    if (!transactionDate || !creditCard || !merchant || amount <= 0 || hst < 0) {
      throw new Error('Date, card, merchant, and positive amount are required.');
    }
  }

  function buildEntryPayload() {
    return {
      transactionDate: el('ccrDate').value,
      creditCard: (el('ccrCard').value || '').trim(),
      amount: parseFloat(el('ccrAmount').value || '0'),
      hst: parseFloat(el('ccrHst').value || '0'),
      merchant: (el('ccrMerchant').value || '').trim(),
      description: (el('ccrDescription').value || '').trim(),
      dedicatedStoreId: el('ccrDedicatedStore').value || '',
    };
  }

  function renderBoardButtons(boards, selectedType, selectedStoreId) {
    const container = el('ccrStoreAllocations');
    if (!container) return;
    if (!boards.length) {
      container.innerHTML = '<div class="empty-row">No transactions found.</div>';
      return;
    }
    container.innerHTML = boards.map(board => {
      const isActive = board.type === selectedType && (board.type !== 'store' || board.storeId === selectedStoreId);
      return `
        <button class="ccr-store-btn ${isActive ? 'active' : ''}" data-board-type="${board.type}" data-store-id="${board.storeId || ''}">
          <span class="ccr-store-name">${escapeHtml(board.label)}</span>
          <span class="ccr-store-meta">${fmt(board.amount || 0)}</span>
        </button>
      `;
    }).join('');
  }

  function renderBoardRows(rows) {
    const tbody = el('ccrBoardTbody');
    tbody.innerHTML = '';
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-row">No transactions in this board</td></tr>';
      return;
    }
    rows.forEach(row => {
      tbody.innerHTML += `
        <tr data-id="${row.id}" data-status="${row.status}">
          <td>${fmtDate(row.transactionDate)}</td>
          <td>${escapeHtml(row.creditCard)}</td>
          <td>${escapeHtml(row.merchant)}</td>
          <td>${escapeHtml(row.description || '')}</td>
          <td class="text-right">${fmt(row.amount)}</td>
          <td class="text-right">${fmt(row.hst)}</td>
          <td>${escapeHtml(row.dedicatedStoreName || 'Not Assigned')}</td>
          <td>${statusLabel(row.status)}</td>
          <td class="actions-cell">
            <div class="ccr-actions">
              <button class="btn btn-primary btn-sm" data-action="allocate">Allocate</button>
              <button class="btn btn-ghost btn-sm" data-action="edit">Edit</button>
              <button class="btn btn-danger btn-sm" data-action="delete">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
  }

  function getRecord(id) {
    return recordsById.get(parseInt(id, 10));
  }

  async function refreshDependentViews() {
    await Promise.all([
      MonthlyEntry.refreshAll(),
      Reports.refreshAll(),
    ]);
  }

  async function refresh() {
    if (!el('panel-cc-reconciliation')) return;
    if (!stores.length) {
      await loadStores();
      populateStoreSelect();
    }

    const payload = await DataStore.getCreditCardReconciliation(getPayloadFilters());
    if (payload.selectedBoard?.type === 'store') {
      selectedBoard = { type: 'store', storeId: payload.selectedBoard.storeId };
    } else {
      selectedBoard = { type: 'pending', storeId: null };
    }

    recordsById.clear();
    (payload.transactions || []).forEach(record => recordsById.set(record.id, record));
    updateSummary(payload.summary || {});
    renderBoardButtons(payload.boards || [], payload.selectedBoard?.type || 'pending', payload.selectedBoard?.storeId || null);
    el('ccrBoardTitle').textContent = payload.selectedBoard?.title || 'PENDING CREDIT CARD TRANSACTIONS';
    renderBoardRows(payload.transactions || []);
  }

  async function saveEntry() {
    validateEntryInput();
    await DataStore.addCreditCardReconciliation(buildEntryPayload());
    resetEntryForm();
    await refresh();
    showToast('Credit card transaction saved');
  }

  async function editRecord(id) {
    const record = getRecord(id);
    if (!record) return;
    const fields = [
      { name: 'transactionDate', label: 'Transaction Date', type: 'date', required: true },
      { name: 'creditCard', label: 'Credit Card', type: 'text', required: true },
      { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true },
      { name: 'hst', label: 'HST', type: 'number', step: '0.01' },
      { name: 'merchant', label: 'Merchant', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'text', wide: true },
      { name: 'dedicatedStoreId', label: 'Dedicated Store', type: 'select', options: [{ value: '', label: 'Not Assigned' }, ...stores.map(store => ({ value: store.id, label: store.name }))], wide: true },
    ];
    openModal('Edit Credit Card Transaction', fields, record, async values => {
      await DataStore.updateCreditCardReconciliation(record.id, values);
      await refresh();
      showToast('Transaction updated');
    });
  }

  async function allocateRecord(id) {
    const record = getRecord(id);
    if (!record) return;

    const fields = [
      { name: 'transactionDate', label: 'Transaction Date', type: 'date', readonly: true },
      { name: 'creditCard', label: 'Credit Card', type: 'text', readonly: true },
      { name: 'merchant', label: 'Merchant', type: 'text', readonly: true, wide: true },
      { name: 'amount', label: 'Transaction Amount', type: 'number', readonly: true },
      { name: 'hst', label: 'HST', type: 'number', readonly: true },
      { name: 'total', label: 'Total', type: 'number', readonly: true },
      { name: 'paymentType', label: 'Payment Type', type: 'select', required: true, options: [{ value: 'CASH', label: 'Cash' }, { value: 'DEBIT', label: 'Debit' }] },
    ];

    const initialValues = {
      transactionDate: record.transactionDate,
      creditCard: record.creditCard,
      merchant: record.merchant,
      amount: record.amount,
      hst: record.hst || 0,
      total: record.total || (parseFloat(record.amount || 0) + parseFloat(record.hst || 0)),
      paymentType: 'CASH',
    };

    if (record.dedicatedStoreId) {
      fields.push({ name: 'destinationStoreName', label: 'Destination Store', type: 'text', readonly: true, wide: true });
      initialValues.destinationStoreName = record.dedicatedStoreName || '';
    } else {
      fields.push({
        name: 'destinationStoreId',
        label: 'Destination Store',
        type: 'select',
        required: true,
        options: stores.map(store => ({ value: store.id, label: store.name })),
        wide: true,
      });
      initialValues.destinationStoreId = '';
    }

    openModal('Allocate Credit Card Transaction', fields, initialValues, async values => {
      const payload = { paymentType: values.paymentType };
      if (record.dedicatedStoreId) {
        payload.destinationStoreId = record.dedicatedStoreId;
      } else {
        payload.destinationStoreId = values.destinationStoreId;
      }
      await DataStore.allocateCreditCardReconciliation(record.id, payload);
      await refresh();
      await refreshDependentViews();
      showToast('Transaction allocated');
    });
  }

  async function deleteRecord(id, status) {
    if (status === STATUS_ALLOCATED) {
      showToast('Allocated transactions are already removed from this board.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to delete this credit card transaction?')) return;
    await DataStore.deleteCreditCardReconciliation(id);
    await refresh();
    showToast('Transaction deleted', 'info');
  }

  async function handleTableAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const row = button.closest('tr');
    if (!row) return;
    const id = parseInt(row.dataset.id, 10);
    const status = row.dataset.status;
    const action = button.dataset.action;
    if (action === 'edit') await editRecord(id);
    if (action === 'allocate') await allocateRecord(id);
    if (action === 'delete') await deleteRecord(id, status);
  }

  async function executeAction(action) {
    try {
      await action();
    } catch (error) {
      showToast(error.message || 'Unable to complete action', 'error');
    }
  }

  async function init() {
    if (!el('panel-cc-reconciliation')) return;

    await loadStores();
    populateStoreSelect();
    resetEntryForm();

    el('ccrAddBtn').addEventListener('click', () => {
      resetEntryForm();
      el('ccrDate').focus();
    });
    el('ccrSaveBtn').addEventListener('click', async () => {
      await executeAction(saveEntry);
    });
    el('ccrBoardTbody').addEventListener('click', async event => {
      await executeAction(async () => handleTableAction(event));
    });
    el('ccrStoreAllocations').addEventListener('click', async event => {
      const button = event.target.closest('.ccr-store-btn');
      if (!button) return;
      const type = button.dataset.boardType;
      if (type === 'store') {
        selectedBoard = { type: 'store', storeId: parseInt(button.dataset.storeId, 10) };
      } else {
        selectedBoard = { type: 'pending', storeId: null };
      }
      await executeAction(refresh);
    });

    await executeAction(refresh);
  }
  return { init, refresh };
})();
