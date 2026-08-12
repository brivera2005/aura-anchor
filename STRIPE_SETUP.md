# Stripe setup checklist - Aura & Anchor

Copy-paste checklist for configuring Stripe before going live.

Replace `YOUR-DEPLOYED-URL` with your Cloudflare Worker URL (e.g. `https://aura-anchor.yourname.workers.dev`).

**Webhook URL:** `https://YOUR-DEPLOYED-URL/api/stripe/webhook`

---

## 1. Create Stripe account

- [ ] Sign up at [dashboard.stripe.com/register](https://dashboard.stripe.com/register)
- [ ] Start in **Test mode** first; switch to Live when ready

---

## 2. Product 1 - Aura & Anchor Monthly

- [ ] **Products → + Add product**
- [ ] Name: `Aura & Anchor Monthly`
- [ ] Description: `Guided relationship healing - monthly subscription`
- [ ] Pricing model: **Recurring**
- [ ] Price: **$14.99 USD**
- [ ] Billing period: **Monthly**
- [ ] Save product
- [ ] Copy **Price ID** (`price_...`) → **`STRIPE_PRICE_ID`**

---

## 3. Product 2 - Aura & Anchor Lifetime

- [ ] **Products → + Add product**
- [ ] Name: `Aura & Anchor Lifetime`
- [ ] Description: `Pay once, forever access - all future features included`
- [ ] Pricing model: **One time**
- [ ] Price: **$449.00 USD** (recommended)
- [ ] Save product
- [ ] Copy **Price ID** (`price_...`) → **`STRIPE_LIFETIME_PRICE_ID`**

---

## 4. Product 3 - Aura & Anchor Annual (optional)

- [ ] **Products → + Add product**
- [ ] Name: `Aura & Anchor Annual`
- [ ] Description: `Annual subscription - 2 months free vs monthly`
- [ ] Pricing model: **Recurring**
- [ ] Price: **$119.00 USD**
- [ ] Billing period: **Yearly**
- [ ] Save product
- [ ] Copy **Price ID** (`price_...`) → **`STRIPE_ANNUAL_PRICE_ID`**

Skip this product if you only want Monthly + Lifetime. The annual card will show a configuration error at checkout until the price ID is set.

---

## 5. API keys

- [ ] **Developers → API keys**
- [ ] Copy **Publishable key** (`pk_test_...` or `pk_live_...`) → **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`**
- [ ] Reveal and copy **Secret key** (`sk_test_...` or `sk_live_...`) → **`STRIPE_SECRET_KEY`** (Wrangler secret - never commit)

---

## 6. Webhook endpoint

- [ ] **Developers → Webhooks → Add endpoint**
- [ ] Endpoint URL:

 ```
 https://YOUR-DEPLOYED-URL/api/stripe/webhook
 ```

- [ ] Select events:
 - [ ] `checkout.session.completed`
 - [ ] `customer.subscription.updated`
 - [ ] `customer.subscription.deleted`
 - [ ] `payment_intent.succeeded` (for lifetime one-time payments)
- [ ] Add endpoint
- [ ] Copy **Signing secret** (`whsec_...`) → **`STRIPE_WEBHOOK_SECRET`** (Wrangler secret)

For local testing, use the Stripe CLI:

```powershell
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## 7. Environment variables

### Cloudflare Workers (production)

**Secrets** (via Wrangler - never in git):

```powershell
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

**Plaintext vars** (Workers dashboard → Settings → Variables, or `wrangler.jsonc`):

| Variable | Example value |
|----------|---------------|
| `STRIPE_PRICE_ID` | `price_xxxxxxxxxxxx` |
| `STRIPE_LIFETIME_PRICE_ID` | `price_xxxxxxxxxxxx` |
| `STRIPE_ANNUAL_PRICE_ID` | `price_xxxxxxxxxxxx` (optional) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_xxxxxxxxxxxx` |
| `NEXT_PUBLIC_SUBSCRIPTION_PRICE` | `14.99` |
| `NEXT_PUBLIC_LIFETIME_PRICE` | `449` |
| `NEXT_PUBLIC_ANNUAL_PRICE` | `119` |
| `ADMIN_EMAILS` | `owner@example.com` (optional paywall bypass) |

### Local dev (`.dev.vars`)

Copy `.dev.vars.example` → `.dev.vars` and fill in the same values (use test keys).

---

## 8. Supabase migration

Run in Supabase SQL Editor if not already applied:

```sql
-- From 012_stripe_subscription.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;
```

Lifetime users are stored with `subscription_status = 'lifetime'` (no migration column change needed - status is free-form text).

---

## 9. Verify

- [ ] Deploy app (see README)
- [ ] `GET https://YOUR-DEPLOYED-URL/api/health` → `checks.stripe: true`
- [ ] Sign in → `/subscribe` → start **Monthly** checkout (test card `4242 4242 4242 4242`)
- [ ] Test **Lifetime** one-time checkout
- [ ] Stripe Dashboard → Webhooks → confirm events deliver with **200** responses

---

## Pricing summary

| Plan | Stripe type | Price | Env var for Price ID |
|------|-------------|-------|----------------------|
| Monthly | Recurring monthly | $14.99/mo | `STRIPE_PRICE_ID` |
| Lifetime | One-time | $449 | `STRIPE_LIFETIME_PRICE_ID` |
| Annual | Recurring yearly | $119/yr | `STRIPE_ANNUAL_PRICE_ID` |

**Partner model:** One subscriber covers invited partners - partners join free.

---

## Admin bypass (optional)

Set `ADMIN_EMAILS=owner@example.com` to skip the paywall for specific accounts without a Stripe subscription.
