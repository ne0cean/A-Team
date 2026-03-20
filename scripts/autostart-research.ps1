# autostart-research.ps1
# Windows 로그인 시 Task Scheduler가 실행 — 데몬이 꺼져 있으면 자동 시작

$REPO    = "C:\Users\SKTelecom\Desktop\Dev Projects\connectome"
$PID_FILE = "$REPO\.research\daemon.pid"
$LOG_FILE = "$REPO\.research\daemon.log"
$SCRIPT   = "$REPO\scripts\research-daemon.mjs"

# .research 디렉토리 보장
if (-not (Test-Path "$REPO\.research")) {
    New-Item -ItemType Directory -Path "$REPO\.research" -Force | Out-Null
}

# 이미 실행 중이면 종료
if (Test-Path $PID_FILE) {
    $existingPid = [int](Get-Content $PID_FILE -Raw).Trim()
    $proc = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
    if ($proc) {
        Add-Content -Path $LOG_FILE -Value "[$((Get-Date -Format 'o'))] [AUTOSTART] 이미 실행 중 (PID: $existingPid). 건너뜀."
        exit 0
    }
}

# node 경로 탐색
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCmd) { $nodeCmd.Source } else { $null }
if (-not $nodePath) {
    Add-Content -Path $LOG_FILE -Value "[$((Get-Date -Format 'o'))] [AUTOSTART] ERROR: node를 찾을 수 없습니다."
    exit 1
}

# 백그라운드 시작 (새 프로세스, 창 없음)
$proc = Start-Process -FilePath $nodePath `
    -ArgumentList "`"$SCRIPT`"" `
    -WorkingDirectory $REPO `
    -WindowStyle Hidden `
    -PassThru

Add-Content -Path $LOG_FILE -Value "[$((Get-Date -Format 'o'))] [AUTOSTART] 데몬 시작됨 (PID: $($proc.Id))"
Write-Host "Research daemon started (PID: $($proc.Id))"
