"use client";

import { cn } from "@/lib/utils";
import { CHECK_IN_QUESTIONS, DEEP_DIVE_QUESTIONS } from "@/lib/cycle-config";
import { Badge } from "@/components/ui/badge";

export function CycleModePicker({
 value,
 onChange,
 suggestCheckIn,
}: {
 value: "deep_dive" | "check_in";
 onChange: (mode: "deep_dive" | "check_in") => void;
 suggestCheckIn?: boolean;
}) {
 return (
 <div className="space-y-2">
 <p className="text-sm font-medium">Cycle mode</p>
 {suggestCheckIn && (
 <p className="text-xs text-muted-foreground">
 It&apos;s been a while since your last cycle - a lighter check-in might feel right.
 </p>
 )}
 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => onChange("deep_dive")}
 className={cn(
 "rounded-xl border p-3 text-left text-sm transition-all",
 value === "deep_dive"
 ? "border-primary bg-primary/10 ring-1 ring-primary/30"
 : "border-border/60 hover:border-primary/30"
 )}
 >
 <span className="font-medium">Deep dive</span>
 <p className="mt-1 text-xs text-muted-foreground">
 {DEEP_DIVE_QUESTIONS} reflections · full exploration
 </p>
 </button>
 <button
 type="button"
 onClick={() => onChange("check_in")}
 className={cn(
 "rounded-xl border p-3 text-left text-sm transition-all",
 value === "check_in"
 ? "border-primary bg-primary/10 ring-1 ring-primary/30"
 : "border-border/60 hover:border-primary/30"
 )}
 >
 <div className="flex items-center gap-2">
 <span className="font-medium">Check-in</span>
 {suggestCheckIn && <Badge variant="secondary" className="text-[10px]">Suggested</Badge>}
 </div>
 <p className="mt-1 text-xs text-muted-foreground">
 {CHECK_IN_QUESTIONS} lighter questions · maintenance mode
 </p>
 </button>
 </div>
 </div>
 );
}
