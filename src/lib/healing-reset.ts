import type { SupabaseClient } from "@supabase/supabase-js";
import { generateInitialQuestionsForBoth } from "@/lib/ai";
import { getDisplayName, getPartnerFirstName } from "@/lib/partner-names";
import { getQuickAnswersForQuestion } from "@/lib/quick-answers";
import { pickThemesForCycle } from "@/lib/healing-themes";
import { sendYourTurnEmail } from "@/lib/email/send-your-turn";
import { getAppUrl } from "@/lib/env";
import type { OnboardingAnalysis, Profile } from "@/lib/types";

const PRESERVED_MILESTONE_KEYS = new Set(["linked", "onboarding_complete", "connected"]);

export interface HealingResetStats {
  relationshipId: string;
  deletedAiQuestions: number;
  deletedUserAnswers: number;
  deletedBriefings: number;
  deletedInsights: number;
  deletedMilestones: number;
  seededQuestions: number;
}

export async function resetHealingLoopData(
  admin: SupabaseClient,
  relationshipId: string,
  options: { seedCycle1?: boolean } = { seedCycle1: true }
): Promise<HealingResetStats> {
  const stats: HealingResetStats = {
    relationshipId,
    deletedAiQuestions: 0,
    deletedUserAnswers: 0,
    deletedBriefings: 0,
    deletedInsights: 0,
    deletedMilestones: 0,
    seededQuestions: 0,
  };

  const { data: questionRows } = await admin
    .from("ai_questions")
    .select("id")
    .eq("relationship_id", relationshipId);

  const questionIds = (questionRows || []).map((q) => q.id);

  if (questionIds.length > 0) {
    const { count: answerCount } = await admin
      .from("user_answers")
      .delete({ count: "exact" })
      .in("question_id", questionIds);
    stats.deletedUserAnswers = answerCount || 0;
  }

  const { count: briefingCount } = await admin
    .from("briefings")
    .delete({ count: "exact" })
    .eq("relationship_id", relationshipId);
  stats.deletedBriefings = briefingCount || 0;

  const { count: questionCount } = await admin
    .from("ai_questions")
    .delete({ count: "exact" })
    .eq("relationship_id", relationshipId);
  stats.deletedAiQuestions = questionCount || 0;

  const { count: insightCount } = await admin
    .from("relationship_insights")
    .delete({ count: "exact" })
    .eq("relationship_id", relationshipId)
    .neq("insight_type", "onboarding_analysis");
  stats.deletedInsights = insightCount || 0;

  const { data: milestones } = await admin
    .from("healing_milestones")
    .select("id, milestone_key")
    .eq("relationship_id", relationshipId);

  const milestoneIdsToDelete = (milestones || [])
    .filter((m) => !PRESERVED_MILESTONE_KEYS.has(m.milestone_key))
    .map((m) => m.id);

  if (milestoneIdsToDelete.length > 0) {
    const { count: milestoneCount } = await admin
      .from("healing_milestones")
      .delete({ count: "exact" })
      .in("id", milestoneIdsToDelete);
    stats.deletedMilestones = milestoneCount || 0;
  }

  await admin
    .from("relationships")
    .update({
      cycle_number: 1,
      questions_answered_this_cycle: 0,
      partner_answers_this_cycle: {},
      themes_covered: [],
    })
    .eq("id", relationshipId);

  if (options.seedCycle1) {
    stats.seededQuestions = await seedCycle1Questions(admin, relationshipId);
  }

  return stats;
}

export async function seedCycle1Questions(
  admin: SupabaseClient,
  relationshipId: string
): Promise<number> {
  const { data: relationship } = await admin
    .from("relationships")
    .select("*")
    .eq("id", relationshipId)
    .single();

  if (!relationship?.user1_id || !relationship?.user2_id) return 0;

  const { data: insightRow } = await admin
    .from("relationship_insights")
    .select("content")
    .eq("relationship_id", relationshipId)
    .eq("insight_type", "onboarding_analysis")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!insightRow?.content) return 0;

  const analysis = insightRow.content as OnboardingAnalysis;

  const { data: profiles } = await admin
    .from("profiles")
    .select("*")
    .in("user_id", [relationship.user1_id, relationship.user2_id]);

  const user1Profile = profiles?.find((p) => p.user_id === relationship.user1_id) as Profile | undefined;
  const user2Profile = profiles?.find((p) => p.user_id === relationship.user2_id) as Profile | undefined;

  const partnerNames = {
    user1Name: getDisplayName(user1Profile ?? null, "Partner 1"),
    user2Name: getDisplayName(user2Profile ?? null, "Partner 2"),
  };

  const cycleThemes = pickThemesForCycle([]);
  const { user1: user1Questions, user2: user2Questions } =
    await generateInitialQuestionsForBoth(analysis, partnerNames, cycleThemes);

  const questionPairs = [
    [relationship.user1_id, user1Questions[0], cycleThemes[0], 0] as const,
    [
      relationship.user2_id,
      user2Questions[0],
      cycleThemes[1] || cycleThemes[0],
      0,
    ] as const,
  ];

  let seeded = 0;
  const appUrl = getAppUrl();

  for (const [userId, questionText, theme, templateIndex] of questionPairs) {
    if (!questionText) continue;

    const bubbleSuggestions = getQuickAnswersForQuestion(
      questionText,
      theme,
      templateIndex
    );

    await admin.from("ai_questions").insert({
      relationship_id: relationshipId,
      for_user_id: userId,
      question_text: questionText,
      cycle_number: 1,
      theme,
      context: {
        source: "healing_reset",
        bubble_suggestions: bubbleSuggestions.suggestions,
        cycle_number: 1,
        question_number: 1,
        template_index: templateIndex,
      },
      status: "pending",
    });

    seeded += 1;

    const profile = userId === relationship.user1_id ? user1Profile : user2Profile;
    const partnerProfile = userId === relationship.user1_id ? user2Profile : user1Profile;
    if (profile?.email) {
      sendYourTurnEmail({
        toEmail: profile.email,
        recipientName: getDisplayName(profile),
        partnerName: getPartnerFirstName(partnerProfile ?? null),
        loopUrl: `${appUrl}/relationship/${relationshipId}/loop`,
        cycleNumber: 1,
        questionNumber: 1,
      }).catch((err) => console.error("Your-turn email failed:", err));
    }
  }

  return seeded;
}
