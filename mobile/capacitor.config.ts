import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Production web app URL loaded inside the native WebView.
 * Override for local dev: CAPACITOR_SERVER_URL=http://10.0.2.2:3000 npm run sync
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

const config: CapacitorConfig = {
  appId: "dev.auraanchor.app",
  appName: "Aura & Anchor",
  webDir: "www",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#faf8f6",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#faf8f6",
    },
  },
  ios: {
    scheme: "AuraAnchor",
    contentInset: "automatic",
    backgroundColor: "#faf8f6",
  },
  android: {
    backgroundColor: "#faf8f6",
    allowMixedContent: false,
  },
};

export default config;
