-- Healing loop cycle tracking

ALTER TABLE relationships
  ADD COLUMN IF NOT EXISTS cycle_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS questions_answered_this_cycle INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS themes_covered JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE ai_questions
  ADD COLUMN IF NOT EXISTS cycle_number INTEGER,
  ADD COLUMN IF NOT EXISTS theme TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_questions_cycle
  ON ai_questions(relationship_id, cycle_number);
