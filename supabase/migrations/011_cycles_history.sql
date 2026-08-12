-- Cycle history, absorb period, and cycle modes

ALTER TABLE relationships
  ADD COLUMN IF NOT EXISTS next_cycle_available_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cycle_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cycle_mode TEXT NOT NULL DEFAULT 'deep_dive'
    CHECK (cycle_mode IN ('deep_dive', 'check_in'));

CREATE INDEX IF NOT EXISTS idx_relationships_next_cycle
  ON relationships(next_cycle_available_at)
  WHERE next_cycle_available_at IS NOT NULL;
