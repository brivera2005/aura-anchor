"use client";



import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Heart, Loader2, RefreshCw } from "lucide-react";

import { InviteLinkShare } from "@/components/invite-link-share";

import { RelationshipProgressSteps } from "@/components/relationship-progress-steps";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";



export function WaitingForPartnerPanel({

 relationshipId,

 inviteLink: initialLink,

 partnerEmail,

 inviteId,

 emailConfigured,

}: {

 relationshipId: string;

 inviteLink: string | null;

 partnerEmail?: string | null;

 inviteId?: string | null;

 emailConfigured?: boolean;

}) {

 const router = useRouter();

 const [inviteLink, setInviteLink] = useState(initialLink);

 const [polling, setPolling] = useState(false);

 const [reconciling, setReconciling] = useState(false);

 const [reconcileMessage, setReconcileMessage] = useState<string | null>(null);



 useEffect(() => {

 const interval = setInterval(async () => {

 setPolling(true);

 try {

 const res = await fetch(`/api/relationship/${relationshipId}/status`);

 if (!res.ok) return;

 const data = await res.json();

 if (data.inviteLink) setInviteLink(data.inviteLink);

 if (data.phase !== "waiting_for_partner") {

 router.refresh();

 }

 } finally {

 setPolling(false);

 }

 }, 30000);



 return () => clearInterval(interval);

 }, [relationshipId, router]);



 async function tryReconcile() {

 setReconciling(true);

 setReconcileMessage(null);

 try {

 const res = await fetch("/api/relationships/reconcile", { method: "POST" });

 const data = await res.json();

 if (data.fixed) {

 router.refresh();

 return;

 }

 setReconcileMessage(

 "Still waiting - make sure your partner signed in with the invited email and completed onboarding."

 );

 } catch {

 setReconcileMessage("Could not check link status. Try again in a moment.");

 } finally {

 setReconciling(false);

 }

 }



 const steps = [

 { label: "You completed onboarding", done: true },

 { label: "Partner joins via invite", done: false, active: true },

 { label: "Deep analysis together", done: false },

 { label: "Healing loop begins", done: false },

 ];



 return (

 <Card className="border-primary/25 bg-primary/5 overflow-hidden">

 <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40 animate-shimmer" />

 <CardHeader>

 <CardTitle className="flex items-center gap-2">

 <Heart className="h-5 w-5 text-primary animate-pulse-soft" />

 Waiting for your partner

 </CardTitle>

 <CardDescription>

 {partnerEmail

 ? `Invite created for ${partnerEmail}. Copy the link below and text it - that's the fastest way.`

 : "Share your invite link so they can join your healing space."}

 </CardDescription>

 </CardHeader>

 <CardContent className="space-y-6">

 <RelationshipProgressSteps steps={steps} />



 {inviteLink ? (

 <InviteLinkShare

 inviteLink={inviteLink}

 partnerEmail={partnerEmail ?? undefined}

 emailConfigured={emailConfigured}

 inviteId={inviteId ?? undefined}

 variant="prominent"

 />

 ) : (

 <p className="text-sm text-muted-foreground">

 Loading invite link…

 </p>

 )}



 <div className="flex flex-wrap gap-2">

 <Button variant="outline" size="sm" onClick={() => router.refresh()}>

 <RefreshCw className={polling ? "h-4 w-4 animate-spin" : "h-4 w-4"} />

 Check now

 </Button>

 <Button

 variant="secondary"

 size="sm"

 onClick={tryReconcile}

 disabled={reconciling}

 >

 {reconciling ? (

 <Loader2 className="h-4 w-4 animate-spin" />

 ) : (

 <RefreshCw className="h-4 w-4" />

 )}

 We&apos;ve both joined

 </Button>

 </div>



 {reconcileMessage && (

 <p className="text-xs text-muted-foreground">{reconcileMessage}</p>

 )}



 <p className="flex items-center gap-2 text-xs text-muted-foreground">

 <Loader2 className="h-3 w-3 animate-spin" />

 Checking for updates every 30 seconds

 </p>

 </CardContent>

 </Card>

 );

}

