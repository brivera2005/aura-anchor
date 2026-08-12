import { NextResponse } from "next/server";
import {
  getPartnerProfile,
  getProfile,
  getUserRelationships,
} from "@/lib/auth-helpers";
import { getQuestionsPerCycle } from "@/lib/cycle-config";
import { getCycleProgress } from "@/lib/cycle-progress";
import { getConnectionDisplayName } from "@/lib/partner-names";
import {
  buildInviteLink,
  computeRelationshipPhaseForRelationship,
} from "@/lib/relationship-phase";
import { reconcileRelationshipForUser } from "@/lib/relationship-reconcile";
import { getRelationshipLabel } from "@/lib/relationship-types";
import { createClient } from "@/lib/supabase/server";
import type { RelationshipSummary } from "@/lib/relationship-data";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await reconcileRelationshipForUser(user.id);

    const profile = await getProfile(user.id);
    const relationships = await getUserRelationships(user.id);
    const items: RelationshipSummary[] = [];

    for (const rel of relationships) {
      const partner = rel.user2_id ? await getPartnerProfile(rel, user.id) : null;
      const partnerUserId = rel.user1_id === user.id ? rel.user2_id : rel.user1_id;

      const { data: pendingInvite } = await supabase
        .from("invites")
        .select("*")
        .eq("relationship_id", rel.id)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

      const { data: insightRow } = await supabase
        .from("relationship_insights")
        .select("id")
        .eq("relationship_id", rel.id)
        .eq("insight_type", "onboarding_analysis")
        .limit(1)
        .maybeSingle();

      const phaseCtx = await computeRelationshipPhaseForRelationship(
        supabase,
        profile,
        rel,
        partner,
        pendingInvite,
        !!insightRow,
        user.id
      );

      const progress = getCycleProgress(rel, user.id, partnerUserId);

      items.push({
        relationship: rel,
        phase: phaseCtx.phase,
        partner,
        displayName: getConnectionDisplayName(rel, partner),
        typeLabel: getRelationshipLabel(rel.type, rel.relationship_subtype),
        pendingInvite,
        inviteLink: pendingInvite?.token ? buildInviteLink(pendingInvite.token) : null,
        hasAnalysis: !!insightRow,
        cycleNumber: rel.cycle_number ?? 1,
        cycleProgress: progress.totalAnswers,
        myAnswers: progress.myAnswers,
        partnerAnswers: progress.partnerAnswers,
        questionsPerCycle: getQuestionsPerCycle(rel.cycle_mode),
      });
    }

    return NextResponse.json({ relationships: items, profile });
  } catch (err) {
    console.error("List relationships error:", err);
    return NextResponse.json({ error: "Failed to list connections" }, { status: 500 });
  }
}
