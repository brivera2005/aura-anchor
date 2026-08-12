-- Expand relationship types and add subtype + connection name for multi-relationship support

ALTER TABLE relationships
  ADD COLUMN IF NOT EXISTS relationship_subtype TEXT,
  ADD COLUMN IF NOT EXISTS connection_name TEXT;

ALTER TABLE invites
  ADD COLUMN IF NOT EXISTS relationship_subtype TEXT,
  ADD COLUMN IF NOT EXISTS connection_name TEXT;

-- Drop old type constraints and add expanded list
ALTER TABLE relationships DROP CONSTRAINT IF EXISTS relationships_type_check;
ALTER TABLE relationships ADD CONSTRAINT relationships_type_check
  CHECK (type IN (
    'spouse', 'partner', 'parent', 'child', 'sibling', 'in_law',
    'friend', 'ex_partner', 'roommate', 'other'
  ));

ALTER TABLE invites DROP CONSTRAINT IF EXISTS invites_relationship_type_check;
ALTER TABLE invites ADD CONSTRAINT invites_relationship_type_check
  CHECK (relationship_type IN (
    'spouse', 'partner', 'parent', 'child', 'sibling', 'in_law',
    'friend', 'ex_partner', 'roommate', 'other'
  ));

-- Migrate legacy "parent" rows that meant parent/child generically (no subtype needed)
COMMENT ON COLUMN relationships.connection_name IS 'User-provided name before partner joins (e.g. Mom, Sarah)';
COMMENT ON COLUMN relationships.relationship_subtype IS 'Optional nuance: mother, brother, best_friend, etc.';
