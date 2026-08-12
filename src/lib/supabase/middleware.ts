import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/env";
import { isStripeConfigured } from "@/lib/stripe";
import { userHasSubscriptionAccess } from "@/lib/subscription";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip Supabase session refresh on fully public pages to reduce worker CPU/subrequests.
  if (pathname === "/" || pathname.startsWith("/accept-invite/")) {
    return NextResponse.next({ request });
  }

  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedPaths = [
    "/dashboard",
    "/onboarding",
    "/invite",
    "/connection",
    "/relationship",
    "/question",
    "/briefings",
    "/insights",
    "/settings",
    "/subscribe",
    "/partner-slot",
  ];

  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const subscriptionGatedPaths = [
    "/dashboard",
    "/relationship",
    "/question",
    "/briefings",
    "/insights",
  ];

  const subscriptionExemptPaths = [
    "/subscribe",
    "/settings",
    "/onboarding",
    "/connection",
    "/invite",
    "/accept-invite",
    "/partner-slot",
  ];

  const needsSubscription =
    isStripeConfigured() &&
    user &&
    subscriptionGatedPaths.some((path) => pathname.startsWith(path)) &&
    !subscriptionExemptPaths.some((path) => pathname.startsWith(path));

  if (needsSubscription) {
    const hasAccess = await userHasSubscriptionAccess(
      supabase,
      user.id,
      user.email
    );
    if (!hasAccess) {
      const url = request.nextUrl.clone();
      url.pathname = "/subscribe";
      return NextResponse.redirect(url);
    }
  }

  if (
    isStripeConfigured() &&
    user &&
    pathname === "/subscribe"
  ) {
    const hasAccess = await userHasSubscriptionAccess(
      supabase,
      user.id,
      user.email
    );
    if (hasAccess) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
