"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSelectedRelationshipOptional } from "@/contexts/selected-relationship-context";
import { readSelectedRelationshipId } from "@/lib/selected-relationship-storage";

/** Ensures scoped pages have ?relationship= from context or localStorage. */
export function RelationshipParamRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ctx = useSelectedRelationshipOptional();

  useEffect(() => {
    const existing = searchParams.get("relationship");
    if (existing) return;

    const fromContext = ctx?.selectedId;
    const fromStorage = readSelectedRelationshipId();
    const id = fromContext || fromStorage || ctx?.relationships[0]?.id;

    if (id) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("relationship", id);
      router.replace(`${pathname}?${params.toString()}`);
      return;
    }

    if (ctx?.ready) {
      router.replace("/dashboard");
    }
  }, [ctx, pathname, router, searchParams]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
