import { isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PartnerSlotFields {
 partner_slot_email: string | null;
 partner_slot_user_id: string | null;
 partner_slot_locked_at: string | null;
 subscription_status?: string | null;
 email?: string | null;
}

export type PartnerSlotProfile = PartnerSlotProfileFull;

export interface PartnerSlotProfileFull {
 partner_slot_email: string | null;
 partner_slot_user_id: string | null;
 partner_slot_locked_at: string | null;
 partner_slot_permanent: boolean | null;
 partner_slot_change_count: number | null;
 partner_slot_grace_ends_at: string | null;
 subscription_status: string | null;
 subscription_current_period_end: string | null;
 email: string | null;
}

export interface PartnerSlotState {
 email: string | null;
 partnerUserId: string | null;
 permanent: boolean;
 locked: boolean;
 lockedAt: string | null;
 canEdit: boolean;
 subscriptionStatus: string | null;
 blockReason: string | null;
}

export function normalizePartnerEmail(email: string): string {
 return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
 return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isPayingSubscriber(status: string | null | undefined): boolean {
 return status === "active" || status === "trialing" || status === "lifetime";
}

export function partnerSlotIsLocked(
 profile: Pick<PartnerSlotProfile, "partner_slot_email" | "partner_slot_locked_at"> | null
): boolean {
 return !!(profile?.partner_slot_email?.trim() || profile?.partner_slot_locked_at);
}

export function computePartnerSlotState(
 profile: PartnerSlotProfile
): PartnerSlotState {
 const locked = partnerSlotIsLocked(profile);

 let blockReason: string | null = null;
 if (locked) {
 blockReason =
 "Your subscription includes 1 partner at this email. This cannot be changed.";
 }

 return {
 email: profile.partner_slot_email,
 partnerUserId: profile.partner_slot_user_id,
 permanent: locked,
 locked: locked,
 lockedAt: profile.partner_slot_locked_at,
 canEdit: !locked,
 subscriptionStatus: profile.subscription_status,
 blockReason: locked ? blockReason : null,
 };
}

export async function getPartnerSlotProfile(
 userId: string
): Promise<PartnerSlotProfile | null> {
 const admin = createAdminClient();
 const { data } = await admin
 .from("profiles")
 .select(
 "partner_slot_email, partner_slot_user_id, partner_slot_locked_at, partner_slot_permanent, partner_slot_change_count, partner_slot_grace_ends_at, subscription_status, subscription_current_period_end, email"
 )
 .eq("user_id", userId)
 .maybeSingle();
 return data;
}

export async function getPartnerSlotState(
 userId: string
): Promise<PartnerSlotState | null> {
 const profile = await getPartnerSlotProfile(userId);
 if (!profile) return null;
 return computePartnerSlotState(profile);
}

/** Called after Stripe checkout - partner email is set during onboarding, not checkout. */
export async function initPartnerSlotOnSubscribe(
 _userId: string,
 _options: {
 subscriptionStatus: string;
 graceEndsAt?: Date | null;
 }
): Promise<void> {
 // No-op - partner slot is locked during onboarding.
}

export async function applyPartnerSlotFromCheckout(
 userId: string,
 partnerEmail: string | null | undefined
): Promise<void> {
 if (!partnerEmail?.trim()) return;
 const profile = await getPartnerSlotProfile(userId);
 if (partnerSlotIsLocked(profile)) return;
 await setPartnerSlotEmail(userId, partnerEmail, { allowOverwrite: false });
}

async function persistLockedPartnerEmail(
 userId: string,
 email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
 const admin = createAdminClient();
 const now = new Date().toISOString();

 const { error } = await admin
 .from("profiles")
 .update({
 partner_slot_email: email,
 partner_slot_locked_at: now,
 partner_slot_permanent: true,
 })
 .eq("user_id", userId)
 .is("partner_slot_email", null);

 if (error) {
 return { ok: false, error: error.message };
 }

 return { ok: true };
}

export async function setPartnerSlotEmail(
 userId: string,
 rawEmail: string,
 options?: { allowOverwrite?: boolean; duringOnboarding?: boolean }
): Promise<{ ok: true; state: PartnerSlotState } | { ok: false; error: string }> {
 const email = normalizePartnerEmail(rawEmail);
 if (!email || !isValidEmail(email)) {
 return { ok: false, error: "Enter a valid email address." };
 }

 const profile = await getPartnerSlotProfile(userId);
 if (!profile) {
 return { ok: false, error: "Profile not found." };
 }

 if (profile.email?.toLowerCase() === email) {
 return { ok: false, error: "Partner email must be different from your own." };
 }

 const state = computePartnerSlotState(profile);

 if (state.locked) {
 if (profile.partner_slot_email === email) {
 const current = await getPartnerSlotState(userId);
 if (!current) {
 return { ok: false, error: "Failed to load partner slot." };
 }
 return { ok: true, state: current };
 }
 if (!options?.allowOverwrite) {
 return {
 ok: false,
 error: `Your included partner is locked to ${profile.partner_slot_email}. Contact support to change.`,
 };
 }
 }

 if (
 !options?.duringOnboarding &&
 !isPayingSubscriber(profile.subscription_status)
 ) {
 return {
 ok: false,
 error: "Complete onboarding to set your included partner email.",
 };
 }

 const write = await persistLockedPartnerEmail(userId, email);
 if (!write.ok) {
 if (state.locked) {
 return {
 ok: false,
 error: `Your included partner is locked to ${profile.partner_slot_email}. Contact support to change.`,
 };
 }
 return { ok: false, error: write.error };
 }

 const updated = await getPartnerSlotState(userId);
 if (!updated) {
 return { ok: false, error: "Failed to load updated partner slot." };
 }

 return { ok: true, state: updated };
}

export async function lockPartnerSlotPermanently(_userId: string): Promise<void> {
 // Slot locks on first confirmed set during onboarding.
}

export async function assignPartnerSlotUser(
 subscriberUserId: string,
 partnerAuthUserId: string,
 partnerEmail: string
): Promise<void> {
 const admin = createAdminClient();
 const normalized = normalizePartnerEmail(partnerEmail);

 const { data: partnerProfile } = await admin
 .from("profiles")
 .select("id")
 .eq("user_id", partnerAuthUserId)
 .maybeSingle();

 const now = new Date().toISOString();
 await admin
 .from("profiles")
 .update({
 partner_slot_user_id: partnerProfile?.id ?? null,
 partner_slot_email: normalized,
 partner_slot_locked_at: now,
 partner_slot_permanent: true,
 })
 .eq("user_id", subscriberUserId);
}

export async function claimPartnerSlotOnAccept(
 subscriberUserId: string,
 partnerAuthUserId: string,
 partnerEmail: string
): Promise<void> {
 await assignPartnerSlotUser(subscriberUserId, partnerAuthUserId, partnerEmail);
}

export async function validateInvitePartnerSlot(
 _supabase: unknown,
 userId: string,
 toEmail: string,
 slotProfile?: PartnerSlotFields
): Promise<{ ok: true } | { ok: false; error: string }> {
 if (slotProfile?.email && isAdminEmail(slotProfile.email)) {
 return { ok: true };
 }

 const profile = await getPartnerSlotProfile(userId);
 if (!profile) {
 return { ok: false, error: "Profile not found." };
 }

 if (isAdminEmail(profile.email)) {
 return { ok: true };
 }

 if (!isPayingSubscriber(profile.subscription_status)) {
 return { ok: true };
 }

 const normalized = normalizePartnerEmail(toEmail);
 const state = computePartnerSlotState(profile);

 if (!state.locked || !state.email) {
 return {
 ok: false,
 error:
 "Set your included partner email during onboarding before sending invites.",
 };
 }

 if (state.email !== normalized) {
 return {
 ok: false,
 error: `Your plan includes 1 partner. Invites must go to ${state.email}.`,
 };
 }

 return { ok: true };
}

export function partnerEmailGetsFreeAccess(
 subscriberProfile: PartnerSlotProfile,
 partnerEmail: string | null | undefined,
 partnerProfileId: string | null | undefined
): boolean {
 if (!isPayingSubscriber(subscriberProfile.subscription_status)) {
 return false;
 }

 const normalizedPartner = partnerEmail
 ? normalizePartnerEmail(partnerEmail)
 : null;

 if (subscriberProfile.partner_slot_user_id && partnerProfileId) {
 return subscriberProfile.partner_slot_user_id === partnerProfileId;
 }

 const slotEmail = subscriberProfile.partner_slot_email?.trim() || null;
 if (!slotEmail || !normalizedPartner) {
 return false;
 }

 return slotEmail === normalizedPartner;
}
