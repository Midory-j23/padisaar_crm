"""Apply login/OTP/error_reports schema fixes. Safe to run multiple times.

Run from the backend directory so .env is loaded:

    cd ~/pyprojects/crm2/backend
    source /home/crm/pyprojects/venv/bin/activate
    python fix_login_schema.py
"""

import asyncio
import re

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings

STATEMENTS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_mobile ON users (mobile)",
    """
    CREATE TABLE IF NOT EXISTS login_otps (
        id VARCHAR PRIMARY KEY,
        mobile VARCHAR NOT NULL,
        code_hash VARCHAR NOT NULL,
        expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_login_otps_mobile ON login_otps (mobile)",
    """
    CREATE TABLE IF NOT EXISTS error_reports (
        id VARCHAR PRIMARY KEY,
        fingerprint VARCHAR NOT NULL,
        source VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'open',
        message VARCHAR NOT NULL,
        stack TEXT,
        path VARCHAR,
        method VARCHAR,
        status_code INTEGER,
        user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        user_agent VARCHAR,
        app_version VARCHAR,
        occurrence_count INTEGER NOT NULL DEFAULT 1,
        extra JSON DEFAULT '{}',
        created_at TIMESTAMP WITHOUT TIME ZONE,
        last_seen_at TIMESTAMP WITHOUT TIME ZONE,
        resolved_at TIMESTAMP WITHOUT TIME ZONE,
        resolved_by_id VARCHAR REFERENCES users(id) ON DELETE SET NULL
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_error_reports_fingerprint ON error_reports (fingerprint)",
    "CREATE INDEX IF NOT EXISTS ix_error_reports_status_last_seen ON error_reports (status, last_seen_at)",
]


def _redacted_db_url(url: str) -> str:
    return re.sub(r"://([^:/]+):([^@]+)@", r"://\1:***@", url)


async def _column_names(conn, table: str) -> list[str]:
    result = await conn.execute(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :table "
            "ORDER BY ordinal_position"
        ),
        {"table": table},
    )
    return [row[0] for row in result]


async def main() -> None:
    print("DB:", _redacted_db_url(settings.DATABASE_URL))
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        print("users columns before:", await _column_names(conn, "users"))
        for sql in STATEMENTS:
            await conn.execute(text(sql))
            first = sql.strip().splitlines()[0].strip()
            print("applied:", first[:80])
        print("users columns after:", await _column_names(conn, "users"))
        tables = await conn.execute(
            text(
                "SELECT tablename FROM pg_tables "
                "WHERE schemaname = 'public' "
                "AND tablename IN ('login_otps', 'error_reports') "
                "ORDER BY 1"
            )
        )
        print("tables:", [row[0] for row in tables])
    await engine.dispose()
    print("DONE")


if __name__ == "__main__":
    asyncio.run(main())
