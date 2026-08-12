import { NextResponse } from "next/server";
import { loadRelationshipContext } from "@/lib/relationship-data";
import { buildInviteLink } from "@/lib/relationship-phase";
import { reconcileRelationshipForUser } from "@/lib/relationship-reconcile";
import { getPartnerProfile, userHasAccessToRelationship } from "@/lib/auth-helpers";
import { isOnboardingCompleteForUser } from "@/lib/relationship-onboarding";
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

    const hasAccess = await userHasAccessToRelationship(id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await reconcileRelationshipForUser(user.id);

    const { data: relationship } = await supabase
      .from("relationships")
      .select("*")
      .eq("id", id)
      .single();

    if (!relationship) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ctx = await loadRelationshipContext(user.id, id);
    const partner = await getPartnerProfile(relationship, user.id);

    const { data: pendingInvite } = await supabase
      .from("invites")
      .select("*")
      .eq("relationship_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const partnerOnboarded = partner
      ? await isOnboardingCompleteForUser(supabase, partner.user_id, id)
      : false;

    const { data: pendingQuestion } = await supabase
      .from("ai_questions")
      .select("id, question_text")
      .eq("relationship_id", id)
      .eq("for_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      phase: ctx.phase,
      relationshipId: id,
      relationship,
      relationshipStatus: relationship.status,
      partnerName: partner?.name || relationship.connection_name || null,
      partnerOnboarded,
      bothOnboarded: ctx.bothOnboarded,
      hasAnalysis: ctx.hasAnalysis,
      pendingInvite: pendingInvite
        ? {
            ...pendingInvite,
            inviteLink: pendingInvite.token
              ? buildInviteLink(pendingInvite.token)
              : null,
          }
        : null,
      inviteStatus: pendingInvite?.status || null,
      inviteLink: pendingInvite?.token
        ? buildInviteLink(pendingInvite.token)
        : null,
      pendingQuestion,
    });
  } catch (err) {
    console.error("Relationship status error:", err);
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}
