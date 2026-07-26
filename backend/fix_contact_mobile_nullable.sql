-- Allow contacts without mobile number
ALTER TABLE contacts ALTER COLUMN mobile DROP NOT NULL;
