# Aura & Anchor - Mobile (Capacitor)

Native iOS and Android apps wrap your **deployed web app** inside a Capacitor WebView. 
The Next.js app stays on Cloudflare (or any host); no React Native rewrite.

## Prerequisites

| Platform | Requirements |
|----------|--------------|
| **Both** | Node.js 20+, npm |
| **iOS** | macOS, Xcode 15+, Apple Developer account (for device/TestFlight) |
| **Android** | Android Studio, JDK 17 |

> **Path note:** The repo folder may be named `Aura & Anchor` (`&` breaks some webpack tooling). 
> Capacitor lives in `mobile/` and works from that subfolder. For Next.js deploys, use `scripts/build-deploy.ps1`.

## Quick start

```powershell
# From repo root
npm run mobile:setup # first time
npm run mobile:sync

# Open native IDEs
npm run mobile:ios # macOS + Xcode only
npm run mobile:android # Android Studio
```

Set your production URL before syncing:

```powershell
$env:CAPACITOR_SERVER_URL = "https://YOUR-DEPLOYED-URL"
$env:CAPACITOR_APP_HOST = "YOUR-DEPLOYED-URL" # Android app links (no https://)
npm run mobile:sync
```

## What the shell does

- Loads your deployed URL (`capacitor.config.ts` → `server.url`)
- Brand splash screen + status bar (`#faf8f6` light / `#1a1816` dark)
- Safe-area padding via `viewport-fit=cover` + `.capacitor-native` CSS
- Deep links: `auraanchor://auth/callback`, `/login`, `/accept-invite/[token]`

### Local dev against your machine

```powershell
$env:CAPACITOR_SERVER_URL = "http://10.0.2.2:3000" # Android emulator → host
cd mobile
npm run sync
```

iOS Simulator: use your Mac's LAN IP, e.g. `http://192.168.1.42:3000`.

## Build for stores

### iOS (Xcode)

1. `npm run mobile:sync`
2. `npm run mobile:ios` - opens `mobile/ios/App/App.xcworkspace`
3. Select a team under **Signing & Capabilities**
4. Product → Archive → Distribute

Bundle ID: `dev.auraanchor.app` 
URL scheme: `auraanchor`

### Android (Android Studio)

1. `npm run mobile:sync`
2. `npm run mobile:android` - opens `mobile/android`
3. Build → Generate Signed Bundle / APK

Application ID: `dev.auraanchor.app`

## Icons & splash

Source artwork: `public/icons/icon.svg` (copied to `mobile/resources/`).

Regenerate native assets after changing the icon:

```powershell
cd mobile
npm run icons
npm run sync
```

## OAuth (Google / Supabase) - important

Google **blocks OAuth inside embedded WebViews**. The app handles this automatically:

1. On native, **Continue with Google** opens the **system browser** (`@capacitor/browser`).
2. After sign-in, Supabase redirects to `auraanchor://auth/callback?code=…`
3. The app catches the deep link and navigates the WebView to `/auth/callback` to finish PKCE.

### Supabase dashboard

Add these **Redirect URLs** (Authentication → URL Configuration):

```
https://YOUR-DEPLOYED-URL/auth/callback
auraanchor://auth/callback
```

### Google Cloud Console

Authorized redirect URIs must include Supabase's callback (unchanged from web):

```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

## PWA (install without app store)

The web app ships `public/manifest.json` with standalone display. 
Users can “Add to Home Screen” from Safari/Chrome without the native shell.

## Scripts (repo root)

| Script | Action |
|--------|--------|
| `npm run mobile:setup` | Install mobile deps + add iOS/Android platforms |
| `npm run mobile:sync` | Icons, assets, cap sync, deep-link patches |
| `npm run mobile:ios` | Open Xcode |
| `npm run mobile:android` | Open Android Studio |
| `npm run mobile:doctor` | Run `cap doctor` |

## Deploy web changes

Mobile meta/layout changes require redeploying the web app. Capacitor-only changes do **not** need a redeploy.
