"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

function getAuthRedirect(): string {
 const match = document.cookie.match(/(?:^|;\s*)auth-redirect=([^;]*)/);
 if (match) {
 const value = decodeURIComponent(match[1]);
 if (value.startsWith("/") && !value.startsWith("//")) return value;
 }
 return "/dashboard";
}

function clearAuthRedirectCookie() {
 document.cookie = "auth-redirect=; path=/; max-age=0";
}

function AuthCallbackHandler() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const started = useRef(false);

 useEffect(() => {
 if (started.current) return;
 started.current = true;

 async function handleCallback() {
 const oauthError = searchParams.get("error");
 if (oauthError) {
 const desc = searchParams.get("error_description") || oauthError;
 console.error("OAuth callback error:", desc);
 router.replace(`/login?error=auth&details=${encodeURIComponent(desc)}`);
 return;
 }

 const code = searchParams.get("code");
 if (!code) {
 console.error("Auth callback: missing code parameter");
 router.replace("/login?error=auth&details=missing_code");
 return;
 }

 const redirect = getAuthRedirect();
 const supabase = createClient();

 // Browser client must exchange the code - it holds the PKCE verifier cookie
 // set during signInWithOAuth. Server route handlers on Cloudflare Workers
 // cannot reliably read that cookie (open-next / edge SSR limitation).
 const { error } = await supabase.auth.exchangeCodeForSession(code);

 if (error) {
 console.error("exchangeCodeForSession failed:", error.message);
 router.replace(`/login?error=auth&details=${encodeURIComponent(error.message)}`);
 return;
 }

 clearAuthRedirectCookie();
 router.replace(redirect);
 }

 void handleCallback();
 }, [router, searchParams]);

 return (
 <div className="gradient-aura flex min-h-screen items-center justify-center">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 </div>
 );
}

export default function AuthCallbackPage() {
 return (
 <Suspense
 fallback={
 <div className="gradient-aura flex min-h-screen items-center justify-center">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 </div>
 }
 >
 <AuthCallbackHandler />
 </Suspense>
 );
}
