-- Store in-app error reports (does not delete CRM data)
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
);

CREATE INDEX IF NOT EXISTS ix_error_reports_fingerprint ON error_reports (fingerprint);
CREATE INDEX IF NOT EXISTS ix_error_reports_status_last_seen ON error_reports (status, last_seen_at);
