"use client";

import type { CycleHistoryItem } from "@/lib/cycle-history";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

export function CyclesTimeline({
  cycles,
  className,
}: {
  cycles: CycleHistoryItem[];
  className?: string;
}) {
  if (cycles.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      {/* Desktop horizontal timeline */}
      <div className="hidden sm:flex sm:items-start sm:gap-0">
        {cycles.map((cycle, i) => (
          <div key={cycle.cycleNumber} className="relative flex flex-1 flex-col items-center">
            {i > 0 && (
              <div
                className={cn(
                  "absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2",
                  cycles[i - 1].inProgress ? "bg-muted" : "bg-primary/40"
                )}
                style={{ left: "-50%" }}
              />
            )}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                cycle.inProgress
                  ? "border-primary bg-primary/20 animate-pulse"
                  : "border-primary bg-primary text-primary-foreground"
              )}
            >
              {cycle.inProgress ? (
                <Circle className="h-4 w-4 text-primary" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </div>
            <p className="mt-2 text-center text-xs font-medium">Cycle {cycle.cycleNumber}</p>
            <p className="mt-0.5 max-w-[80px] text-center text-[10px] text-muted-foreground line-clamp-2">
              {cycle.inProgress ? "In progress" : "Complete"}
            </p>
          </div>
        ))}
      </div>

      {/* Mobile vertical timeline */}
      <div className="space-y-0 sm:hidden">
        {cycles.map((cycle, i) => (
          <div key={cycle.cycleNumber} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border-2",
                  cycle.inProgress
                    ? "border-primary bg-primary/20"
                    : "border-primary bg-primary text-primary-foreground"
                )}
              >
                {cycle.inProgress ? (
                  <Circle className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
              </div>
              {i < cycles.length - 1 && (
                <div className="my-1 w-0.5 flex-1 min-h-[24px] bg-primary/30" />
              )}
            </div>
            <div className="pb-4 pt-0.5">
              <p className="text-sm font-medium">Cycle {cycle.cycleNumber}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{cycle.summary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
