"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";

/** Partner email is set during onboarding - redirect legacy URL to settings. */
export default function PartnerSlotPage() {
 const router = useRouter();

 useEffect(() => {
 router.replace("/settings");
 }, [router]);

 return (
 <AppShell>
 <div className="mx-auto max-w-lg py-24 text-center">
 <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
 <p className="mt-4 text-sm text-muted-foreground">
 Partner email is set during onboarding.{" "}
 <Link href="/settings" className="text-primary underline">
 Go to settings
 </Link>
 </p>
 </div>
 </AppShell>
 );
}
