-- Phone login: users.mobile + login_otps table
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR;
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_mobile ON users (mobile);

UPDATE users SET mobile = '09120000001'
WHERE email = 'admin@padisaar.com' AND mobile IS NULL;

UPDATE users SET mobile = '09120000002'
WHERE email = 'expert@padisaar.com' AND mobile IS NULL;

CREATE TABLE IF NOT EXISTS login_otps (
    id VARCHAR PRIMARY KEY,
    mobile VARCHAR NOT NULL,
    code_hash VARCHAR NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_login_otps_mobile ON login_otps (mobile);
