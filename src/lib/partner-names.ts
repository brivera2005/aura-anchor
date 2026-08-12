import type { Relationship } from "./types";
import { getRelationshipReference } from "./relationship-types";

type NameSource = { name?: string | null; email?: string | null } | null | undefined;

/** Display name for a connection: partner profile, connection_name, or type reference. */
export function getConnectionDisplayName(
  relationship: Relationship,
  partnerProfile?: NameSource
): string {
  if (partnerProfile) {
    return getDisplayName(partnerProfile, "Connection");
  }
  if (relationship.connection_name?.trim()) {
    return relationship.connection_name.trim();
  }
  const ref = getRelationshipReference(
    relationship.type,
    relationship.relationship_subtype,
    null
  );
  return ref.replace(/^your /i, "").replace(/^./, (c) => c.toUpperCase());
}

/** First name or short display label for UI copy. */
export function getPartnerFirstName(profile: NameSource): string {
  const full = getDisplayName(profile);
  return full.split(/\s+/)[0] || full;
}

/** Full display name from profile.name (Google full_name on signup) or email local-part. */
export function getDisplayName(profile: NameSource, fallback = "Partner"): string {
  if (!profile) return fallback;
  const name = profile.name?.trim();
  if (name) return name;
  if (profile.email) {
    const local = profile.email.split("@")[0];
    if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return fallback;
}

export interface PartnerNameContext {
  answererName: string;
  answererFirstName: string;
  partnerName: string;
  partnerFirstName: string;
}

export function buildPartnerNameContext(
  answererProfile: NameSource,
  partnerProfile: NameSource
): PartnerNameContext {
  const answererName = getDisplayName(answererProfile, "You");
  const partnerName = getDisplayName(partnerProfile, "Partner");
  return {
    answererName,
    answererFirstName: answererName.split(/\s+/)[0] || answererName,
    partnerName,
    partnerFirstName: partnerName.split(/\s+/)[0] || partnerName,
  };
}
