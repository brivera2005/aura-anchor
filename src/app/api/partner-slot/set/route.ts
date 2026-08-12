import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/admin";
import { setPartnerSlotEmail } from "@/lib/partner-slot";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isAdminEmail(user.email)) {
    return NextResponse.json(
      { error: "Admin accounts are not subject to partner slot limits." },
      { status: 400 }
    );
  }

  let email: string;
  let duringOnboarding = false;
  let confirmPermanent = false;
  try {
    const body = await request.json();
    if (!body?.email || typeof body.email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    email = body.email;
    duringOnboarding = body.duringOnboarding === true;
    confirmPermanent = body.confirmPermanent === true;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!confirmPermanent) {
    return NextResponse.json(
      { error: "You must confirm that this partner email is permanent." },
      { status: 400 }
    );
  }

  const result = await setPartnerSlotEmail(user.id, email, { duringOnboarding });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, ...result.state });
}
