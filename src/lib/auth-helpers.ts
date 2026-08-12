import { dedupeRelationships } from "@/lib/canonical-relationship";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Relationship } from "@/lib/types";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data;
}

export async function getUserRelationships(userId: string): Promise<Relationship[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("relationships")
    .select("*")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .neq("status", "ended")
    .order("created_at", { ascending: false });
  return dedupeRelationships(data || []);
}

export async function getPartnerId(relationship: Relationship, userId: string) {
  if (relationship.user1_id === userId) return relationship.user2_id;
  return relationship.user1_id;
}

export async function getPartnerProfile(
  relationship: Relationship,
  userId: string
): Promise<Profile | null> {
  const partnerId = await getPartnerId(relationship, userId);
  if (!partnerId) return null;
  return getProfile(partnerId);
}

export async function userHasAccessToRelationship(
  relationshipId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("relationships")
    .select("id")
    .eq("id", relationshipId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .single();
  return !!data;
}
