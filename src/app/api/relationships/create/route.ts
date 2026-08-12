import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth-helpers";
import { findDuplicateRelationship } from "@/lib/relationship-onboarding";
import { createClient } from "@/lib/supabase/server";
import type { RelationshipSubtype, RelationshipType } from "@/lib/types";

const VALID_TYPES: RelationshipType[] = [
  "spouse", "partner", "parent", "child", "sibling", "in_law",
  "friend", "ex_partner", "roommate", "other",
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, subtype, connectionName } = await request.json();

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid relationship type" }, { status: 400 });
    }

    if (!connectionName?.trim()) {
      return NextResponse.json({ error: "Connection name is required" }, { status: 400 });
    }

    const name = connectionName.trim();

    const duplicate = await findDuplicateRelationship(supabase, user.id, type, {
      connectionName: name,
    });

    if (duplicate) {
      return NextResponse.json(
        {
          error: `You already have a ${type} connection named "${duplicate.connection_name || name}".`,
          existingRelationshipId: duplicate.id,
        },
        { status: 409 }
      );
    }

    const { data: relationship, error } = await supabase
      .from("relationships")
      .insert({
        user1_id: user.id,
        type,
        relationship_subtype: subtype || null,
        connection_name: name,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      relationshipId: relationship.id,
      relationship,
    });
  } catch (err) {
    console.error("Create relationship error:", err);
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfile(user.id);

    const { data: relationships } = await supabase
      .from("relationships")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .neq("status", "ended")
      .order("created_at", { ascending: false });

    return NextResponse.json({ relationships: relationships || [], profile });
  } catch (err) {
    console.error("List relationships error:", err);
    return NextResponse.json({ error: "Failed to list connections" }, { status: 500 });
  }
}
