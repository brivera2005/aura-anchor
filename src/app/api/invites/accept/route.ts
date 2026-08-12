import { NextResponse } from "next/server";
import { claimPartnerSlotOnAccept, normalizePartnerEmail } from "@/lib/partner-slot";
import { linkOrphanedOnboardingResponses } from "@/lib/onboarding-responses";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RelationshipRow = {
 id: string;
 status: string;
 user1_id: string;
 user2_id: string | null;
};

export async function POST(request: Request) {
 try {
 const supabase = await createClient();
 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const { token } = await request.json();
 if (!token) {
 return NextResponse.json({ error: "Missing token" }, { status: 400 });
 }

 // Prefer admin for invite lookup so RLS / email casing cannot hide a valid token.
 const lookup = hasAdminClient() ? createAdminClient() : supabase;
 const { data: invite, error: inviteError } = await lookup
 .from("invites")
 .select("*")
 .eq("token", token)
 .maybeSingle();

 if (inviteError || !invite) {
 return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
 }

 const { data: profile } = await supabase
 .from("profiles")
 .select("email")
 .eq("user_id", user.id)
 .single();

 const userEmail = normalizePartnerEmail(
 profile?.email || user.email || ""
 );
 const inviteEmail = normalizePartnerEmail(invite.to_email as string);

 if (userEmail !== inviteEmail) {
 return NextResponse.json(
 {
 error: `This invite was sent to ${invite.to_email}. Sign in with Google using that exact email to accept.`,
 },
 { status: 403 }
 );
 }

 const db = hasAdminClient() ? createAdminClient() : supabase;

 const { data: relationshipData } = await db
 .from("relationships")
 .select("id, status, user1_id, user2_id")
 .eq("id", invite.relationship_id)
 .maybeSingle();

 const relationship = relationshipData as RelationshipRow | null;

 const alreadyLinked =
 !!relationship &&
 (relationship.user2_id === user.id || relationship.user1_id === user.id) &&
 (relationship.status === "active" || relationship.user2_id === user.id);

 // Idempotent: old email links after a successful accept should not error.
 if (invite.status === "accepted" || alreadyLinked) {
 if (invite.status !== "accepted") {
 await db.from("invites").update({ status: "accepted" }).eq("id", invite.id);
 }

 if (relationship && relationship.user2_id !== user.id && relationship.user1_id !== user.id) {
 // Invite marked accepted but relationship never linked this user - repair.
 const { error: repairError } = await db
 .from("relationships")
 .update({ user2_id: user.id, status: "active" })
 .eq("id", invite.relationship_id)
 .is("user2_id", null);

 if (repairError) {
 return NextResponse.json(
 { error: repairError.message || "Failed to link relationship" },
 { status: 500 }
 );
 }
 } else if (relationship && relationship.status !== "active" && relationship.user2_id === user.id) {
 await db
 .from("relationships")
 .update({ status: "active" })
 .eq("id", invite.relationship_id);
 }

 await claimPartnerSlotOnAccept(invite.from_user_id, user.id, userEmail);

 return NextResponse.json({
 success: true,
 alreadyLinked: true,
 relationshipId: invite.relationship_id,
 });
 }

 if (invite.status === "cancelled") {
 return NextResponse.json({ error: "This invite was cancelled" }, { status: 410 });
 }

 if (invite.status === "expired" || new Date(invite.expires_at) < new Date()) {
 if (invite.status !== "expired") {
 await db.from("invites").update({ status: "expired" }).eq("id", invite.id);
 }
 return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
 }

 if (invite.status !== "pending") {
 return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
 }

 if (relationship?.user2_id && relationship.user2_id !== user.id) {
 return NextResponse.json(
 { error: "This invite was already accepted by someone else" },
 { status: 409 }
 );
 }

 const { data: updatedRel, error: relError } = await db
 .from("relationships")
 .update({
 user2_id: user.id,
 status: "active",
 })
 .eq("id", invite.relationship_id)
 .select("id, status, user2_id")
 .single();

 if (relError || !updatedRel?.user2_id) {
 return NextResponse.json(
 { error: relError?.message || "Failed to link relationship" },
 { status: 500 }
 );
 }

 const { error: inviteUpdateError } = await db
 .from("invites")
 .update({ status: "accepted" })
 .eq("id", invite.id);

 if (inviteUpdateError) {
 return NextResponse.json({ error: inviteUpdateError.message }, { status: 500 });
 }

 await claimPartnerSlotOnAccept(invite.from_user_id, user.id, userEmail);

 await db.from("healing_milestones").upsert(
 {
 relationship_id: invite.relationship_id,
 milestone_key: "linked",
 title: "Connected",
 description: "You and your partner are now linked",
 },
 { onConflict: "relationship_id,milestone_key" }
 );

 if (hasAdminClient() && invite.relationship_id) {
 const { data: rel } = await db
 .from("relationships")
 .select("user1_id")
 .eq("id", invite.relationship_id)
 .single();

 const userIds = [user.id];
 if (rel?.user1_id) userIds.push(rel.user1_id);

 await linkOrphanedOnboardingResponses(
 createAdminClient(),
 invite.relationship_id,
 userIds
 );
 }

 return NextResponse.json({
 success: true,
 relationshipId: invite.relationship_id,
 });
 } catch (err) {
 console.error("Accept invite error:", err);
 return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
 }
}
