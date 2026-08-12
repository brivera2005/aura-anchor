import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getEnvStatus } from "@/lib/env";

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const sbCookies = allCookies.filter((c) => c.name.startsWith("sb-"));

  return NextResponse.json({
    env: getEnvStatus(),
    cookieCount: allCookies.length,
    sbCookieNames: sbCookies.map((c) => c.name),
    hasPkceVerifierCookie: allCookies.some((c) => c.name.includes("code-verifier")),
    timestamp: new Date().toISOString(),
  });
}
