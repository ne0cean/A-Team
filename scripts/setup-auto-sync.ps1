# setup-auto-sync.ps1 — Register auto-sync Task Scheduler job on Windows
# Runs auto-sync.ps1 every 30 minutes.
# Run once as Administrator (or accept UAC prompt).

$TaskName  = "ConnectomeAutoSync"
$ScriptPath = Join-Path $PSScriptRoot "auto-sync.ps1"
$RepoDir   = Resolve-Path (Join-Path $PSScriptRoot "..")

# Remove old task if exists
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[setup] Removed existing task."
}

$Action  = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NonInteractive -WindowStyle Hidden -File `"$ScriptPath`"" `
    -WorkingDirectory $RepoDir

# Trigger: every 30 minutes, starting now
$Trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 30) -Once -At (Get-Date)

# Run whether user is logged on or not, with highest privilege
$Settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -RunLevel Highest `
    -Force | Out-Null

Write-Host "[setup] Task '$TaskName' registered. Runs every 30 minutes."
Write-Host "[setup] Script: $ScriptPath"
Write-Host "[setup] To check: Get-ScheduledTask -TaskName '$TaskName'"
Write-Host "[setup] To remove: Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
