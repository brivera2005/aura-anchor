import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt, encrypt } from "./encryption";

export function precycleNoteKey(cycleNumber: number): string {
  return `precycle_note_cycle_${cycleNumber}`;
}

export async function savePrecycleNote(
  supabase: SupabaseClient,
  userId: string,
  relationshipId: string,
  cycleNumber: number,
  note: string
): Promise<void> {
  const key = precycleNoteKey(cycleNumber);
  await supabase.from("onboarding_responses").upsert(
    {
      user_id: userId,
      relationship_id: relationshipId,
      question_key: key,
      encrypted_answer: encrypt(note.trim()),
    },
    { onConflict: "user_id,relationship_id,question_key" }
  );
}

export async function loadPrecycleNote(
  supabase: SupabaseClient,
  userId: string,
  relationshipId: string,
  cycleNumber: number
): Promise<string | null> {
  const { data } = await supabase
    .from("onboarding_responses")
    .select("encrypted_answer")
    .eq("user_id", userId)
    .eq("relationship_id", relationshipId)
    .eq("question_key", precycleNoteKey(cycleNumber))
    .maybeSingle();

  if (!data?.encrypted_answer) return null;
  try {
    return decrypt(data.encrypted_answer);
  } catch {
    return null;
  }
}

/** Merge both partners' private notes for guide context (truncated). */
export async function loadPrecycleNotesForGuide(
  supabase: SupabaseClient,
  relationshipId: string,
  user1Id: string,
  user2Id: string | null,
  cycleNumber: number
): Promise<string | undefined> {
  const notes: string[] = [];
  const u1 = await loadPrecycleNote(supabase, user1Id, relationshipId, cycleNumber);
  if (u1) notes.push(u1.slice(0, 300));
  if (user2Id) {
    const u2 = await loadPrecycleNote(supabase, user2Id, relationshipId, cycleNumber);
    if (u2) notes.push(u2.slice(0, 300));
  }
  if (notes.length === 0) return undefined;
  return notes.join(" | ");
}
