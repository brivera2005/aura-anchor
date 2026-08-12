"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PrecycleNoteCard({
  relationshipId,
  cycleNumber,
}: {
  relationshipId: string;
  cycleNumber: number;
}) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/relationship/${relationshipId}/precycle-note?cycle=${cycleNumber}`
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.note) setNote(data.note);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [relationshipId, cycleNumber]);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/relationship/${relationshipId}/precycle-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleNumber, note }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Lock className="h-4 w-4 text-muted-foreground" />
        Private focus note
        <span className="text-xs font-normal text-muted-foreground">(only you see this)</span>
      </div>
      <Label htmlFor="precycle-note" className="sr-only">
        What do you want to focus on this cycle?
      </Label>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <>
          <Textarea
            id="precycle-note"
            placeholder="What do you want to focus on this cycle?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save note"}
            </Button>
            {saved && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
