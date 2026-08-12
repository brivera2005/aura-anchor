import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth-helpers";
import { isInviteEmailConfigured, sendInviteEmail } from "@/lib/email/send-invite";
import {
  type PartnerSlotFields,
  validateInvitePartnerSlot,
} from "@/lib/partner-slot";
import { buildInviteLink } from "@/lib/relationship-phase";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isInviteEmailConfigured()) {
      return NextResponse.json(
        { error: "Email not configured. Copy the invite link and share it directly." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const inviteId = body.inviteId as string | undefined;

    let query = supabase
      .from("invites")
      .select("*")
      .eq("from_user_id", user.id)
      .eq("status", "pending");

    if (inviteId) {
      query = query.eq("id", inviteId);
    }

    const { data: invite, error: inviteError } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "No pending invite found" }, { status: 404 });
    }

    const profile = await getProfile(user.id);
    const slotProfile: PartnerSlotFields = {
      partner_slot_email: profile?.partner_slot_email ?? null,
      partner_slot_user_id: profile?.partner_slot_user_id ?? null,
      partner_slot_locked_at: profile?.partner_slot_locked_at ?? null,
      subscription_status: profile?.subscription_status,
      email: profile?.email,
    };

    const slotCheck = await validateInvitePartnerSlot(
      supabase,
      user.id,
      invite.to_email,
      slotProfile
    );

    if (!slotCheck.ok) {
      return NextResponse.json({ error: slotCheck.error }, { status: 403 });
    }

    const senderName = profile?.name || "Someone";
    const inviteLink = buildInviteLink(invite.token);

    const emailResult = await sendInviteEmail({
      toEmail: invite.to_email,
      inviteLink,
      senderName,
      relationshipType: invite.relationship_type,
    });

    return NextResponse.json({
      emailSent: emailResult.sent,
      emailError: emailResult.error,
      inviteLink,
    });
  } catch (err) {
    console.error("Resend invite error:", err);
    return NextResponse.json({ error: "Failed to resend invite" }, { status: 500 });
  }
}
