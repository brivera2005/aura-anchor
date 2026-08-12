import { NextResponse } from "next/server";

import { getProfile } from "@/lib/auth-helpers";
import { isInviteEmailConfigured, sendInviteEmail } from "@/lib/email/send-invite";
import { linkOrphanedOnboardingResponses } from "@/lib/onboarding-responses";
import { validateInvitePartnerSlot } from "@/lib/partner-slot";
import { findDuplicateRelationship } from "@/lib/relationship-onboarding";
import { buildInviteLink } from "@/lib/relationship-phase";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import crypto from "crypto";

export async function POST(request: Request) {
 try {
 const supabase = await createClient();
 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const { toEmail, relationshipType, relationshipId, subtype } =
 await request.json();

 if (!toEmail || !relationshipType) {
 return NextResponse.json({ error: "Missing fields" }, { status: 400 });
 }

 const normalizedEmail = toEmail.toLowerCase().trim();
 const profile = await getProfile(user.id);

 if (profile?.email?.toLowerCase() === normalizedEmail) {
 return NextResponse.json(
 {
 error:
 "You can't invite yourself - use a different email for your connection",
 },
 { status: 400 }
 );
 }

 const slotCheck = await validateInvitePartnerSlot(
 supabase,
 user.id,
 normalizedEmail,
 {
 partner_slot_email: profile?.partner_slot_email ?? null,
 partner_slot_user_id: profile?.partner_slot_user_id ?? null,
 partner_slot_locked_at: profile?.partner_slot_locked_at ?? null,
 subscription_status: profile?.subscription_status,
 email: profile?.email,
 }
 );

 if (!slotCheck.ok) {
 return NextResponse.json({ error: slotCheck.error }, { status: 403 });
 }

 const token = crypto.randomBytes(32).toString("hex");
 const expiresAt = new Date();
 expiresAt.setDate(expiresAt.getDate() + 7);

 let relationship;

 if (relationshipId) {
 const { data: existing } = await supabase
 .from("relationships")
 .select("*")
 .eq("id", relationshipId)
 .eq("user1_id", user.id)
 .single();

 if (!existing) {
 return NextResponse.json(
 { error: "Relationship not found" },
 { status: 404 }
 );
 }
 relationship = existing;
 } else {
 const duplicate = await findDuplicateRelationship(
 supabase,
 user.id,
 relationshipType,
 {}
 );
 if (duplicate) {
 return NextResponse.json(
 {
 error: `You already have a pending ${relationshipType} connection.`,
 existingRelationshipId: duplicate.id,
 },
 { status: 409 }
 );
 }

 const { data: created, error: relError } = await supabase
 .from("relationships")
 .insert({
 user1_id: user.id,
 type: relationshipType,
 relationship_subtype: subtype || null,
 status: "pending",
 })
 .select()
 .single();

 if (relError) {
 return NextResponse.json({ error: relError.message }, { status: 500 });
 }
 relationship = created;
 }

 if (hasAdminClient()) {
 await linkOrphanedOnboardingResponses(createAdminClient(), relationship.id, [
 user.id,
 ]);
 }

 const { data: invite, error: inviteError } = await supabase
 .from("invites")
 .insert({
 from_user_id: user.id,
 to_email: normalizedEmail,
 relationship_type: relationshipType,
 relationship_subtype: relationship.relationship_subtype || subtype || null,
 connection_name: relationship.connection_name || null,
 token,
 relationship_id: relationship.id,
 expires_at: expiresAt.toISOString(),
 })
 .select()
 .single();

 if (inviteError) {
 return NextResponse.json({ error: inviteError.message }, { status: 500 });
 }

 const inviteLink = buildInviteLink(token);
 const senderName = profile?.name || "Someone";

 let emailSent = false;
 let emailError: string | undefined;

 if (isInviteEmailConfigured()) {
 const emailResult = await sendInviteEmail({
 toEmail: normalizedEmail,
 inviteLink,
 senderName,
 relationshipType,
 });
 emailSent = emailResult.sent;
 emailError = emailResult.error;
 }

 return NextResponse.json({
 invite,
 inviteLink,
 emailSent,
 emailConfigured: isInviteEmailConfigured(),
 emailError,
 message: emailSent
 ? "Invite created and email sent. You can also copy the link below."
 : "Invite created. Copy the link below and share it with your partner.",
 });
 } catch (err) {
 console.error("Invite error:", err);
 return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
 }
}
