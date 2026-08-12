"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Heart, Plus, Users } from "lucide-react";
import { useSelectedRelationship } from "@/contexts/selected-relationship-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PHASE_SHORT: Record<string, string> = {
  needs_onboarding: "Onboarding",
  needs_invite: "Setup",
  waiting_for_partner: "Invited",
  partner_needs_onboarding: "Waiting",
  ready_for_analysis: "Ready",
  active_loop: "Active",
};

export function RelationshipSessionSwitcher() {
  const { relationships, selected, selectedId, ready, selectRelationship } =
    useSelectedRelationship();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!ready) {
    return (
      <div className="hidden h-9 w-40 animate-pulse rounded-lg bg-muted/60 sm:block" />
    );
  }

  if (relationships.length === 0) {
    return (
      <Button asChild size="sm" variant="outline" className="hidden sm:flex">
        <Link href="/connection/new">
          <Plus className="h-4 w-4" />
          New connection
        </Link>
      </Button>
    );
  }

  const label = selected
    ? `${selected.displayName} · ${selected.typeLabel}`
    : "Select connection";

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex max-w-[220px] items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted/50",
          open && "border-primary/40 bg-primary/5"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Users className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">
          <span className="text-muted-foreground">Working on: </span>
          <span className="font-medium">{label}</span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border/60 bg-background shadow-lg"
          role="listbox"
        >
          <div className="border-b border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground">
            Your connections
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {relationships.map((rel) => {
              const isActive = rel.id === selectedId;
              return (
                <li key={rel.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      setOpen(false);
                      selectRelationship(rel.id, "loop");
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50",
                      isActive && "bg-primary/5"
                    )}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Heart className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{rel.displayName}</p>
                      <p className="text-xs text-muted-foreground">{rel.typeLabel}</p>
                      {rel.phase === "active_loop" && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          You {rel.myAnswers}/{rel.questionsPerCycle} · Them{" "}
                          {rel.partnerAnswers}/{rel.questionsPerCycle}
                        </p>
                      )}
                    </div>
                    <Badge variant={isActive ? "default" : "secondary"} className="shrink-0 text-[10px]">
                      {PHASE_SHORT[rel.phase] ?? rel.status}
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border/60 p-2">
            <Button asChild variant="ghost" size="sm" className="w-full justify-start">
              <Link href="/connection/new" onClick={() => setOpen(false)}>
                <Plus className="h-4 w-4" />
                New connection
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <Link href="/dashboard" onClick={() => setOpen(false)}>
                All connections
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
