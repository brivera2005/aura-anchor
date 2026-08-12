<#
.SYNOPSIS
  Upload Aura & Anchor Stripe config to Cloudflare Workers.

.DESCRIPTION
  Sets wrangler secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) and
  plaintext vars in wrangler.jsonc (price IDs, publishable key, trial, admin).
  Run from project root. Use subst X: if path contains &.

.PARAMETER StripeSecretKey
  sk_test_... or sk_live_... (Wrangler secret — never commit)

.PARAMETER StripeWebhookSecret
  whsec_... from Stripe Dashboard → Webhooks (Wrangler secret)

.PARAMETER StripePriceId
  price_... for Aura & Anchor Monthly ($14.99/mo)

.PARAMETER StripeLifetimePriceId
  price_... for Aura & Anchor Lifetime ($449 one-time)

.PARAMETER StripeAnnualPriceId
  Optional price_... for Aura & Anchor Annual ($119/yr)

.PARAMETER StripePublishableKey
  pk_test_... or pk_live_...

.PARAMETER AdminEmails
  Comma-separated owner emails that bypass paywall. Default: owner@example.com

.EXAMPLE
  .\scripts\set-stripe-secrets.ps1 `
    -StripeSecretKey "sk_test_..." `
    -StripeWebhookSecret "whsec_..." `
    -StripePriceId "price_..." `
    -StripeLifetimePriceId "price_..." `
    -StripePublishableKey "pk_test_..."

.EXAMPLE
  .\scripts\set-stripe-secrets.ps1 `
    -StripeSecretKey "sk_live_..." `
    -StripeWebhookSecret "whsec_..." `
    -StripePriceId "price_..." `
    -StripeLifetimePriceId "price_..." `
    -StripeAnnualPriceId "price_..." `
    -StripePublishableKey "pk_live_..." `
    -Deploy
