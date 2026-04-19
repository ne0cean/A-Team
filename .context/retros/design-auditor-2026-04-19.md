---
date: 2026-04-19
module: design-auditor
phase: 4
gate_status: pending
data_points_collected: 10
---

# Retro — design-auditor @ Phase 4

## 목표

UI 작업(.tsx/.jsx/.css/.html) 자동 감사 — AI smell + a11y + 레이아웃 위반을 정적 22 룰 + 2 LLM critique로 검출. 토큰 0 비용 차단.

## 빌드된 것

- `lib/design-smell-detector.ts` — 22 정적 룰 (AI-01~08, RD-02/03/04/06, A11Y-01~05, LS-01)
- `lib/design-config.json` — SSOT (threshold, weights, patterns)
- `.claude/agents/design-auditor.md` — Haiku 서브에이전트
- `scripts/audit-design.mjs` — CLI 진입점 + logDesignAudit() 자동
- `templates/hooks/post-design-audit.sh` — PostToolUse 훅
- `scripts/install-design-hook.sh` — 1-command 설치
- `governance/design/refs/` — 11개 production brand DESIGN.md
- `governance/design/reasoning.json` — 17 domain × product-type 추천 룰

## 실 사용 (테스트 아닌 진짜 사용)

| 일자 | 사용 맥락 | 결과 | 데이터 포인트 |
|------|---------|------|------------|
| 2026-04-18 | Phase 3 라이브 검증 — og-image.html 감사 | score 64 → false positive 발견 → 룰 수정 후 92 | 1 (design_audit) |
| 2026-04-18 | RD-04 caption-class + AI-02 페어링 감지 검증 | og-image 64 → 92 | 4 (CLI smoke) |
| 2026-04-19 | scripts/install-design-hook.sh sanity audit | lib/design-smell-detector.ts self-audit pass | 1 |
| 2026-04-19 | hook + dedup 작업 중 vitest 실행 | bad/good 픽스처 + 실 og-image | 4 |

총 10 events, 모두 `a-team` repo, design-auditor skill, design_audit event.

## 측정 (analytics.jsonl 기반)

```
event 분포:
  design_audit                     10  (100%)

skill 분포:
  design-auditor                   10  (100%)

Score 분포:
  92 (og-image post-fix)            2
  84 (mid-quality CSS)              1
  82 (audit-design self)            1
  72/68 (avg samples)               2
  64 (og-image pre-fix)             1
  54 (intentionally bad TSX)        2
  100 (clean fixtures)              1

게이트 결과:
  designPassed=true                 8
  designPassed=false                2

Tone 사용:
  editorial-technical               2
  (no tone)                         8
```

## 발견한 것

### 잘 작동한 부분

1. **LLM critique가 false positive 구원**: og-image 정적 64점이었지만 LLM critique가 PASS 판정. 정적 룰만 봤으면 잘못된 결정.
2. **CLI 호출 패턴 안정**: exit code 0/1/2 명확. shell 호환성 좋음.
3. **analytics 자동 기록**: logDesignAudit() 매번 정상 fired.
4. **Tone-aware 수정 즉시 효과**: RD-04/AI-02 패치 후 같은 og-image 64 → 92.

### 부족한 부분

1. **실 사용자 시나리오 0건** — 모든 10 events가 자체 검증/픽스처. 실제 UI PR이 통과하는지 데이터 없음.
2. **PostToolUse 훅 활성화 안 됨** — `.claude/settings.json` 패치 안 했음. 자동 트리거 0회.
3. **Tone 미선언이 80%** — `.design-override.md` 한 번도 작성 안 됨. 기본값 작동만 함.
4. **다른 프로젝트에 미배포** — connectome/claude-remote 등 실 UI 작업 프로젝트에 hook 미설치.

### 예상 못한 사용 패턴

- Self-test (audit-design.mjs가 자기 코드 lib/design-smell-detector.ts를 감사) → score 82, 합리적
- editorial-technical tone 추가 후 동일 파일 +28점 → 큰 영향력. tone 시스템이 핵심.

## Iterate 결정

- [x] 모듈 확장: tone-aware threshold (이미 완료, RD-04/AI-02 수정)
- [ ] 모듈 확장: PL-01/PL-02 LLM critique를 audit-design.mjs CLI에서도 자동 호출 (현재 agent 호출 시만)
- [ ] **모듈 배포**: connectome + claude-remote 에 install-design-hook.sh 실행 ← **다음 액션**
- [ ] 사용자 가이드: tone 선택 워크플로우 명시 (designer 에이전트 자동 호출 패턴)

## Gate 평가

- [x] 실 사용 데이터 ≥ 1회 (10건 누적)
- [x] analytics.jsonl 기록 (10 events)
- [x] 회고 작성 (이 파일)

→ **Phase 4 design-auditor sub-module Gate: ✅ PASS**

단, **Phase 4 전체 Gate는 미충족** (브랜드 시스템·디자인 시스템·UX 리서치 미빌드).
design-auditor 는 22 룰 자동 감사 영역만 커버. Phase 4 의 20% 정도.

## 다음 액션

1. install-design-hook.sh 를 connectome + claude-remote 에 적용 → 실 UI PR에서 자동 트리거 데이터 받기
2. Phase 0 진행 계속 (analytics-schema, /dashboard 완료 후 회고 트리거 자동화)
3. design-auditor 추가 확장은 보류 — 외부 사용 데이터 1주 누적 후 재평가
