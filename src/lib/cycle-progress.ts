import type { SupabaseClient } from "@supabase/supabase-js";
import { getQuestionsPerCycle } from "@/lib/cycle-config";
import type { Relationship } from "@/lib/types";
export type PartnerAnswersMap = Record<string, number>;

export interface CycleProgressSnapshot {
 cycleNumber: number;
 myAnswers: number;
 partnerAnswers: number;
 myComplete: boolean;
 partnerComplete: boolean;
 bothComplete: boolean;
 totalAnswers: number;
 questionsPerCycle: number;
}

export function parsePartnerAnswers(
 raw: unknown
): PartnerAnswersMap {
 if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
 const out: PartnerAnswersMap = {};
 for (const [key, value] of Object.entries(raw)) {
 if (typeof value === "number" && Number.isFinite(value)) {
 out[key] = value;
 }
 }
 return out;
}

export function getPartnerAnswerCount(
 relationship: {
 partner_answers_this_cycle?: Record<string, number> | null;
 },
 userId: string
): number {
 const map = parsePartnerAnswers(relationship.partner_answers_this_cycle);
 return map[userId] ?? 0;
}

export function buildPartnerAnswersUpdate(
 baseCounts: PartnerAnswersMap,
 userId: string,
 newCount: number
): PartnerAnswersMap {
 return {
 ...baseCounts,
 [userId]: newCount,
 };
}

export function getCycleProgress(
 relationship: Pick<
 Relationship,
 "cycle_number" | "partner_answers_this_cycle" | "user1_id" | "user2_id" | "cycle_mode"
 > & {
 partner_answers_this_cycle?: Record<string, number> | null;
 },
 currentUserId: string,
 partnerUserId: string | null,
 questionsPerCycle?: number
): CycleProgressSnapshot {
 const perCycle =
 questionsPerCycle ?? getQuestionsPerCycle(relationship.cycle_mode);
 const myAnswers = getPartnerAnswerCount(relationship, currentUserId);
 const partnerAnswers = partnerUserId
 ? getPartnerAnswerCount(relationship, partnerUserId)
 : 0;

 return {
 cycleNumber: relationship.cycle_number ?? 1,
 myAnswers,
 partnerAnswers,
 myComplete: myAnswers >= perCycle,
 partnerComplete: partnerAnswers >= perCycle,
 bothComplete:
 myAnswers >= perCycle &&
 partnerAnswers >= perCycle,
 totalAnswers: myAnswers + partnerAnswers,
 questionsPerCycle: perCycle,
 };
}

export function isCycleReadyForAnalysis(
 relationship: Pick<
 Relationship,
 "user1_id" | "user2_id" | "partner_answers_this_cycle" | "cycle_mode"
 > | {
 user1_id: string;
 user2_id: string | null;
 partner_answers_this_cycle?: Record<string, number> | null;
 cycle_mode?: string | null;
 },
 questionsPerCycle?: number
): boolean {
 const perCycle =
 questionsPerCycle ?? getQuestionsPerCycle(relationship.cycle_mode);
 if (!relationship.user1_id || !relationship.user2_id) return false;
 const user1Count = getPartnerAnswerCount(relationship, relationship.user1_id);
 const user2Count = getPartnerAnswerCount(relationship, relationship.user2_id);
 return user1Count >= perCycle && user2Count >= perCycle;
}

/** Reconcile counters from answered questions when JSONB is stale or empty. */
export async function reconcilePartnerAnswersFromDb(
 supabase: SupabaseClient,
 relationshipId: string,
 cycleNumber: number
): Promise<PartnerAnswersMap> {
 const { data: cycleQuestions } = await supabase
 .from("ai_questions")
 .select("for_user_id")
 .eq("relationship_id", relationshipId)
 .eq("cycle_number", cycleNumber)
 .eq("status", "answered");

 const counts: PartnerAnswersMap = {};
 for (const row of cycleQuestions || []) {
 counts[row.for_user_id] = (counts[row.for_user_id] || 0) + 1;
 }
 return counts;
}

/** Count answered questions in the current cycle - source of truth for partner progress. */
export async function resolvePartnerCycleCounts(
 supabase: SupabaseClient,
 relationship: {
 id: string;
 cycle_number?: number;
 partner_answers_this_cycle?: Record<string, number> | null;
 user1_id: string;
 user2_id: string | null;
 }
): Promise<PartnerAnswersMap> {
 return reconcilePartnerAnswersFromDb(
 supabase,
 relationship.id,
 relationship.cycle_number ?? 1
 );
}

/** Persist reconciled counts when JSONB counters are stale or incomplete. */
export async function syncPartnerCycleCountsToDb(
 supabase: SupabaseClient,
 relationship: {
 id: string;
 cycle_number?: number;
 partner_answers_this_cycle?: Record<string, number> | null;
 user1_id: string;
 user2_id: string | null;
 }
): Promise<PartnerAnswersMap> {
 const counts = await resolvePartnerCycleCounts(supabase, relationship);
 const stored = parsePartnerAnswers(relationship.partner_answers_this_cycle);
 const storedTotal = Object.values(stored).reduce((a, b) => a + b, 0);
 const countsTotal = Object.values(counts).reduce((a, b) => a + b, 0);

 const needsSync =
 countsTotal !== storedTotal ||
 (relationship.user1_id && (stored[relationship.user1_id] ?? 0) !== (counts[relationship.user1_id] ?? 0)) ||
 (relationship.user2_id && (stored[relationship.user2_id] ?? 0) !== (counts[relationship.user2_id] ?? 0));

 if (needsSync) {
 const totalAnswers = countsTotal;
 await supabase
 .from("relationships")
 .update({
 partner_answers_this_cycle: counts,
 questions_answered_this_cycle: totalAnswers,
 })
 .eq("id", relationship.id);
 }

 return counts;
}

export async function getCycleProgressResolved(
 supabase: SupabaseClient,
 relationship: {
 id: string;
 cycle_number?: number;
 partner_answers_this_cycle?: Record<string, number> | null;
 user1_id: string;
 user2_id: string | null;
 },
 currentUserId: string,
 partnerUserId: string | null
): Promise<CycleProgressSnapshot> {
 const counts = await resolvePartnerCycleCounts(supabase, relationship);
 const relWithCounts = { ...relationship, partner_answers_this_cycle: counts };
 return getCycleProgress(relWithCounts, currentUserId, partnerUserId);
}
