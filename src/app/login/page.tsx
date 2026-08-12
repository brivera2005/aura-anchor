"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Anchor, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { capacitorAuthCallbackUrl, isCapacitorNative } from "@/lib/capacitor";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const error = searchParams.get("error");
  const errorDetails = searchParams.get("details");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setAuthError(null);
    const supabase = createClient();
    const appUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "");

    // Store post-login path in a cookie so redirectTo matches Supabase allow-list exactly.
    document.cookie = `auth-redirect=${encodeURIComponent(redirect)}; path=/; max-age=600; SameSite=Lax${
      window.location.protocol === "https:" ? "; Secure" : ""
    }`;

    const native = isCapacitorNative();
    const redirectTo = native ? capacitorAuthCallbackUrl() : `${appUrl}/auth/callback`;

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: native,
      },
    });

    if (!oauthError && native && data?.url) {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: data.url, presentationStyle: "popover" });
      setLoading(false);
      return;
    }

    if (oauthError) {
      setLoading(false);
      const providerDisabled =
        oauthError.message.toLowerCase().includes("not enabled") ||
        oauthError.message.toLowerCase().includes("unsupported provider");
      setAuthError(
        providerDisabled
          ? "Google sign-in is not enabled for this app yet. Enable Google under Supabase → Authentication → Providers, then try again."
          : oauthError.message
      );
    }
  }

  return (
    <div className="gradient-aura flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Heart className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="font-serif text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to continue your healing journey with Aura & Anchor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(error || authError) && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p>
                {authError ||
                  (error === "auth"
                    ? "Authentication failed. Please try again."
                    : "Something went wrong. Please try again.")}
              </p>
              {errorDetails && (
                <p className="mt-1 text-xs opacity-80">{decodeURIComponent(errorDetails)}</p>
              )}
            </div>
          )}
          <Button
            className="w-full"
            size="lg"
            onClick={signInWithGoogle}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our privacy-first approach. Your responses are encrypted.
          </p>
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <Anchor className="h-3 w-3" />
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="gradient-aura flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
