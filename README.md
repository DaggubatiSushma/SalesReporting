# Sales Reporting

Sales Reporting is a Flask-based web application for managing store-level sales, payments, expenses, salaries, lottery records, LCBO workflows, and credit card reconciliation.

## Tech stack

- Python (Flask)
- PostgreSQL via `DATABASE_URL`
- OpenPyXL for report exports

## Project structure

- `main.py` - Flask app, API routes, DB initialization, and business logic
- `frontend/` - Static frontend assets (HTML/CSS/JS)
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
- `DATABASE_URL` is required and the app uses PostgreSQL.

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
3. Create `.env` from `.env.example` and update values.
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

