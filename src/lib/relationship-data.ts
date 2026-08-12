import {

  linkOrphanedOnboardingResponses,

} from "./onboarding-responses";

import {

  buildInviteLink,

  computeRelationshipPhaseForRelationship,

  type RelationshipPhase,

  type RelationshipPhaseContext,

} from "./relationship-phase";

import {

  getPartnerProfile,

  getProfile,

  getUserRelationships,

} from "./auth-helpers";

import { reconcileRelationshipForUser } from "./relationship-reconcile";

import { getConnectionDisplayName } from "./partner-names";

import { getRelationshipLabel } from "./relationship-types";

import { createAdminClient, hasAdminClient } from "./supabase/admin";

import { createClient } from "./supabase/server";

import type { AIQuestion, Invite, Profile, Relationship } from "./types";

import { getCycleProgress } from "./cycle-progress";
import { QUESTIONS_PER_CYCLE } from "./healing-themes";



export interface RelationshipSummary {

  relationship: Relationship;

  phase: RelationshipPhase;

  partner: Profile | null;

  displayName: string;

  typeLabel: string;

  pendingInvite: Invite | null;

  inviteLink: string | null;

  hasAnalysis: boolean;

  cycleNumber: number;

  cycleProgress: number;

  myAnswers: number;

  partnerAnswers: number;

  questionsPerCycle: number;

}



export interface DashboardContext {

  profile: Awaited<ReturnType<typeof getProfile>>;

  relationships: RelationshipSummary[];

  pendingQuestion: AIQuestion | null;

  unreadBriefings: number;

}



export async function loadRelationshipContext(

  userId: string,

  relationshipId: string

): Promise<RelationshipPhaseContext & { profile: Profile | null }> {

  const supabase = await createClient();

  const profile = await getProfile(userId);



  const { data: relationship } = await supabase

    .from("relationships")

    .select("*")

    .eq("id", relationshipId)

    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

    .single();



  if (!relationship) {

    return {

      phase: "needs_invite",

      relationship: null,

      partner: null,

      pendingInvite: null,

      bothOnboarded: false,

      hasAnalysis: false,

      inviteLink: null,

      userOnboarded: false,

      partnerOnboarded: false,

      profile,

    };

  }



  const partner = await getPartnerProfile(relationship, userId);



  const { data: pendingInvite } = await supabase

    .from("invites")

    .select("*")

    .eq("relationship_id", relationshipId)

    .eq("status", "pending")

    .limit(1)

    .maybeSingle();



  const { data: insightRow } = await supabase

    .from("relationship_insights")

    .select("id")

    .eq("relationship_id", relationshipId)

    .eq("insight_type", "onboarding_analysis")

    .limit(1)

    .maybeSingle();



  return {

    ...(await computeRelationshipPhaseForRelationship(

      supabase,

      profile,

      relationship,

      partner,

      pendingInvite,

      !!insightRow,

      userId

    )),

    profile,

  };

}



export async function loadDashboardContext(userId: string): Promise<DashboardContext> {

  await reconcileRelationshipForUser(userId);



  const supabase = await createClient();

  const profile = await getProfile(userId);

  const relationships = await getUserRelationships(userId);



  const summaries: RelationshipSummary[] = [];



  for (const rel of relationships) {

    const partner = rel.user2_id ? await getPartnerProfile(rel, userId) : null;



    if (hasAdminClient() && rel.user2_id) {

      await linkOrphanedOnboardingResponses(createAdminClient(), rel.id, [

        rel.user1_id,

        rel.user2_id!,

      ]);

    }



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

      userId

    );



    const partnerId = rel.user1_id === userId ? rel.user2_id : rel.user1_id;

    const cycleProgress = getCycleProgress(rel, userId, partnerId);



    summaries.push({

      relationship: rel,

      phase: phaseCtx.phase,

      partner,

      displayName: getConnectionDisplayName(rel, partner),

      typeLabel: getRelationshipLabel(rel.type, rel.relationship_subtype),

      pendingInvite,

      inviteLink: pendingInvite?.token ? buildInviteLink(pendingInvite.token) : null,

      hasAnalysis: !!insightRow,

      cycleNumber: rel.cycle_number ?? 1,

      cycleProgress: cycleProgress.totalAnswers,

      myAnswers: cycleProgress.myAnswers,

      partnerAnswers: cycleProgress.partnerAnswers,

      questionsPerCycle: QUESTIONS_PER_CYCLE,

    });

  }



  let pendingQuestion: AIQuestion | null = null;

  let unreadBriefings = 0;



  const activeLoop = summaries.find((s) => s.phase === "active_loop");

  if (activeLoop) {

    const { data: question } = await supabase

      .from("ai_questions")

      .select("*")

      .eq("relationship_id", activeLoop.relationship.id)

      .eq("for_user_id", userId)

      .eq("status", "pending")

      .order("created_at", { ascending: true })

      .limit(1)

      .maybeSingle();

    pendingQuestion = question;

  }



  const { count } = await supabase

    .from("briefings")

    .select("*", { count: "exact", head: true })

    .eq("for_user_id", userId)

    .is("read_at", null);

  unreadBriefings = count || 0;



  return {

    profile,

    relationships: summaries,

    pendingQuestion,

    unreadBriefings,

  };

}



export { buildInviteLink };


