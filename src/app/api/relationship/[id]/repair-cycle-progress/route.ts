import { NextResponse } from "next/server";
import { completeCycleIfReady } from "@/lib/healing-cycle";
import {
  getCycleProgress,
  isCycleReadyForAnalysis,
  reconcilePartnerAnswersFromDb,
  syncPartnerCycleCountsToDb,
} from "@/lib/cycle-progress";
import { QUESTIONS_PER_CYCLE } from "@/lib/healing-themes";
import { getDisplayName } from "@/lib/partner-names";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hasAdminClient()) {
      return NextResponse.json(
        { error: "Admin client not configured" },
        { status: 500 }
      );
    }

    const adminToken = request.headers.get("x-admin-token");
    const encryptionKey = process.env.ENCRYPTION_KEY?.trim();
    if (!adminToken || !encryptionKey || adminToken !== encryptionKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: relationshipId } = await params;
    const body = await request.json().catch(() => ({}));
    const triggerAnalysis = body.triggerAnalysis !== false;

    const admin = createAdminClient();
    const { data: relationship, error: relError } = await admin
      .from("relationships")
      .select("*")
      .eq("id", relationshipId)
      .single();

    if (relError || !relationship) {
      return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
    }

    const cycleNumber = relationship.cycle_number ?? 1;
    const beforeJson = relationship.partner_answers_this_cycle ?? {};

    const { data: profiles } = await admin
      .from("profiles")
      .select("*")
      .in("user_id", [relationship.user1_id, relationship.user2_id!].filter(Boolean));

    const { data: cycleQuestions } = await admin
      .from("ai_questions")
      .select("id, for_user_id, status, cycle_number")
      .eq("relationship_id", relationshipId)
      .eq("cycle_number", cycleNumber);

    const answeredQuestions = (cycleQuestions || []).filter((q) => q.status === "answered");
    const questionIds = answeredQuestions.map((q) => q.id);

    let answerRows: { user_id: string; question_id: string }[] = [];
    if (questionIds.length > 0) {
      const { data: answers } = await admin
        .from("user_answers")
        .select("user_id, question_id")
        .in("question_id", questionIds);
      answerRows = answers || [];
    }

    const perUserAnswered = (cycleQuestions || []).reduce(
      (acc, q) => {
        if (q.status !== "answered") return acc;
        acc[q.for_user_id] = (acc[q.for_user_id] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const perUserFromAnswers = answerRows.reduce(
      (acc, row) => {
        acc[row.user_id] = (acc[row.user_id] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const reconciled = await reconcilePartnerAnswersFromDb(
      admin,
      relationshipId,
      cycleNumber
    );
    const synced = await syncPartnerCycleCountsToDb(admin, {
      ...relationship,
      partner_answers_this_cycle: reconciled,
    });

    const user1Progress = getCycleProgress(
      { ...relationship, partner_answers_this_cycle: synced },
      relationship.user1_id,
      relationship.user2_id
    );
    const user2Progress = relationship.user2_id
      ? getCycleProgress(
          { ...relationship, partner_answers_this_cycle: synced },
          relationship.user2_id,
          relationship.user1_id
        )
      : null;

    let cycleAnalysisTriggered = false;
    let analysisTitle: string | undefined;

    if (
      triggerAnalysis &&
      isCycleReadyForAnalysis({ ...relationship, partner_answers_this_cycle: synced })
    ) {
      const user1Profile =
        profiles?.find((p) => p.user_id === relationship.user1_id) || null;
      const user2Profile =
        profiles?.find((p) => p.user_id === relationship.user2_id) || null;

      const analysis = await completeCycleIfReady(
        admin,
        { ...relationship, partner_answers_this_cycle: synced },
        user1Profile,
        user2Profile
      );

      if (analysis) {
        cycleAnalysisTriggered = true;
        analysisTitle = analysis.title;
      }
    }

    const profileSummary = (profiles || []).map((p) => ({
      userId: p.user_id,
      name: getDisplayName(p),
      email: p.email,
      answersThisCycle: synced[p.user_id] ?? 0,
    }));

    return NextResponse.json({
      success: true,
      relationshipId,
      cycleNumber,
      before: beforeJson,
      after: synced,
      perUserAnsweredQuestions: perUserAnswered,
      perUserAnswerRows: perUserFromAnswers,
      profiles: profileSummary,
      progress: {
        user1: user1Progress,
        user2: user2Progress,
      },
      questionsPerCycle: QUESTIONS_PER_CYCLE,
      cycleAnalysisTriggered,
      analysisTitle,
    });
  } catch (err) {
    console.error("Repair cycle progress failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Repair failed" },
      { status: 500 }
    );
  }
}
