import type { SupabaseClient } from "@supabase/supabase-js";
import { pickCanonicalRelationship } from "@/lib/canonical-relationship";
import { encrypt, decrypt, hasEncryptionKey } from "@/lib/encryption";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import type { Demographics } from "@/lib/types";

type DbClient = SupabaseClient;

export async function resolveRelationshipIdForUser(
  supabase: DbClient,
  userId: string
): Promise<string | null> {
  const { data: relationships } = await supabase
    .from("relationships")
    .select("*")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false });

  const canonical = pickCanonicalRelationship(relationships || []);
  return canonical?.id ?? null;
}

/**
 * Links onboarding rows saved before a relationship existed (relationship_id IS NULL)
 * to the couple's relationship. Safe to call repeatedly.
 */
export async function linkOrphanedOnboardingResponses(
  admin: DbClient,
  relationshipId: string,
  userIds: string[]
): Promise<number> {
  let linked = 0;

  for (const userId of userIds) {
    const { data: orphans } = await admin
      .from("onboarding_responses")
      .select("id, question_key, created_at")
      .eq("user_id", userId)
      .is("relationship_id", null)
      .order("created_at", { ascending: false });

    const latestByQuestion = new Map<string, string>();
    const duplicateIds: string[] = [];

    for (const orphan of orphans || []) {
      if (latestByQuestion.has(orphan.question_key)) {
        duplicateIds.push(orphan.id);
      } else {
        latestByQuestion.set(orphan.question_key, orphan.id);
      }
    }

    if (duplicateIds.length > 0) {
      await admin.from("onboarding_responses").delete().in("id", duplicateIds);
    }

    for (const [questionKey, orphanId] of latestByQuestion) {
      const { data: existing } = await admin
        .from("onboarding_responses")
        .select("id")
        .eq("user_id", userId)
        .eq("relationship_id", relationshipId)
        .eq("question_key", questionKey)
        .maybeSingle();

      if (existing) {
        await admin.from("onboarding_responses").delete().eq("id", orphanId);
      } else {
        const { error } = await admin
          .from("onboarding_responses")
          .update({ relationship_id: relationshipId })
          .eq("id", orphanId);

        if (!error) linked += 1;
      }
    }
  }

  return linked;
}

export interface PartnerOnboardingData {
  user1Responses: Record<string, string>;
  user2Responses: Record<string, string>;
  user1Count: number;
  user2Count: number;
}

function safeDecrypt(ciphertext: string): string | null {
  if (!hasEncryptionKey()) return null;
  try {
    return decrypt(ciphertext);
  } catch (err) {
    console.error("Failed to decrypt onboarding response:", err);
    return null;
  }
}

const DEMOGRAPHIC_KEYS = [
  "age_range",
  "relationship_length",
  "living_situation",
  "help_areas",
] as const;

/** Backfill missing onboarding rows from profiles.demographics when answers were only stored there. */
export async function backfillOnboardingFromDemographics(
  admin: DbClient,
  relationshipId: string,
  userId: string,
  demographics: Demographics | null | undefined
): Promise<number> {
  if (!demographics || !hasEncryptionKey()) return 0;

  let inserted = 0;
  const entries: Record<string, string | undefined> = {
    age_range: demographics.age_range,
    relationship_length: demographics.relationship_length,
    living_situation: demographics.living_situation,
    help_areas: Array.isArray(demographics.help_areas)
      ? demographics.help_areas.join(", ")
      : undefined,
  };

  for (const key of DEMOGRAPHIC_KEYS) {
    const value = entries[key]?.trim();
    if (!value) continue;

    const { data: existing } = await admin
      .from("onboarding_responses")
      .select("id")
      .eq("user_id", userId)
      .eq("relationship_id", relationshipId)
      .eq("question_key", key)
      .maybeSingle();

    if (existing) continue;

    const { error } = await admin.from("onboarding_responses").upsert(
      {
        user_id: userId,
        relationship_id: relationshipId,
        question_key: key,
        encrypted_answer: encrypt(value),
      },
      { onConflict: "user_id,relationship_id,question_key" }
    );

    if (!error) inserted += 1;
  }

  return inserted;
}

