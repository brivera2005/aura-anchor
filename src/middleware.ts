import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
 return updateSession(request);
}

export const config = {
 matcher: [
 // Skip auth/callback - middleware session refresh can strip PKCE verifier cookies
 "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|auth/callback|api/health|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
 ],
};
