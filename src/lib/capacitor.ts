/** True when running inside the Capacitor native shell (iOS/Android). */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() ?? false;
}

/** Custom URL scheme registered in the native projects for OAuth deep links. */
export const NATIVE_AUTH_SCHEME = "auraanchor";
export const CAPACITOR_AUTH_SCHEME = NATIVE_AUTH_SCHEME;
export const NATIVE_AUTH_CALLBACK = `${NATIVE_AUTH_SCHEME}://auth/callback`;

export function capacitorAuthCallbackUrl(): string {
  return NATIVE_AUTH_CALLBACK;
}

/** Map native deep-link URLs back to in-app paths on the production origin. */
export function nativeDeepLinkToPath(url: string, webOrigin: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === `${NATIVE_AUTH_SCHEME}:`) {
      const path = parsed.pathname.replace(/^\/+/, "");
      const query = parsed.search;
      if (path === "auth/callback" || path.startsWith("auth/callback")) {
        return `/auth/callback${query}`;
      }
      if (path === "login" || path.startsWith("login")) {
        return `/login${query}`;
      }
      const acceptMatch = path.match(/^accept-invite\/(.+)$/);
      if (acceptMatch) {
        return `/accept-invite/${acceptMatch[1]}${query}`;
      }
      return `/${path}${query}`;
    }
    if (parsed.origin === webOrigin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return null;
  }
  return null;
}

/** OAuth redirect target: custom scheme on native, HTTPS on web. */
export function authCallbackRedirect(appUrl: string): string {
  if (isCapacitorNative()) {
    return NATIVE_AUTH_CALLBACK;
  }
  return `${appUrl.replace(/\/$/, "")}/auth/callback`;
}
