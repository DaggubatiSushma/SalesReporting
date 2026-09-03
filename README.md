# Sales Reporting

Sales Reporting is a Flask-based web application for managing store-level sales, payments, expenses, salaries, lottery records, LCBO workflows, and credit card reconciliation.

## Tech stack

- Python (Flask)
- SQLite (local default) or PostgreSQL (production via `DATABASE_URL`)
- OpenPyXL for report exports

## Project structure

- `main.py` - Flask app, API routes, DB initialization, and business logic
- `frontend/` - Static frontend assets (HTML/CSS/JS)
- `backend/schema.sql` - SQLite schema
- `backend/schema.postgres.sql` - PostgreSQL schema
- `wsgi.py` - WSGI entrypoint
- `.env.example` - Environment variable template

## Environment variables

Create a `.env` file in the project root (same level as `main.py`):

```env
SECRET_KEY=change-me
DATABASE_URL=postgresql://postgres:your-db-password@db.your-project-ref.supabase.co:5432/postgres?sslmode=require
MASTER_USERNAME=master
MASTER_PASSWORD=change-me
```

Notes:
- If `DATABASE_URL` is set, app uses PostgreSQL.
- If `DATABASE_URL` is missing/empty, app falls back to local SQLite (`sales_reporting.db`).

## Local development

1. Create and activate virtual environment
   - Windows (PowerShell):
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - Linux/macOS:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. (Optional) create `.env` from `.env.example` and update values.
4. Run:
   ```bash
   python main.py
   ```
5. Open: `http://localhost:8080`

## PostgreSQL (Supabase) setup

1. In Supabase, open **Project Settings > Database**.
2. Copy connection string (prefer pooler on PythonAnywhere if direct host has network issues).
3. Set `DATABASE_URL` in `.env`.
4. Run PostgreSQL schema in Supabase SQL Editor:
   - Copy/paste `backend/schema.postgres.sql`
   - Run query

## Migrate existing SQLite data to PostgreSQL

If you have data in `sales_reporting.db`, run a one-time migration.

1. Ensure PostgreSQL schema already exists.
2. Create `migrate_sqlite_to_supabase.py` in project root with:

```python
import sqlite3
import psycopg

SQLITE_PATH = "sales_reporting.db"
PG_DSN = "postgresql://postgres:<PASSWORD>@db.your-project-ref.supabase.co:5432/postgres?sslmode=require"

tables = [
    "stores",
    "daily_sales",
    "lottery_records",
    "cash_payments",
    "bank_payments",
    "expenses",
    "salaries",
    "other_income",
    "lcbo_entries",
    "credit_card_payments",
    "credit_card_reconciliation",
    "lcbo_monthly_workflows",
    "lcbo_monthly_workflow_events",
]

sqlite_conn = sqlite3.connect(SQLITE_PATH)
sqlite_conn.row_factory = sqlite3.Row

pg = psycopg.connect(PG_DSN)
pg.autocommit = False

with pg.cursor() as cur:
    for t in tables:
        cur.execute(f'TRUNCATE TABLE "{t}" RESTART IDENTITY CASCADE;')

    for t in tables:
        rows = sqlite_conn.execute(f'SELECT * FROM "{t}"').fetchall()
        if not rows:
            continue
        cols = rows[0].keys()
        col_sql = ", ".join(f'"{c}"' for c in cols)
        val_sql = ", ".join(["%s"] * len(cols))
        insert_sql = f'INSERT INTO "{t}" ({col_sql}) VALUES ({val_sql})'
        for row in rows:
            cur.execute(insert_sql, [row[c] for c in cols])

pg.commit()
pg.close()
sqlite_conn.close()

print("Migration complete.")
```

3. Run:
   ```bash
   python migrate_sqlite_to_supabase.py
   ```

## PythonAnywhere deployment

1. Create web app with **Manual configuration** (Python 3.12 or closest).
2. Clone project into:
   - `/home/<your-username>/SalesReporting`
3. Create venv and install dependencies:
   ```bash
   cd ~/SalesReporting
   python3.12 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
4. Create `.env` in `~/SalesReporting/.env` with production values.
5. Configure WSGI file with:

```python
import sys

project_home = "/home/<your-username>/SalesReporting"
if project_home not in sys.path:
    sys.path.insert(0, project_home)

from main import app as application
```

6. In PythonAnywhere Web tab, set:
   - Source code: `/home/<your-username>/SalesReporting`
   - Virtualenv: `/home/<your-username>/SalesReporting/.venv`
7. Reload web app.

## Verify active database

- If app shows data while Supabase tables are empty, app is using SQLite fallback.
- To verify Supabase usage, run in Supabase SQL Editor:

```sql
select count(*) from stores;
select count(*) from daily_sales;
```

## Wipe all PostgreSQL data (keep schema)

Run in Supabase SQL Editor:

```sql
TRUNCATE TABLE
  lcbo_monthly_workflow_events,
  lcbo_monthly_workflows,
  credit_card_reconciliation,
  credit_card_payments,
  lcbo_entries,
  other_income,
  salaries,
  expenses,
  bank_payments,
  cash_payments,
  lottery_records,
  daily_sales,
  stores
RESTART IDENTITY CASCADE;
```


