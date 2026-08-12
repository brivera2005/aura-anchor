import { NextResponse } from "next/server";
import { encrypt, hasEncryptionKey } from "@/lib/encryption";
import {
 linkOrphanedOnboardingResponses,
} from "@/lib/onboarding-responses";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
 try {
 if (!hasEncryptionKey()) {
 return NextResponse.json(
 { error: "Encryption not configured" },
 { status: 500 }
 );
 }

 const supabase = await createClient();
 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const { relationshipId, responses, demographics, onboardingComplete } =
 await request.json();

 if (!responses || typeof responses !== "object") {
 return NextResponse.json({ error: "Missing responses" }, { status: 400 });
 }

 if (!relationshipId) {
 return NextResponse.json(
 { error: "relationshipId is required - open onboarding from a specific connection" },
 { status: 400 }
 );
 }

 const { data: relationship } = await supabase
 .from("relationships")
 .select("id")
 .eq("id", relationshipId)
 .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
 .single();

 if (!relationship) {
 return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
 }

 const resolvedRelationshipId = relationshipId;

 const questionKeys = Object.keys(responses as Record<string, string>);

 // Postgres UNIQUE allows duplicate rows when relationship_id IS NULL.
 if (!resolvedRelationshipId && hasAdminClient() && questionKeys.length > 0) {
 await createAdminClient()
 .from("onboarding_responses")
 .delete()
 .eq("user_id", user.id)
 .is("relationship_id", null)
 .in("question_key", questionKeys);
 }

 const rows = Object.entries(responses as Record<string, string>).map(
 ([question_key, answer]) => ({
 user_id: user.id,
 relationship_id: resolvedRelationshipId,
 question_key,
 encrypted_answer: encrypt(String(answer)),
 })
 );

 const { error } = await supabase.from("onboarding_responses").upsert(rows, {
 onConflict: "user_id,relationship_id,question_key",
 });

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 if (resolvedRelationshipId && hasAdminClient()) {
 await linkOrphanedOnboardingResponses(
 createAdminClient(),
 resolvedRelationshipId,
 [user.id]
 );
 }

 if (demographics) {
 await supabase
 .from("profiles")
 .update({
 demographics,
 onboarding_completed: !!onboardingComplete,
 updated_at: new Date().toISOString(),
 })
 .eq("user_id", user.id);
 } else if (onboardingComplete) {
 await supabase
 .from("profiles")
 .update({ onboarding_completed: true })
 .eq("user_id", user.id);
 }

 return NextResponse.json({
 success: true,
 relationshipId: resolvedRelationshipId,
 });
 } catch (err) {
 console.error("Save onboarding error:", err);
 return NextResponse.json({ error: "Failed to save" }, { status: 500 });
 }
}