async function findRelationshipWithOnboardingData(
  admin: DbClient,
  relationshipId: string,
  user1Id: string,
  user2Id: string
): Promise<string> {
  const { count: primaryCount } = await admin
    .from("onboarding_responses")
    .select("id", { count: "exact", head: true })
    .eq("relationship_id", relationshipId)
    .in("user_id", [user1Id, user2Id]);

  if ((primaryCount ?? 0) > 0) return relationshipId;

  const { data: siblings } = await admin
    .from("relationships")
    .select("id")
    .or(
      `and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`
    )
    .neq("id", relationshipId)
    .neq("status", "ended");

  for (const sibling of siblings || []) {
    const { count } = await admin
      .from("onboarding_responses")
      .select("id", { count: "exact", head: true })
      .eq("relationship_id", sibling.id)
      .in("user_id", [user1Id, user2Id]);

    if ((count ?? 0) > 0) {
      await linkOrphanedOnboardingResponses(admin, relationshipId, [user1Id, user2Id]);
      const { data: rows } = await admin
        .from("onboarding_responses")
        .select("user_id, question_key, encrypted_answer")
        .eq("relationship_id", sibling.id)
        .in("user_id", [user1Id, user2Id]);

      for (const row of rows || []) {
        await admin.from("onboarding_responses").upsert(
          {
            user_id: row.user_id,
            relationship_id: relationshipId,
            question_key: row.question_key,
            encrypted_answer: row.encrypted_answer,
          },
          { onConflict: "user_id,relationship_id,question_key" }
        );
      }
      return relationshipId;
    }
  }

  return relationshipId;
}

async function ensureOnboardingData(
  admin: DbClient,
  relationshipId: string,
  user1Id: string,
  user2Id: string
): Promise<void> {
  await linkOrphanedOnboardingResponses(admin, relationshipId, [user1Id, user2Id]);
  await findRelationshipWithOnboardingData(admin, relationshipId, user1Id, user2Id);

  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, demographics, onboarding_completed")
    .in("user_id", [user1Id, user2Id]);

  for (const profile of profiles || []) {
    if (!profile.onboarding_completed) continue;
    await backfillOnboardingFromDemographics(
      admin,
      relationshipId,
      profile.user_id,
      profile.demographics as Demographics
    );
  }
}

export async function fetchPartnerOnboardingResponses(
  relationshipId: string,
  user1Id: string,
  user2Id: string,
  db?: DbClient
): Promise<PartnerOnboardingData> {
  if (hasAdminClient()) {
    const admin = createAdminClient();
    await ensureOnboardingData(admin, relationshipId, user1Id, user2Id);
  }

  const client = db ?? (hasAdminClient() ? createAdminClient() : null);
  if (!client) {
    throw new Error("Server misconfigured: cannot read partner onboarding responses");
  }

  const { data: rows, error } = await client
    .from("onboarding_responses")
    .select("user_id, question_key, encrypted_answer")
    .eq("relationship_id", relationshipId)
    .in("user_id", [user1Id, user2Id]);

  if (error) {
    throw new Error(`Failed to load onboarding responses: ${error.message}`);
  }

  const user1Responses: Record<string, string> = {};
  const user2Responses: Record<string, string> = {};

  for (const row of rows || []) {
    const plaintext = safeDecrypt(row.encrypted_answer);
    if (!plaintext) continue;

    if (row.user_id === user1Id) {
      user1Responses[row.question_key] = plaintext;
    } else if (row.user_id === user2Id) {
      user2Responses[row.question_key] = plaintext;
    }
  }

  return {
    user1Responses,
    user2Responses,
    user1Count: Object.keys(user1Responses).length,
    user2Count: Object.keys(user2Responses).length,
  };
}

export function isEmptyDataAnalysis(summary: string | undefined): boolean {
  if (!summary) return true;
  const lower = summary.toLowerCase();
  return (
    lower.includes("no onboarding responses") ||
    lower.includes("no responses were provided") ||
    lower.includes("without any provided responses")
  );
}

export async function clearOnboardingAnalysisArtifacts(
  admin: DbClient,
  relationshipId: string
): Promise<void> {
  await admin
    .from("relationship_insights")
    .delete()
    .eq("relationship_id", relationshipId)
    .eq("insight_type", "onboarding_analysis");

  const { data: questions } = await admin
    .from("ai_questions")
    .select("id, context")
    .eq("relationship_id", relationshipId)
    .eq("status", "pending");

  const staleIds = (questions || [])
    .filter((q) => {
      const ctx = q.context as { source?: string } | null;
      return ctx?.source === "onboarding_analysis";
    })
    .map((q) => q.id);

  if (staleIds.length > 0) {
    await admin.from("ai_questions").delete().in("id", staleIds);
  }

  await admin
    .from("healing_milestones")
    .delete()
    .eq("relationship_id", relationshipId)
    .eq("milestone_key", "onboarding_complete");
}
