import { getAppUrl } from "./env";

import { isOnboardingCompleteForUser } from "./relationship-onboarding";

import type { Invite, Profile, Relationship } from "./types";

import type { SupabaseClient } from "@supabase/supabase-js";



export type RelationshipPhase =

  | "needs_onboarding"

  | "needs_invite"

  | "waiting_for_partner"

  | "partner_needs_onboarding"

  | "ready_for_analysis"

  | "active_loop";



export interface RelationshipPhaseContext {

  phase: RelationshipPhase;

  relationship: Relationship | null;

  partner: Profile | null;

  pendingInvite: Invite | null;

  bothOnboarded: boolean;

  hasAnalysis: boolean;

  inviteLink: string | null;

  userOnboarded: boolean;

  partnerOnboarded: boolean;

}



export function buildInviteLink(token: string): string {

  return `${getAppUrl()}/accept-invite/${token}`;

}



export async function computeRelationshipPhaseForRelationship(

  supabase: SupabaseClient,

  profile: Profile | null,

  relationship: Relationship,

  partner: Profile | null,

  pendingInvite: Invite | null,

  hasAnalysis: boolean,

  userId: string

): Promise<RelationshipPhaseContext> {

  const userOnboarded = await isOnboardingCompleteForUser(

    supabase,

    userId,

    relationship.id

  );



  if (!userOnboarded) {

    return {

      phase: "needs_onboarding",

      relationship,

      partner,

      pendingInvite,

      bothOnboarded: false,

      hasAnalysis: false,

      inviteLink: null,

      userOnboarded: false,

      partnerOnboarded: false,

    };

  }



  if (!relationship.user2_id) {

    if (pendingInvite) {

      const inviteLink = pendingInvite.token

        ? buildInviteLink(pendingInvite.token)

        : null;

      return {

        phase: "waiting_for_partner",

        relationship,

        partner: null,

        pendingInvite,

        bothOnboarded: false,

        hasAnalysis: false,

        inviteLink,

        userOnboarded: true,

        partnerOnboarded: false,

      };

    }

    return {

      phase: "needs_invite",

      relationship,

      partner: null,

      pendingInvite: null,

      bothOnboarded: false,

      hasAnalysis: false,

      inviteLink: null,

      userOnboarded: true,

      partnerOnboarded: false,

    };

  }



  const partnerOnboarded = partner

    ? await isOnboardingCompleteForUser(supabase, partner.user_id, relationship.id)

    : false;



  if (!partnerOnboarded) {

    return {

      phase: "partner_needs_onboarding",

      relationship,

      partner,

      pendingInvite: null,

      bothOnboarded: false,

      hasAnalysis: false,

      inviteLink: null,

      userOnboarded: true,

      partnerOnboarded: false,

    };

  }



  if (!hasAnalysis) {

    return {

      phase: "ready_for_analysis",

      relationship,

      partner,

      pendingInvite: null,

      bothOnboarded: true,

      hasAnalysis: false,

      inviteLink: null,

      userOnboarded: true,

      partnerOnboarded: true,

    };

  }



  return {

    phase: "active_loop",

    relationship,

    partner,

    pendingInvite: null,

    bothOnboarded: true,

    hasAnalysis: true,

    inviteLink: null,

    userOnboarded: true,

    partnerOnboarded: true,

  };

}



/** @deprecated Use computeRelationshipPhaseForRelationship for multi-relationship support */

export function computeRelationshipPhase(

  profile: Profile | null,

  relationships: Relationship[],

  partnerProfiles: Map<string, Profile | null>,

  pendingInvite: Invite | null,

  hasAnalysis: boolean

): RelationshipPhaseContext {

  const pendingRelationship = relationships.find((r) => r.status === "pending");

  const activeRelationship = relationships.find((r) => r.status === "active");

  const linkedPending =

    pendingRelationship?.user2_id != null ? pendingRelationship : null;



  if (!pendingRelationship && !activeRelationship) {

    return {

      phase: "needs_invite",

      relationship: null,

      partner: null,

      pendingInvite: null,

      bothOnboarded: false,

      hasAnalysis: false,

      inviteLink: null,

      userOnboarded: !!profile?.onboarding_completed,

      partnerOnboarded: false,

    };

  }



  if (pendingRelationship && !activeRelationship && !linkedPending) {

    const inviteLink = pendingInvite?.token

      ? buildInviteLink(pendingInvite.token)

      : null;

    return {

      phase: "waiting_for_partner",

      relationship: pendingRelationship,

      partner: null,

      pendingInvite,

      bothOnboarded: false,

      hasAnalysis: false,

      inviteLink,

      userOnboarded: true,

      partnerOnboarded: false,

    };

  }



  const relationship = activeRelationship ?? linkedPending!;

  const partnerId =

    relationship.user1_id === profile?.user_id

      ? relationship.user2_id

      : relationship.user1_id;

  const partner = partnerId ? partnerProfiles.get(partnerId) ?? null : null;



  const partnerOnboarded = partner?.onboarding_completed ?? false;

  const bothOnboarded = !!profile?.onboarding_completed && partnerOnboarded;



  if (!partnerOnboarded) {

    return {

      phase: "partner_needs_onboarding",

      relationship,

      partner,

      pendingInvite: null,

      bothOnboarded: false,

      hasAnalysis: false,

      inviteLink: null,

      userOnboarded: !!profile?.onboarding_completed,

      partnerOnboarded: false,

    };

  }



  if (!hasAnalysis) {

    return {

      phase: "ready_for_analysis",

      relationship,

      partner,

      pendingInvite: null,

      bothOnboarded: true,

      hasAnalysis: false,

      inviteLink: null,

      userOnboarded: true,

      partnerOnboarded: true,

    };

  }



  return {

    phase: "active_loop",

    relationship,

    partner,

    pendingInvite: null,

    bothOnboarded: true,

    hasAnalysis: true,

    inviteLink: null,

    userOnboarded: true,

    partnerOnboarded: true,

  };

}


