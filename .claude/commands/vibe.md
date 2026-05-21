---
description: 세션 시작 — 컨텍스트 로드 + 태스크 분류 + 즉시 실행
---

> **자동 트리거**: SessionStart 훅이 새 세션 시 자동 주입.
> 수동 `/vibe`는 컨텍스트 강제 리로드 시 사용.

## Step 0 — 상태 스캔 (vibe-init.sh)

```bash
node scripts/log-event.mjs command_start name=vibe
bash scripts/vibe-init.sh
```

**Step 0.69 — Gap Priority 1줄 요약** (a-team 레포에서만):
```bash
[ -f scripts/gap-priority.mjs ] && node scripts/gap-priority.mjs --summary 3 2>/dev/null || true
```
출력 예: `Gap #1: marketing.performance-marketing (score=16.0, cov=0%) | #2: sales-cs.lead-generation | Total: 28개`
이 줄을 브리핑 마지막에 포함한다. 없으면 스킵.

**Step 0.75 — Scheduled Reviews** (전체 프로젝트):
```bash
node ~/Projects/a-team/scripts/check-scheduled-reviews.mjs 2>/dev/null || true
```
- due 항목 있음 → 브리핑에 포함 + "예약 리뷰 N건 도래. 처리하시겠습니까?" 제안
- due 항목 없음 → 스킵
- 처리 후 해당 항목 status를 "done"으로 변경

**Step 0.7 — Daily Growth Brief** (a-team 레포에서만):
```bash
TODAY=$(date +%Y-%m-%d)
if [ ! -f ".context/briefs/${TODAY}-brief.md" ]; then
  echo "daily_brief: 오늘 브리핑 없음 — /daily-brief 실행 권장"
else
  echo "daily_brief: 오늘 브리핑 존재 — $(head -5 .context/briefs/${TODAY}-brief.md | grep -o '> .*' | head -1)"
fi
```
- 브리핑 없음 → Step 4 브리핑에 `/daily-brief` 제안 포함
- 브리핑 있음 → Executive Summary 1줄 표시

**Step 0.8 — Design Token Check** (UI가 있는 프로젝트에서만):
```bash
# UI 파일 존재 확인
UI_EXISTS=$(find . -maxdepth 4 -name "*.jsx" -o -name "*.tsx" -o -name "*.vue" -o -name "*.svelte" 2>/dev/null | head -1)
if [ -n "$UI_EXISTS" ]; then
  DRIFT=$(node ~/Projects/a-team/scripts/design-drift-detect.mjs . --json 2>/dev/null | head -1)
  if [ -n "$DRIFT" ]; then
    TOKEN_FILE=$(echo "$DRIFT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tokenFile','NONE'))" 2>/dev/null)
    SCORE=$(echo "$DRIFT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('driftScore',0))" 2>/dev/null)
    RATING=$(echo "$DRIFT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('rating','?'))" 2>/dev/null)
    echo "design_tokens: ${TOKEN_FILE} (score: ${SCORE}/100, ${RATING})"
  fi
fi
```
- `NONE` → designer 에이전트 호출하여 토큰 생성 제안: "디자인 토큰이 없습니다. 생성할까요?"
- D/F 등급 → "디자인 드리프트 심각 (${SCORE}/100). 토큰 정비 권장"
- A/B 등급 → 1줄 표시 후 진행

**출력 해석**:
- `resume_active: true` → `/pickup` 으로 분기 (경량 복구)
- `actions` 있음 → 제안된 커맨드 안내
- `git_dirty > 0` → uncommitted 작업 존재
- `pending_p0 > 0` → P0 긴급 개선사항 안내

**분기 규칙**:
- `resume_active` 또는 `git_dirty > 5` 또는 `in_progress` 있음 → **pickup 경량 경로**
- 그 외 → **vibe 풀 경로** (Step 1~4)

---

## Step 1 — 컨텍스트 로드

```bash
git pull --rebase --autostash origin $(git branch --show-current) 2>&1 | tail -3 || true
```

읽을 파일:
- `.context/CURRENT.md` — 현재 상태, Next Tasks
- `.context/DECISIONS.md` — 최근 결정사항 (있으면)
- `git log --oneline -5`

## Step 2 — 태스크 분류 (Opus / Sonnet)

CURRENT.md의 Next Tasks 분류:

**🔵 Opus**: 아키텍처 설계, 복잡한 리팩토링, 멀티파일 연쇄, 보안, 신규 핵심 기능
**🟢 Sonnet**: 구현, 버그 수정, 문서, 테스트, 단순 CRUD, 마이너 버그

## Step 3 — 실행 모드 결정

```
에이전트 1-2 + 독립      → 🟢 단일 터미널
에이전트 3-5 + 파일 분리  → 🟡 A-Team 오케스트레이션
설계 결정 / 옵션 비교     → 🟣 MoA 모드
```

**모델 추천** (CLAUDE.md 프로토콜):
1. Opus 필요 여부: (a) 새 설계 / (b) 옵션 비교 / (c) 5+ 파일 의존성
2. NO → 첫 줄에 전환 제안: "Sonnet으로 충분. 전환할까요?"

## Step 4 — 실행

브리핑: "마지막 [{커밋}]. 다음: [{태스크}]. [모드]. 시작."

**관련 명령어** (태스크 유형별):
- 구현 → `/tdd` → `/craft` → `/ship`
- 설계 → `/blueprint` → `/plan-eng`
- 리뷰 → `/review` → `/adversarial`
- 품질 → `/cso` → `/qa` → `/land`
- 야간 → `/zzz` → `/ralph`

---

## 상세 체크 항목 (vibe-init.sh 내부)

| 체크 | 설명 |
|------|------|
| A-Team sync | 6h 경과 시 자동 pull |
| Resume 감지 | RESUME.md 미완료 시 /pickup 제안 |
| launchd | 자동 재개 설정 여부 |
| Cold review | 30일 경과 시 /cold-review 제안 |
| Major integration | 최근 3커밋에 lib/agents/governance 변경 시 /optimize |
| Pending P0 | improvements/pending.md에 P0 있으면 알림 |
| Capability | capability-map.json 종합 점수 |
| Roadmap | team-roadmap.md 현재 Phase |

상세 로직: `scripts/vibe-init.sh` 참조
