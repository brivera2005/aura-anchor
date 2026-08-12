"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  CAPACITOR_AUTH_SCHEME,
  isCapacitorNative,
  nativeDeepLinkToPath,
} from "@/lib/capacitor";

/**
 * Native-only bootstrap: safe areas, status bar, splash screen, OAuth deep links.
 */
export function CapacitorInit() {
  const router = useRouter();

  useEffect(() => {
    if (!isCapacitorNative()) return;

    document.documentElement.classList.add("capacitor-native");
    document.body.classList.add("capacitor-native");

    let cancelled = false;
    let removeListener: (() => void) | undefined;

    async function initNative() {
      try {
        const [{ StatusBar, Style }, { App }, { Browser }, { SplashScreen }] =
          await Promise.all([
            import("@capacitor/status-bar"),
            import("@capacitor/app"),
            import("@capacitor/browser"),
            import("@capacitor/splash-screen"),
          ]);

        if (cancelled) return;

        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        try {
          await StatusBar.setStyle({ style: prefersDark ? Style.Dark : Style.Light });
          await StatusBar.setBackgroundColor({
            color: prefersDark ? "#1a1816" : "#faf8f6",
          });
        } catch {
          // Status bar APIs vary by platform/version.
        }

        const handleOpenUrl = async (url: string) => {
          try {
            await Browser.close();
          } catch {
            // Browser may already be closed.
          }

          const path = nativeDeepLinkToPath(url, window.location.origin);
          if (path) {
            router.replace(path);
            return;
          }

          if (url.startsWith(`${CAPACITOR_AUTH_SCHEME}://`)) {
            const rest = url.slice(`${CAPACITOR_AUTH_SCHEME}://`.length);
            window.location.href = `${window.location.origin}/${rest}`;
          }
        };

        const launch = await App.getLaunchUrl();
        if (launch?.url) {
          await handleOpenUrl(launch.url);
        }

        const listener = await App.addListener("appUrlOpen", ({ url }) => {
          void handleOpenUrl(url);
        });
        removeListener = () => {
          void listener.remove();
        };

        await SplashScreen.hide();
      } catch (err) {
        console.warn("Capacitor init skipped:", err);
      }
    }

    void initNative();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [router]);

  return null;
}
