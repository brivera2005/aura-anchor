import type { SupabaseClient } from "@supabase/supabase-js";

import { REQUIRED_ONBOARDING_KEYS } from "./constants";

import type { Relationship } from "./types";



type DbClient = SupabaseClient;



/** Check if user completed onboarding for a specific relationship. */

export async function isOnboardingCompleteForUser(

  supabase: DbClient,

  userId: string,

  relationshipId: string

): Promise<boolean> {

  const { data: rows } = await supabase

    .from("onboarding_responses")

    .select("question_key")

    .eq("user_id", userId)

    .eq("relationship_id", relationshipId);



  const keys = new Set((rows || []).map((r) => r.question_key));

  return REQUIRED_ONBOARDING_KEYS.every((k) => keys.has(k));

}



export async function countOnboardingResponses(

  supabase: DbClient,

  userId: string,

  relationshipId: string

): Promise<number> {

  const { count } = await supabase

    .from("onboarding_responses")

    .select("id", { count: "exact", head: true })

    .eq("user_id", userId)

    .eq("relationship_id", relationshipId);

  return count ?? 0;

}



export async function findDuplicateRelationship(

  supabase: DbClient,

  userId: string,

  type: string,

  opts: { partnerUserId?: string | null; connectionName?: string | null }

): Promise<Relationship | null> {

  const { data: existing } = await supabase

    .from("relationships")

    .select("*")

    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

    .eq("type", type)

    .neq("status", "ended");



  for (const rel of existing || []) {

    if (opts.partnerUserId && rel.user2_id === opts.partnerUserId) {

      return rel;

    }

    if (

      opts.connectionName &&

      !rel.user2_id &&

      rel.connection_name?.toLowerCase() === opts.connectionName.toLowerCase()

    ) {

      return rel;

    }

  }

  return null;

}


