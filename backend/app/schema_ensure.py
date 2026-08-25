"""Idempotent schema fixes required for login/auth.

Production DBs that were stamped with alembic without applying migrations
can miss `users.mobile` / `login_otps`, which makes every login return HTTP 500.
"""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)

_ENSURE_STATEMENTS = [
    # Phone login (migration b2c3d4e5f6a7 + c3d4e5f6a7b8)
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_mobile ON users (mobile)",
    """
    UPDATE users SET mobile = '09120000001'
    WHERE email = 'admin@padisaar.com' AND mobile IS NULL
    """,
    """
    UPDATE users SET mobile = '09120000002'
    WHERE email = 'expert@padisaar.com' AND mobile IS NULL
    """,
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
    # Error reports (migration a8b9c0d1e2f3) — used by 500 handler / settings UI
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


async def ensure_auth_schema(engine: AsyncEngine) -> None:
    """Apply missing auth-related columns/tables. Safe to run on every startup."""
    async with engine.begin() as conn:
        for statement in _ENSURE_STATEMENTS:
            await conn.execute(text(statement))
    logger.info("Auth schema ensure completed (users.mobile, login_otps, error_reports)")
