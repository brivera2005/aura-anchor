"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function MarkBriefingRead({ briefingId }: { briefingId: string }) {
  const router = useRouter();

  async function markRead() {
    const supabase = createClient();
    await supabase
      .from("briefings")
      .update({ read_at: new Date().toISOString() })
      .eq("id", briefingId);
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={markRead}>
      Mark as read
    </Button>
  );
}
