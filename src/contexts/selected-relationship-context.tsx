"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  readSelectedRelationshipId,
  writeSelectedRelationshipId,
} from "@/lib/selected-relationship-storage";
import type { RelationshipPhase } from "@/lib/relationship-phase";
import type { RelationshipType } from "@/lib/types";

export interface RelationshipListItem {
  id: string;
  type: RelationshipType;
  relationship_subtype?: string | null;
  connection_name?: string | null;
  status: string;
  displayName: string;
  typeLabel: string;
  phase: RelationshipPhase;
  cycleNumber: number;
  myAnswers: number;
  partnerAnswers: number;
  questionsPerCycle: number;
}

interface SelectedRelationshipContextValue {
  relationships: RelationshipListItem[];
  selectedId: string | null;
  selected: RelationshipListItem | null;
  ready: boolean;
  selectRelationship: (id: string, navigateTo?: "loop" | "stay" | "dashboard") => void;
  refresh: () => Promise<void>;
  healingLoopHref: string;
  insightsHref: string;
  briefingsHref: string;
  cyclesHref: string;
}

const SelectedRelationshipContext =
  createContext<SelectedRelationshipContextValue | null>(null);

export function SelectedRelationshipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [relationships, setRelationships] = useState<RelationshipListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/relationships/list");
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.relationships || []) as RelationshipListItem[];
      setRelationships(list);

      const fromStorage = readSelectedRelationshipId();
      const fromUrl = pathname.match(/\/relationship\/([^/]+)/)?.[1] ?? null;
      const validIds = new Set(list.map((r) => r.id));

      let nextId: string | null = null;
      if (fromUrl && validIds.has(fromUrl)) {
        nextId = fromUrl;
      } else if (fromStorage && validIds.has(fromStorage)) {
        nextId = fromStorage;
      } else if (list.length > 0) {
        nextId = list[0].id;
      }

      if (nextId) {
        setSelectedId(nextId);
        writeSelectedRelationshipId(nextId);
      } else {
        setSelectedId(null);
      }
    } finally {
      setReady(true);
    }
  }, [pathname]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const match = pathname.match(/\/relationship\/([^/]+)/);
    if (!match) return;
    const id = match[1];
    if (id && id !== selectedId) {
      setSelectedId(id);
      writeSelectedRelationshipId(id);
    }
  }, [pathname, selectedId]);

  const selectRelationship = useCallback(
    (id: string, navigateTo: "loop" | "stay" | "dashboard" = "loop") => {
      setSelectedId(id);
      writeSelectedRelationshipId(id);
      if (navigateTo === "loop") {
        router.push(`/relationship/${id}/loop`);
      } else if (navigateTo === "dashboard") {
        router.push("/dashboard");
      }
    },
    [router]
  );

  const selected = useMemo(
    () => relationships.find((r) => r.id === selectedId) ?? null,
    [relationships, selectedId]
  );

  const healingLoopHref = selectedId
    ? `/relationship/${selectedId}/loop`
    : "/dashboard";

  const insightsHref = selectedId
    ? `/insights?relationship=${selectedId}`
    : "/insights";

  const briefingsHref = selectedId
    ? `/briefings?relationship=${selectedId}`
    : "/briefings";

  const cyclesHref = selectedId
    ? `/relationship/${selectedId}/cycles`
    : "/dashboard";

  const value = useMemo(
    () => ({
      relationships,
      selectedId,
      selected,
      ready,
      selectRelationship,
      refresh,
      healingLoopHref,
      insightsHref,
      briefingsHref,
      cyclesHref,
    }),
    [
      relationships,
      selectedId,
      selected,
      ready,
      selectRelationship,
      refresh,
      healingLoopHref,
      insightsHref,
      briefingsHref,
      cyclesHref,
    ]
  );

  return (
    <SelectedRelationshipContext.Provider value={value}>
      {children}
    </SelectedRelationshipContext.Provider>
  );
}

export function useSelectedRelationship() {
  const ctx = useContext(SelectedRelationshipContext);
  if (!ctx) {
    throw new Error(
      "useSelectedRelationship must be used within SelectedRelationshipProvider"
    );
  }
  return ctx;
}

export function useSelectedRelationshipOptional() {
  return useContext(SelectedRelationshipContext);
}
