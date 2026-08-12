import { NextResponse } from "next/server";
import { getEnvStatus } from "@/lib/env";

export async function GET() {
  const status = getEnvStatus();
  const ready = status.supabase && status.encryption;

  return NextResponse.json(
    {
      status: ready ? "ok" : "misconfigured",
      checks: status,
    },
    { status: ready ? 200 : 503 }
  );
}
