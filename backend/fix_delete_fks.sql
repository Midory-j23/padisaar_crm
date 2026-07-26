-- Fix account (company) + contact deletes blocked by foreign keys.
-- Run as: sudo -u postgres psql -d YOUR_DATABASE_NAME -f fix_delete_fks.sql

-- contacts.contact_id on activities → SET NULL when contact deleted
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_contact_id_fkey;
ALTER TABLE activities
  ADD CONSTRAINT activities_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES contacts(id)
  ON DELETE SET NULL;

-- When account deleted, cascade children
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_account_id_fkey;
ALTER TABLE contacts
  ADD CONSTRAINT contacts_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES accounts(id)
  ON DELETE CASCADE;

ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_account_id_fkey;
ALTER TABLE opportunities
  ADD CONSTRAINT opportunities_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES accounts(id)
  ON DELETE CASCADE;

ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_account_id_fkey;
ALTER TABLE activities
  ADD CONSTRAINT activities_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES accounts(id)
  ON DELETE CASCADE;

-- When opportunity deleted, cascade / null children
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_opportunity_id_fkey;
ALTER TABLE activities
  ADD CONSTRAINT activities_opportunity_id_fkey
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
  ON DELETE SET NULL;

ALTER TABLE opportunity_stage_history DROP CONSTRAINT IF EXISTS opportunity_stage_history_opportunity_id_fkey;
ALTER TABLE opportunity_stage_history
  ADD CONSTRAINT opportunity_stage_history_opportunity_id_fkey
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
  ON DELETE CASCADE;

ALTER TABLE win_loss_analysis DROP CONSTRAINT IF EXISTS win_loss_analysis_opportunity_id_fkey;
ALTER TABLE win_loss_analysis
  ADD CONSTRAINT win_loss_analysis_opportunity_id_fkey
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
  ON DELETE CASCADE;
