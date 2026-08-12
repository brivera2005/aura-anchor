"use client";

import { useEffect } from "react";
import { CycleReportView } from "@/components/cycle-report-view";
import type { CycleAnalysis } from "@/lib/types";

export function CycleReportExport({
  analysis,
  user1Name,
  user2Name,
  relationshipId,
}: {
  analysis: CycleAnalysis;
  user1Name: string;
  user2Name: string;
  relationshipId: string;
}) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="bg-background text-foreground min-h-screen p-6">
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg"
        >
          Save / Print report
        </button>
      </div>
      <CycleReportView
        analysis={analysis}
        user1Name={user1Name}
        user2Name={user2Name}
        relationshipId={relationshipId}
        backHref={`/relationship/${relationshipId}/cycle/${analysis.cycle_number}`}
        showExport={false}
      />
    </div>
  );
}
