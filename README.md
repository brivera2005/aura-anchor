# Aura & Anchor

A compassionate, AI-powered relationship healing app where two people connect via invite link, complete onboarding, and receive personalized questions, briefings, and insights that bridge perception gaps.

**Repository:** [github.com/brivera2005/aura-anchor](https://github.com/brivera2005/aura-anchor)

## Core features

- **Google OAuth** via Supabase Auth
- **Partner linking** with secure invite links
- **Multi-step onboarding** with encrypted responses (AES-256-GCM)
- **AI analysis** after both partners complete onboarding (Gemini preferred, OpenAI fallback, mock mode without keys)
- **Question → briefing loop** - answer → AI briefing (WHY / HOW / WHAT) to partner → next question
- **Dashboard** - pending question, unread briefings, healing progress
- **Stripe subscriptions** - monthly, annual, or lifetime
- **Native mobile apps** - iOS & Android via Capacitor (see [MOBILE.md](./MOBILE.md))
- **Dark/light mode**, mobile-first UI

## Tech stack

- Next.js 16 (App Router, **webpack build** for Cloudflare) + React 19 + TypeScript
- Supabase (PostgreSQL, Auth, RLS)
- Stripe (Checkout, Customer Portal, webhooks)
- Google Gemini or OpenAI (optional - mock AI if no key)
- Tailwind CSS v4
- Deployed on **Cloudflare Workers** via `@opennextjs/cloudflare`
- **Capacitor 7** for iOS/Android native shells

---

## Quick start (local dev)

### 1. Clone and install

```powershell
git clone https://github.com/brivera2005/aura-anchor.git
cd aura-anchor
npm install
```

### 2. Environment

```powershell
cp .env.example .env.local
```

Fill in at minimum:

| Variable | Where to get it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page (anon/public key) |
| `ENCRYPTION_KEY` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

Optional: `GOOGLE_AI_API_KEY`, `OPENAI_API_KEY`, Stripe keys, `RESEND_API_KEY`. Without AI keys the app uses **mock AI** so you can explore the full UI flow.

### 3. Supabase database

1. Create a project at [supabase.com](https://supabase.com)
2. **SQL Editor** → run migrations in order from `supabase/migrations/` (start with `001_schema.sql`)
3. **Authentication → Providers** → enable **Google**
4. **Authentication → URL Configuration** → add redirect URLs:
 - `http://localhost:3000/auth/callback`
 - `https://YOUR-DEPLOYED-URL/auth/callback` (after deploy)
 - `auraanchor://auth/callback` (for native mobile - see MOBILE.md)

### 4. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → OAuth 2.0 Web client
2. Authorized redirect URI: `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`
3. Add Client ID + Secret in Supabase → Auth → Google provider

### 5. Run

```powershell
npm run dev
# → http://localhost:3000
```

Preview the Cloudflare bundle locally:

```powershell
cp .dev.vars.example .dev.vars # fill in same vars
npm run preview
# → http://localhost:8787
```

---

## Deploy to Cloudflare Workers

### Windows path note

The folder name `Aura & Anchor` contains `&`, which breaks some npm/webpack paths. Use a subst drive or the included deploy script:

```powershell
.\scripts\build-deploy.ps1
```

Or manually:

```powershell
subst X: "C:\path\to\aura-anchor"
cd X:\
npm install
npm run deploy
```

### Configuration

1. Copy `wrangler.jsonc.example` values into `wrangler.jsonc` (or edit `wrangler.jsonc` directly)
2. Set **plaintext vars** in `wrangler.jsonc` → `vars` (app URL, Supabase URL, Stripe price IDs, publishable key)
3. Set **secrets** via Wrangler (never commit these):

```powershell
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put ENCRYPTION_KEY
npx wrangler secret put GOOGLE_AI_API_KEY
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

Full variable reference:

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Plaintext | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Secret | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Optional | Server-side admin ops |
| `NEXT_PUBLIC_APP_URL` | Plaintext | Yes | Your deployed worker URL |
| `ENCRYPTION_KEY` | Secret | Yes | 64-char hex (32 bytes) for AES-256 |
| `GOOGLE_AI_API_KEY` | Secret | Recommended | Gemini API key |
| `OPENAI_API_KEY` | Secret | Fallback | Used if no Gemini key |
| `RESEND_API_KEY` | Secret | Optional | Sends invite emails when set |
| `STRIPE_SECRET_KEY` | Secret | Prod | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Secret | Prod | Webhook signing secret |
| `STRIPE_PRICE_ID` | Plaintext | Prod | Monthly price ID |
| `STRIPE_LIFETIME_PRICE_ID` | Plaintext | Prod | Lifetime price ID |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Plaintext | Prod | Stripe publishable key |
| `ADMIN_EMAILS` | Plaintext | Optional | Comma-separated emails that bypass paywall |

Health check: `GET /api/health` - returns `status: ok` when Supabase + encryption are configured.

**Stripe setup:** see [STRIPE_SETUP.md](./STRIPE_SETUP.md)

---

## Mobile apps (iOS & Android)

Capacitor wraps the deployed web app in a native shell. See **[MOBILE.md](./MOBILE.md)** for full build instructions.

```powershell
npm run mobile:setup # first time: install deps + add platforms
npm run mobile:sync # sync config + icons
npm run mobile:ios # open Xcode (macOS)
npm run mobile:android # open Android Studio
```

---

## User flow

1. **Sign in** with Google
2. **Complete onboarding** - demographics, help areas, self/partner reflection
3. **Invite partner** - copy invite link (optional email via Resend)
4. Partner **accepts invite** and completes onboarding
5. **Generate AI analysis** from relationship or insights page
6. **Answer questions** - partner receives WHY/HOW/WHAT briefings
7. Track progress on the **dashboard**

---

## Project structure

```
src/app/ Pages + API routes
src/components/ UI + app shell + Capacitor init
src/lib/ Supabase, encryption, AI, Stripe, env helpers
supabase/ SQL migrations
mobile/ Capacitor iOS/Android shell
scripts/ Deploy helpers, icon generation
wrangler.jsonc Cloudflare Worker config (use .example as template)
MOBILE.md Native app build guide
STRIPE_SETUP.md Stripe checklist
```

---

## Security

- Sensitive responses encrypted at the application layer before DB storage
- Row Level Security on all Supabase tables
- **Never commit** `.env.local`, `.dev.vars`, or API keys
- Use `wrangler secret put` for production secrets
- Rotate any keys that were ever exposed in git history

---

## License

MIT - see [LICENSE](./LICENSE)
