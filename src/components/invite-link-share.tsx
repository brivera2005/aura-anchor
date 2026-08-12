"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Mail, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InviteLinkShareProps {
 inviteLink: string;
 partnerEmail?: string;
 emailSent?: boolean;
 emailConfigured?: boolean;
 inviteId?: string;
 variant?: "default" | "prominent";
}

export function InviteLinkShare({
 inviteLink,
 partnerEmail,
 emailSent,
 emailConfigured,
 inviteId,
 variant = "default",
}: InviteLinkShareProps) {
 const [copied, setCopied] = useState(false);
 const [resending, setResending] = useState(false);
 const [resendStatus, setResendStatus] = useState<"idle" | "sent" | "error">("idle");
 const [canShare] = useState(
 () => typeof navigator !== "undefined" && !!navigator.share
 );

 async function copyLink() {
 await navigator.clipboard.writeText(inviteLink);
 setCopied(true);
 setTimeout(() => setCopied(false), 2500);
 }

 async function shareLink() {
 if (!navigator.share) {
 await copyLink();
 return;
 }
 try {
 await navigator.share({
 title: "Join me on Aura & Anchor",
 text: partnerEmail
 ? `I'd love to heal together on Aura & Anchor.`
 : "Join me on Aura & Anchor - a healing space for us.",
 url: inviteLink,
 });
 } catch {
 // User cancelled share sheet
 }
 }

 async function resendEmail() {
 setResending(true);
 setResendStatus("idle");
 try {
 const res = await fetch("/api/invites/resend", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(inviteId ? { inviteId } : {}),
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data.error || "Failed to resend");
 setResendStatus(data.emailSent ? "sent" : "error");
 } catch {
 setResendStatus("error");
 } finally {
 setResending(false);
 }
 }

 const isProminent = variant === "prominent";

 return (
 <div className="space-y-4">
 <div
 className={
 isProminent
 ? "rounded-2xl border-2 border-primary/30 bg-primary/5 p-5"
 : "space-y-2"
 }
 >
 {isProminent && (
 <p className="mb-3 text-sm font-medium text-foreground">
 Share this link with {partnerEmail || "your partner"}
 </p>
 )}
 {!isProminent && (
 <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
 Invite link
 </p>
 )}
 <div
 className={
 isProminent
 ? "break-all rounded-xl bg-background p-4 font-mono text-sm leading-relaxed select-all"
 : "flex gap-2"
 }
 >
 {isProminent ? (
 inviteLink
 ) : (
 <Input value={inviteLink} readOnly className="text-xs" />
 )}
 </div>
 <div className="mt-3 flex flex-wrap gap-2">
 <Button
 type="button"
 className={isProminent ? "flex-1 sm:flex-none" : ""}
 size={isProminent ? "lg" : "default"}
 onClick={copyLink}
 >
 {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
 {copied ? "Copied!" : "Copy link"}
 </Button>
 {canShare && (
 <Button
 type="button"
 variant="outline"
 size={isProminent ? "lg" : "default"}
 onClick={shareLink}
 >
 <Share2 className="h-4 w-4" />
 Share
 </Button>
 )}
 {emailConfigured && (
 <Button
 type="button"
 variant="outline"
 size={isProminent ? "lg" : "sm"}
 onClick={resendEmail}
 disabled={resending}
 >
 {resending ? (
 <Loader2 className="h-4 w-4 animate-spin" />
 ) : (
 <Mail className="h-4 w-4" />
 )}
 {resendStatus === "sent" ? "Email sent!" : "Resend email"}
 </Button>
 )}
 </div>
 </div>

 <div className="space-y-1 text-xs text-muted-foreground">
 {emailSent ? (
 <p>
 We emailed {partnerEmail}. It may take a few minutes - or copy the link above
 and text it directly for the fastest delivery.
 </p>
 ) : emailConfigured ? (
 <p>
 Email delivery had an issue - copy the link above and text or iMessage it
 directly. That&apos;s the fastest way to reach {partnerEmail || "them"}.
 </p>
 ) : (
 <p>
 <strong className="text-foreground">Copy the link above</strong> and text or
 iMessage it to {partnerEmail || "your partner"}. That&apos;s the fastest way to
 invite them.
 </p>
 )}
 <p>Link expires in 7 days. They must sign in with the invited email address.</p>
 </div>
 </div>
 );
}
