import type { RelationshipType } from "./types";
import {
 getOnboardingCopy,
 getRelationshipReference,
} from "./relationship-types";



export {

 RELATIONSHIP_TYPES,

 RELATIONSHIP_SUBTYPES,

 HELP_AREAS_BY_TYPE,

 getRelationshipLabel,

 getRelationshipReference,

 getRelationshipTypeLabel,

 getOnboardingCopy,

} from "./relationship-types";



export const AGE_RANGES = [

 "18-24",

 "25-34",

 "35-44",

 "45-54",

 "55-64",

 "65+",

];



export const RELATIONSHIP_LENGTHS = [

 "Less than 1 year",

 "1-3 years",

 "3-7 years",

 "7-15 years",

 "15+ years",

 "Lifelong / since childhood",

];



export const LIVING_SITUATIONS = [

 "Living together",

 "Living separately, nearby",

 "Long distance",

 "See each other weekly",

 "See each other monthly or less",

 "Other arrangement",

];



export const HELP_AREAS = [

 { id: "communication", label: "Communication", icon: "MessageCircle" },

 { id: "trust", label: "Trust", icon: "Shield" },

 { id: "intimacy", label: "Intimacy", icon: "Heart" },

 { id: "conflict", label: "Conflict resolution", icon: "Flame" },

 { id: "boundaries", label: "Boundaries", icon: "Fence" },

 { id: "emotional", label: "Emotional support", icon: "Sparkles" },

 { id: "growth", label: "Personal growth", icon: "Sprout" },

 { id: "forgiveness", label: "Forgiveness", icon: "Dove" },

 { id: "independence", label: "Independence & respect", icon: "Bird" },

 { id: "loyalty", label: "Loyalty & support", icon: "Handshake" },

];



export const ONBOARDING_STEP_IDS = [

 "demographics",

 "help_areas",

 "self_reflection",

 "partner_view",

 "relationship_history",

] as const;



export const REQUIRED_ONBOARDING_KEYS = [

 "age_range",

 "help_areas",

 "self_strengths",

 "self_weaknesses",

 "self_needs",

 "partner_strengths",

 "partner_weaknesses",

 "current_challenge",

 "hope_for_future",

] as const;



export function buildOnboardingSteps(type: RelationshipType = "partner") {
 const ref = getRelationshipReference(type);
 const copy = getOnboardingCopy(type, ref);



 return [

 {

 id: "demographics",

 title: "About You",

 description: "Help us understand your context for this connection",

 fields: [

 { key: "age_range", label: "Your age range", type: "select", options: AGE_RANGES },

 {

 key: "relationship_length",

 label: copy.fields.relationship_length?.label ?? "How long have you been connected?",

 type: "select",

 options: RELATIONSHIP_LENGTHS,

 },

 {

 key: "living_situation",

 label: copy.fields.living_situation?.label ?? "Living situation",

 type: "select",

 options: LIVING_SITUATIONS,

 },

 ],

 },

 {

 id: "help_areas",

 title: "What You Need",

 description: copy.fields.help_areas?.label ?? "Select the areas where you'd like support",

 fields: [

 { key: "help_areas", label: "Areas for healing", type: "multiselect", options: HELP_AREAS.map((h) => h.id) },

 ],

 },

 {

 id: "self_reflection",

 title: copy.title,

 description: copy.description,

 fields: [

 { key: "self_strengths", label: copy.fields.self_strengths.label, type: "textarea" },

 { key: "self_weaknesses", label: copy.fields.self_weaknesses.label, type: "textarea" },

 { key: "self_needs", label: copy.fields.self_needs.label, type: "textarea" },

 ],

 },

 {

 id: "partner_view",

 title: "See Them Clearly",

 description: `Share how you perceive them - this reveals perception gaps`,

 fields: [

 { key: "partner_strengths", label: copy.fields.partner_strengths.label, type: "textarea" },

 { key: "partner_weaknesses", label: copy.fields.partner_weaknesses.label, type: "textarea" },

 { key: "partner_love_language", label: copy.fields.partner_love_language.label, type: "textarea" },

 ],

 },

 {

 id: "relationship_history",

 title: "Your Story",

 description: "Context helps us personalize your healing journey",

 fields: [

 { key: "how_met", label: copy.fields.how_met.label, type: "textarea" },

 { key: "current_challenge", label: copy.fields.current_challenge.label, type: "textarea" },

 { key: "hope_for_future", label: copy.fields.hope_for_future.label, type: "textarea" },

 ],

 },

 ];

}



/** @deprecated use buildOnboardingSteps(type) */

export const ONBOARDING_STEPS = buildOnboardingSteps("partner");



export const MILESTONES = [

 { key: "first_answer", title: "First Step", description: "Completed your first healing question" },

 { key: "five_answers", title: "Building Momentum", description: "Answered 5 healing questions" },

 { key: "first_briefing", title: "Bridge Builder", description: "Received your first connection briefing" },

 { key: "onboarding_complete", title: "Foundation Set", description: "Both people completed onboarding" },

 { key: "ten_answers", title: "Deep Work", description: "Answered 10 healing questions" },

];


