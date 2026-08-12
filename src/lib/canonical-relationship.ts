import type { Relationship } from "./types";

/** Stable key for the two people in a relationship (order-independent), scoped by type. */
export function partnerPairKey(rel: Relationship): string {
  const typeKey = rel.type;
  if (rel.user1_id && rel.user2_id) {
    return `${typeKey}:${[rel.user1_id, rel.user2_id].sort().join(":")}`;
  }
  return `${typeKey}:${rel.id}`;
}

function relationshipScore(rel: Relationship): number {
  return (
    (rel.status === "active" ? 4 : rel.status === "pending" ? 2 : 0) +
    (rel.user2_id ? 1 : 0)
  );
}

/** When both partners invited each other, keep one canonical relationship. */
export function dedupeRelationships(relationships: Relationship[]): Relationship[] {
  const seen = new Map<string, Relationship>();

  for (const rel of relationships) {
    const key = partnerPairKey(rel);
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, rel);
      continue;
    }

    const relScore = relationshipScore(rel);
    const existingScore = relationshipScore(existing);

    if (relScore > existingScore) {
      seen.set(key, rel);
    } else if (
      relScore === existingScore &&
      new Date(rel.created_at) < new Date(existing.created_at)
    ) {
      seen.set(key, rel);
    }
  }

  return [...seen.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function pickCanonicalRelationship(
  relationships: Relationship[]
): Relationship | null {
  const deduped = dedupeRelationships(relationships);
  return deduped.find((r) => r.status === "active") ?? deduped[0] ?? null;
}
