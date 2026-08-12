export const SELECTED_RELATIONSHIP_KEY = "aura_selected_relationship";

export function readSelectedRelationshipId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SELECTED_RELATIONSHIP_KEY);
  } catch {
    return null;
  }
}

export function writeSelectedRelationshipId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SELECTED_RELATIONSHIP_KEY, id);
  } catch {
    // ignore quota / private mode
  }
}
