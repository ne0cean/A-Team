# Eternal Growth — Weekly Auto-Research Protocol

> **A-Team은 매주 스스로 최신 트렌드를 조사하고 수용 가능한 부분을 통합한다. 끊임없이 성장하는 툴킷.**

---

## 트리거

- **주기**: 매주 월요일 03:00 KST
- **메커니즘**:
  - Option A: GitHub Actions (`.github/workflows/weekly-research.yml`)
  - Option B: 로컬 cron (`crontab -e`)
  - Option C: 수동 (`bash scripts/weekly-research.sh`)

---

## 파이프라인

2026-04-14 이번 리서치와 **동일 구조**, 단 자동 실행:

```
Stage 0  — 템플릿 복사 (bootstrap)
Stage 0.5 — 이전 주 baseline 재사용 or 신규 측정
Stage 1  — 범주 14개 병렬 researcher
Stage 2  — Selection Criteria 8개 필터
Stage 3  — Protected Asset (P1-P8) 매핑
Stage 4  — 통과 후보 deep-dive
Stage 5  — RFC 작성
Stage 5.5-5.7 — Prototype + A/B + G5 Gate
Stage 6  — Priority Matrix
Stage 7  — Final 4 docs
Stage 8  — PR 자동 생성
```

---

## 격리

- 매 실행: `docs/research/YYYY-WW/` 폴더로 분리 (예: `2026-W16`)
- 이전 주 결과는 **읽기 전용 참조** (수정 금지)
- 브랜치: `research/YYYY-WW`

---

## 자동 PR 생성

Performance Gate (G5) 통과 후보만 A-Team master에 PR 자동 생성:

1. **Branch**: `research/YYYY-WW`
2. **PR Title**: `research(YYYY-WW): N개 후보 수용 검토`
3. **Body**: `final/EXECUTIVE_SUMMARY.md` + `final/PRIORITY_MATRIX.md` 자동 첨부
4. **Labels**: `auto-research`, `needs-review`

---

## Human Gate (필수)

**자동 머지 금지**. PR은 반드시 사용자 수동 승인 후 머지.

- 승인 기준:
  - G5 통과 증명 (benchmark 원본 데이터 첨부)
  - 이전 주 수용 후보와 충돌 없음
  - P1–P8 침해 없음

---

## Drift Detection

이전 주 수용 후보가 이번 주 새 후보와 충돌하면 alert:

```bash
# scripts/weekly-research.sh 안에서 실행
PREV_ACCEPT=$(grep "ACCEPT" docs/research/$PREV_WEEK/final/EXECUTIVE_SUMMARY.md)
CURR_REJECT=$(grep "REJECT" docs/research/$CURR_WEEK/final/REJECTED.md)
# 교집합 있으면 WARN
```

Alert 경로: `docs/research/YYYY-WW/DRIFT_ALERT.md` + PR 본문에 명시.

---

## 산출물 구조

```
docs/research/2026-W16/
├── MANIFEST.md
├── RESUME_STATE.md
├── BASELINE.md (이전 주 baseline 참조 or 재측정)
├── round-1/ (14 범주)
├── round-2/ (shortlist + mapping)
├── round-3/ (deep-dives)
├── rfc/ (RFCs)
└── final/
    ├── EXECUTIVE_SUMMARY.md
    ├── INTEGRATION_ROADMAP.md
    ├── PRIORITY_MATRIX.md
    ├── REJECTED.md
    └── DRIFT_ALERT.md (있을 때만)
```

---

## 중단 조건

1. **3주 연속 G5 통과 후보 0개** → 템플릿/기준 재검토 필요. 사용자 알림.
2. **drift alert 3주 연속** → 주간 주기를 격주로 조정.
3. **disk 사용량 >1GB** (누적 리서치 폴더) → 아카이브 정책 수립.

---

## 실행 방식별 세팅

### Option A — GitHub Actions
파일: `.github/workflows/weekly-research.yml`

```yaml
name: Weekly Auto-Research
on:
  schedule:
    - cron: '0 18 * * 0'  # 매주 일요일 18:00 UTC = 월요일 03:00 KST
  workflow_dispatch:
jobs:
  research:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Bootstrap
        run: bash scripts/weekly-research.sh
      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          title: "research(${{ env.WEEK_TAG }}): auto-generated"
          branch: research/${{ env.WEEK_TAG }}
          labels: auto-research, needs-review
```

### Option B — 로컬 cron
```bash
crontab -e
# 추가:
0 3 * * 1 bash ~/tools/A-Team/scripts/weekly-research.sh
```

### Option C — 수동
```bash
bash ~/tools/A-Team/scripts/weekly-research.sh
```

---

## Cost Budget

매 주 실행 예상 비용 (Sonnet 기준):
- Round 1 (14 researcher × ~15k tok): ~$0.8
- Round 2 (2 subagent × ~10k tok): ~$0.15
- Round 3 (6 deep-dive × ~20k tok): ~$0.6
- Round 4 (architect × ~15k tok × 6): ~$0.4
- Round 5 (Stage 6-7 × ~10k tok × 3): ~$0.15

**주당 ~$2.1**, 월 ~$8.4. 월 예산 $10 초과 시 cron 비활성.

---

## 템플릿 재사용

`docs/research/_template/` 하위 (Stage 10에서 생성):
- `MANIFEST_TEMPLATE.md`
- `RESUME_STATE_TEMPLATE.md`
- `BASELINE_SPEC_TEMPLATE.md`

매주 `weekly-research.sh`가 이 템플릿 복사해서 시작.

---

## Governance 준수

- `ateam-sovereignty.md` 제1원칙 (독립성) — 프로젝트 건드리지 않음
- `ateam-first.md` — 기존 자원 먼저 조사
- `truth-contract.md` — tool output 기반만 보고
- `autonomous-loop.md` — 자율 모드 계약 적용

---

## 관련 파일
- `scripts/weekly-research.sh` (bootstrap entry)
- `.github/workflows/weekly-research.yml` (CI trigger)
- `docs/research/_template/` (템플릿)
- `governance/rules/*.md` (적용 원칙)

**Last updated**: 2026-04-14 (Stage 10 신설)
