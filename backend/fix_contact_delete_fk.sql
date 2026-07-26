-- Fix contact delete: allow activities.contact_id to become NULL when contact is deleted
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_contact_id_fkey;

ALTER TABLE activities
  ADD CONSTRAINT activities_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES contacts(id)
  ON DELETE SET NULL;
