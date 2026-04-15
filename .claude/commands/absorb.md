---
description: /absorb — 다른 프로젝트의 로컬 A-Team 개선사항 역류 흡수. 글로벌 가치 점검 후 master 에 promote.
---

master A-Team 이 다른 프로젝트들의 `.claude/commands/`, `governance/`, `scripts/` 를 스캔해 **역류 가능한 개선사항**을 찾아 `improvements/pending.md` 에 후보로 등록. **자동 머지 안 함** — 사람 결정 대기.

## 사용 시점

- 명시 호출: `/absorb` (수동 스캔)
- 자동 트리거: `/vibe` 주 1회 (요일 0 = 일요일) 또는 `/end` 옵션
- 사용자가 "다른 프로젝트 개선사항 있나 확인" 요청 시

## Step 1 — 스캔 대상 탐색

```bash
# master A-Team repo (현재)
ATEAM_MASTER="$HOME/Projects/a-team"

# 스캔 대상: ~/Projects/*/ (a-team 자체 제외)
PROJECTS=()
for proj in "$HOME"/Projects/*/; do
  name=$(basename "$proj")
  [ "$name" = "a-team" ] && continue
  [ "$name" = "_archive" ] && continue
  [ -d "$proj.claude" ] || [ -d "$proj/governance" ] || [ -d "$proj/scripts" ] || continue
  PROJECTS+=("$proj")
done
```

## Step 2 — Diff 분석

각 프로젝트에 대해 3가지 범주 확인:

### A. 신규 파일 (master 에 없음)
```bash
# 프로젝트 .claude/commands/*.md 중 master 에 없는 것
for cmd in "$proj.claude/commands"/*.md; do
  name=$(basename "$cmd")
  [ -f "$ATEAM_MASTER/.claude/commands/$name" ] || echo "NEW: $proj → $name"
done
```

### B. 수정된 파일 (master 와 다름)
```bash
# master 에 있지만 내용 다름
for cmd in "$proj.claude/commands"/*.md; do
  name=$(basename "$cmd")
  master_cmd="$ATEAM_MASTER/.claude/commands/$name"
  [ -f "$master_cmd" ] && ! diff -q "$cmd" "$master_cmd" >/dev/null 2>&1 && echo "DIFF: $proj → $name"
done
```

### C. 고유 스크립트/룰
```bash
# scripts/*.sh, governance/rules/*.md 중 master 에 없는 것
```

## Step 3 — 글로벌 가치 분류 (휴리스틱)

각 후보에 대해 자동 판정:

| Signal | 분류 |
|---|---|
| 파일 내용에 프로젝트명 하드코딩 (`vibe-toolkit`, `connectome` 등) | **LOCAL** (제외) |
| 특정 도메인 어휘 (`rails`, `django`, `nextjs`, `unity`, `figma`) | **LOCAL** (제외) |
| `/Users/noir/Projects/<project>` 경로 하드코딩 | **LOCAL** (제외) |
| "A-Team" 언급 + 일반 패턴 | **GLOBAL** (후보) |
| governance/rules/ 스타일 규칙 | **GLOBAL** (후보) |
| 유틸 스크립트 (cross-platform, 일반 Unix) | **GLOBAL** (후보) |
| 불분명 | **UNCLEAR** (사람 검토) |

```bash
classify_file() {
  local file="$1"
  if grep -qE "vibe-toolkit|connectome|do-better-workspace|morning-rave|claude-remote|longform|hsc-clicker|ai-bubble|t33a|cross-pc|auto-auth" "$file"; then
    echo "LOCAL"
  elif grep -qE "/Users/[a-z]+/Projects/[a-z-]+" "$file"; then
    echo "LOCAL"
  elif grep -qE "\b(rails|django|nextjs|unity|figma|godot|unreal)\b" "$file"; then
    echo "LOCAL"
  elif grep -qE "A-Team|\.claude/commands|governance/rules|lib/" "$file"; then
    echo "GLOBAL"
  else
    echo "UNCLEAR"
  fi
}
```

## Step 4 — `improvements/pending.md` 등록

GLOBAL + UNCLEAR 후보 각각에 ID 부여 후 append:

```markdown
### IMP-YYYYMMDD-NN — <file name> (from <project>)
- **날짜**: YYYY-MM-DD
- **출처**: /absorb 스캔 (프로젝트 {name})
- **타입**: NEW | DIFF | SCRIPT | RULE
- **분류**: GLOBAL | UNCLEAR
- **경로**: <project>/.claude/commands/<file>
- **자동 판정**: {heuristic 결과}
- **내용 요약**: (처음 200자)
- **액션 후보**:
  - [ ] 원본 복사해 master 에 추가 (GLOBAL 확정 시)
  - [ ] 일반화 수정 후 추가 (프로젝트 참조 제거)
  - [ ] 거부 (LOCAL 재분류)
- **상태**: ⏳ pending
```

LOCAL 은 로깅만 (pending.md 미등록):
```bash
echo "[$(date +%Y-%m-%d)] $proj/$name → LOCAL (skipped): $reason" >> "$ATEAM_MASTER/improvements/absorb-scan.log"
```

## Step 5 — 리포트 출력

```
🔍 /absorb 스캔 결과
────────────────────
스캔: 5 프로젝트
발견: NEW 12 / DIFF 3 / SCRIPT 4
분류: GLOBAL 6 / UNCLEAR 8 / LOCAL 5
등록: improvements/pending.md 에 14건 추가

Top 후보 (GLOBAL):
1. connectome/.claude/commands/snapshot.md — 프로젝트 스냅샷 생성
2. vibe-toolkit/scripts/mcp-install.sh — MCP 서버 설치 헬퍼
...

검토: /improve list 로 확인, /improve apply 로 반영
```

## 자동 트리거

`vibe.md` Step 0.55 (신설 예정):
```
# 주 1회 (일요일) /absorb 자동 스캔
if [ "$(date +%u)" = "7" ] && [ ! -f .last-absorb-scan ] ; then
  echo "📥 /absorb 주간 스캔 실행 중..."
  bash <<< "$(cat .claude/commands/absorb.md | ...)"
  date +%Y-%m-%d > .last-absorb-scan
fi
```

또는 사용자가 "/absorb" 로 수동 실행.

## 원칙

1. **자동 머지 금지** — 후보 등록만. 사람이 `/improve apply` 로 결정
2. **프로젝트 손대지 않음** — read-only 스캔. 프로젝트 파일 수정 X
3. **False positive 허용** — UNCLEAR 는 사람이 쳐냄. LOCAL 너무 공격적 제외보다 후보 등록 후 거부가 안전
4. **출처 추적** — 어느 프로젝트에서 왔는지 항상 기록
5. **라이선스 주의** — 다른 프로젝트가 다른 라이선스일 수 있음. 파일 head comment 확인 후 promote

## 제한

- 리팩토링 정도 큰 개선은 자동 감지 어려움 (diff 하나가 여러 파일 걸쳐 있으면)
- 프로젝트가 외부 오픈소스 포크면 false positive 많을 수 있음 (LOCAL heuristic 강화 필요)
- master 로 promote 시 테스트 누락 검토 필요 (별도 수동 작업)
