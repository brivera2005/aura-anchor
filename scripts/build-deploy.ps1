<#
.SYNOPSIS
  Build and deploy Aura & Anchor, working around & in the project folder path.

.DESCRIPTION
  Next.js/webpack fails when the project path contains '&'.
  This script syncs to a safe path, builds, and deploys to Cloudflare.

  Set NEXT_PUBLIC_APP_URL before running (your Cloudflare Worker URL).
#>
$ErrorActionPreference = "Stop"

$appUrl = $env:NEXT_PUBLIC_APP_URL
if (-not $appUrl) {
  Write-Error "Set NEXT_PUBLIC_APP_URL to your deployed Worker URL before running this script."
}

$source = Split-Path $PSScriptRoot -Parent
$buildDir = Join-Path (Split-Path $source -Parent) "aura-anchor-build"

Write-Host "Source: $source"
Write-Host "Build dir: $buildDir"
Write-Host "Deploy URL: $appUrl"

if (-not (Test-Path $buildDir)) {
  New-Item -ItemType Directory -Path $buildDir | Out-Null
}

$exclude = @(".next", ".open-next", "node_modules", "aura-anchor-build")
robocopy $source $buildDir /MIR /XD $exclude /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

if (-not (Test-Path "$buildDir\node_modules")) {
  Write-Host "Copying node_modules (first run)..."
  robocopy "$source\node_modules" "$buildDir\node_modules" /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

Set-Location $buildDir
Write-Host "Building and deploying..."
$env:NEXT_PUBLIC_APP_URL = $appUrl
if (-not $env:NEXT_PUBLIC_LIFETIME_PRICE) { $env:NEXT_PUBLIC_LIFETIME_PRICE = "449" }
npm run deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Verifying health endpoint..."
try {
  $health = Invoke-RestMethod -Uri "$appUrl/api/health" -TimeoutSec 30
  $health | ConvertTo-Json -Depth 5
} catch {
  Write-Warning "Health check request failed: $_"
}
