"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Anchor, Check, Heart, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [status, setStatus] = useState<"loading" | "auth_needed" | "accepting" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [alreadyLinked, setAlreadyLinked] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatus("auth_needed");
        return;
      }

      setStatus("accepting");
      try {
        const res = await fetch("/api/invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to accept invite");

        setRelationshipId(data.relationshipId);
        setAlreadyLinked(!!data.alreadyLinked);
        setStatus("success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStatus("error");
      }
    }

    checkAuth();
  }, [token]);

  async function signInAndAccept() {
    const supabase = createClient();
    const appUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "");

    document.cookie = `auth-redirect=${encodeURIComponent(`/accept-invite/${token}`)}; path=/; max-age=600; SameSite=Lax${
      window.location.protocol === "https:" ? "; Secure" : ""
    }`;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${appUrl}/auth/callback`,
      },
    });
  }

  return (
    <div className="gradient-aura flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Heart className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="font-serif text-2xl">Accept invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to heal together on Aura & Anchor
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {(status === "loading" || status === "accepting") && (
            <div className="py-8">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                {status === "loading" ? "Checking invitation..." : "Connecting your accounts..."}
              </p>
            </div>
          )}

          {status === "auth_needed" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sign in with the email address the invite was sent to
              </p>
              <Button className="w-full" onClick={signInAndAccept}>
                Sign in with Google
              </Button>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-500/10 p-6">
                <Check className="mx-auto mb-2 h-10 w-10 text-emerald-600" />
                <p className="font-medium">
                  {alreadyLinked ? "You're already connected!" : "You're connected!"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {alreadyLinked
                    ? "This invite was already accepted. Head to your dashboard to continue."
                    : "Complete onboarding to begin your healing journey"}
                </p>
              </div>
              {alreadyLinked ? (
                <Button className="w-full" onClick={() => router.push("/dashboard")}>
                  Go to dashboard
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() =>
                    router.push(
                      relationshipId
                        ? `/onboarding?relationship=${relationshipId}`
                        : "/onboarding"
                    )
                  }
                >
                  Start onboarding
                </Button>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-destructive/10 p-6">
                <X className="mx-auto mb-2 h-10 w-10 text-destructive" />
                <p className="font-medium">Unable to accept invite</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  <Anchor className="h-4 w-4" />
                  Go to dashboard
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
