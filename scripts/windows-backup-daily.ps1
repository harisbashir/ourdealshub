# Schedule daily MariaDB backup for OurDealsHub (Windows Task Scheduler).
# Run once:
#   powershell -ExecutionPolicy Bypass -File scripts\windows-backup-daily.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $root "scripts\run-backup-daily.ps1"

@"
`$ErrorActionPreference = 'Stop'
Set-Location '$root'
npm run db:backup
Write-Host ('backup ok ' + (Get-Date -Format o))
"@ | Set-Content -Path $runner -Encoding UTF8

$taskName = "OurDealsHubDailyBackup"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Force | Out-Null

Write-Host "Scheduled task '$taskName' registered (daily 03:00)."
Write-Host "Runner script: $runner"
Write-Host "Test now: powershell -File `"$runner`""
