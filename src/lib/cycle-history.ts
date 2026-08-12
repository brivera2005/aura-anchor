import type { SupabaseClient } from "@supabase/supabase-js";
import { THEME_LABELS, type HealingTheme } from "./healing-themes";
import type { CycleAnalysis } from "./types";

export interface CycleHistoryItem {
 cycleNumber: number;
 title: string;
 summary: string;
 themesCovered: string[];
 themeLabels: string[];
 reportUrl: string;
 completedAt: string | null;
 inProgress: boolean;
 progressNarrative?: string;
}

export interface CycleHistorySummary {
 cycles: CycleHistoryItem[];
 completedCount: number;
 currentCycleNumber: number;
 allThemesCovered: string[];
 progressNarrative?: string;
}

export async function loadCycleHistory(
 supabase: SupabaseClient,
 relationshipId: string,
 currentCycleNumber: number
): Promise<CycleHistorySummary> {
 const { data: insightRows } = await supabase
 .from("relationship_insights")
 .select("content, created_at")
 .eq("relationship_id", relationshipId)
 .eq("insight_type", "cycle_analysis")
 .order("created_at", { ascending: true });

 const completedCycles: CycleHistoryItem[] = (insightRows || []).map((row) => {
 const analysis = row.content as CycleAnalysis;
 const themes = analysis.themes_covered || [];
 return {
 cycleNumber: analysis.cycle_number,
 title: analysis.title || `Cycle ${analysis.cycle_number}`,
 summary: analysis.summary || "",
 themesCovered: themes,
 themeLabels: themes.map((t) => THEME_LABELS[t as HealingTheme] || t),
 reportUrl: `/relationship/${relationshipId}/cycle/${analysis.cycle_number}`,
 completedAt: row.created_at,
 inProgress: false,
 progressNarrative: analysis.progress_narrative,
 };
 });

 const completedNumbers = new Set(completedCycles.map((c) => c.cycleNumber));
 const cycles = [...completedCycles];

 if (!completedNumbers.has(currentCycleNumber)) {
 cycles.push({
 cycleNumber: currentCycleNumber,
 title: `Cycle ${currentCycleNumber}`,
 summary: "In progress - complete reflections to unlock your report",
 themesCovered: [],
 themeLabels: [],
 reportUrl: `/relationship/${relationshipId}/loop`,
 completedAt: null,
 inProgress: true,
 });
 }

 cycles.sort((a, b) => a.cycleNumber - b.cycleNumber);

 const allThemesCovered = [
 ...new Set(completedCycles.flatMap((c) => c.themesCovered)),
 ];

 const latestNarrative = [...completedCycles]
 .reverse()
 .find((c) => c.progressNarrative)?.progressNarrative;

 return {
 cycles,
 completedCount: completedCycles.length,
 currentCycleNumber,
 allThemesCovered,
 progressNarrative: latestNarrative,
 };
}
