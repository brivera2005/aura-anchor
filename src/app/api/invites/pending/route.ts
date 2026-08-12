import { NextResponse } from "next/server";
import { buildInviteLink } from "@/lib/relationship-phase";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: invite } = await supabase
      .from("invites")
      .select("*")
      .eq("from_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!invite) {
      return NextResponse.json({ invite: null });
    }

    return NextResponse.json({
      invite,
      inviteLink: buildInviteLink(invite.token),
    });
  } catch (err) {
    console.error("Pending invite error:", err);
    return NextResponse.json({ error: "Failed to load invite" }, { status: 500 });
  }
}
