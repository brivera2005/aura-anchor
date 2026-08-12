export type RelationshipType =
  | "spouse"
  | "partner"
  | "parent"
  | "child"
  | "sibling"
  | "in_law"
  | "friend"
  | "ex_partner"
  | "roommate"
  | "other";

export type RelationshipSubtype =
  | "mother"
  | "father"
  | "stepmother"
  | "stepfather"
  | "guardian"
  | "son"
  | "daughter"
  | "stepson"
  | "stepdaughter"
  | "brother"
  | "sister"
  | "half_sibling"
  | "step_sibling"
  | "mother_in_law"
  | "father_in_law"
  | "brother_in_law"
  | "sister_in_law"
  | "son_in_law"
  | "daughter_in_law"
  | "best_friend"
  | "close_friend"
  | "childhood_friend"
  | "work_friend"
  | "co_parent"
  | "former_spouse"
  | "former_partner"
  | "housemate"
  | "flatmate"
  | "mentor"
  | "colleague"
  | "neighbor"
  | "custom";

export type RelationshipStatus = "pending" | "active" | "paused" | "ended";

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  demographics: Demographics;
  onboarding_completed: boolean;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
  partner_slot_email?: string | null;
  partner_slot_user_id?: string | null;
  partner_slot_locked_at?: string | null;
  partner_slot_permanent?: boolean | null;
  partner_slot_change_count?: number | null;
  partner_slot_grace_ends_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Demographics {
  age_range?: string;
  relationship_length?: string;
  living_situation?: string;
  help_areas?: string[];
  relationship_type?: RelationshipType;
}

export interface Relationship {
  id: string;
  user1_id: string;
  user2_id: string | null;
  type: RelationshipType;
  relationship_subtype?: RelationshipSubtype | null;
  connection_name?: string | null;
  status: RelationshipStatus;
  cycle_number?: number;
  questions_answered_this_cycle?: number;
  partner_answers_this_cycle?: Record<string, number>;
  themes_covered?: string[];
  next_cycle_available_at?: string | null;
  cycle_started_at?: string | null;
  cycle_mode?: "deep_dive" | "check_in";
  created_at: string;
  updated_at: string;
}

export interface Invite {
  id: string;
  from_user_id: string;
  to_email: string;
  relationship_type: RelationshipType;
  relationship_subtype?: RelationshipSubtype | null;
  connection_name?: string | null;
  token: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  relationship_id: string | null;
  expires_at: string;
  created_at: string;
}

export interface OnboardingResponse {
  id: string;
  user_id: string;
  relationship_id: string | null;
  question_key: string;
  encrypted_answer: string;
  created_at: string;
}

export interface AIQuestion {
  id: string;
  relationship_id: string;
  for_user_id: string;
  question_text: string;
  context: Record<string, unknown>;
  status: "pending" | "answered" | "skipped";
  cycle_number?: number | null;
  theme?: string | null;
  created_at: string;
}

export interface UserAnswer {
  id: string;
  question_id: string;
  user_id: string;
  encrypted_answer: string;
  created_at: string;
}

export interface Briefing {
  id: string;
  relationship_id: string;
  for_user_id: string;
  from_user_id: string;
  content: string;
  related_answer_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface RelationshipInsight {
  id: string;
  relationship_id: string;
  insight_type: string;
  content: Record<string, unknown>;
  created_at: string;
}

export interface HealingMilestone {
  id: string;
  relationship_id: string;
  milestone_key: string;
  title: string;
  description: string | null;
  achieved_at: string;
}

export interface OnboardingAnalysis {
  health_score: number;
  summary: string;
  user_strengths: string[];
  user_weaknesses: string[];
  partner_strengths: string[];
  partner_weaknesses: string[];
  perception_gaps: Array<{
    area: string;
    self_view: string;
    partner_view: string;
    gap_description: string;
  }>;
  alignment_areas: string[];
  recommended_focus: string[];
}

export interface BriefingSections {
  why: string;
  how: string;
  what: string;
}

export interface AnswerAnalysis {
  briefing_for_partner: string;
  briefing_sections: BriefingSections;
  follow_up_question: string;
  progress_note: string;
  theme?: string;
  milestone?: {
    key: string;
    title: string;
    description: string;
  };
}

export interface CycleAnalysisPerceptionGap {
  area: string;
  partner_a_view: string;
  partner_b_view: string;
  gap_description: string;
  whats_valid: string;
  whats_an_issue: string;
}

export interface CycleAnalysis {
  cycle_number: number;
  title: string;
  summary: string;
  where_you_stand_together: string;
  heard_from_partner_a: string;
  heard_from_partner_b: string;
  perception_gaps: CycleAnalysisPerceptionGap[];
  whats_working: string[];
  needs_attention: string[];
  why_it_matters: string;
  how_to_start_healing: string;
  joint_actions_this_week: string[];
  partner_a_actions_this_week: string[];
  partner_b_actions_this_week: string[];
  conversation_starters: string[];
  next_cycle_preview: string;
  /** @deprecated use why_it_matters */
  why?: string;
  /** @deprecated use heard_from + how_to_start_healing */
  what_each_needs?: {
    partner_a: string;
    partner_b: string;
  };
  /** @deprecated use how_to_start_healing */
  how_to_improve?: string;
  /** @deprecated use joint_actions_this_week */
  action_steps?: string[];
  themes_covered: string[];
  /** Plain-language trend since Cycle 1 */
  progress_narrative?: string;
  /** Parsed action steps for follow-up in next cycle */
  tracked_action_steps?: string[];
  /** Follow-up prompt about prior cycle actions */
  prior_cycle_followup?: string;
  cycle_started_at?: string;
  cycle_completed_at?: string;
}

export interface PartnerNamesForAI {
  user1Name: string;
  user2Name: string;
}
