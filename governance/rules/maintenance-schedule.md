# A-Team 정기 유지보수 스케줄

> **목적**: a-team 지속 성장 및 최적화 효율화를 위한 정기 작업 자동화

---

## 스케줄 개요

| 주기 | 작업 | 설명 | 자동화 | 우선순위 |
|------|------|------|--------|----------|
| **매일** | Git 백업 | origin/master 자동 push | ✅ launchd | HIGH |
| **매일** | Test 스모크 | 핵심 테스트 10개 실행 | 📋 수동 | MEDIUM |
| **주간** | Insights 리포트 | analytics.jsonl 집계 + 패턴 감지 | ✅ launchd | HIGH |
| **주간** | Dashboard 체크 | 모듈 건강도 + 사용 빈도 | ✅ launchd | HIGH |
| **주간** | Absorb 스캔 | 외부 프로젝트 개선사항 역류 | ✅ launchd | MEDIUM |
| **주간** | Security Audit | npm audit + tsc + vitest | ✅ launchd | HIGH |
| **주간** | Autoresearch 판정 | Shadow 모드 데이터 집계 | ✅ launchd | LOW |
| **격주** | Design Retro | design-auditor 사용 회고 | 📋 수동 | LOW |
| **월간** | Cold Review | 전체 구조 냉철한 감사 | ✅ launchd | HIGH |
| **분기** | Dependency Update | npm outdated → 수동 업데이트 | 📋 수동 | MEDIUM |
| **분기** | Phase Gate 검토 | 로드맵 진행 상황 평가 | 📋 수동 | HIGH |

---

## 세부 작업 정의

### 1. Git 백업 (매일 05:00 KST)

**목적**: 작업 손실 방지, 원격 백업 유지

**스크립트**: `scripts/maintenance/daily-backup.sh`
```bash
#!/bin/bash
cd ~/Projects/a-team || exit 1

# 변경사항 있으면 자동 커밋
if [[ -n $(git status --porcelain) ]]; then
  git add -A
  git commit -m "auto: daily backup [$(date +%Y-%m-%d)]"
fi

# origin/master로 push
git push origin master || {
  echo "❌ Push failed — manual intervention required"
  exit 1
}

echo "✅ Daily backup complete"
```

**launchd plist**: `com.ateam.daily-backup.plist`
- StartCalendarInterval: Hour 5, Minute 0

---

### 2. Insights 주간 리포트 (매주 월요일 09:00 KST)

**목적**: analytics.jsonl 패턴 감지, 비용 급증 알림, 사용 트렌드

**커맨드**: `/insights`

**스크립트**: `scripts/maintenance/weekly-insights.sh`
```bash
#!/bin/bash
cd ~/Projects/a-team || exit 1

# /insights 커맨드 실행 (general-purpose 에이전트)
echo "📊 Generating weekly insights report..."

# Task tool로 insights 에이전트 호출
# 결과: .context/reports/insights-YYYY-MM-DD.md

echo "✅ Weekly insights report generated"
```

**launchd plist**: `com.ateam.weekly-insights.plist`
- StartCalendarInterval: Weekday 1 (월요일), Hour 9, Minute 0

---

### 3. Dashboard 모듈 건강도 (매주 월요일 09:30 KST)

**목적**: 각 모듈 사용 빈도, Phase Gate 진행률, 커맨드 비활성화 감지

**커맨드**: `/dashboard`

**스크립트**: `scripts/maintenance/weekly-dashboard.sh`
```bash
#!/bin/bash
cd ~/Projects/a-team || exit 1

# Dashboard 실행
node scripts/dashboard.mjs > /tmp/dashboard-$(date +%Y-%m-%d).json

# JSON 파싱하여 경고 이슈 추출
WARNINGS=$(jq -r '.modules[] | select(.health < 50) | .name' /tmp/dashboard-$(date +%Y-%m-%d).json)

if [[ -n "$WARNINGS" ]]; then
  echo "⚠️  Low health modules detected:"
  echo "$WARNINGS"
fi

echo "✅ Dashboard check complete"
```

**launchd plist**: `com.ateam.weekly-dashboard.plist`
- StartCalendarInterval: Weekday 1, Hour 9, Minute 30

---

### 4. Security Audit (매주 일요일 23:00 KST)

**목적**: 보안 취약점 조기 감지, 타입 오류 방지, 테스트 회귀 차단

**스크립트**: `scripts/maintenance/weekly-security.sh`
```bash
#!/bin/bash
cd ~/Projects/a-team || exit 1

echo "🔒 Running security audit..."

# 1. npm audit
npm audit --audit-level=moderate > /tmp/npm-audit-$(date +%Y-%m-%d).txt
AUDIT_EXIT=$?

# 2. TypeScript 타입 체크
npx tsc --noEmit > /tmp/tsc-$(date +%Y-%m-%d).txt 2>&1
TSC_EXIT=$?

# 3. Vitest 전체 실행
npm test > /tmp/vitest-$(date +%Y-%m-%d).txt 2>&1
TEST_EXIT=$?

# 결과 집계
if [[ $AUDIT_EXIT -ne 0 || $TSC_EXIT -ne 0 || $TEST_EXIT -ne 0 ]]; then
  echo "❌ Security audit FAILED"
  echo "   npm audit: $AUDIT_EXIT"
  echo "   tsc: $TSC_EXIT"
  echo "   tests: $TEST_EXIT"
  exit 1
fi

echo "✅ Security audit PASSED"
```

