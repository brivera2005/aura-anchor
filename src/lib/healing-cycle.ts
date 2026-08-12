import type { SupabaseClient } from "@supabase/supabase-js";
import { runCycleAnalysis } from "@/lib/ai";
import {
  computeNextCycleAvailableAt,
  getQuestionsPerCycle,
} from "@/lib/cycle-config";
import {
  isCycleReadyForAnalysis,
  resolvePartnerCycleCounts,
} from "@/lib/cycle-progress";
import { sendCycleCompleteEmail } from "@/lib/email/send-cycle-complete";
import { getAppUrl } from "@/lib/env";
import { decrypt } from "@/lib/encryption";
import { getDisplayName } from "@/lib/partner-names";
import { collectThemesFromMemory } from "@/lib/theme-memory";
import type { CycleAnalysis, Profile } from "@/lib/types";

interface RelationshipRow {
  id: string;
  user1_id: string;
  user2_id: string | null;
  cycle_number: number;
  questions_answered_this_cycle: number;
  partner_answers_this_cycle?: Record<string, number> | null;
  themes_covered: string[] | null;
  cycle_mode?: string | null;
}

export async function completeCycleIfReady(
  supabase: SupabaseClient,
  relationship: RelationshipRow,
  user1Profile: Profile | null,
  user2Profile: Profile | null
): Promise<CycleAnalysis | null> {
  const questionsPerCycle = getQuestionsPerCycle(relationship.cycle_mode);
  let partnerAnswers = await resolvePartnerCycleCounts(supabase, relationship);

  if (
    !isCycleReadyForAnalysis(
      { ...relationship, partner_answers_this_cycle: partnerAnswers },
      questionsPerCycle
    )
  ) {
    return null;
  }

  const cycleNumber = relationship.cycle_number;
  const user1Name = getDisplayName(user1Profile, "Partner 1");
  const user2Name = getDisplayName(user2Profile, "Partner 2");

  const { data: cycleQuestions } = await supabase
    .from("ai_questions")
    .select("id, question_text, theme, for_user_id")
    .eq("relationship_id", relationship.id)
    .eq("cycle_number", cycleNumber)
    .eq("status", "answered");

  const questionIds = (cycleQuestions || []).map((q) => q.id);
  if (questionIds.length === 0) return null;

  const { data: cycleAnswers } = await supabase
    .from("user_answers")
    .select("encrypted_answer, user_id, question_id, created_at")
    .in("question_id", questionIds)
    .order("created_at", { ascending: true });

  const questionMap = new Map((cycleQuestions || []).map((q) => [q.id, q]));

  const qaPairs: Array<{
    answererName: string;
    question: string;
    answer: string;
    theme: string;
  }> = [];

  for (const row of cycleAnswers || []) {
    const q = questionMap.get(row.question_id);
    let answerText = "";
    try {
      answerText = decrypt(row.encrypted_answer);
    } catch {
      answerText = "[encrypted]";
    }
    const answererName =
      row.user_id === relationship.user1_id ? user1Name : user2Name;
    qaPairs.push({
      answererName,
      question: q?.question_text || "Reflection question",
      answer: answerText,
      theme: q?.theme || "emotional_needs",
    });
  }

  const themesThisCycle = [
    ...new Set(qaPairs.map((q) => q.theme).filter(Boolean)),
  ];

  const { data: onboardingInsight } = await supabase
    .from("relationship_insights")
    .select("content")
    .eq("relationship_id", relationship.id)
    .eq("insight_type", "onboarding_analysis")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: priorCycles } = await supabase
    .from("relationship_insights")
    .select("content, created_at")
    .eq("relationship_id", relationship.id)
    .eq("insight_type", "cycle_analysis")
    .order("created_at", { ascending: true });

  const priorAnalyses = (priorCycles || []).map((c) => c.content as CycleAnalysis);
  const priorCycleSummaries = priorAnalyses.map((c) => c.summary);
  const priorThemesHistory = priorAnalyses.map((c) => ({
    cycleNumber: c.cycle_number,
    themes: c.themes_covered || [],
  }));

  const allThemesBefore = collectThemesFromMemory(
    priorThemesHistory,
    relationship.themes_covered || []
  );

  const analysis = await runCycleAnalysis({
    cycleNumber,
    names: { user1Name, user2Name },
    themesThisCycle,
    qaPairs,
    onboardingSummary: (onboardingInsight?.content as { summary?: string })?.summary,
    priorCycleSummaries,
    allThemesCovered: allThemesBefore,
    priorCycleAnalyses: priorAnalyses,
  });

  const trackedActions =
    analysis.joint_actions_this_week?.slice(0, 3) ||
    analysis.tracked_action_steps ||
    [];

  const enrichedAnalysis: CycleAnalysis = {
    ...analysis,
    tracked_action_steps: trackedActions,
    prior_cycle_followup:
      cycleNumber >= 1 && trackedActions[0]
        ? `Next cycle will check in: did you try "${trackedActions[0].slice(0, 80)}"?`
        : undefined,
    cycle_completed_at: new Date().toISOString(),
  };

  await supabase.from("relationship_insights").insert({
    relationship_id: relationship.id,
    insight_type: "cycle_analysis",
    content: enrichedAnalysis,
  });

  await supabase.from("healing_milestones").upsert(
    {
      relationship_id: relationship.id,
      milestone_key: `cycle_${cycleNumber}_complete`,
      title: analysis.title,
      description: analysis.summary,
    },
    { onConflict: "relationship_id,milestone_key" }
  );

  const updatedThemesCovered = [
    ...new Set([...(relationship.themes_covered || []), ...themesThisCycle]),
  ];
  const nextCycle = cycleNumber + 1;
  const nextAvailableAt = computeNextCycleAvailableAt();

  const { error: cycleResetError } = await supabase
    .from("relationships")
    .update({
      cycle_number: nextCycle,
      questions_answered_this_cycle: 0,
      partner_answers_this_cycle: {},
      themes_covered: updatedThemesCovered,
      next_cycle_available_at: nextAvailableAt,
      cycle_started_at: null,
    })
    .eq("id", relationship.id);

  if (cycleResetError?.message?.includes("partner_answers_this_cycle")) {
    await supabase
      .from("relationships")
      .update({
        cycle_number: nextCycle,
        questions_answered_this_cycle: 0,
        themes_covered: updatedThemesCovered,
        next_cycle_available_at: nextAvailableAt,
        cycle_started_at: null,
      })
      .eq("id", relationship.id);
  }

  const appUrl = getAppUrl();
  const reportUrl = `${appUrl}/relationship/${relationship.id}/cycle/${cycleNumber}`;

  if (relationship.user1_id && relationship.user2_id) {
    for (const profile of [user1Profile, user2Profile]) {
      if (!profile?.email) continue;
      const partnerProfile =
        profile.user_id === relationship.user1_id ? user2Profile : user1Profile;
      sendCycleCompleteEmail({
        toEmail: profile.email,
        recipientName: getDisplayName(profile),
        partnerName: getDisplayName(partnerProfile, "Partner"),
        reportUrl,
        cycleNumber,
      }).catch((err) => console.error("Cycle-complete email failed:", err));
    }
  }

  return enrichedAnalysis;
}

export { getQuestionsPerCycle as QUESTIONS_PER_CYCLE };
