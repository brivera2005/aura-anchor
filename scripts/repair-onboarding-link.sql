UPDATE onboarding_responses o
SET relationship_id = '7d16deaa-7506-44f9-a8c9-ea63cfdd69b2'
WHERE o.relationship_id IS NULL
  AND o.user_id IN (
    'fd6f9663-8d30-45d9-bbde-c55be0b52f96',
    '0f89aee1-df55-4408-aad5-4049efd041f9'
  );

DELETE FROM relationship_insights
WHERE insight_type = 'onboarding_analysis'
  AND relationship_id IN (
    '7d16deaa-7506-44f9-a8c9-ea63cfdd69b2',
    'd5fcba2d-615b-4660-82a0-5ebb622ac68b'
  );
