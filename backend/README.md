# Padisaar CRM — Python Backend

FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL

## Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env
```

Create PostgreSQL database:

```sql
CREATE DATABASE padisaar_crm;
```

Run migrations and seed:

```bash
alembic revision --autogenerate -m "init"
alembic upgrade head
python seed.py
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Default users (after seed)

| Role    | Email                 | Password  |
|---------|-----------------------|-----------|
| Manager | admin@padisaar.com    | admin123  |
| Expert  | expert@padisaar.com   | expert123 |
