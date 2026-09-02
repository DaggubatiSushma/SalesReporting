// ============================================================
//  data.js – API-backed data layer
// ============================================================

const DataStore = (() => {
  const ACTIVE_STORE_KEY = 'sr_active_store_id';
  let activeStoreId = parseInt(localStorage.getItem(ACTIVE_STORE_KEY) || '0', 10) || 0;

  async function api(path, options = {}) {
    const config = {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      ...options,
    };

    const response = await fetch(path, config);
    if (response.status === 204) return null;

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw new Error('Backend API is not available. Start the app with start-server.ps1 or start-server.bat.');
        }
        throw new Error('Unexpected server response.');
      }
    }
    if (!response.ok) {
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('sales-reporting:auth-required', {
          detail: { path },
        }));
      }
      throw new Error(data?.error || `Request failed (${response.status})`);
    }
    return data;
  }

  async function fetchFile(path) {
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) {
      const text = await response.text();
      if (text) {
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
        throw new Error(parsed?.error || text || `Request failed (${response.status})`);
      }
      throw new Error(`Request failed (${response.status})`);
    }

    const disposition = response.headers.get('Content-Disposition') || '';
    const fileNameMatch = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)"?/i);
    return {
      blob: await response.blob(),
      filename: fileNameMatch ? decodeURIComponent(fileNameMatch[1]) : 'sales-report.xlsx',
    };
  }

  async function uploadFile(path, file, extraFields = {}) {
    const body = new FormData();
    body.append('file', file);
    Object.entries(extraFields).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        body.append(key, String(value));
      }
    });

    const response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      body,
    });

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        if (!response.ok) throw new Error(text || `Request failed (${response.status})`);
      }
    }
    if (!response.ok) {
      throw new Error(data?.error || `Request failed (${response.status})`);
    }
    return data;
  }

  function buildQuery(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value);
      }
    });
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  function getActiveStore() {
    return activeStoreId;
  }

  function setActiveStore(id) {
    activeStoreId = parseInt(id, 10) || 0;
    localStorage.setItem(ACTIVE_STORE_KEY, String(activeStoreId));
  }

  async function getStores() {
    const stores = await api('/api/stores');
    if (!stores.length) return [];

    if (!activeStoreId || !stores.some(store => store.id === activeStoreId)) {
      setActiveStore(stores[0].id);
    }
    return stores;
  }

  async function addStore(name) {
    return api('/api/stores', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async function renameStore(id, name) {
    return api(`/api/stores/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  }

  async function deleteStore(id) {
    return api(`/api/stores/${id}`, { method: 'DELETE' });
  }

  function resourceUrl(resource, filters = {}) {
    return `/api/stores/${getActiveStore()}/${resource}${buildQuery(filters)}`;
  }

  function storeResourceUrl(storeId, resource, filters = {}) {
    return `/api/stores/${storeId}/${resource}${buildQuery(filters)}`;
  }

  function itemUrl(resource, id) {
    return `/api/${resource}/${id}`;
  }

  async function listResource(resource, filters = {}) {
    return api(resourceUrl(resource, filters));
  }

  async function createResource(resource, payload) {
    return api(resourceUrl(resource), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async function createStoreResource(storeId, resource, payload) {
    return api(storeResourceUrl(storeId, resource), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async function updateResource(resource, id, payload) {
    return api(itemUrl(resource, id), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async function deleteResource(resource, id) {
    return api(itemUrl(resource, id), { method: 'DELETE' });
  }

  async function getSalesEntries(filters = {}) {
    return api(`/api/stores/${getActiveStore()}/daily-sales${buildQuery(filters)}`);
  }

  return {
    getActiveStore,
    setActiveStore,
    getStores,
    addStore,
    renameStore,
    deleteStore,

    getAuthStatus() {
      return api('/api/auth/status');
    },
    login(username, password) {
      return api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
    },
    logout() {
      return api('/api/auth/logout', { method: 'POST' });
    },

    async getSalesEntry(date) {
      return api(`/api/stores/${getActiveStore()}/daily-sales/${date}`);
    },

    async saveSalesEntry(entry) {
      return api(`/api/stores/${getActiveStore()}/daily-sales/${entry.date}`, {
        method: 'PUT',
        body: JSON.stringify(entry),
      });
    },

    getSalesEntriesByMonth(year, month) {
      return getSalesEntries({ year, month });
    },

    getAllSalesByYear(year) {
      return getSalesEntries({ year });
    },

    getLotteryRecords(filters = {}) {
      return listResource('lottery-records', filters);
    },
    addLotteryRecord(payload) {
      return createResource('lottery-records', payload);
    },
    updateLotteryRecord(id, payload) {
      return updateResource('lottery-records', id, payload);
    },
    deleteLotteryRecord(id) {
      return deleteResource('lottery-records', id);
    },
    getLotteryByMonth(year, month) {
      return listResource('lottery-records', { year, month });
    },
    getLotteryByYear(year) {
      return listResource('lottery-records', { year });
    },
    getLotteryByDate(date) {
      const [year, month] = date.split('-').map((part, index) => index < 2 ? parseInt(part, 10) : part);
      return listResource('lottery-records', { year, month }).then(rows => rows.find(row => row.date === date) || null);
    },

    getCashPayments(filters = {}) {
      return listResource('cash-payments', filters);
    },
    addCashPayment(payload) {
      return createResource('cash-payments', payload);
    },
    updateCashPayment(id, payload) {
      return updateResource('cash-payments', id, payload);
    },
    deleteCashPayment(id) {
      return deleteResource('cash-payments', id);
    },
    getCashPaymentsByMonth(year, month) {
      return listResource('cash-payments', { year, month });
    },
    getCashPaymentsByYear(year) {
      return listResource('cash-payments', { year });
    },

    getBankPayments(filters = {}) {
      return listResource('bank-payments', filters);
    },
    addBankPayment(payload) {
      return createResource('bank-payments', payload);
    },
    updateBankPayment(id, payload) {
      return updateResource('bank-payments', id, payload);
    },
    deleteBankPayment(id) {
      return deleteResource('bank-payments', id);
    },
    getBankPaymentsByMonth(year, month) {
      return listResource('bank-payments', { year, month });
    },
    getBankPaymentsByYear(year) {
      return listResource('bank-payments', { year });
    },

    getExpenses(filters = {}) {
      return listResource('expenses', filters);
    },
    addExpense(payload) {
      return createResource('expenses', payload);
    },
    updateExpense(id, payload) {
      return updateResource('expenses', id, payload);
    },
    deleteExpense(id) {
      return deleteResource('expenses', id);
    },
    getExpensesByMonth(year, month) {
      return listResource('expenses', { year, month });
    },
    getExpensesByYear(year) {
      return listResource('expenses', { year });
    },

    getSalaries(filters = {}) {
      return listResource('salaries', filters);
    },
    addSalary(payload) {
      return createResource('salaries', payload);
    },
    updateSalary(id, payload) {
      return updateResource('salaries', id, payload);
    },
    deleteSalary(id) {
      return deleteResource('salaries', id);
    },
    getSalariesByMonth(year, month) {
      return listResource('salaries', { year, month });
    },
    getSalariesByYear(year) {
      return listResource('salaries', { year });
    },

    getOtherIncome(filters = {}) {
      return listResource('other-income', filters);
    },
    addOtherIncome(payload) {
      return createResource('other-income', payload);
    },
    updateOtherIncome(id, payload) {
      return updateResource('other-income', id, payload);
    },
    deleteOtherIncome(id) {
      return deleteResource('other-income', id);
    },
    getOtherIncomeByMonth(year, month) {
      return listResource('other-income', { year, month });
    },
    getOtherIncomeByYear(year) {
      return listResource('other-income', { year });
    },

    getLCBOEntries(filters = {}) {
      return listResource('lcbo-entries', filters);
    },
    getLCBOEntriesForStore(storeId, filters = {}) {
      return api(storeResourceUrl(storeId, 'lcbo-entries', filters));
    },
    addLCBOEntry(payload) {
      return createResource('lcbo-entries', payload);
    },
    addLCBOEntryForStore(storeId, payload) {
      return createStoreResource(storeId, 'lcbo-entries', payload);
    },
    updateLCBOEntry(id, payload) {
      return updateResource('lcbo-entries', id, payload);
    },
    deleteLCBOEntry(id) {
      return deleteResource('lcbo-entries', id);
    },
    getLCBOByMonth(year, month) {
      return listResource('lcbo-entries', { year, month });
    },
    getLCBOByQuarter(year, quarter) {
      return listResource('lcbo-entries', { year, quarter });
    },
    getLCBOByYear(year) {
      return listResource('lcbo-entries', { year });
    },

    getCCPayments(filters = {}) {
      return listResource('credit-card-payments', filters);
    },
    getCCPaymentsForStore(storeId, filters = {}) {
      return api(storeResourceUrl(storeId, 'credit-card-payments', filters));
    },
    addCCPayment(payload) {
      return createResource('credit-card-payments', payload);
    },
    addCCPaymentForStore(storeId, payload) {
      return createStoreResource(storeId, 'credit-card-payments', payload);
    },
    updateCCPayment(id, payload) {
      return updateResource('credit-card-payments', id, payload);
    },
    deleteCCPayment(id) {
      return deleteResource('credit-card-payments', id);
    },
    getCCByMonth(year, month) {
      return listResource('credit-card-payments', { year, month });
    },
    getCCByQuarter(year, quarter) {
      return listResource('credit-card-payments', { year, quarter });
    },
    getCCByYear(year) {
      return listResource('credit-card-payments', { year });
    },

    getStoreComparison(year) {
      return api(`/api/reports/store-comparison${buildQuery({ year })}`);
    },

    getStorePerformance(year) {
      return api(`/api/reports/store-performance${buildQuery({ year })}`);
    },

    getCreditCardReconciliation(filters = {}) {
      return api(`/api/credit-card-reconciliation${buildQuery(filters)}`);
    },
    getCreditCardReconciliationById(id) {
      return api(`/api/credit-card-reconciliation/${id}`);
    },
    addCreditCardReconciliation(payload) {
      return api('/api/credit-card-reconciliation', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updateCreditCardReconciliation(id, payload) {
      return api(`/api/credit-card-reconciliation/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    deleteCreditCardReconciliation(id) {
      return api(`/api/credit-card-reconciliation/${id}`, { method: 'DELETE' });
    },
    allocateCreditCardReconciliation(id, payload) {
      return api(`/api/credit-card-reconciliation/${id}/allocate`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    reverseCreditCardReconciliation(id) {
      return api(`/api/credit-card-reconciliation/${id}/reverse`, { method: 'POST' });
    },

    getLCBOModuleMonth(storeId, year, month) {
      return api(`/api/lcbo-module/month${buildQuery({ storeId, year, month })}`);
    },
    validateLCBOMonth(payload) {
      return api('/api/lcbo-module/validate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    postLCBOMonth(payload) {
      return api('/api/lcbo-module/post', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    reverseLCBOMonth(payload) {
      return api('/api/lcbo-module/reverse', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    downloadAnnualWorkbookForStore(storeId, year) {
      return fetchFile(`/api/stores/${storeId}/annual-export${buildQuery({ year })}`);
    },
    importAnnualWorkbookForStore(storeId, year, file) {
      return uploadFile(
        `/api/stores/${storeId}/annual-import${buildQuery({ year })}`,
        file,
        { year },
      );
    },
    downloadAnnualWorkbook(year) {
      return fetchFile(`/api/stores/${getActiveStore()}/annual-export${buildQuery({ year })}`);
    },
    importAnnualWorkbook(year, file) {
      return uploadFile(
        `/api/stores/${getActiveStore()}/annual-import${buildQuery({ year })}`,
        file,
        { year },
      );
    },
  };
})();
