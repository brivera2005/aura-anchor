"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function HealingLoopPoller({
  relationshipId,
  enabled = true,
}: {
  relationshipId: string;
  enabled?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/relationship/${relationshipId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.pendingQuestion || data.phase === "active_loop") {
          router.refresh();
        }
      } catch {
        // ignore polling errors
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [relationshipId, enabled, router]);

  return null;
}
