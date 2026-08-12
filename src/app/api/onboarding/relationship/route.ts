import { NextResponse } from "next/server";
import { resolveRelationshipIdForUser } from "@/lib/onboarding-responses";
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

    const relationshipId = await resolveRelationshipIdForUser(supabase, user.id);
    return NextResponse.json({ relationshipId });
  } catch (err) {
    console.error("Onboarding relationship lookup error:", err);
    return NextResponse.json({ error: "Failed to resolve relationship" }, { status: 500 });
  }
}
