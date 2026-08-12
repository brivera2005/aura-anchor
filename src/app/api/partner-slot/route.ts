import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/admin";
import { getPartnerSlotState } from "@/lib/partner-slot";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await getPartnerSlotState(user.id);
  if (!state) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...state,
    isAdmin: isAdminEmail(user.email),
  });
}
