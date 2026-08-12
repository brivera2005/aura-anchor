<#
.SYNOPSIS
  Upload Aura & Anchor secrets to Cloudflare Workers.

.DESCRIPTION
  Sets wrangler secrets and documents Supabase dashboard steps.
  Run from project root (use subst X: if path contains &).

.PARAMETER SupabaseUrl
  NEXT_PUBLIC_SUPABASE_URL (also written to wrangler.jsonc vars)

.PARAMETER SupabaseAnonKey
  NEXT_PUBLIC_SUPABASE_ANON_KEY

.PARAMETER SupabaseServiceRoleKey
  SUPABASE_SERVICE_ROLE_KEY (server-only)

.PARAMETER GoogleAiApiKey
  GOOGLE_AI_API_KEY for Gemini

.PARAMETER EncryptionKey
  64-char hex AES-256 key. Generated automatically if omitted.

.EXAMPLE
  .\scripts\set-secrets.ps1 -SupabaseUrl "https://xxx.supabase.co" -SupabaseAnonKey "eyJ..." -SupabaseServiceRoleKey "eyJ..." -GoogleAiApiKey "AIza..."
#>
param(
  [Parameter(Mandatory = $true)][string]$SupabaseUrl,
  [Parameter(Mandatory = $true)][string]$SupabaseAnonKey,
  [Parameter(Mandatory = $true)][string]$SupabaseServiceRoleKey,
  [string]$GoogleAiApiKey,
  [string]$EncryptionKey
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if (-not $EncryptionKey) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $EncryptionKey = ([System.BitConverter]::ToString($bytes) -replace '-', '').ToLower()
  Write-Host "Generated new ENCRYPTION_KEY (save this locally in .env.local):"
  Write-Host "ENCRYPTION_KEY=$EncryptionKey"
}

function Set-WranglerSecret([string]$Name, [string]$Value) {
  if (-not $Value) { return }
  Write-Host "Uploading secret: $Name"
  $Value | npx wrangler secret put $Name
}

Set-WranglerSecret "NEXT_PUBLIC_SUPABASE_ANON_KEY" $SupabaseAnonKey
Set-WranglerSecret "SUPABASE_SERVICE_ROLE_KEY" $SupabaseServiceRoleKey
Set-WranglerSecret "ENCRYPTION_KEY" $EncryptionKey
if ($GoogleAiApiKey) {
  Set-WranglerSecret "GOOGLE_AI_API_KEY" $GoogleAiApiKey
}

# Update public var in wrangler.jsonc
$wranglerPath = Join-Path $root "wrangler.jsonc"
$content = Get-Content $wranglerPath -Raw
if ($content -match '"NEXT_PUBLIC_SUPABASE_URL"') {
  $content = $content -replace '"NEXT_PUBLIC_SUPABASE_URL"\s*:\s*"[^"]*"', "`"NEXT_PUBLIC_SUPABASE_URL`": `"$SupabaseUrl`""
} else {
  $content = $content -replace '("NEXT_PUBLIC_APP_URL"\s*:\s*"[^"]*")', "`$1,`n`t`t`"NEXT_PUBLIC_SUPABASE_URL`": `"$SupabaseUrl`""
}
Set-Content -Path $wranglerPath -Value $content -NoNewline

Write-Host ""
Write-Host "=== Supabase dashboard (manual one-time setup) ===" -ForegroundColor Cyan
Write-Host "1. SQL migration:  https://supabase.com/dashboard/project/_/sql"
Write-Host "   Run file: supabase/migrations/001_schema.sql"
Write-Host "2. Auth providers: https://supabase.com/dashboard/project/_/auth/providers"
Write-Host "   Enable Google OAuth"
Write-Host "3. URL config:     https://supabase.com/dashboard/project/_/auth/url-configuration"
Write-Host "   Site URL: <your NEXT_PUBLIC_APP_URL>"
Write-Host "   Redirect URLs: <your-app-url>/auth/callback"
Write-Host ""
Write-Host "=== Google Cloud Console (manual) ===" -ForegroundColor Cyan
Write-Host "Add authorized redirect URI:"
Write-Host "  https://<your-project-ref>.supabase.co/auth/v1/callback"
Write-Host "(Find exact URL under Supabase > Auth > Providers > Google)"
Write-Host ""
Write-Host "Done. Run: npm run deploy (from scripts/build-deploy.ps1 if path has &)"
