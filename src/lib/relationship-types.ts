import type { RelationshipSubtype, RelationshipType } from "./types";

export const RELATIONSHIP_TYPES: {
 value: RelationshipType;
 label: string;
 description: string;
}[] = [
 { value: "spouse", label: "Spouse", description: "Husband, wife, or life partner" },
 { value: "partner", label: "Partner", description: "Romantic partner you're dating or committed to" },
 { value: "parent", label: "Parent", description: "Your mother, father, or caregiver" },
 { value: "child", label: "Child", description: "Your son, daughter, or dependent" },
 { value: "sibling", label: "Sibling", description: "Brother, sister, or sibling-like bond" },
 { value: "in_law", label: "In-law", description: "Mother-in-law, father-in-law, and extended family by marriage" },
 { value: "friend", label: "Friend", description: "Close friend or chosen family" },
 { value: "ex_partner", label: "Ex-partner", description: "Former partner - co-parenting, closure, or rebuilding" },
 { value: "roommate", label: "Roommate", description: "Someone you share a home with" },
 { value: "other", label: "Other", description: "Any connection that matters to you" },
];

export const RELATIONSHIP_SUBTYPES: Record<
 RelationshipType,
 { value: RelationshipSubtype; label: string }[]
> = {
 spouse: [],
 partner: [],
 parent: [
 { value: "mother", label: "Mother" },
 { value: "father", label: "Father" },
 { value: "stepmother", label: "Stepmother" },
 { value: "stepfather", label: "Stepfather" },
 { value: "guardian", label: "Guardian / caregiver" },
 ],
 child: [
 { value: "son", label: "Son" },
 { value: "daughter", label: "Daughter" },
 { value: "stepson", label: "Stepson" },
 { value: "stepdaughter", label: "Stepdaughter" },
 ],
 sibling: [
 { value: "brother", label: "Brother" },
 { value: "sister", label: "Sister" },
 { value: "half_sibling", label: "Half-sibling" },
 { value: "step_sibling", label: "Step-sibling" },
 ],
 in_law: [
 { value: "mother_in_law", label: "Mother-in-law" },
 { value: "father_in_law", label: "Father-in-law" },
 { value: "brother_in_law", label: "Brother-in-law" },
 { value: "sister_in_law", label: "Sister-in-law" },
 { value: "son_in_law", label: "Son-in-law" },
 { value: "daughter_in_law", label: "Daughter-in-law" },
 ],
 friend: [
 { value: "best_friend", label: "Best friend" },
 { value: "close_friend", label: "Close friend" },
 { value: "childhood_friend", label: "Childhood friend" },
 { value: "work_friend", label: "Work friend" },
 ],
 ex_partner: [
 { value: "co_parent", label: "Co-parent" },
 { value: "former_spouse", label: "Former spouse" },
 { value: "former_partner", label: "Former partner" },
 ],
 roommate: [
 { value: "housemate", label: "Housemate" },
 { value: "flatmate", label: "Flatmate" },
 ],
 other: [
 { value: "mentor", label: "Mentor" },
 { value: "colleague", label: "Colleague" },
 { value: "neighbor", label: "Neighbor" },
 { value: "custom", label: "Other" },
 ],
};

const TYPE_LABELS: Record<RelationshipType, string> = Object.fromEntries(
 RELATIONSHIP_TYPES.map((t) => [t.value, t.label])
) as Record<RelationshipType, string>;

const SUBTYPE_LABELS: Record<RelationshipSubtype, string> = Object.fromEntries(
 Object.values(RELATIONSHIP_SUBTYPES)
 .flat()
 .map((s) => [s.value, s.label])
) as Record<RelationshipSubtype, string>;

export function getRelationshipTypeLabel(type: RelationshipType): string {
 return TYPE_LABELS[type] ?? "Connection";
}

export function getRelationshipSubtypeLabel(
 subtype: RelationshipSubtype | null | undefined
): string | null {
 if (!subtype) return null;
 return SUBTYPE_LABELS[subtype] ?? null;
}

/** Full label for UI: "Mother (Parent)" or "Spouse" */
export function getRelationshipLabel(
 type: RelationshipType,
 subtype?: RelationshipSubtype | null
): string {
 const subtypeLabel = getRelationshipSubtypeLabel(subtype);
 if (subtypeLabel) return subtypeLabel;
 return getRelationshipTypeLabel(type);
}

