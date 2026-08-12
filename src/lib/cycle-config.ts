/** Hours to wait after a cycle report before next cycle questions appear (skippable). */
export const ABSORB_PERIOD_HOURS = 24;

export type CycleMode = "deep_dive" | "check_in";

export const DEEP_DIVE_QUESTIONS = 5;
export const CHECK_IN_QUESTIONS = 3;

/** Cycles after which check-in mode becomes available. */
export const CHECK_IN_AVAILABLE_FROM_CYCLE = 4;

export function getQuestionsPerCycle(mode?: CycleMode | string | null): number {
  return mode === "check_in" ? CHECK_IN_QUESTIONS : DEEP_DIVE_QUESTIONS;
}

export function isCheckInAvailable(cycleNumber: number): boolean {
  return cycleNumber >= CHECK_IN_AVAILABLE_FROM_CYCLE;
}

export function getAbsorbPeriodMs(): number {
  return ABSORB_PERIOD_HOURS * 60 * 60 * 1000;
}

export function computeNextCycleAvailableAt(from: Date = new Date()): string {
  return new Date(from.getTime() + getAbsorbPeriodMs()).toISOString();
}

export function isAbsorbPeriodActive(nextCycleAvailableAt: string | null | undefined): boolean {
  if (!nextCycleAvailableAt) return false;
  return new Date(nextCycleAvailableAt).getTime() > Date.now();
}

export function msUntilNextCycle(nextCycleAvailableAt: string | null | undefined): number {
  if (!nextCycleAvailableAt) return 0;
  return Math.max(0, new Date(nextCycleAvailableAt).getTime() - Date.now());
}

/** Suggest check-in when 2+ weeks since last cycle report. */
export function shouldSuggestCheckIn(lastCycleCompletedAt: string | null | undefined): boolean {
  if (!lastCycleCompletedAt) return false;
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(lastCycleCompletedAt).getTime() >= twoWeeksMs;
}
