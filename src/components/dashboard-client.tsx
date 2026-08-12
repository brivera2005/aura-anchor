"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { NewConnectionCard, RelationshipCard } from "@/components/relationship-card";
import { Button } from "@/components/ui/button";
import type { RelationshipSummary } from "@/lib/relationship-data";

interface DashboardData {
  profile: { name?: string | null } | null;
  relationships: RelationshipSummary[];
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/relationships/list");
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = "/login";
            return;
          }
          throw new Error("Failed to load connections");
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const firstName = data.profile?.name?.split(" ")[0] || "friend";
  const activeCount = data.relationships.filter((r) => r.phase === "active_loop").length;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Hello, {firstName}</h1>
          <p className="mt-1 text-muted-foreground">
            {data.relationships.length === 0
              ? "Start healing a relationship that matters to you"
              : activeCount > 0
                ? `${data.relationships.length} connection${data.relationships.length === 1 ? "" : "s"} · ${activeCount} active healing loop${activeCount === 1 ? "" : "s"}`
                : `${data.relationships.length} connection${data.relationships.length === 1 ? "" : "s"} in progress`}
          </p>
        </div>
        {data.relationships.length > 0 && (
          <Button asChild size="sm">
            <Link href="/connection/new">
              <Plus className="h-4 w-4" />
              New connection
            </Link>
          </Button>
        )}
      </div>

      {data.relationships.length === 0 ? (
        <NewConnectionCard />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.relationships.map((summary) => (
            <RelationshipCard key={summary.relationship.id} summary={summary} />
          ))}
          <NewConnectionCard />
        </div>
      )}
    </div>
  );
}
