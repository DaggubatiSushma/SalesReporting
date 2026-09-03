# Plan

## Current status
- Sales reporting app is running locally with live store data.
- Qmarket remains the active operational module.
- QFarm is reserved as a future module and is accessible via the module selector.

## Deployment direction
- Host the Flask app on PythonAnywhere.
- Prefer an external managed Postgres service such as Supabase for the production database.
- Only enable PythonAnywhere's built-in Postgres option if you want the database hosted in the same platform instead of using Supabase.

## Migration and deployment steps
1. Update the application to use PostgreSQL connection settings instead of SQLite.
2. Replace SQLite-specific PRAGMA and file-based DB assumptions with PostgreSQL-compatible patterns.
3. Create a Supabase project and database, or use PythonAnywhere's Postgres if preferred, then import the schema and current data.
4. Configure environment variables for SECRET_KEY, DATABASE_URL, MASTER_USERNAME, and MASTER_PASSWORD.
5. Prepare a production WSGI entrypoint for PythonAnywhere.
6. Deploy the app to PythonAnywhere and test login, store loading, and report queries.
7. Configure backup, monitoring, and production security for the deployed environment.

## Immediate next action
- Use the PythonAnywhere account setup to choose either Supabase Postgres or built-in Postgres, then deploy the app and validate the live connection.
