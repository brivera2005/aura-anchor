"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface PartnerSlotBannerData {
 email: string | null;
 locked: boolean;
 requiresSetup: boolean;
}

export function PartnerSlotBanner() {
 const [slot, setSlot] = useState<PartnerSlotBannerData | null>(null);

 useEffect(() => {
 fetch("/api/partner-slot")
 .then((res) => (res.ok ? res.json() : null))
 .then((data) => {
 if (data && !data.locked) {
 setSlot(data);
 }
 })
 .catch(() => {});
 }, []);

 if (!slot) return null;

 return (
 <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
 <p className="flex items-center gap-2 font-medium">
 <AlertTriangle className="h-4 w-4" />
 Set your included partner email to send invites
 </p>
 <p className="mt-1 text-muted-foreground">
 Complete onboarding for a connection - your partner email locks permanently on confirm.
 </p>
 <Link href="/connection/new" className="mt-2 inline-block text-primary underline">
 Start or continue onboarding
 </Link>
 </div>
 );
}
