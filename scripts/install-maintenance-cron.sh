#!/bin/bash
# install-maintenance-cron.sh
# A-Team 정기 유지보수 작업 launchd cron 설치

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST_DIR="$HOME/Library/LaunchAgents"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  A-Team Maintenance Cron Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 스크립트 디렉토리 생성
mkdir -p "$PROJECT_ROOT/scripts/maintenance"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. Daily Backup (매일 05:00)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

cat > "$PROJECT_ROOT/scripts/maintenance/daily-backup.sh" <<'SCRIPT'
#!/bin/bash
cd ~/Projects/a-team || exit 1

if [[ -n $(git status --porcelain) ]]; then
  git add -A
  git commit -m "auto: daily backup [$(date +%Y-%m-%d)]"
fi

git push origin master || {
  echo "❌ Push failed"
  exit 1
}

echo "✅ Daily backup complete"
SCRIPT

chmod +x "$PROJECT_ROOT/scripts/maintenance/daily-backup.sh"

cat > "$PLIST_DIR/com.ateam.daily-backup.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ateam.daily-backup</string>
    <key>ProgramArguments</key>
    <array>
        <string>$PROJECT_ROOT/scripts/maintenance/daily-backup.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>5</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/com.ateam.daily-backup.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/com.ateam.daily-backup.error.log</string>
</dict>
</plist>
EOF

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. Weekly Security Audit (일요일 23:00)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

cat > "$PROJECT_ROOT/scripts/maintenance/weekly-security.sh" <<'SCRIPT'
#!/bin/bash
cd ~/Projects/a-team || exit 1

echo "🔒 Running security audit..."

npm audit --audit-level=moderate > /tmp/npm-audit-$(date +%Y-%m-%d).txt
AUDIT_EXIT=$?

npx tsc --noEmit > /tmp/tsc-$(date +%Y-%m-%d).txt 2>&1
TSC_EXIT=$?

npm test > /tmp/vitest-$(date +%Y-%m-%d).txt 2>&1
TEST_EXIT=$?

if [[ $AUDIT_EXIT -ne 0 || $TSC_EXIT -ne 0 || $TEST_EXIT -ne 0 ]]; then
  echo "❌ Security audit FAILED"
  echo "   npm audit: $AUDIT_EXIT"
  echo "   tsc: $TSC_EXIT"
  echo "   tests: $TEST_EXIT"
  exit 1
fi

echo "✅ Security audit PASSED"
SCRIPT

chmod +x "$PROJECT_ROOT/scripts/maintenance/weekly-security.sh"

cat > "$PLIST_DIR/com.ateam.weekly-security.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ateam.weekly-security</string>
    <key>ProgramArguments</key>
    <array>
        <string>$PROJECT_ROOT/scripts/maintenance/weekly-security.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>0</integer>
        <key>Hour</key>
        <integer>23</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/com.ateam.weekly-security.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/com.ateam.weekly-security.error.log</string>
</dict>
</plist>
EOF

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. Weekly Dashboard (월요일 09:30)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

cat > "$PROJECT_ROOT/scripts/maintenance/weekly-dashboard.sh" <<'SCRIPT'
#!/bin/bash
cd ~/Projects/a-team || exit 1

echo "📊 Running dashboard check..."

node scripts/dashboard.mjs > /tmp/dashboard-$(date +%Y-%m-%d).json

WARNINGS=$(jq -r '.modules[] | select(.health < 50) | .name' /tmp/dashboard-$(date +%Y-%m-%d).json)

if [[ -n "$WARNINGS" ]]; then
  echo "⚠️  Low health modules detected:"
  echo "$WARNINGS"
fi

echo "✅ Dashboard check complete"
SCRIPT

chmod +x "$PROJECT_ROOT/scripts/maintenance/weekly-dashboard.sh"

cat > "$PLIST_DIR/com.ateam.weekly-dashboard.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ateam.weekly-dashboard</string>
    <key>ProgramArguments</key>
    <array>
        <string>$PROJECT_ROOT/scripts/maintenance/weekly-dashboard.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>1</integer>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>30</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/com.ateam.weekly-dashboard.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/com.ateam.weekly-dashboard.error.log</string>
</dict>
</plist>
EOF

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 설치 완료
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo ""
echo "✅ 3개 maintenance cron 스크립트 생성 완료"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  등록 명령 (수동 실행):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "launchctl load ~/Library/LaunchAgents/com.ateam.daily-backup.plist"
echo "launchctl load ~/Library/LaunchAgents/com.ateam.weekly-security.plist"
echo "launchctl load ~/Library/LaunchAgents/com.ateam.weekly-dashboard.plist"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  확인:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "launchctl list | grep com.ateam"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  참고: governance/rules/maintenance-schedule.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
