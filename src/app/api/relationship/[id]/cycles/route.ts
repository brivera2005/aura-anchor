import { NextResponse } from "next/server";
import {
  getQuestionsPerCycle,
  isAbsorbPeriodActive,
  isCheckInAvailable,
  msUntilNextCycle,
  shouldSuggestCheckIn,
} from "@/lib/cycle-config";
import { loadCycleHistory } from "@/lib/cycle-history";
import { getCycleProgress, syncPartnerCycleCountsToDb } from "@/lib/cycle-progress";
import { getPartnerProfile } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const partner = await getPartnerProfile(relationship, user.id);
    const partnerUserId =
      relationship.user1_id === user.id
        ? relationship.user2_id
        : relationship.user1_id;

    const counts = await syncPartnerCycleCountsToDb(supabase, relationship);
    const cycleNumber = relationship.cycle_number ?? 1;
    const questionsPerCycle = getQuestionsPerCycle(relationship.cycle_mode);
    const cycleProgress = getCycleProgress(
      { ...relationship, partner_answers_this_cycle: counts },
      user.id,
      partnerUserId
    );

    const history = await loadCycleHistory(supabase, id, cycleNumber);

    const absorbActive = isAbsorbPeriodActive(relationship.next_cycle_available_at);
    const msRemaining = msUntilNextCycle(relationship.next_cycle_available_at);

    const { count: pendingCount } = await supabase
      .from("ai_questions")
      .select("*", { count: "exact", head: true })
      .eq("relationship_id", id)
      .eq("cycle_number", cycleNumber)
      .eq("status", "pending");

    const lastCompleted = history.cycles
      .filter((c) => !c.inProgress && c.completedAt)
      .sort((a, b) => b.cycleNumber - a.cycleNumber)[0];

    return NextResponse.json({
      history,
      cycleProgress,
      questionsPerCycle,
      absorbPeriod: {
        active: absorbActive,
        nextCycleAvailableAt: relationship.next_cycle_available_at,
        msRemaining,
        cycleNumber,
        canStart:
          !absorbActive &&
          (pendingCount || 0) === 0 &&
          cycleProgress.myAnswers === 0 &&
          cycleProgress.partnerAnswers === 0,
      },
      checkInAvailable: isCheckInAvailable(cycleNumber),
      suggestCheckIn: shouldSuggestCheckIn(lastCompleted?.completedAt ?? null),
      cycleMode: relationship.cycle_mode || "deep_dive",
      partnerName: partner?.name?.split(/\s+/)[0] || relationship.connection_name || "Partner",
    });
  } catch (err) {
    console.error("Cycles data error:", err);
    return NextResponse.json({ error: "Failed to load cycles" }, { status: 500 });
  }
}
