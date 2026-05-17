# Run this whenever the dev server or build hits EINVAL / EBUSY / UNKNOWN
# errors on .next or node_modules files.
#
# Cause: OneDrive's Files-On-Demand virtualizes files created by Next.js
# at runtime (.next cache, node_modules trace artifacts). When Next or
# the @vercel/nft trace collector tries to readlink / read those files,
# it gets EINVAL / UNKNOWN / EBUSY.
#
# Fix: stop the dev server, delete the corrupted .next cache, and re-pin
# every file in the project (including node_modules) as "always available
# locally" so OneDrive stops virtualizing them.
#
# Usage:  powershell -ExecutionPolicy Bypass -File .\scripts\fix-onedrive.ps1
#         (or `pwsh` instead of `powershell` if you have PowerShell 7+)
# Then:   npm run dev   (or npm run build)

$ErrorActionPreference = "Continue"

# Anchor to the project root regardless of where the script is invoked from.
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location $projectRoot

Write-Host "Stopping node processes..." -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

if (Test-Path .\.next) {
    Write-Host "Removing .next cache..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force .\.next
}

Write-Host "Pinning project files as always-local in OneDrive..." -ForegroundColor Cyan
attrib +P -U /s /d 2>&1 | Out-Null

# node_modules contains hundreds of thousands of files; OneDrive sometimes
# misses the deep tree on a single recursive attrib from the parent. Pin it
# directly to be sure the @vercel/nft trace collector won't trip.
if (Test-Path .\node_modules) {
    Write-Host "Pinning node_modules (this takes ~30s)..." -ForegroundColor Cyan
    Push-Location .\node_modules
    attrib +P -U /s /d 2>&1 | Out-Null
    Pop-Location
}

Pop-Location

Write-Host ""
Write-Host "Done. Run 'npm run dev' or 'npm run build' from $projectRoot" -ForegroundColor Green
