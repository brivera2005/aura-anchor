import { NextResponse } from "next/server";
import { reconcileRelationshipForUser } from "@/lib/relationship-reconcile";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await reconcileRelationshipForUser(user.id);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Reconcile error:", err);
    return NextResponse.json({ error: "Failed to reconcile" }, { status: 500 });
  }
}
