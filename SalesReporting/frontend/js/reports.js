// ============================================================
//  reports.js – Monthly & Annual reports logic
// ============================================================

const Reports = (() => {
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const REVIEW_FIELDS = [
    { name: 'date', label: 'Date', type: 'date', required: true, readonly: true, wide: true },
    { name: 'total', label: 'Total', type: 'number', step: '0.01', readonly: true },
    { name: 'sales', label: 'Sales', type: 'number', step: '0.01' },
    { name: 'hst', label: 'HST', type: 'number', step: '0.01' },
    { name: 'online', label: 'Online', type: 'number', step: '0.01' },
    { name: 'instant', label: 'Instant', type: 'number', step: '0.01' },
    { name: 'cc', label: 'CC', type: 'number', step: '0.01' },
    { name: 'gc', label: 'GC', type: 'number', step: '0.01' },
    { name: 'nonAdd', label: 'Non-Add', type: 'number', step: '0.01' },
    { name: 'mc', label: 'MC', type: 'number', step: '0.01' },
    { name: 'visa', label: 'Visa', type: 'number', step: '0.01' },
    { name: 'debit', label: 'Debit', type: 'number', step: '0.01' },
    { name: 'cash', label: 'Cash', type: 'number', step: '0.01' },
    { name: 'lotteryPayment', label: 'Lottery Payment', type: 'number', step: '0.01' },
    { name: 'lotteryIncome', label: 'Lottery Income', type: 'number', step: '0.01' },
  ];

  let reportYear = new Date().getFullYear();
  let reportMonth = new Date().getMonth() + 1;
  let dailyReviewCache = [];
  const BI_SERIES_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0f766e', '#4f46e5', '#0891b2', '#ca8a04', '#be185d'];

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function monthFromDate(dateValue) {
    return parseInt(dateValue.slice(5, 7), 10);
  }

  function quarterFromDate(dateValue) {
    return Math.floor((monthFromDate(dateValue) - 1) / 3) + 1;
  }

  function numeric(value) {
    return parseFloat(value) || 0;
  }

  function sumRows(rows, field) {
    return rows.reduce((sum, row) => sum + numeric(row[field]), 0);
  }

  function sumAmountWithHst(rows) {
    return rows.reduce((sum, row) => sum + numeric(row.amount) + numeric(row.hst), 0);
  }

  function sumByMonth(rows, field, month) {
    return rows
      .filter(row => monthFromDate(row.date) === month)
      .reduce((sum, row) => sum + numeric(row[field]), 0);
  }

  function sumByQuarter(rows, field, quarter) {
    return rows
      .filter(row => quarterFromDate(row.date) === quarter)
      .reduce((sum, row) => sum + numeric(row[field]), 0);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function compactNumber(value) {
    const amount = numeric(value);
    const abs = Math.abs(amount);
    if (abs >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return `${Math.round(amount)}`;
  }

  function renderLineChart(containerId, labels, series) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const normalizedSeries = (series || []).filter(item => Array.isArray(item.data));
    const values = normalizedSeries.flatMap(item => item.data.map(numeric));
    if (!normalizedSeries.length || !values.length) {
      container.innerHTML = '<div class="bi-chart-empty">No data available for the selected year.</div>';
      return;
    }

    const width = 980;
    const height = 340;
    const padding = { top: 18, right: 20, bottom: 44, left: 62 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const minValue = Math.min(0, ...values);
    let maxValue = Math.max(0, ...values);
    if (Math.abs(maxValue - minValue) < 0.0001) maxValue = minValue + 1;
    const range = maxValue - minValue;

    const x = index => padding.left + (labels.length <= 1 ? 0 : (chartWidth * index) / (labels.length - 1));
    const y = value => padding.top + ((maxValue - numeric(value)) / range) * chartHeight;

    const tickCount = 5;
    const yTicks = Array.from({ length: tickCount + 1 }, (_, index) => minValue + ((maxValue - minValue) * index) / tickCount);
    const gridLines = yTicks.map(value => {
      const yPos = y(value);
      return `
        <line class="bi-grid-line" x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}"></line>
        <text class="bi-axis-label" x="${padding.left - 8}" y="${yPos + 4}" text-anchor="end">${escapeHtml(compactNumber(value))}</text>
      `;
    }).join('');

    const xLabels = labels.map((label, index) => `
      <text class="bi-axis-label" x="${x(index)}" y="${height - 14}" text-anchor="middle">${escapeHtml(label)}</text>
    `).join('');

    const lines = normalizedSeries.map(item => {
      const points = item.data.map((value, index) => `${x(index)},${y(value)}`).join(' ');
      const circles = item.data.map((value, index) => `
        <circle class="bi-series-point" cx="${x(index)}" cy="${y(value)}" r="3.5" fill="${escapeHtml(item.color)}"></circle>
      `).join('');
      return `
        <polyline fill="none" stroke="${escapeHtml(item.color)}" stroke-width="3" points="${points}"></polyline>
        ${circles}
      `;
    }).join('');

    const legend = normalizedSeries.map(item => `
      <span class="bi-legend-item">
        <span class="bi-legend-swatch" style="background:${escapeHtml(item.color)}"></span>
        ${escapeHtml(item.name)}
      </span>
    `).join('');

    container.innerHTML = `
      <svg class="bi-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="performance chart">
        ${gridLines}
        <line class="bi-axis-line" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
        <line class="bi-axis-line" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
        ${lines}
        ${xLabels}
      </svg>
      <div class="bi-legend">${legend}</div>
    `;
  }

  function renderProfitChart(rows) {
    const container = document.getElementById('perfProfitChart');
    if (!container) return;

    const items = [...(rows || [])].sort((a, b) => numeric(b.yearOperatingDifference) - numeric(a.yearOperatingDifference));
    if (!items.length) {
      container.innerHTML = '<div class="bi-chart-empty">No profit data available for the selected year.</div>';
      return;
    }

    const topValue = Math.max(...items.map(item => Math.abs(numeric(item.yearOperatingDifference))), 0.0001);
    container.innerHTML = items.map(item => {
      const value = numeric(item.yearOperatingDifference);
      const barWidth = Math.min((value / topValue) * 100, 100);
      const safeWidth = Math.max(Math.abs(barWidth), 2);
      return `
        <div class="bi-bar-row">
          <div class="bi-bar-top">
            <span>${escapeHtml(item.storeName)}</span>
            <span>${fmt(value)}</span>
          </div>
          <div class="bi-bar-track"><div class="bi-bar-fill ${value < 0 ? 'negative' : ''}" style="width:${safeWidth}%"></div></div>
        </div>
      `;
    }).join('');
  }

  function mergeDailyAndLottery(salesEntries, lotteryRecords) {
    const byDate = new Map();

    salesEntries.forEach(entry => {
      byDate.set(entry.date, {
        date: entry.date,
        salesId: entry.id,
        lotteryId: null,
        total: numeric(entry.total),
        sales: numeric(entry.sales),
        hst: numeric(entry.hst),
        online: numeric(entry.online),
        instant: numeric(entry.instant),
        cc: numeric(entry.cc),
        gc: numeric(entry.gc),
        nonAdd: numeric(entry.nonAdd),
        mc: numeric(entry.mc),
        visa: numeric(entry.visa),
        debit: numeric(entry.debit),
        cash: numeric(entry.cash),
        lotteryPayment: numeric(entry.lotteryPayment),
        lotteryIncome: numeric(entry.lotteryIncome),
      });
    });

    lotteryRecords.forEach(record => {
      const existing = byDate.get(record.date) || {
        date: record.date,
        salesId: null,
        lotteryId: null,
        total: 0,
        sales: 0,
        hst: 0,
        online: 0,
        instant: 0,
        cc: 0,
        gc: 0,
        nonAdd: 0,
        mc: 0,
        visa: 0,
        debit: 0,
        cash: 0,
        lotteryPayment: 0,
        lotteryIncome: 0,
      };

      existing.lotteryId = record.id;
      existing.lotteryPayment = numeric(record.lotteryPayment);
      existing.lotteryIncome = numeric(record.lotteryIncome);
      byDate.set(record.date, existing);
    });

    return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  function renderVendorSummary(tbodyId, records, footerIds) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';

    const grouped = {};
    records.forEach(record => {
      const vendor = record.vendorName || 'Unknown';
      if (!grouped[vendor]) grouped[vendor] = { vendor, amount: 0, hst: 0, total: 0 };
      grouped[vendor].amount += numeric(record.amount);
      grouped[vendor].hst += numeric(record.hst);
      grouped[vendor].total += numeric(record.amount) + numeric(record.hst);
    });

    const rows = Object.values(grouped).sort((a, b) => a.vendor.localeCompare(b.vendor));
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No records for this month</td></tr>';
    } else {
      rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${row.vendor}</td>
          <td class="text-right">${fmt(row.amount)}</td>
          <td class="text-right">${fmt(row.hst)}</td>
          <td class="text-right">${fmt(row.total)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    updateFooter({
      [footerIds.amount]: fmt(rows.reduce((sum, row) => sum + row.amount, 0)),
      [footerIds.hst]: fmt(rows.reduce((sum, row) => sum + row.hst, 0)),
      [footerIds.total]: fmt(rows.reduce((sum, row) => sum + row.total, 0)),
    });
  }

  function renderAmountOnlySummary(tbodyId, records, footerId, nameField, emptyText = 'No records for this month') {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '';

    const grouped = {};
    records.forEach(record => {
      const key = record[nameField] || 'Unknown';
      if (!grouped[key]) grouped[key] = 0;
      grouped[key] += numeric(record.amount);
    });

    const rows = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="2" class="empty-row">${emptyText}</td></tr>`;
    } else {
      rows.forEach(([name, amount]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${name}</td>
          <td class="text-right">${fmt(amount)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    updateFooter({ [footerId]: fmt(rows.reduce((sum, [, amount]) => sum + amount, 0)) });
  }

  function renderDailyReviewTable(rows) {
    const tbody = document.getElementById('dailySalesReviewTbody');
    tbody.innerHTML = '';

    const footerMap = {
      dailyReviewFoot_total: fmt(sumField(rows, 'total')),
      dailyReviewFoot_sales: fmt(sumField(rows, 'sales')),
      dailyReviewFoot_hst: fmt(sumField(rows, 'hst')),
      dailyReviewFoot_online: fmt(sumField(rows, 'online')),
      dailyReviewFoot_instant: fmt(sumField(rows, 'instant')),
      dailyReviewFoot_cc: fmt(sumField(rows, 'cc')),
      dailyReviewFoot_gc: fmt(sumField(rows, 'gc')),
      dailyReviewFoot_nonAdd: fmt(sumField(rows, 'nonAdd')),
      dailyReviewFoot_mc: fmt(sumField(rows, 'mc')),
      dailyReviewFoot_visa: fmt(sumField(rows, 'visa')),
      dailyReviewFoot_debit: fmt(sumField(rows, 'debit')),
      dailyReviewFoot_cash: fmt(sumField(rows, 'cash')),
      dailyReviewFoot_lotteryPayment: fmt(sumField(rows, 'lotteryPayment')),
      dailyReviewFoot_lotteryIncome: fmt(sumField(rows, 'lotteryIncome')),
    };
    updateFooter(footerMap);

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="16" class="empty-row">No daily entries for this month</td></tr>';
      return;
    }

    rows.forEach(row => {
      const tr = document.createElement('tr');
      tr.dataset.date = row.date;
      tr.innerHTML = `
        <td>${fmtDate(row.date)}</td>
        <td class="text-right">${fmt(row.total)}</td>
        <td class="text-right">${fmt(row.sales)}</td>
        <td class="text-right">${fmt(row.hst)}</td>
        <td class="text-right">${fmt(row.online)}</td>
        <td class="text-right">${fmt(row.instant)}</td>
        <td class="text-right">${fmt(row.cc)}</td>
        <td class="text-right">${fmt(row.gc)}</td>
        <td class="text-right">${fmt(row.nonAdd)}</td>
        <td class="text-right">${fmt(row.mc)}</td>
        <td class="text-right">${fmt(row.visa)}</td>
        <td class="text-right">${fmt(row.debit)}</td>
        <td class="text-right">${fmt(row.cash)}</td>
        <td class="text-right">${fmt(row.lotteryPayment)}</td>
        <td class="text-right">${fmt(row.lotteryIncome)}</td>
        <td class="actions-cell"><button class="btn-icon btn-edit" title="Edit">✏️</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function upsertLotteryRecord(values, existing) {
    const payload = {
      date: values.date,
      lotteryPayment: parseFloat(values.lotteryPayment) || 0,
      lotteryIncome: parseFloat(values.lotteryIncome) || 0,
    };

    if (existing?.lotteryId) {
      await DataStore.updateLotteryRecord(existing.lotteryId, payload);
      return;
    }

    if (payload.lotteryPayment !== 0 || payload.lotteryIncome !== 0) {
      await DataStore.addLotteryRecord(payload);
    }
  }

  async function editDailyEntry(date) {
    const existing = dailyReviewCache.find(row => row.date === date);
    if (!existing) return;

    openModal('Edit Daily Review Entry', REVIEW_FIELDS, existing, async values => {
      const salesPayload = {
        date: values.date,
        total: numeric(values.sales) + numeric(values.hst),
        sales: numeric(values.sales),
        hst: numeric(values.hst),
        online: numeric(values.online),
        instant: numeric(values.instant),
        cc: numeric(values.cc),
        gc: numeric(values.gc),
        nonAdd: numeric(values.nonAdd),
        mc: numeric(values.mc),
        visa: numeric(values.visa),
        debit: numeric(values.debit),
        cash: numeric(values.cash),
      };

      const shouldSaveSales = Boolean(existing.salesId) || [
        salesPayload.total,
        salesPayload.sales,
        salesPayload.hst,
        salesPayload.online,
        salesPayload.instant,
        salesPayload.cc,
        salesPayload.gc,
        salesPayload.nonAdd,
        salesPayload.mc,
        salesPayload.visa,
        salesPayload.debit,
        salesPayload.cash,
      ].some(value => numeric(value) !== 0);

      if (shouldSaveSales) {
        await DataStore.saveSalesEntry(salesPayload);
      }
      await upsertLotteryRecord(values, existing);
      await renderMonthly();
      await SalesEntry.refresh();
      showToast('Daily review entry updated');
    });
  }

  async function renderMonthly() {
    const year = reportYear;
    const month = reportMonth;
    setText('reportMonthLabel', `${MONTH_NAMES[month - 1]} ${year}`);

    const [salesEntries, cashPayments, bankPayments, expenses, salaries, otherIncome, lotteryRecords] = await Promise.all([
      DataStore.getSalesEntriesByMonth(year, month),
      DataStore.getCashPaymentsByMonth(year, month),
      DataStore.getBankPaymentsByMonth(year, month),
      DataStore.getExpensesByMonth(year, month),
      DataStore.getSalariesByMonth(year, month),
      DataStore.getOtherIncomeByMonth(year, month),
      DataStore.getLotteryByMonth(year, month),
    ]);

    const pos = sumField(salesEntries, 'sales');
    const hst = sumField(salesEntries, 'hst');
    const posPlusHst = pos + hst;
    const online = sumField(salesEntries, 'online');
    const instant = sumField(salesEntries, 'instant');
    const cc = sumField(salesEntries, 'cc');
    const gc = sumField(salesEntries, 'gc');
    const nonAdd = sumField(salesEntries, 'nonAdd');

    const totalSalesA = posPlusHst + online + instant + cc + gc;
    const cashPayouts = sumField(cashPayments, 'amount');
    const salaryPayouts = sumField(salaries, 'amount');
    const totalCashAndSalaryB = cashPayouts + salaryPayouts;
    const netC = totalSalesA - totalCashAndSalaryB;

    const masterCard = sumField(salesEntries, 'mc');
    const visa = sumField(salesEntries, 'visa');
    const debit = sumField(salesEntries, 'debit');
    const cash = sumField(salesEntries, 'cash');
    const totalAmount = masterCard + visa + debit + cash;
    const difference = totalAmount - netC;

    const bankPayouts = sumField(bankPayments, 'amount');
    const totalPayouts = cashPayouts + bankPayouts;
    const totalSalesForPct = sumField(salesEntries, 'total');
    const payoutPct = totalSalesForPct > 0 ? (totalPayouts / totalSalesForPct) * 100 : 0;

    setText('bs_pos', fmt(pos));
    setText('bs_hst', fmt(hst));
    setText('bs_posPlusHst', fmt(posPlusHst));
    setText('bs_online', fmt(online));
    setText('bs_instant', fmt(instant));
    setText('bs_cc', fmt(cc));
    setText('bs_gc', fmt(gc));
    setText('bs_nonAdd', fmt(nonAdd));

    setText('bs_totalSales', fmt(totalSalesA));
    setText('bs_totalCashSalary', fmt(totalCashAndSalaryB));
    setText('bs_net', fmt(netC));
    setText('bs_mc', fmt(masterCard));
    setText('bs_visa', fmt(visa));
    setText('bs_debit', fmt(debit));
    setText('bs_cash', fmt(cash));
    setText('bs_totalAmount', fmt(totalAmount));
    setText('bs_difference', fmt(difference));

    setText('pct_totalSales', fmt(totalSalesForPct));
    setText('pct_cashPayouts', fmt(cashPayouts));
    setText('pct_bankPayouts', fmt(bankPayouts));
    setText('pct_totalPayouts', fmt(totalPayouts));
    setText('pct_payout', fmtPct(payoutPct));

    renderVendorSummary('cashSumTbody', cashPayments, {
      amount: 'cashSumFoot_amt',
      hst: 'cashSumFoot_hst',
      total: 'cashSumFoot_total',
    });
    renderVendorSummary('bankSumTbody', bankPayments, {
      amount: 'bankSumFoot_amt',
      hst: 'bankSumFoot_hst',
      total: 'bankSumFoot_total',
    });
    renderVendorSummary('expenseSumTbody', expenses, {
      amount: 'expenseSumFoot_amt',
      hst: 'expenseSumFoot_hst',
      total: 'expenseSumFoot_total',
    });
    renderAmountOnlySummary('salarySumTbody', salaries, 'salarySumFoot_amt', 'employee');
    renderAmountOnlySummary('otherIncomeSumTbody', otherIncome, 'otherIncomeSumFoot_amt', 'vendorName');

    dailyReviewCache = mergeDailyAndLottery(salesEntries, lotteryRecords);
    renderDailyReviewTable(dailyReviewCache);
  }

  async function renderStoreDashboard() {
    const year = parseInt(document.getElementById('dashboardYear').value, 10);
    const payload = await DataStore.getStoreComparison(year);
    const rows = [...(payload.stores || [])].sort((a, b) => numeric(b.salesTotal) - numeric(a.salesTotal));
    const salesTbody = document.getElementById('storeDashboardTbody');
    const lcboTbody = document.getElementById('storeLcboDashboardTbody');
    const lcboTotal = sumRows(rows, 'lcboTotal');
    const cardPaymentTotal = sumRows(rows, 'creditCardPayments');
    const lcboGapTotal = rows.reduce((sum, row) => sum + (numeric(row.lcboTotal) - numeric(row.creditCardPayments)), 0);

    setText('dashboardPeriodLabel', `${year}`);

    salesTbody.innerHTML = '';
    lcboTbody.innerHTML = '';
    if (!rows.length) {
      salesTbody.innerHTML = '<tr><td colspan="9" class="empty-row">No store data for this year</td></tr>';
      lcboTbody.innerHTML = '<tr><td colspan="4" class="empty-row">No LCBO or card data for this year</td></tr>';
    } else {
      rows.forEach(row => {
        const salesTr = document.createElement('tr');
        salesTr.innerHTML = `
          <td><strong>${row.storeName}</strong></td>
          <td class="text-right">${fmt(row.salesTotal)}</td>
          <td class="text-right">${fmt(row.incomeTotalExtended)}</td>
          <td class="text-right">${fmt(row.cashPayments)}</td>
          <td class="text-right">${fmt(row.bankPayments)}</td>
          <td class="text-right">${fmt(row.expenses)}</td>
          <td class="text-right">${fmt(row.salaries)}</td>
          <td class="text-right">${fmt(row.totalPayouts)}</td>
          <td class="text-right ${numeric(row.operatingDifference) < 0 ? 'text-danger' : ''}">${fmt(row.operatingDifference)}</td>
        `;
        salesTbody.appendChild(salesTr);

        const gap = numeric(row.lcboTotal) - numeric(row.creditCardPayments);
        const lcboTr = document.createElement('tr');
        lcboTr.innerHTML = `
          <td><strong>${row.storeName}</strong></td>
          <td class="text-right">${fmt(row.lcboTotal)}</td>
          <td class="text-right">${fmt(row.creditCardPayments)}</td>
          <td class="text-right ${gap < 0 ? 'text-danger' : ''}">${fmt(gap)}</td>
        `;
        lcboTbody.appendChild(lcboTr);
      });
    }

    updateFooter({
      dashboardFoot_salesTotal: fmt(sumRows(rows, 'salesTotal')),
      dashboardFoot_incomeTotal: fmt(sumRows(rows, 'incomeTotalExtended')),
      dashboardFoot_cashPayments: fmt(sumRows(rows, 'cashPayments')),
      dashboardFoot_bankPayments: fmt(sumRows(rows, 'bankPayments')),
      dashboardFoot_expenses: fmt(sumRows(rows, 'expenses')),
      dashboardFoot_salaries: fmt(sumRows(rows, 'salaries')),
      dashboardFoot_totalPayouts: fmt(sumRows(rows, 'totalPayouts')),
      dashboardFoot_difference: fmt(sumRows(rows, 'operatingDifference')),
      dashboardLcboFoot_total: fmt(lcboTotal),
      dashboardLcboFoot_cards: fmt(cardPaymentTotal),
      dashboardLcboFoot_gap: fmt(lcboGapTotal),
    });
  }

  async function renderPerformanceDashboard() {
    const year = parseInt(document.getElementById('dashboardYear').value, 10);
    const payload = await DataStore.getStorePerformance(year);
    const months = (payload.months || MONTH_NAMES).map(label => label.slice(0, 3));
    const monthlyTotals = payload.monthlyTotals || [];
    const stores = payload.stores || [];
    const storeSelect = document.getElementById('performanceStore');

    if (storeSelect && !storeSelect.dataset.initialized) {
      storeSelect.addEventListener('change', async () => {
        await renderPerformanceDashboard();
      });
      storeSelect.dataset.initialized = 'true';
    }

    const existingSelection = storeSelect?.value || 'all';
    if (storeSelect) {
      const options = [{ key: 'all', name: 'All Stores' }, ...stores.map(item => ({ key: String(item.storeId), name: item.storeName }))];
      storeSelect.innerHTML = options.map(option => `<option value="${escapeHtml(option.key)}">${escapeHtml(option.name)}</option>`).join('');
      const hasExisting = options.some(option => option.key === existingSelection);
      storeSelect.value = hasExisting ? existingSelection : 'all';
    }

    const selectedStoreKey = storeSelect?.value || 'all';
    const selectedStore = selectedStoreKey === 'all'
      ? null
      : stores.find(item => String(item.storeId) === selectedStoreKey);
    const selectedStoreName = selectedStore?.storeName || 'All Stores';

    setText('performancePeriodLabel', `${year} • ${selectedStoreName}`);
    setText(
      'performanceSalesCashTitle',
      `📈 Monthly Sales vs Cash Payments (${selectedStoreName})`,
    );
    setText(
      'performanceSalesCashLead',
      selectedStore
        ? 'Month-by-month comparison for the selected store.'
        : 'Yearly month-by-month trend comparing total sales and cash payouts across all stores.',
    );

    renderLineChart('perfTrendChart', months, [
      {
        name: 'Sales',
        color: '#2563eb',
        data: selectedStore ? (selectedStore.monthlySales || []).map(numeric) : monthlyTotals.map(item => numeric(item.salesTotal)),
      },
      {
        name: 'Cash Payments',
        color: '#dc2626',
        data: selectedStore ? (selectedStore.monthlyCashPayments || []).map(numeric) : monthlyTotals.map(item => numeric(item.cashPayments)),
      },
    ]);

    const storeSeries = stores.map((item, index) => ({
      name: item.storeName,
      color: BI_SERIES_COLORS[index % BI_SERIES_COLORS.length],
      data: (item.monthlySales || []).map(numeric),
    }));
    renderLineChart('perfStoreTrendChart', months, storeSeries);
    renderProfitChart(stores);
  }

  async function renderAnnual() {
    const year = parseInt(document.getElementById('annualYear').value, 10);
    const [salesEntries, cashPayments, bankPayments, expenses, salaries, otherIncome, lotteryRecords] = await Promise.all([
      DataStore.getAllSalesByYear(year),
      DataStore.getCashPaymentsByYear(year),
      DataStore.getBankPaymentsByYear(year),
      DataStore.getExpensesByYear(year),
      DataStore.getSalariesByYear(year),
      DataStore.getOtherIncomeByYear(year),
      DataStore.getLotteryByYear(year),
    ]);

    renderAnnualSectionOne(salesEntries, cashPayments);
    renderAnnualSectionTwo(bankPayments, expenses, salaries, lotteryRecords, otherIncome);
    renderAnnualSectionThree(salesEntries, cashPayments, bankPayments, expenses, salaries, otherIncome, lotteryRecords);
    renderAnnualHstSummary(salesEntries, cashPayments, bankPayments, expenses, salaries, otherIncome, lotteryRecords);
  }

  function renderAnnualSectionOne(salesEntries, cashPayments) {
    const tbody = document.getElementById('annualSection1Tbody');
    tbody.innerHTML = '';

    const totals = {
      salesBase: 0, online: 0, instant: 0, cc: 0, salesTotal: 0,
      purchases: 0, interac: 0, cashDeposits: 0, incomeTotal: 0, difference: 0,
    };

    MONTH_NAMES.forEach((monthName, index) => {
      const month = index + 1;
      const salesBase = sumByMonth(salesEntries, 'sales', month) + sumByMonth(salesEntries, 'hst', month);
      const online = sumByMonth(salesEntries, 'online', month);
      const instant = sumByMonth(salesEntries, 'instant', month);
      const cc = sumByMonth(salesEntries, 'cc', month) + sumByMonth(salesEntries, 'gc', month);
      const salesTotal = salesBase + online + instant + cc;
      const purchases = sumAmountWithHst(cashPayments.filter(row => monthFromDate(row.date) === month));
      const interac = sumByMonth(salesEntries, 'mc', month) + sumByMonth(salesEntries, 'visa', month) + sumByMonth(salesEntries, 'debit', month);
      const cashDeposits = sumByMonth(salesEntries, 'cash', month);
      const incomeTotal = interac + cashDeposits;
      const difference = salesTotal - purchases - incomeTotal;

      totals.salesBase += salesBase;
      totals.online += online;
      totals.instant += instant;
      totals.cc += cc;
      totals.salesTotal += salesTotal;
      totals.purchases += purchases;
      totals.interac += interac;
      totals.cashDeposits += cashDeposits;
      totals.incomeTotal += incomeTotal;
      totals.difference += difference;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${monthName}</strong></td>
        <td class="text-right">${fmt(salesBase)}</td>
        <td class="text-right">${fmt(online)}</td>
        <td class="text-right">${fmt(instant)}</td>
        <td class="text-right">${fmt(cc)}</td>
        <td class="text-right">${fmt(salesTotal)}</td>
        <td class="text-right">${fmt(purchases)}</td>
        <td class="text-right">${fmt(interac)}</td>
        <td class="text-right">${fmt(cashDeposits)}</td>
        <td class="text-right">${fmt(incomeTotal)}</td>
        <td class="text-right ${difference < 0 ? 'text-danger' : ''}">${fmt(difference)}</td>
      `;
      tbody.appendChild(tr);
    });

    updateFooter({
      ann1_salesBase: fmt(totals.salesBase),
      ann1_online: fmt(totals.online),
      ann1_instant: fmt(totals.instant),
      ann1_cc: fmt(totals.cc),
      ann1_salesTotal: fmt(totals.salesTotal),
      ann1_purchases: fmt(totals.purchases),
      ann1_interac: fmt(totals.interac),
      ann1_cashDeposits: fmt(totals.cashDeposits),
      ann1_incomeTotal: fmt(totals.incomeTotal),
      ann1_difference: fmt(totals.difference),
    });
  }

  function renderAnnualSectionTwo(bankPayments, expenses, salaries, lotteryRecords, otherIncome) {
    const tbody = document.getElementById('annualSection2Tbody');
    tbody.innerHTML = '';

    const totals = {
      bank: 0, expenses: 0, salaries: 0, lotteryPayment: 0, lotteryIncome: 0, otherIncome: 0,
    };

    MONTH_NAMES.forEach((monthName, index) => {
      const month = index + 1;
      const bank = sumAmountWithHst(bankPayments.filter(row => monthFromDate(row.date) === month));
      const expense = sumAmountWithHst(expenses.filter(row => monthFromDate(row.date) === month));
      const salary = salaries.filter(row => monthFromDate(row.date) === month).reduce((sum, row) => sum + numeric(row.amount), 0);
      const lotteryPayment = sumByMonth(lotteryRecords, 'lotteryPayment', month);
      const lotteryIncome = sumByMonth(lotteryRecords, 'lotteryIncome', month);
      const other = otherIncome.filter(row => monthFromDate(row.date) === month).reduce((sum, row) => sum + numeric(row.amount), 0);

      totals.bank += bank;
      totals.expenses += expense;
      totals.salaries += salary;
      totals.lotteryPayment += lotteryPayment;
      totals.lotteryIncome += lotteryIncome;
      totals.otherIncome += other;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${monthName}</strong></td>
        <td class="text-right">${fmt(bank)}</td>
        <td class="text-right">${fmt(expense)}</td>
        <td class="text-right">${fmt(salary)}</td>
        <td class="text-right">${fmt(lotteryPayment)}</td>
        <td class="text-right">${fmt(lotteryIncome)}</td>
        <td class="text-right">${fmt(other)}</td>
      `;
      tbody.appendChild(tr);
    });

    updateFooter({
      ann2_bank: fmt(totals.bank),
      ann2_expenses: fmt(totals.expenses),
      ann2_salaries: fmt(totals.salaries),
      ann2_lotteryPayment: fmt(totals.lotteryPayment),
      ann2_lotteryIncome: fmt(totals.lotteryIncome),
      ann2_otherIncome: fmt(totals.otherIncome),
    });
  }

  function renderAnnualSectionThree(salesEntries, cashPayments, bankPayments, expenses, salaries, otherIncome, lotteryRecords) {
    const tbody = document.getElementById('annualQuarterlyTbody');
    tbody.innerHTML = '';

    const totals = {
      sales: 0, cc: 0, lotteryIncome: 0, otherIncome: 0, totalSales: 0,
      cashPayments: 0, bankPayments: 0, expenses: 0, salaries: 0, totalPayments: 0, difference: 0,
    };

    ['Q1', 'Q2', 'Q3', 'Q4'].forEach((quarterLabel, index) => {
      const quarter = index + 1;
      const sales = sumByQuarter(salesEntries, 'sales', quarter) + sumByQuarter(salesEntries, 'hst', quarter);
      const cc = sumByQuarter(salesEntries, 'cc', quarter) + sumByQuarter(salesEntries, 'gc', quarter);
      const lotteryIncome = sumByQuarter(lotteryRecords, 'lotteryIncome', quarter);
      const other = otherIncome.filter(row => quarterFromDate(row.date) === quarter).reduce((sum, row) => sum + numeric(row.amount), 0);
      const totalSales = sales + cc + lotteryIncome + other;

      const cash = sumAmountWithHst(cashPayments.filter(row => quarterFromDate(row.date) === quarter));
      const bank = sumAmountWithHst(bankPayments.filter(row => quarterFromDate(row.date) === quarter));
      const expense = sumAmountWithHst(expenses.filter(row => quarterFromDate(row.date) === quarter));
      const salary = salaries.filter(row => quarterFromDate(row.date) === quarter).reduce((sum, row) => sum + numeric(row.amount), 0);
      const totalPayments = cash + bank + expense + salary;
      const difference = totalSales - totalPayments;

      totals.sales += sales;
      totals.cc += cc;
      totals.lotteryIncome += lotteryIncome;
      totals.otherIncome += other;
      totals.totalSales += totalSales;
      totals.cashPayments += cash;
      totals.bankPayments += bank;
      totals.expenses += expense;
      totals.salaries += salary;
      totals.totalPayments += totalPayments;
      totals.difference += difference;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${quarterLabel}</strong></td>
        <td class="text-right">${fmt(sales)}</td>
        <td class="text-right">${fmt(cc)}</td>
        <td class="text-right">${fmt(lotteryIncome)}</td>
        <td class="text-right">${fmt(other)}</td>
        <td class="text-right">${fmt(totalSales)}</td>
        <td class="text-right">${fmt(cash)}</td>
        <td class="text-right">${fmt(bank)}</td>
        <td class="text-right">${fmt(expense)}</td>
        <td class="text-right">${fmt(salary)}</td>
        <td class="text-right">${fmt(totalPayments)}</td>
        <td class="text-right ${difference < 0 ? 'text-danger' : ''}">${fmt(difference)}</td>
      `;
      tbody.appendChild(tr);
    });

    updateFooter({
      ann3_sales: fmt(totals.sales),
      ann3_cc: fmt(totals.cc),
      ann3_lotteryIncome: fmt(totals.lotteryIncome),
      ann3_otherIncome: fmt(totals.otherIncome),
      ann3_totalSales: fmt(totals.totalSales),
      ann3_cashPayments: fmt(totals.cashPayments),
      ann3_bankPayments: fmt(totals.bankPayments),
      ann3_expenses: fmt(totals.expenses),
      ann3_salaries: fmt(totals.salaries),
      ann3_totalPayments: fmt(totals.totalPayments),
      ann3_difference: fmt(totals.difference),
    });
  }

  function renderAnnualHstSummary(salesEntries, cashPayments, bankPayments, expenses, salaries, otherIncome, lotteryRecords) {
    const topTbody = document.getElementById('annualHstSection1Tbody');
    const bottomTbody = document.getElementById('annualHstSection2Tbody');
    if (!topTbody || !bottomTbody) return;
    topTbody.innerHTML = '';
    bottomTbody.innerHTML = '';

    const topTotals = {
      sales: 0, online: 0, instant: 0, cc: 0, total: 0,
      cashPayments: 0, bankPayments: 0, lotteryPayments: 0, totalPurchases: 0, expenses: 0,
    };
    const bottomTotals = {
      salesHst: 0, cashHst: 0, bankHst: 0, salaries: 0, totalHst: 0,
      utilitiesHst: 0, interac: 0, cashDeposits: 0, lotteryIncome: 0, otherIncome: 0,
    };

    MONTH_NAMES.forEach((monthName, index) => {
      const month = index + 1;
      const monthCash = cashPayments.filter(row => monthFromDate(row.date) === month);
      const monthBank = bankPayments.filter(row => monthFromDate(row.date) === month);
      const monthExpenses = expenses.filter(row => monthFromDate(row.date) === month);
      const monthSalaries = salaries.filter(row => monthFromDate(row.date) === month);
      const monthOtherIncome = otherIncome.filter(row => monthFromDate(row.date) === month);

      const sales = sumByMonth(salesEntries, 'sales', month);
      const online = sumByMonth(salesEntries, 'online', month);
      const instant = sumByMonth(salesEntries, 'instant', month);
      const cc = sumByMonth(salesEntries, 'cc', month) + sumByMonth(salesEntries, 'gc', month);
      const total = sales + online + instant + cc;
      const cashPaymentsAmt = monthCash.reduce((sum, row) => sum + numeric(row.amount), 0);
      const bankPaymentsAmt = monthBank.reduce((sum, row) => sum + numeric(row.amount), 0);
      const lotteryPayments = sumByMonth(lotteryRecords, 'lotteryPayment', month);
      const totalPurchases = cashPaymentsAmt + bankPaymentsAmt + lotteryPayments;
      const expensesAmt = monthExpenses.reduce((sum, row) => sum + numeric(row.amount), 0);

      topTotals.sales += sales;
      topTotals.online += online;
      topTotals.instant += instant;
      topTotals.cc += cc;
      topTotals.total += total;
      topTotals.cashPayments += cashPaymentsAmt;
      topTotals.bankPayments += bankPaymentsAmt;
      topTotals.lotteryPayments += lotteryPayments;
      topTotals.totalPurchases += totalPurchases;
      topTotals.expenses += expensesAmt;

      const topTr = document.createElement('tr');
      topTr.innerHTML = `
        <td><strong>${monthName}</strong></td>
        <td class="text-right">${fmt(sales)}</td>
        <td class="text-right">${fmt(online)}</td>
        <td class="text-right">${fmt(instant)}</td>
        <td class="text-right">${fmt(cc)}</td>
        <td class="text-right">${fmt(total)}</td>
        <td class="text-right">${fmt(cashPaymentsAmt)}</td>
        <td class="text-right">${fmt(bankPaymentsAmt)}</td>
        <td class="text-right">${fmt(lotteryPayments)}</td>
        <td class="text-right">${fmt(totalPurchases)}</td>
        <td class="text-right">${fmt(expensesAmt)}</td>
      `;
      topTbody.appendChild(topTr);

      const salesHst = sumByMonth(salesEntries, 'hst', month);
      const cashHst = monthCash.reduce((sum, row) => sum + numeric(row.hst), 0);
      const bankHst = monthBank.reduce((sum, row) => sum + numeric(row.hst), 0);
      const salary = monthSalaries.reduce((sum, row) => sum + numeric(row.amount), 0);
      const totalHst = cashHst + bankHst;
      const utilitiesHst = monthExpenses.reduce((sum, row) => sum + numeric(row.hst), 0);
      const interac = sumByMonth(salesEntries, 'mc', month) + sumByMonth(salesEntries, 'visa', month) + sumByMonth(salesEntries, 'debit', month);
      const cashDeposits = sumByMonth(salesEntries, 'cash', month);
      const lotteryIncome = sumByMonth(lotteryRecords, 'lotteryIncome', month);
      const otherIncomeAmt = monthOtherIncome.reduce((sum, row) => sum + numeric(row.amount), 0);

      bottomTotals.salesHst += salesHst;
      bottomTotals.cashHst += cashHst;
      bottomTotals.bankHst += bankHst;
      bottomTotals.salaries += salary;
      bottomTotals.totalHst += totalHst;
      bottomTotals.utilitiesHst += utilitiesHst;
      bottomTotals.interac += interac;
      bottomTotals.cashDeposits += cashDeposits;
      bottomTotals.lotteryIncome += lotteryIncome;
      bottomTotals.otherIncome += otherIncomeAmt;

      const bottomTr = document.createElement('tr');
      bottomTr.innerHTML = `
        <td><strong>${monthName}</strong></td>
        <td class="text-right">${fmt(salesHst)}</td>
        <td class="text-right">${fmt(cashHst)}</td>
        <td class="text-right">${fmt(bankHst)}</td>
        <td class="text-right">${fmt(salary)}</td>
        <td class="text-right">${fmt(totalHst)}</td>
        <td class="text-right">${fmt(utilitiesHst)}</td>
        <td class="text-right">${fmt(interac)}</td>
        <td class="text-right">${fmt(cashDeposits)}</td>
        <td class="text-right">${fmt(lotteryIncome)}</td>
        <td class="text-right">${fmt(otherIncomeAmt)}</td>
      `;
      bottomTbody.appendChild(bottomTr);
    });

    updateFooter({
      annHst1_sales: fmt(topTotals.sales),
      annHst1_online: fmt(topTotals.online),
      annHst1_instant: fmt(topTotals.instant),
      annHst1_cc: fmt(topTotals.cc),
      annHst1_total: fmt(topTotals.total),
      annHst1_cashPayments: fmt(topTotals.cashPayments),
      annHst1_bankPayments: fmt(topTotals.bankPayments),
      annHst1_lotteryPayments: fmt(topTotals.lotteryPayments),
      annHst1_totalPurchases: fmt(topTotals.totalPurchases),
      annHst1_expenses: fmt(topTotals.expenses),
      annHst2_salesHst: fmt(bottomTotals.salesHst),
      annHst2_cashHst: fmt(bottomTotals.cashHst),
      annHst2_bankHst: fmt(bottomTotals.bankHst),
      annHst2_salaries: fmt(bottomTotals.salaries),
      annHst2_totalHst: fmt(bottomTotals.totalHst),
      annHst2_utilitiesHst: fmt(bottomTotals.utilitiesHst),
      annHst2_interac: fmt(bottomTotals.interac),
      annHst2_cashDeposits: fmt(bottomTotals.cashDeposits),
      annHst2_lotteryIncome: fmt(bottomTotals.lotteryIncome),
      annHst2_otherIncome: fmt(bottomTotals.otherIncome),
    });
  }

  function buildMonthPills() {
    const container = document.getElementById('monthPills');
    container.innerHTML = '';

    MONTH_NAMES.forEach((monthName, index) => {
      const button = document.createElement('button');
      button.className = `month-pill${index + 1 === reportMonth ? ' active' : ''}`;
      button.textContent = monthName.slice(0, 3);
      button.dataset.month = index + 1;
      button.addEventListener('click', async () => {
        reportMonth = index + 1;
        container.querySelectorAll('.month-pill').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        await renderMonthly();
      });
      container.appendChild(button);
    });
  }

  function initSubTabs() {
    document.querySelectorAll('.report-sub-tab').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.report-sub-tab').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.report-panel').forEach(panel => panel.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(button.dataset.panel).classList.add('active');
      });
    });
  }

  function initAnnualSubTabs() {
    const tabs = document.querySelectorAll('.annual-sub-tab');
    if (!tabs.length) return;
    const panels = document.querySelectorAll('.annual-subpanel');
    tabs.forEach(button => {
      button.addEventListener('click', () => {
        tabs.forEach(tab => tab.classList.remove('active'));
        panels.forEach(panel => panel.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(button.dataset.panel)?.classList.add('active');
      });
    });
  }

  function initVendorSummaryTabs() {
    const tabs = document.querySelectorAll('.vendor-summary-tab');
    if (!tabs.length) return;
    const panels = document.querySelectorAll('.vendor-summary-panel');
    tabs.forEach(button => {
      button.addEventListener('click', () => {
        tabs.forEach(tab => tab.classList.remove('active'));
        panels.forEach(panel => panel.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(button.dataset.panel)?.classList.add('active');
      });
    });
  }

  async function syncWorkbookStoreSelectors() {
    const stores = await DataStore.getStores();
    const activeStoreId = DataStore.getActiveStore();
    const selectors = [
      document.getElementById('exportStoreSelect'),
      document.getElementById('importStoreSelect'),
    ].filter(Boolean);

    selectors.forEach(select => {
      const previous = parseInt(select.value, 10);
      const fallbackId = Number.isInteger(previous) && stores.some(store => store.id === previous)
        ? previous
        : (stores.some(store => store.id === activeStoreId) ? activeStoreId : stores[0]?.id);
      select.innerHTML = stores.map(store => `<option value="${store.id}">${escapeHtml(store.name)}</option>`).join('');
      if (fallbackId) select.value = String(fallbackId);
    });
  }

  async function downloadAnnualWorkbook() {
    const button = document.getElementById('exportWorkbookBtn');
    const storeId = parseInt(document.getElementById('exportStoreSelect').value, 10);
    const year = parseInt(document.getElementById('exportYear').value, 10);
    const originalLabel = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Preparing workbook...';

    try {
      const { blob, filename } = await DataStore.downloadAnnualWorkbookForStore(storeId, year);
      const link = document.createElement('a');
      const downloadUrl = URL.createObjectURL(blob);
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      const storeName = document.getElementById('exportStoreSelect').selectedOptions[0]?.textContent || 'store';
      showToast(`Workbook exported for ${storeName} (${year})`);
    } finally {
      button.disabled = false;
      button.innerHTML = originalLabel;
    }
  }

  async function importAnnualWorkbook() {
    const button = document.getElementById('importWorkbookBtn');
    const fileInput = document.getElementById('importWorkbookFile');
    const storeId = parseInt(document.getElementById('importStoreSelect').value, 10);
    const year = parseInt(document.getElementById('importYear').value, 10);
    const file = fileInput?.files?.[0];
    if (!file) {
      showToast('Select an Excel file to import');
      return;
    }

    const originalLabel = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Importing workbook...';
    try {
      const result = await DataStore.importAnnualWorkbookForStore(storeId, year, file);
      fileInput.value = '';
      await Promise.all([renderMonthly(), renderAnnual(), SalesEntry.refresh(), MonthlyEntry.refreshAll()]);
      const dailyCount = result?.imported?.daily_sales ?? 0;
      const storeName = document.getElementById('importStoreSelect').selectedOptions[0]?.textContent || 'store';
      showToast(`Workbook imported for ${storeName} (${dailyCount} daily rows)`);
    } finally {
      button.disabled = false;
      button.innerHTML = originalLabel;
    }
  }

  async function refreshAll() {
    await syncWorkbookStoreSelectors();
    await Promise.all([
      renderMonthly(),
      renderAnnual(),
      renderStoreDashboard(),
      renderPerformanceDashboard(),
    ]);
  }

  async function init() {
    populateYearSelect('reportYear');
    populateYearSelect('annualYear');
    populateYearSelect('dashboardYear');
    populateYearSelect('exportYear');
    populateYearSelect('importYear');

    document.getElementById('reportYear').addEventListener('change', async event => {
      reportYear = parseInt(event.target.value, 10);
      buildMonthPills();
      await renderMonthly();
    });

    document.getElementById('annualYear').addEventListener('change', async () => {
      await renderAnnual();
    });

    document.getElementById('dashboardYear').addEventListener('change', async () => {
      await renderStoreDashboard();
      await renderPerformanceDashboard();
    });

    document.getElementById('exportWorkbookBtn').addEventListener('click', async () => {
      await downloadAnnualWorkbook();
    });
    document.getElementById('importWorkbookBtn').addEventListener('click', async () => {
      await importAnnualWorkbook();
    });

    document.getElementById('dailySalesReviewTbody').addEventListener('click', async event => {
      const row = event.target.closest('tr');
      if (!row) return;
      if (event.target.classList.contains('btn-edit')) {
        await editDailyEntry(row.dataset.date);
      }
    });
    initSubTabs();
    initAnnualSubTabs();
    initVendorSummaryTabs();
    buildMonthPills();
    await refreshAll();
  }

  return { init, renderMonthly, renderAnnual, renderStoreDashboard, renderPerformanceDashboard, refreshAll };
})();
