import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateCycleStartQuestions,
  pickThemesForCycle,
} from "@/lib/ai";
import {
  computeNextCycleAvailableAt,
  getQuestionsPerCycle,
  type CycleMode,
  shouldSuggestCheckIn,
} from "@/lib/cycle-config";
import { sendCycleCompleteEmail } from "@/lib/email/send-cycle-complete";
import { sendYourTurnEmail } from "@/lib/email/send-your-turn";
import { getAppUrl } from "@/lib/env";
import { getQuickAnswersForQuestion } from "@/lib/quick-answers";
import { getDisplayName, getPartnerFirstName } from "@/lib/partner-names";
import { loadPrecycleNotesForGuide } from "@/lib/precycle-note";
import {
  collectThemesFromMemory,
  getIntensityTier,
  getLongitudinalPrefix,
  pickThemesForCycleFromMemory,
} from "@/lib/theme-memory";
import {
  buildActionFollowupQuestion,
  buildQuestionContextNote,
} from "@/lib/theme-questions";
import type { CycleAnalysis, Profile } from "@/lib/types";

interface RelationshipRow {
  id: string;
  user1_id: string;
  user2_id: string | null;
  cycle_number: number;
  themes_covered: string[] | null;
  cycle_mode?: CycleMode | string | null;
}

export interface StartNextCycleOptions {
  cycleMode?: CycleMode;
  skipAbsorb?: boolean;
}

/** Create first questions for cycle N after absorb period or manual start. */
export async function startNextCycleQuestions(
  supabase: SupabaseClient,
  relationship: RelationshipRow,
  user1Profile: Profile | null,
  user2Profile: Profile | null,
  options: StartNextCycleOptions = {}
): Promise<{ created: boolean; suggestCheckIn: boolean }> {
  if (!relationship.user1_id || !relationship.user2_id) {
    return { created: false, suggestCheckIn: false };
  }

  const cycleNumber = relationship.cycle_number ?? 1;
  const cycleMode = (options.cycleMode ||
    relationship.cycle_mode ||
    "deep_dive") as CycleMode;
  const questionsPerCycle = getQuestionsPerCycle(cycleMode);

  const { count: existingPending } = await supabase
    .from("ai_questions")
    .select("*", { count: "exact", head: true })
    .eq("relationship_id", relationship.id)
    .eq("cycle_number", cycleNumber)
    .eq("status", "pending");

  if ((existingPending || 0) > 0) {
    return { created: false, suggestCheckIn: false };
  }

  const { data: priorInsights } = await supabase
    .from("relationship_insights")
    .select("content, created_at")
    .eq("relationship_id", relationship.id)
    .eq("insight_type", "cycle_analysis")
    .order("created_at", { ascending: true });

  const cycleRecords = (priorInsights || []).map((row) => {
    const c = row.content as CycleAnalysis;
    return { cycleNumber: c.cycle_number, themes: c.themes_covered || [] };
  });

  const allThemesUsed = collectThemesFromMemory(
    cycleRecords,
    relationship.themes_covered || []
  );

  const { themes: nextThemes, isRecycling } = pickThemesForCycleFromMemory(
    allThemesUsed,
    questionsPerCycle
  );

  const priorCycle = (priorInsights || [])
    .map((r) => r.content as CycleAnalysis)
    .find((c) => c.cycle_number === cycleNumber - 1);

  const priorSummary = priorCycle?.summary;
  const priorAction =
    priorCycle?.tracked_action_steps?.[0] ||
    priorCycle?.joint_actions_this_week?.[0];

  const precycleFocus = await loadPrecycleNotesForGuide(
    supabase,
    relationship.id,
    relationship.user1_id,
    relationship.user2_id,
    cycleNumber
  );

  const intensityTier = getIntensityTier(cycleNumber);
  const longitudinalPrefix = getLongitudinalPrefix(cycleNumber, priorSummary);

  const contextNote = buildQuestionContextNote({
    cycleNumber,
    intensityTier,
    longitudinalPrefix,
    precycleFocus,
    isRecyclingTheme: isRecycling,
    priorActionFollowup: priorAction
      ? `Ask if they tried: "${priorAction.slice(0, 80)}"`
      : undefined,
  });

  const user1Name = getDisplayName(user1Profile, "Partner 1");
  const user2Name = getDisplayName(user2Profile, "Partner 2");

  let nextQuestions = await generateCycleStartQuestions(
    { user1Name, user2Name },
    cycleNumber,
    nextThemes,
    priorSummary,
    contextNote
  );

  if (priorAction && cycleNumber > 1) {
    const partnerForUser1 = getPartnerFirstName(user2Profile);
    const partnerForUser2 = getPartnerFirstName(user1Profile);
    nextQuestions = {
      user1: buildActionFollowupQuestion(priorAction, partnerForUser1),
      user2: buildActionFollowupQuestion(priorAction, partnerForUser2),
    };
  }

  const now = new Date().toISOString();
  await supabase
    .from("relationships")
    .update({
      cycle_mode: cycleMode,
      cycle_started_at: now,
      next_cycle_available_at: null,
      partner_answers_this_cycle: {},
      questions_answered_this_cycle: 0,
    })
    .eq("id", relationship.id);

  const appUrl = getAppUrl();

  const pairs = [
    [relationship.user1_id, nextQuestions.user1, nextThemes[0]] as const,
    [relationship.user2_id, nextQuestions.user2, nextThemes[1] || nextThemes[0]] as const,
  ];

  for (const [userId, questionText, theme] of pairs) {
    if (!questionText) continue;
    const bubbleSuggestions = getQuickAnswersForQuestion(questionText, theme, 0);
    await supabase.from("ai_questions").insert({
      relationship_id: relationship.id,
      for_user_id: userId,
      question_text: questionText,
      cycle_number: cycleNumber,
      theme,
      context: {
        source: "cycle_start",
        cycle_number: cycleNumber,
        cycle_mode: cycleMode,
        bubble_suggestions: bubbleSuggestions.suggestions,
        template_index: 0,
        question_number: 1,
      },
      status: "pending",
    });

    const profile = userId === relationship.user1_id ? user1Profile : user2Profile;
    const partnerProfile =
      userId === relationship.user1_id ? user2Profile : user1Profile;
    if (profile?.email) {
      sendYourTurnEmail({
        toEmail: profile.email,
        recipientName: getDisplayName(profile),
        partnerName: getPartnerFirstName(partnerProfile),
        loopUrl: `${appUrl}/relationship/${relationship.id}/loop`,
        cycleNumber,
        questionNumber: 1,
        questionsPerCycle,
      }).catch((err) => console.error("Your-turn email failed:", err));
    }
  }

  const lastCompletedAt = priorInsights?.length
    ? priorInsights[priorInsights.length - 1].created_at
    : null;

  return {
    created: true,
    suggestCheckIn: shouldSuggestCheckIn(lastCompletedAt),
  };
}

export { computeNextCycleAvailableAt, pickThemesForCycle };
