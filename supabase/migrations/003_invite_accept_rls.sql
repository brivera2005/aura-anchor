-- Allow invite recipients to link themselves as user2 when accepting an invite.
-- (Previously only user1/user2 could UPDATE relationships, but user2_id is NULL until accept.)

CREATE POLICY "Invite recipients can accept relationship" ON relationships FOR UPDATE
  USING (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
    OR EXISTS (
      SELECT 1 FROM invites i
      WHERE i.relationship_id = relationships.id
        AND i.status = 'pending'
        AND lower(i.to_email) = lower(COALESCE(
          (SELECT email FROM profiles WHERE user_id = auth.uid()),
          (SELECT email FROM auth.users WHERE id = auth.uid())
        ))
    )
  )
  WITH CHECK (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
    OR (
      user2_id = auth.uid()
      AND status = 'active'
      AND EXISTS (
        SELECT 1 FROM invites i
        WHERE i.relationship_id = relationships.id
          AND i.status IN ('pending', 'accepted')
          AND lower(i.to_email) = lower(COALESCE(
            (SELECT email FROM profiles WHERE user_id = auth.uid()),
            (SELECT email FROM auth.users WHERE id = auth.uid())
          ))
      )
    )
  );

-- Partners in an active relationship can read each other's onboarding status.
DROP POLICY IF EXISTS "Partners can view partner profile" ON profiles;
CREATE POLICY "Partners can view partner profile" ON profiles FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.status = 'active'
        AND (
          (r.user1_id = auth.uid() AND r.user2_id = profiles.user_id)
          OR (r.user2_id = auth.uid() AND r.user1_id = profiles.user_id)
        )
    )
  );