**launchd plist**: `com.ateam.weekly-security.plist`
- StartCalendarInterval: Weekday 0 (일요일), Hour 23, Minute 0

---

### 5. Cold Review 월간 감사 (매월 1일 10:00 KST)

**목적**: 편향 없이 전체 구조의 맹점/미흡/낭비 발견

**커맨드**: `/cold-review`

**스크립트**: `scripts/maintenance/monthly-cold-review.sh`
```bash
#!/bin/bash
cd ~/Projects/a-team || exit 1

echo "❄️  Running monthly cold review..."

# /cold-review 실행 (cold-review 에이전트)
# 결과: .context/retros/cold-review-YYYY-MM.md

echo "✅ Cold review complete"
```

**launchd plist**: `com.ateam.monthly-cold-review.plist`
- StartCalendarInterval: Day 1, Hour 10, Minute 0

---

### 6. Autoresearch 판정 (매주 토요일 18:00 KST)

**목적**: Shadow 모드 데이터 주간 집계, 판정 조건 충족 시 알림

**스크립트**: `scripts/maintenance/weekly-autoresearch.sh`
```bash
#!/bin/bash
cd ~/Projects/a-team || exit 1

echo "🔬 Checking autoresearch shadow data..."

# Shadow 모드 데이터 집계
# .autoresearch/_shadow/*/log.jsonl 분석
# weekly-report.md 갱신

# 판정 조건 체크 (3주 + 15 runs)
# 충족 시 DECISION-REPORT.md 작성 + 알림

echo "✅ Autoresearch check complete"
```

**launchd plist**: `com.ateam.weekly-autoresearch.plist`
- StartCalendarInterval: Weekday 6 (토요일), Hour 18, Minute 0

---

## 수동 작업 (스케줄링 불가)

### Design Retro (격주, 데이터 축적 시)

**트리거**: design-auditor 사용 10회 이상 누적
**실행**: `/design-retro`
**판정**: `.context/retros/design-auditor-YYYY-MM-DD.md` 확인

### Dependency Update (분기)

**실행**: `npm outdated`
**판정**: 주요 버전 업데이트 있으면 수동 테스트 후 반영

### Phase Gate 검토 (분기)

**실행**: `team-roadmap.md` Phase 진행 상황 평가
**판정**: Phase N 완료 조건 충족 시 다음 Phase 진입

---

## 설치 방법

### Step 1: 스크립트 생성

```bash
cd ~/Projects/a-team
mkdir -p scripts/maintenance

# 각 스크립트를 scripts/maintenance/에 생성
chmod +x scripts/maintenance/*.sh
```

### Step 2: launchd plist 생성

```bash
bash scripts/install-maintenance-cron.sh
```

### Step 3: 등록 확인

```bash
launchctl list | grep com.ateam
```

**예상 출력**:
```
com.ateam.daily-backup
com.ateam.weekly-insights
com.ateam.weekly-dashboard
com.ateam.weekly-security
com.ateam.weekly-autoresearch
com.ateam.monthly-cold-review
com.ateam.absorb-weekly (기존)
```

---

## 알림 설정

### Telegram 통합 (선택)

각 스크립트에 실패 시 Telegram 알림 추가:

```bash
# scripts/maintenance/common.sh
function notify_telegram() {
  local message="$1"
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=${message}"
}

# 사용 예시
if [[ $EXIT_CODE -ne 0 ]]; then
  notify_telegram "❌ A-Team Security Audit Failed - $(date)"
fi
```

### Claude.ai 세션 알림 (기본)

`/vibe` Step 0 에서 자동 감지:
- CronCreate 이벤트 읽기
- "⏰ 예정된 작업: Weekly Insights (월요일 09:00)" 알림

---

## 우선순위별 실행 전략

### HIGH 우선순위 (자동 실행 필수)
- Git 백업 (데이터 손실 방지)
- Insights 리포트 (비용/사용 트렌드)
- Dashboard 체크 (모듈 건강도)
- Security Audit (보안/안정성)
- Cold Review (품질 유지)

### MEDIUM 우선순위 (자동 실행 권장)
- Absorb 스캔 (외부 개선사항)
- Dependency Update (분기별 수동)

### LOW 우선순위 (수동 또는 조건부)
- Autoresearch 판정 (Shadow 모드)
- Design Retro (데이터 축적 시)

---

## 로그 관리

### 로그 위치

```
~/Library/Logs/
  ├── com.ateam.daily-backup/
  ├── com.ateam.weekly-insights/
  ├── com.ateam.weekly-dashboard/
  ├── com.ateam.weekly-security/
  ├── com.ateam.weekly-autoresearch/
  └── com.ateam.monthly-cold-review/
```

### 로그 로테이션

```bash
# 30일 이상 로그 자동 삭제
find ~/Library/Logs/com.ateam.* -name "*.log" -mtime +30 -delete
```

---

## 다음 단계

1. `scripts/install-maintenance-cron.sh` 작성
2. 각 maintenance 스크립트 작성
3. launchd plist 파일 생성
4. 테스트 실행 (dry-run)
5. 실 등록 및 모니터링
