# auto-sync.ps1 — Windows auto-commit on idle
# Registered via Task Scheduler. Commits if uncommitted changes exist.

$RepoDir = Join-Path $PSScriptRoot ".."
Set-Location (Resolve-Path $RepoDir)

$Status = git status --porcelain
if ($Status) {
    git add -A
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    git commit -m "sync: auto-commit $Timestamp"
    Write-Host "[auto-sync] Committed at $Timestamp"
} else {
    Write-Host "[auto-sync] No changes at $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}
