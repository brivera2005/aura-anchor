import { NextResponse } from "next/server";
import { isAbsorbPeriodActive, type CycleMode } from "@/lib/cycle-config";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const cycleMode = (body.cycleMode as CycleMode) || "deep_dive";
    const skipAbsorb = body.skipAbsorb === true;

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

    if (
      isAbsorbPeriodActive(relationship.next_cycle_available_at) &&
      !skipAbsorb
    ) {
      return NextResponse.json(
        { error: "Absorb period still active" },
        { status: 400 }
      );
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", [relationship.user1_id, relationship.user2_id!]);

    const user1Profile = profiles?.find((p) => p.user_id === relationship.user1_id) ?? null;
    const user2Profile = profiles?.find((p) => p.user_id === relationship.user2_id) ?? null;

    const { startNextCycleQuestions } = await import("@/lib/start-next-cycle");
    const result = await startNextCycleQuestions(
      supabase,
      { ...relationship, cycle_mode: cycleMode },
      user1Profile,
      user2Profile,
      { cycleMode, skipAbsorb }
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("Start next cycle error:", err);
    return NextResponse.json({ error: "Failed to start cycle" }, { status: 500 });
  }
}