/** Pronoun-style reference for guide copy: "your mother", "your brother" */
export function getRelationshipReference(
 type: RelationshipType,
 subtype?: RelationshipSubtype | null,
 connectionName?: string | null
): string {
 if (subtype) {
 const map: Partial<Record<RelationshipSubtype, string>> = {
 mother: "your mother",
 father: "your father",
 stepmother: "your stepmother",
 stepfather: "your stepfather",
 guardian: "your guardian",
 son: "your son",
 daughter: "your daughter",
 stepson: "your stepson",
 stepdaughter: "your stepdaughter",
 brother: "your brother",
 sister: "your sister",
 half_sibling: "your sibling",
 step_sibling: "your step-sibling",
 mother_in_law: "your mother-in-law",
 father_in_law: "your father-in-law",
 brother_in_law: "your brother-in-law",
 sister_in_law: "your sister-in-law",
 son_in_law: "your son-in-law",
 daughter_in_law: "your daughter-in-law",
 best_friend: "your best friend",
 close_friend: "your close friend",
 childhood_friend: "your childhood friend",
 work_friend: "your friend",
 co_parent: "your co-parent",
 former_spouse: "your former spouse",
 former_partner: "your former partner",
 housemate: "your roommate",
 flatmate: "your roommate",
 mentor: "your mentor",
 colleague: "your colleague",
 neighbor: "your neighbor",
 };
 if (map[subtype]) return map[subtype]!;
 }

 const typeRefs: Record<RelationshipType, string> = {
 spouse: "your spouse",
 partner: "your partner",
 parent: "your parent",
 child: "your child",
 sibling: "your sibling",
 in_law: "your in-law",
 friend: "your friend",
 ex_partner: "your ex-partner",
 roommate: "your roommate",
 other: connectionName ? connectionName : "this person",
 };
 return typeRefs[type];
}

/** Help area IDs recommended per relationship type */
export const HELP_AREAS_BY_TYPE: Record<RelationshipType, string[]> = {
 spouse: ["communication", "trust", "intimacy", "conflict", "emotional", "forgiveness"],
 partner: ["communication", "trust", "intimacy", "conflict", "emotional", "growth"],
 parent: ["boundaries", "communication", "emotional", "forgiveness", "conflict"],
 child: ["boundaries", "communication", "emotional", "conflict", "growth"],
 sibling: ["communication", "conflict", "forgiveness", "boundaries", "emotional"],
 in_law: ["boundaries", "communication", "conflict", "emotional", "forgiveness"],
 friend: ["communication", "trust", "emotional", "boundaries", "growth"],
 ex_partner: ["communication", "boundaries", "conflict", "forgiveness", "emotional"],
 roommate: ["boundaries", "communication", "conflict", "emotional"],
 other: ["communication", "trust", "emotional", "boundaries", "conflict"],
};

export interface OnboardingFieldCopy {
 label: string;
 placeholder?: string;
}

export interface OnboardingStepCopy {
 title: string;
 description: string;
 fields: Record<string, OnboardingFieldCopy>;
}

export function getOnboardingCopy(
 type: RelationshipType,
 reference: string
): OnboardingStepCopy {
 const person = reference;
 const capitalized = reference.charAt(0).toUpperCase() + reference.slice(1);

 const partnerWord =
 type === "friend"
 ? "friend"
 : type === "parent" || type === "child" || type === "sibling" || type === "in_law"
 ? "family member"
 : type === "roommate"
 ? "roommate"
 : type === "ex_partner"
 ? "ex-partner"
 : "partner";

 return {
 title: "Know Yourself",
 description: `Honest self-reflection helps your guide understand you in this relationship`,
 fields: {
 self_strengths: {
 label: `What are your greatest strengths with ${person}?`,
 },
 self_weaknesses: {
 label: "What do you struggle with most in this relationship?",
 },
 self_needs: {
 label: `What do you need most from ${person} right now?`,
 },
 partner_strengths: {
 label: `What are ${capitalized}'s greatest strengths?`,
 },
 partner_weaknesses: {
 label: `What challenges do you see in ${person}?`,
 },
 partner_love_language: {
 label:
 type === "friend" || type === "roommate"
 ? `How do you think ${person} feels most appreciated?`
 : `How do you think ${person} feels most loved or valued?`,
 },
 how_met: {
 label:
 type === "parent" || type === "child" || type === "sibling"
 ? "What's the story of your relationship - growing up and now?"
 : type === "friend"
 ? "How did your friendship begin?"
 : "How did your relationship begin?",
 },
 current_challenge: {
 label: "What is the biggest challenge you're facing right now?",
 },
 hope_for_future: {
 label: `What does a healthier connection with ${person} look like to you?`,
 },
 relationship_length: {
 label:
 type === "parent" || type === "child" || type === "sibling"
 ? "How long have you been navigating this relationship as adults?"
 : "How long have you been connected?",
 },
 living_situation: {
 label:
 type === "roommate"
 ? "Living arrangement"
 : type === "parent" || type === "child" || type === "sibling"
 ? "How often do you see or talk to each other?"
 : "Living situation",
 },
 help_areas: {
 label: `Areas for healing with your ${partnerWord}`,
 },
 },
 };
}
