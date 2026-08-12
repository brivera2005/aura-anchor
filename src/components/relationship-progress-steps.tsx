import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProgressStep {
  label: string;
  done: boolean;
  active?: boolean;
}

export function RelationshipProgressSteps({ steps }: { steps: ProgressStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={step.label} className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
              step.done
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : step.active
                  ? "border-primary bg-primary/15 text-primary animate-pulse-soft"
                  : "border-border bg-muted text-muted-foreground"
            )}
          >
            {step.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <div className="pt-0.5">
            <p
              className={cn(
                "text-sm font-medium",
                step.active && !step.done && "text-primary",
                !step.done && !step.active && "text-muted-foreground"
              )}
            >
              {step.label}
            </p>
            {step.active && !step.done && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Circle className="h-2 w-2 fill-primary text-primary animate-pulse-soft" />
                In progress
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
