import { createClient } from "@supabase/supabase-js";

import { getRequiredEnv, getSupabaseConfig } from "@/lib/env";

/** Server-only Supabase client that bypasses RLS (invite accept, reconciliation). */
export function createAdminClient() {
  const config = getSupabaseConfig();
  const serviceKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!config || !serviceKey) {
    throw new Error(
      "Supabase admin client not configured. Set SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(config.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hasAdminClient(): boolean {
  return !!getSupabaseConfig() && !!getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}
