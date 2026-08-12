import { NextResponse } from "next/server";
import { hasEncryptionKey } from "@/lib/encryption";
import { resetHealingLoopData } from "@/lib/healing-reset";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hasEncryptionKey() || !hasAdminClient()) {
      return NextResponse.json(
        { error: "Server not configured for healing reset" },
        { status: 500 }
      );
    }

    const { id: relationshipId } = await params;
    const body = await request.json().catch(() => ({}));
    const seedCycle1 = body.seedCycle1 !== false;

    const adminToken = request.headers.get("x-admin-token");
    const encryptionKey = process.env.ENCRYPTION_KEY?.trim();
    const isAdminToken =
      !!adminToken && !!encryptionKey && adminToken === encryptionKey;

    if (!isAdminToken) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: relationship } = await supabase
        .from("relationships")
        .select("id, status, user1_id, user2_id")
        .eq("id", relationshipId)
        .single();

      if (!relationship) {
        return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
      }

      if (relationship.status !== "active") {
        return NextResponse.json(
          { error: "Relationship is not active" },
          { status: 400 }
        );
      }

      if (
        user.id !== relationship.user1_id &&
        user.id !== relationship.user2_id
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (body.confirm !== true) {
        return NextResponse.json(
          { error: "Pass confirm: true to reset healing loop data" },
          { status: 400 }
        );
      }
    }

    const admin = createAdminClient();
    const stats = await resetHealingLoopData(admin, relationshipId, { seedCycle1 });

    return NextResponse.json({
      success: true,
      message: "Healing loop reset. Onboarding data preserved.",
      stats,
    });
  } catch (err) {
    console.error("Healing reset failed:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Healing reset failed",
      },
      { status: 500 }
    );
  }
}
