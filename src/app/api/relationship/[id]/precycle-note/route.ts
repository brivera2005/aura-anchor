import { NextResponse } from "next/server";
import { hasEncryptionKey } from "@/lib/encryption";
import { loadPrecycleNote, savePrecycleNote } from "@/lib/precycle-note";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(_request.url);
    const cycleNumber = parseInt(searchParams.get("cycle") || "1", 10);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const note = await loadPrecycleNote(supabase, user.id, id, cycleNumber);
    return NextResponse.json({ note });
  } catch (err) {
    console.error("Load precycle note error:", err);
    return NextResponse.json({ error: "Failed to load note" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!hasEncryptionKey()) {
      return NextResponse.json({ error: "Encryption not configured" }, { status: 500 });
    }

    const { id } = await params;
    const { cycleNumber, note } = await request.json();

    if (!cycleNumber || typeof note !== "string") {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: relationship } = await supabase
      .from("relationships")
      .select("id")
      .eq("id", id)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();

    if (!relationship) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (note.trim()) {
      await savePrecycleNote(supabase, user.id, id, cycleNumber, note);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Save precycle note error:", err);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}
