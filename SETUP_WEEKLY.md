# Stage 10 Weekly Auto-Research — 설정 가이드

> **A-Team이 매주 월요일 03:00 KST에 자동으로 GitHub trending을 분석하고 RFC 후보를 제안합니다.**
> 사용자 액션 1개로 활성화.

---

## 1-Step 활성화

### GitHub Actions용 ANTHROPIC_API_KEY 추가

1. GitHub 레포 방문: https://github.com/ne0cean/A-Team
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** 클릭
4. Name: `ANTHROPIC_API_KEY`
5. Secret: 본인 Anthropic API 키 (sk-ant-...)
6. **Add secret**

이게 끝. 다음 월요일 03:00 KST에 자동 실행.

---

## 자동 실행 순서

```
매주 월요일 18:00 UTC (= 화요일 03:00 KST)
  ↓
.github/workflows/weekly-research.yml 발동
  ↓
Step 1: checkout + Node 22 + npm ci + @anthropic-ai/sdk 설치
  ↓
Step 2: node scripts/weekly-research.mjs 실행
  ├─ Phase 1: GitHub Trending API 6개 topic × 5 repos 수집
  │            (ai-agents, llm, claude-code, agent-framework, developer-tools, prompt-engineering)
  ├─ Phase 2: 상위 5 repo의 README 가져오기
  ├─ Phase 3: Claude Sonnet 4.6 평가 (Selection Criteria 1-8 + P1-P8 + G5/G7)
  ├─ Phase 4: SUMMARY.md + trending-raw.json + evaluation-raw.json 작성
  └─ Phase 5: `research/YYYY-WW` 브랜치 push
  ↓
자동 PR 생성 (라벨: auto-research, needs-review)
  ↓
사용자가 PR 리뷰 + 수동 merge (자동 merge 금지)
```

---

## 수동 실행 (테스트용)

### 로컬 실행
```bash
cd ~/tools/A-Team
export ANTHROPIC_API_KEY=sk-ant-your-key
export GITHUB_TOKEN=ghp_your-token  # optional, rate limit 완화
node scripts/weekly-research.mjs
# 출력: docs/research/YYYY-WW/SUMMARY.md
```

### GH Actions 수동 트리거
1. Actions 탭 → "Weekly Auto-Research (Eternal Growth)"
2. **Run workflow** 버튼
3. 약 5분 후 완료 + PR 생성

---

## 비용 예상

- GitHub Trending API: **무료** (GITHUB_TOKEN 있으면 5000 req/hr)
- Claude Sonnet 4.6 호출: **1회 / 주**, ~$0.3-0.8 per run
- 월 비용: **~$2-4**
- GH Actions 실행 시간: ~5분, free tier 2000분/월 대비 미미

---

## 산출물 구조

```
docs/research/2026-W16/     ← 매 주 생성
├── SUMMARY.md              ← 사람이 읽을 주간 리포트
├── trending-raw.json       ← GitHub 원본 데이터
└── evaluation-raw.json     ← Claude 평가 전체
```

---

## 검증 / 디버깅

### 실행 확인
```bash
# 최근 workflow run 확인
gh run list --workflow=weekly-research.yml

# 로그 확인
gh run view <run-id> --log
```

### 로컬 dry-run
```bash
# ANTHROPIC_API_KEY 없이 Phase 1-2만 (trending fetch만)
node scripts/weekly-research.mjs
# → evaluation-raw.json 없이 SUMMARY.md 생성
```

---

## 중단 / 비활성화

### 일시 중단 (workflow 유지)
`.github/workflows/weekly-research.yml` 의 `schedule` 섹션 주석 처리:
```yaml
on:
  # schedule:
  #   - cron: '0 18 * * 1'
  workflow_dispatch:
```

### 완전 중단 (workflow 삭제)
```bash
git rm .github/workflows/weekly-research.yml
git commit -m "chore: disable weekly auto-research"
git push
```

### Secret 제거
GitHub Settings → Secrets → ANTHROPIC_API_KEY → Remove

---

## 품질 유지 (Human Gate)

자동 merge **금지**. 모든 PR은 사람이 검토:
- [ ] SUMMARY.md ACCEPT 후보가 A-Team Selection Criteria 8개 실제 충족하는가
- [ ] REJECT 후보가 과거 REJECTED.md와 중복되는가
- [ ] Drift alert이 있으면 이전 Wave와 충돌 검증
- [ ] 흥미로운 pattern 발견 시 별도 RFC 착수 고려

Sovereignty 원칙: **A-Team이 스스로 decide 하지 않음**. 사용자가 최종 gatekeeper.

---

## 다음 Phase (미래 확장)

- [ ] SWE-bench / Terminal-Bench 점수 자동 수집
- [ ] 이전 주 REJECTED 후보 재평가 (trigger 조건 충족 시)
- [ ] 경쟁 프로젝트 drift 감지 (A-Team 기능이 뒤처지는지)
- [ ] 주간 PERFORMANCE_LEDGER 자동 append

---

**Status**: Infrastructure 완료. `ANTHROPIC_API_KEY` secret 1개만 추가하면 즉시 활성.

**Related**:
- `scripts/weekly-research.mjs` — 실행 스크립트
- `scripts/trending-fetch.mjs` — GitHub API client
- `governance/workflows/eternal-growth.md` — 프로토콜 명세
- `docs/research/2026-04-optimization/final/REJECTED.md` — 재평가 트리거
