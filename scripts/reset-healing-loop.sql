-- Reset healing loop data for Ben + Sarah (keeps onboarding)
-- Canonical relationship: 7d16deaa-7506-44f9-a8c9-ea63cfdd69b2

BEGIN;

-- Delete answers (via questions) and briefings first
DELETE FROM user_answers
WHERE question_id IN (
  SELECT id FROM ai_questions
  WHERE relationship_id = '7d16deaa-7506-44f9-a8c9-ea63cfdd69b2'
);

DELETE FROM briefings
WHERE relationship_id = '7d16deaa-7506-44f9-a8c9-ea63cfdd69b2';

DELETE FROM ai_questions
WHERE relationship_id = '7d16deaa-7506-44f9-a8c9-ea63cfdd69b2';

DELETE FROM relationship_insights
WHERE relationship_id = '7d16deaa-7506-44f9-a8c9-ea63cfdd69b2'
  AND insight_type <> 'onboarding_analysis';

DELETE FROM healing_milestones
WHERE relationship_id = '7d16deaa-7506-44f9-a8c9-ea63cfdd69b2'
  AND milestone_key NOT IN ('linked', 'onboarding_complete', 'connected');

UPDATE relationships
SET
  cycle_number = 1,
  questions_answered_this_cycle = 0,
  partner_answers_this_cycle = '{}'::jsonb,
  themes_covered = '[]'::jsonb,
  updated_at = NOW()
WHERE id = '7d16deaa-7506-44f9-a8c9-ea63cfdd69b2';

COMMIT;

-- After this SQL, call POST /api/relationship/7d16deaa-7506-44f9-a8c9-ea63cfdd69b2/reset-healing-loop
-- with seedCycle1:true OR click "Start healing session" in the app.
