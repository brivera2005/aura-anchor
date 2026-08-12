-- Allow partners to clear and replace onboarding analysis artifacts via user JWT (no service role).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'relationship_insights'
      AND policyname = 'Partners can delete insights'
  ) THEN
    CREATE POLICY "Partners can delete insights" ON relationship_insights FOR DELETE
      USING (
        auth.uid() IN (
          SELECT user1_id FROM relationships WHERE id = relationship_id
          UNION SELECT user2_id FROM relationships WHERE id = relationship_id
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_questions'
      AND policyname = 'Partners can delete relationship questions'
  ) THEN
    CREATE POLICY "Partners can delete relationship questions" ON ai_questions FOR DELETE
      USING (
        auth.uid() IN (
          SELECT user1_id FROM relationships WHERE id = relationship_id
          UNION SELECT user2_id FROM relationships WHERE id = relationship_id
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'healing_milestones'
      AND policyname = 'Partners can update milestones'
  ) THEN
    CREATE POLICY "Partners can update milestones" ON healing_milestones FOR UPDATE
      USING (
        auth.uid() IN (
          SELECT user1_id FROM relationships WHERE id = relationship_id
          UNION SELECT user2_id FROM relationships WHERE id = relationship_id
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'healing_milestones'
      AND policyname = 'Partners can delete milestones'
  ) THEN
    CREATE POLICY "Partners can delete milestones" ON healing_milestones FOR DELETE
      USING (
        auth.uid() IN (
          SELECT user1_id FROM relationships WHERE id = relationship_id
          UNION SELECT user2_id FROM relationships WHERE id = relationship_id
        )
      );
  END IF;
END $$;
