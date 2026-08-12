import { linkOrphanedOnboardingResponses } from "./onboarding-responses";
import { partnerPairKey } from "./canonical-relationship";
import type { Relationship } from "./types";
import { createAdminClient, hasAdminClient } from "./supabase/admin";

export interface ReconcileResult {
  fixed: boolean;
  relationshipId?: string;
  reason?: string;
}

/**
 * Repairs relationships stuck in pending after invite accept (RLS used to block user2 updates).
 * Safe to call on every dashboard load for the relationship owner.
 */
export async function reconcileRelationshipForUser(
  userId: string
): Promise<ReconcileResult> {
  if (!hasAdminClient()) {
    return { fixed: false, reason: "admin_not_configured" };
  }

  const admin = createAdminClient();
  const mergeResult = await mergeDuplicateRelationships(admin, userId);
  if (mergeResult.merged && mergeResult.canonicalId) {
    return {
      fixed: true,
      relationshipId: mergeResult.canonicalId,
      reason: "merged_duplicate_relationships",
    };
  }

  const { data: asUser1 } = await admin
    .from("relationships")
    .select("*")
    .eq("user1_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (asUser1) {
    const fixed = await reconcilePendingRelationship(admin, asUser1);
    if (fixed) {
      return { fixed: true, relationshipId: asUser1.id, reason: "activated_pending" };
    }
  }

  const email = await getUserEmail(admin, userId);
  if (!email) {
    return { fixed: false, reason: "no_email" };
  }

  const { data: acceptedInvite } = await admin
    .from("invites")
    .select("id, relationship_id")
    .ilike("to_email", email)
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (acceptedInvite?.relationship_id) {
    const { data: rel } = await admin
      .from("relationships")
      .select("id, status, user2_id, user1_id")
      .eq("id", acceptedInvite.relationship_id)
      .maybeSingle();

    if (rel && rel.status === "pending" && !rel.user2_id) {
      const { error } = await admin
        .from("relationships")
        .update({ user2_id: userId, status: "active" })
        .eq("id", rel.id);

      if (!error) {
        await linkOrphanedOnboardingResponses(admin, rel.id, [
          userId,
          rel.user1_id,
        ]);
        return {
          fixed: true,
          relationshipId: rel.id,
          reason: "linked_from_accepted_invite",
        };
      }
    }
  }

  return { fixed: false };
}

async function countOnboardingForRelationship(
  admin: ReturnType<typeof createAdminClient>,
  relationshipId: string,
  userIds: string[]
): Promise<number> {
  const { count } = await admin
    .from("onboarding_responses")
    .select("id", { count: "exact", head: true })
    .eq("relationship_id", relationshipId)
    .in("user_id", userIds);
  return count ?? 0;
}

function pickBestDuplicate(
  admin: ReturnType<typeof createAdminClient>,
  group: Relationship[]
): Promise<Relationship> {
  return (async () => {
    let best = group[0];
    let bestCount = -1;

    for (const rel of group) {
      if (!rel.user1_id || !rel.user2_id) continue;
      const count = await countOnboardingForRelationship(admin, rel.id, [
        rel.user1_id,
        rel.user2_id,
      ]);
      if (
        count > bestCount ||
        (count === bestCount &&
          new Date(rel.created_at) < new Date(best.created_at))
      ) {
        best = rel;
        bestCount = count;
      }
    }

    return best;
  })();
}

/** End duplicate active relationships for the same couple; keep the one with onboarding data. */
export async function mergeDuplicateRelationships(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<{ merged: boolean; canonicalId?: string }> {
  const { data: rels } = await admin
    .from("relationships")
    .select("*")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false });

  if (!rels || rels.length < 2) return { merged: false };

  const groups = new Map<string, Relationship[]>();
  for (const rel of rels) {
    if (!rel.user2_id) continue;
    const key = partnerPairKey(rel);
    const list = groups.get(key) ?? [];
    list.push(rel);
    groups.set(key, list);
  }

  let merged = false;
  let canonicalId: string | undefined;

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const canonical = await pickBestDuplicate(admin, group);
    canonicalId = canonical.id;
    const userIds = [canonical.user1_id, canonical.user2_id!];

    for (const rel of group) {
      if (rel.id === canonical.id) continue;

      await linkOrphanedOnboardingResponses(admin, canonical.id, userIds);

      const { data: rows } = await admin
        .from("onboarding_responses")
        .select("user_id, question_key, encrypted_answer")
        .eq("relationship_id", rel.id)
        .in("user_id", userIds);

      for (const row of rows || []) {
        await admin.from("onboarding_responses").upsert(
          {
            user_id: row.user_id,
            relationship_id: canonical.id,
            question_key: row.question_key,
            encrypted_answer: row.encrypted_answer,
          },
          { onConflict: "user_id,relationship_id,question_key" }
        );
      }

      await admin
        .from("relationships")
        .update({ status: "ended", updated_at: new Date().toISOString() })
        .eq("id", rel.id);

      merged = true;
    }
  }

  return { merged, canonicalId };
}

async function getUserEmail(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<string> {
  const { data } = await admin
    .from("profiles")
    .select("email")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.email?.toLowerCase() ?? "";
}

async function reconcilePendingRelationship(
  admin: ReturnType<typeof createAdminClient>,
  relationship: Relationship
): Promise<boolean> {
  if (relationship.user2_id && relationship.status === "pending") {
    const { error } = await admin
      .from("relationships")
      .update({ status: "active" })
      .eq("id", relationship.id);
    return !error;
  }

  const { data: invite } = await admin
    .from("invites")
    .select("*")
    .eq("relationship_id", relationship.id)
    .in("status", ["accepted", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invite) return false;

  const { data: partnerProfile } = await admin
    .from("profiles")
    .select("user_id, onboarding_completed")
    .ilike("email", invite.to_email)
    .maybeSingle();

  if (!partnerProfile?.user_id) return false;

  const shouldActivate =
    invite.status === "accepted" || partnerProfile.onboarding_completed;

  if (!shouldActivate) return false;

  const { error: relError } = await admin
    .from("relationships")
    .update({
      user2_id: partnerProfile.user_id,
      status: "active",
    })
    .eq("id", relationship.id);

  if (relError) return false;

  if (hasAdminClient()) {
    await linkOrphanedOnboardingResponses(
      admin,
      relationship.id,
      [relationship.user1_id, partnerProfile.user_id]
    );
  }

  if (invite.status === "pending") {
    await admin
      .from("invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);
  }

  await admin.from("healing_milestones").upsert(
    {
      relationship_id: relationship.id,
      milestone_key: "linked",
      title: "Connected",
      description: "You and your partner are now linked",
    },
    { onConflict: "relationship_id,milestone_key" }
  );

  return true;
}