#>
param(
  [Parameter(Mandatory = $true)][string]$StripeSecretKey,
  [Parameter(Mandatory = $true)][string]$StripeWebhookSecret,
  [Parameter(Mandatory = $true)][string]$StripePriceId,
  [Parameter(Mandatory = $true)][string]$StripeLifetimePriceId,
  [Parameter(Mandatory = $true)][string]$StripePublishableKey,
  [string]$StripeAnnualPriceId,
  [string]$AdminEmails = "owner@example.com",
  [string]$SubscriptionPrice = "14.99",
  [string]$LifetimePrice = "449",
  [string]$AnnualPrice = "119",
  [string]$TrialDays = "0",
  [switch]$Deploy
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Test-StripeKeyPrefix([string]$Value, [string[]]$Prefixes, [string]$Label) {
  $ok = $false
  foreach ($p in $Prefixes) {
    if ($Value.StartsWith($p)) { $ok = $true; break }
  }
  if (-not $ok) {
    throw "$Label must start with one of: $($Prefixes -join ', ')"
  }
}

function Mask-Key([string]$Value) {
  if ($Value.Length -le 12) { return "***" }
  return "$($Value.Substring(0, 8))...$($Value.Substring($Value.Length - 4))"
}

Test-StripeKeyPrefix $StripeSecretKey @("sk_test_", "sk_live_") "StripeSecretKey"
Test-StripeKeyPrefix $StripeWebhookSecret @("whsec_") "StripeWebhookSecret"
Test-StripeKeyPrefix $StripePriceId @("price_") "StripePriceId"
Test-StripeKeyPrefix $StripeLifetimePriceId @("price_") "StripeLifetimePriceId"
Test-StripeKeyPrefix $StripePublishableKey @("pk_test_", "pk_live_") "StripePublishableKey"
if ($StripeAnnualPriceId) {
  Test-StripeKeyPrefix $StripeAnnualPriceId @("price_") "StripeAnnualPriceId"
}

Write-Host "=== Stripe config (masked) ===" -ForegroundColor Cyan
Write-Host "STRIPE_SECRET_KEY:              $(Mask-Key $StripeSecretKey)"
Write-Host "STRIPE_WEBHOOK_SECRET:          $(Mask-Key $StripeWebhookSecret)"
Write-Host "STRIPE_PRICE_ID:                $(Mask-Key $StripePriceId)"
Write-Host "STRIPE_LIFETIME_PRICE_ID:       $(Mask-Key $StripeLifetimePriceId)"
if ($StripeAnnualPriceId) {
  Write-Host "STRIPE_ANNUAL_PRICE_ID:         $(Mask-Key $StripeAnnualPriceId)"
}
Write-Host "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: $(Mask-Key $StripePublishableKey)"
Write-Host "ADMIN_EMAILS:                   $AdminEmails"
Write-Host ""

function Set-WranglerSecret([string]$Name, [string]$Value) {
  if (-not $Value) { return }
  Write-Host "Uploading secret: $Name"
  $Value | node node_modules/wrangler/bin/wrangler.js secret put $Name
}

Set-WranglerSecret "STRIPE_SECRET_KEY" $StripeSecretKey
Set-WranglerSecret "STRIPE_WEBHOOK_SECRET" $StripeWebhookSecret

$wranglerPath = Join-Path $root "wrangler.jsonc"
$content = Get-Content $wranglerPath -Raw

function Set-JsonVar([string]$Content, [string]$Name, [string]$Value) {
  $escaped = $Value -replace '\\', '\\' -replace '"', '\"'
  if ($Content -match "`"$Name`"\s*:\s*`"[^`"]*`"") {
    return $Content -replace "`"$Name`"\s*:\s*`"[^`"]*`"", "`"$Name`": `"$escaped`""
  }
  return $Content -replace '(\t"vars"\s*:\s*\{)', "`$1`n`t`t`"$Name`": `"$escaped`","
}

$vars = @{
  "STRIPE_PRICE_ID" = $StripePriceId
  "STRIPE_LIFETIME_PRICE_ID" = $StripeLifetimePriceId
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" = $StripePublishableKey
  "NEXT_PUBLIC_SUBSCRIPTION_PRICE" = $SubscriptionPrice
  "NEXT_PUBLIC_LIFETIME_PRICE" = $LifetimePrice
  "NEXT_PUBLIC_ANNUAL_PRICE" = $AnnualPrice
  "STRIPE_TRIAL_DAYS" = $TrialDays
  "NEXT_PUBLIC_STRIPE_TRIAL_DAYS" = $TrialDays
  "ADMIN_EMAILS" = $AdminEmails
}
if ($StripeAnnualPriceId) {
  $vars["STRIPE_ANNUAL_PRICE_ID"] = $StripeAnnualPriceId
}

foreach ($entry in $vars.GetEnumerator()) {
  $content = Set-JsonVar $content $entry.Key $entry.Value
}

Set-Content -Path $wranglerPath -Value $content -NoNewline
Write-Host "Updated wrangler.jsonc vars." -ForegroundColor Green

Write-Host ""
Write-Host "=== Stripe Dashboard webhook (verify manually) ===" -ForegroundColor Cyan
Write-Host "URL: https://YOUR-DEPLOYED-URL/api/stripe/webhook"
Write-Host "Events: checkout.session.completed, customer.subscription.updated,"
Write-Host "        customer.subscription.deleted, payment_intent.succeeded"
Write-Host ""

if ($Deploy) {
  Write-Host "Deploying..." -ForegroundColor Yellow
  & (Join-Path $PSScriptRoot "build-deploy.ps1")
} else {
  Write-Host "Next: deploy so vars take effect:" -ForegroundColor Yellow
  Write-Host "  .\scripts\build-deploy.ps1"
  Write-Host ""
  Write-Host "Then verify:"
  Write-Host "  https://YOUR-DEPLOYED-URL/api/health  -> checks.stripe: true"
}
