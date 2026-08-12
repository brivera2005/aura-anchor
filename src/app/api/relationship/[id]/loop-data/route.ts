import { NextResponse } from "next/server";
import { getPartnerProfile } from "@/lib/auth-helpers";
import {
  getCycleProgress,
  syncPartnerCycleCountsToDb,
} from "@/lib/cycle-progress";
import {
  buildHealingFeed,
  type AnswerRow,
  type CompletedCycleSummary,
} from "@/lib/healing-feed";
import {
  getQuestionsPerCycle,
  isAbsorbPeriodActive,
  isCheckInAvailable,
  msUntilNextCycle,
  shouldSuggestCheckIn,
} from "@/lib/cycle-config";
import { getDisplayName, getPartnerFirstName } from "@/lib/partner-names";
import { createClient } from "@/lib/supabase/server";
import type { CycleAnalysis } from "@/lib/types";

const FEED_PAGE_SIZE = 25;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));
    const limit = Math.min(
      FEED_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("limit") || String(FEED_PAGE_SIZE), 10))
    );

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: relationship } = await supabase
      .from("relationships")
      .select("*")
      .eq("id", id)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();

    if (!relationship) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [{ data: profile }, partner] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      getPartnerProfile(relationship, user.id),
    ]);

    const partnerName = partner
      ? getPartnerFirstName(partner)
      : relationship.connection_name || "your partner";

    const { data: pendingQuestion } = await supabase
      .from("ai_questions")
      .select("*")
      .eq("relationship_id", id)
      .eq("for_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: questions } = await supabase
      .from("ai_questions")
      .select("id, question_text, status, created_at, cycle_number")
      .eq("relationship_id", id)
      .eq("for_user_id", user.id)
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(limit + offset);

    const pagedQuestions = (questions || []).slice(offset, offset + limit);
    const questionIds = pagedQuestions.map((q) => q.id);

    let userAnswers: AnswerRow[] = [];
    if (questionIds.length > 0) {
      const { data: allAnswers } = await supabase
        .from("user_answers")
        .select("id, encrypted_answer, created_at, question_id, ai_questions(question_text)")
        .eq("user_id", user.id)
        .in("question_id", questionIds);
      userAnswers = (allAnswers || []) as AnswerRow[];
    }

    const [briefingsResult, milestonesResult, insightsResult, cycleInsightsResult] =
      await Promise.all([
        supabase
          .from("briefings")
          .select("id, content, from_user_id, read_at, created_at")
          .eq("relationship_id", id)
          .eq("for_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("healing_milestones")
          .select("id, title, description, achieved_at, milestone_key")
          .eq("relationship_id", id)
          .order("achieved_at", { ascending: false })
          .limit(10),
        supabase
          .from("relationship_insights")
          .select("id, insight_type, content, created_at")
          .eq("relationship_id", id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("relationship_insights")
          .select("id, content, created_at")
          .eq("relationship_id", id)
          .eq("insight_type", "cycle_analysis")
          .order("created_at", { ascending: false }),
      ]);

    const briefings = briefingsResult.data || [];
    const milestones = milestonesResult.data || [];
    const insights = insightsResult.data || [];
    const cycleInsights = cycleInsightsResult.data || [];

    const completedCycles: CompletedCycleSummary[] = cycleInsights.map((row) => {
      const analysis = row.content as CycleAnalysis;
      return {
        cycleNumber: analysis.cycle_number,
        title: analysis.title || `Cycle ${analysis.cycle_number} Complete`,
        summary: analysis.summary || "",
        reportUrl: `/relationship/${id}/cycle/${analysis.cycle_number}`,
        completedAt: row.created_at,
        cycleAnalysisAvailable: true as const,
      };
    });

    const cycleAnalysisAvailable = completedCycles.length > 0;

    const cycleNumber = relationship.cycle_number ?? 1;
    const questionsPerCycle = getQuestionsPerCycle(relationship.cycle_mode);
    const myName = getDisplayName(profile, "You");
    const myFirstName = myName.split(/\s+/)[0];
    const counts = await syncPartnerCycleCountsToDb(supabase, relationship);
    const cycleProgress = getCycleProgress(
      { ...relationship, partner_answers_this_cycle: counts },
      user.id,
      partner?.user_id ?? null
    );
    const questionNumberInCycle = Math.min(
      cycleProgress.myAnswers + 1,
      questionsPerCycle
    );

    const absorbActive = isAbsorbPeriodActive(relationship.next_cycle_available_at);
    const lastCompleted = completedCycles.sort((a, b) => b.cycleNumber - a.cycleNumber)[0];

    const partnerNames = new Map<string, string>();
    if (partner?.user_id && partner.name) {
      partnerNames.set(partner.user_id, partner.name);
    }

    const feed = buildHealingFeed(
      pagedQuestions,
      userAnswers,
      briefings,
      milestones,
      insights,
      partnerNames
    );

    const unreadCount = briefings.filter((b) => !b.read_at).length;
    const hasMore = (questions?.length || 0) > offset + limit;

    return NextResponse.json({
      partnerName,
      cycleNumber,
      myFirstName,
      cycleProgress,
      questionsPerCycle,
      currentCycleProgress: cycleProgress,
      questionNumberInCycle,
      pendingQuestion: absorbActive ? null : pendingQuestion,
      feed,
      completedCycles,
      cycleAnalysisAvailable,
      unreadCount,
      pagination: { offset, limit, hasMore },
      absorbPeriod: {
        active: absorbActive,
        nextCycleAvailableAt: relationship.next_cycle_available_at,
        msRemaining: msUntilNextCycle(relationship.next_cycle_available_at),
        checkInAvailable: isCheckInAvailable(cycleNumber),
        suggestCheckIn: shouldSuggestCheckIn(lastCompleted?.completedAt ?? null),
      },
    });
  } catch (err) {
    console.error("Loop data error:", err);
    return NextResponse.json({ error: "Failed to load healing loop" }, { status: 500 });
  }
}
