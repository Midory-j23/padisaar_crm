# Padisaar CRM

B2B CRM for Iranian infrastructure/industrial companies.

## Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0, PostgreSQL, Alembic
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Zustand

## Quick start

### Database (PostgreSQL)

PostgreSQL runs via Docker on **port 5434** (avoids conflicts with other local Postgres instances).

```powershell
# From project root
docker compose up -d
```

Connection: `postgresql://postgres:postgres@localhost:5434/padisaar_crm`

**One-command setup** (from project root):

```powershell
.\scripts\setup-database.ps1
```

This starts Docker, runs migrations, seeds data, and resets demo passwords.

### Backend

**Important:** all backend commands must be run from the `backend` folder (not the project root).

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install --index-url https://pypi.org/simple -r requirements.txt
copy .env.example .env
.\venv\Scripts\alembic upgrade head
python seed.py
.\venv\Scripts\uvicorn app.main:app --reload --port 8000
```

If `alembic` or `uvicorn` is not recognized after activate, use the `.\venv\Scripts\` prefix as shown above.

If port **8000** fails with `WinError 10013`, another app is using it — try **8001** instead:

```powershell
.\venv\Scripts\uvicorn app.main:app --reload --port 8001
```

Then set the frontend API URL in `frontend/.env`:

```
VITE_API_URL=http://localhost:8001/api
```

If this is a fresh clone and no migration exists yet:

```powershell
cd backend
.\venv\Scripts\alembic revision --autogenerate -m "init"
.\venv\Scripts\alembic upgrade head
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — login with:

- **Email:** `admin@padisaar.com` / `admin123`
- **Phone (SMS OTP):** `09120000001` — request code on login page (dev mode shows code in toast)
- **Email:** `expert@padisaar.com` / `expert123`
- **Phone (SMS OTP):** `09120000002`

### SMS gateway (phone OTP login)

Configure in `backend/.env`:

| Variable | Description |
|----------|-------------|
| `SMS_PROVIDER` | `console` (dev), `kavenegar`, or `http` (generic REST) |
| `SMS_API_KEY` | Kavenegar API key |
| `SMS_SENDER` | Sender line number |
| `SMS_GATEWAY_URL` | e.g. `http://192.168.102.104/sms/send` |
| `SMS_GATEWAY_API_KEY` | Sent as `X-API-KEY` header |
| `SMS_GATEWAY_TIMEOUT_SECONDS` | Request timeout (default `5`) |
| `SMS_DEBUG_RETURN_CODE` | `true` in dev — returns OTP in API (never use in production) |

Run migration after pull: `.\venv\Scripts\alembic upgrade head`

**Tip:** use `http://localhost:5173` (not `127.0.0.1`) in the browser. In dev, API calls go through the Vite proxy (`/api` → backend) so CORS issues are avoided.

If login still fails, restart both servers after pulling changes:

```powershell
# Terminal 1 — database
docker compose up -d

# Terminal 2 — backend (from backend folder)
cd backend
.\venv\Scripts\uvicorn app.main:app --reload --port 8000

# Terminal 3 — frontend
cd frontend
npm run dev
```

## Modules (vs full spec — 11 phases)

| Phase | Module | Status | Notes |
|-------|--------|--------|-------|
| 1 | Foundation (Backend + Frontend + DB) | **Done** | FastAPI + React + PostgreSQL + Alembic |
| 2 | Auth & RBAC (JWT) | **Done** | `useAuth` hook, change-password, notification prefs API |
| 3 | Accounts (سازمان‌ها) | **Done** | |
| 4 | Contacts (مخاطبان) | **Done** | |
| 5 | Opportunities + Kanban | **Done** | |
| 6 | Activities (فعالیت‌ها) | **Done** | Multi-contact, overdue list, searchable account, opp prompt |
| 7 | Win/Loss (تحلیل برد/باخت) | **Done** | |
| 8 | Dashboard KPI + Recharts | **Done** | Funnel conversion labels between stages |
| 9 | Notifications & polling | **Done** | Bell dropdown, prefs UI, respect user preferences |
| 10 | Reports, Export, Import, Users | **Done** | Excel + PDF export, accounts/contacts import, audit log |
| 11 | Full i18n + RTL + Jalali | **Done** | `fa.ts`, `DataTable`, `EmptyState`, Jalali dates |
