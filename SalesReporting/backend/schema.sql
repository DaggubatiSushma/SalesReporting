PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    entry_date TEXT NOT NULL,
    total REAL NOT NULL DEFAULT 0,
    sales REAL NOT NULL DEFAULT 0,
    hst REAL NOT NULL DEFAULT 0,
    online REAL NOT NULL DEFAULT 0,
    instant REAL NOT NULL DEFAULT 0,
    cc REAL NOT NULL DEFAULT 0,
    gc REAL NOT NULL DEFAULT 0,
    non_add REAL NOT NULL DEFAULT 0,
    mc REAL NOT NULL DEFAULT 0,
    visa REAL NOT NULL DEFAULT 0,
    debit REAL NOT NULL DEFAULT 0,
    cash REAL NOT NULL DEFAULT 0,
    lottery_payment REAL NOT NULL DEFAULT 0,
    lottery_income REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (store_id, entry_date)
);

CREATE TABLE IF NOT EXISTS lottery_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    lottery_date TEXT NOT NULL,
    lottery_payment REAL NOT NULL DEFAULT 0,
    lottery_income REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (store_id, lottery_date)
);

CREATE TABLE IF NOT EXISTS cash_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    payment_date TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    hst REAL NOT NULL DEFAULT 0,
    source_type TEXT NOT NULL DEFAULT '',
    source_ref_id INTEGER,
    source_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    payment_date TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    hst REAL NOT NULL DEFAULT 0,
    chq TEXT NOT NULL DEFAULT '',
    source_type TEXT NOT NULL DEFAULT '',
    source_ref_id INTEGER,
    source_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    expense_date TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    hst REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS salaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    salary_date TEXT NOT NULL,
    employee TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS other_income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    income_date TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lcbo_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    entry_date TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    invoice_no TEXT NOT NULL,
    credit_ending TEXT NOT NULL DEFAULT '',
    amount REAL NOT NULL DEFAULT 0,
    hst REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_card_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    payment_date TEXT NOT NULL,
    purpose TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_card_reconciliation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_date TEXT NOT NULL,
    credit_card TEXT NOT NULL,
    merchant_name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    hst_cents INTEGER NOT NULL DEFAULT 0 CHECK (hst_cents >= 0),
    dedicated_store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'UNALLOCATED' CHECK (status IN ('UNALLOCATED', 'ALLOCATED', 'REVERSED')),
    allocated_store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    payment_type TEXT CHECK (payment_type IN ('CASH', 'DEBIT')),
    allocation_resource TEXT,
    allocation_record_id INTEGER,
    allocated_at TEXT,
    reversed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lcbo_monthly_workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    status TEXT NOT NULL DEFAULT 'PENDING_VALIDATION'
        CHECK (status IN ('PENDING_VALIDATION', 'VALIDATED', 'POSTED_TO_CASH_DEBIT')),
    validated_amount REAL NOT NULL DEFAULT 0,
    validated_at TEXT,
    notes TEXT NOT NULL DEFAULT '',
    posted_at TEXT,
    posted_resource TEXT,
    posted_record_id INTEGER,
    posted_payment_type TEXT CHECK (posted_payment_type IN ('CASH', 'DEBIT')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (store_id, year, month)
);

CREATE TABLE IF NOT EXISTS lcbo_monthly_workflow_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER NOT NULL REFERENCES lcbo_monthly_workflows(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    event_amount REAL NOT NULL DEFAULT 0,
    event_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_sales_store_date
    ON daily_sales (store_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_lottery_records_store_date
    ON lottery_records (store_id, lottery_date);

CREATE INDEX IF NOT EXISTS idx_cash_payments_store_date
    ON cash_payments (store_id, payment_date);

CREATE INDEX IF NOT EXISTS idx_bank_payments_store_date
    ON bank_payments (store_id, payment_date);

CREATE INDEX IF NOT EXISTS idx_expenses_store_date
    ON expenses (store_id, expense_date);

CREATE INDEX IF NOT EXISTS idx_salaries_store_date
    ON salaries (store_id, salary_date);

CREATE INDEX IF NOT EXISTS idx_other_income_store_date
    ON other_income (store_id, income_date);

CREATE INDEX IF NOT EXISTS idx_lcbo_entries_store_date
    ON lcbo_entries (store_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_credit_card_payments_store_date
    ON credit_card_payments (store_id, payment_date);

CREATE INDEX IF NOT EXISTS idx_ccr_transaction_date
    ON credit_card_reconciliation (transaction_date);

CREATE INDEX IF NOT EXISTS idx_ccr_status
    ON credit_card_reconciliation (status);

CREATE INDEX IF NOT EXISTS idx_ccr_dedicated_store
    ON credit_card_reconciliation (dedicated_store_id);

CREATE INDEX IF NOT EXISTS idx_ccr_allocated_store
    ON credit_card_reconciliation (allocated_store_id);

CREATE INDEX IF NOT EXISTS idx_lcbo_workflows_store_period
    ON lcbo_monthly_workflows (store_id, year, month);

CREATE INDEX IF NOT EXISTS idx_lcbo_workflow_events_workflow
    ON lcbo_monthly_workflow_events (workflow_id, id);
