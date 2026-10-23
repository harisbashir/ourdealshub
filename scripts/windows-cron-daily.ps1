# Schedule daily cron for OurDealsHub (Windows Task Scheduler helper).
# Run once in PowerShell (Admin optional):
#   powershell -ExecutionPolicy Bypass -File scripts\windows-cron-daily.ps1
#
# Calls: GET /api/cron/daily with CRON_SECRET from .env

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) { throw ".env not found at $envFile" }

$cronSecret = ""
$siteUrl = "http://localhost:3000"
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^CRON_SECRET="?([^"]*)"?') { $cronSecret = $Matches[1] }
  if ($_ -match '^NEXT_PUBLIC_SITE_URL="?([^"]*)"?') { $siteUrl = $Matches[1].TrimEnd('/') }
}

if (-not $cronSecret -or $cronSecret.Length -lt 16) {
  throw "Set a strong CRON_SECRET in .env first (≥16 characters)."
}

$scriptPath = Join-Path $root "scripts\run-cron-daily.ps1"
@"
`$ErrorActionPreference = 'Stop'
try {
  Invoke-WebRequest -Uri '$siteUrl/api/cron/daily' -Headers @{ Authorization = 'Bearer $cronSecret' } -UseBasicParsing -TimeoutSec 120 | Out-Null
  Write-Host ('cron ok ' + (Get-Date -Format o))
} catch {
  Write-Host ('cron fail ' + `$_.Exception.Message)
  exit 1
}
"@ | Set-Content -Path $scriptPath -Encoding UTF8

$taskName = "OurDealsHubDailyCron"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Daily -At 8am
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Force | Out-Null

Write-Host "Scheduled task '$taskName' registered (daily 8:00)."
Write-Host "Runner script: $scriptPath"
Write-Host "Test now: powershell -File `"$scriptPath`""
