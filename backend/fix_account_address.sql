-- Replace accounts.location with province / city / address
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS province VARCHAR;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS city VARCHAR;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS address VARCHAR;

UPDATE accounts
SET address = location
WHERE location IS NOT NULL AND location <> '' AND (address IS NULL OR address = '');

ALTER TABLE accounts DROP COLUMN IF EXISTS location;
