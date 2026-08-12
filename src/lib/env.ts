function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return false;
  }
}

/** Base app URL for invite links, auth redirects, and emails. Never returns localhost in production. */
export function getAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (fromEnv && (!isProd || !isLocalhostUrl(fromEnv))) {
    return fromEnv.replace(/\/$/, "");
  }

  if (isProd && fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  return fromEnv?.replace(/\/$/, "") || "http://localhost:3000";
}

export function getRequiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value || value === "placeholder" || value.includes("placeholder")) {
    return null;
  }
  if (name === "SUPABASE_SERVICE_ROLE_KEY" && !isValidServiceRoleKey(value)) {
    return null;
  }
  return value;
}

function isValidServiceRoleKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  if (key.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(
        Buffer.from(key.split(".")[1], "base64url").toString("utf8")
      ) as { role?: string };
      return payload.role === "service_role";
    } catch {
      return false;
    }
  }
  return false;
}
export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function getGeminiApiKey(): string | null {
  return (
    getRequiredEnv("GOOGLE_AI_API_KEY") ?? getRequiredEnv("GEMINI_API_KEY")
  );
}

export function getAIProvider(): "gemini" | "openai" | "mock" {
  if (getGeminiApiKey()) return "gemini";
  if (getRequiredEnv("OPENAI_API_KEY")) return "openai";
  return "mock";
}

export function isInviteEmailConfigured(): boolean {
  return !!(
    getRequiredEnv("RESEND_API_KEY") ||
    getRequiredEnv("SENDGRID_API_KEY") ||
    getRequiredEnv("SMTP_HOST")
  );
}

export function getEnvStatus() {
  return {
    supabase: !!getSupabaseConfig(),
    encryption: hasEncryptionKey(),
    aiProvider: getAIProvider(),
    gemini: !!getGeminiApiKey(),
    openai: !!getRequiredEnv("OPENAI_API_KEY"),
    appUrl: getAppUrl(),
    emailConfigured: !!getRequiredEnv("RESEND_API_KEY"),
    stripe: !!(
      getRequiredEnv("STRIPE_SECRET_KEY") &&
      getRequiredEnv("STRIPE_PRICE_ID")
    ),
  };
}

export function hasEncryptionKey(): boolean {
  const key = process.env.ENCRYPTION_KEY;
  return !!key && key.length === 64 && !key.startsWith("0123456789abcdef0123456789abcdef");
}
