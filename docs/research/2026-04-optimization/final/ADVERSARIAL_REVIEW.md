# Adversarial Review — 통합 기준 정합성 검증

> 적대적 관점에서 RFC 7개 + Final 문서를 Selection Criteria 8개 / Protected Assets P1–P8 / Performance Gate G5 / Meta-Principle "Earned Integration" 기준으로 엄격 검토.

---

## Finding 매트릭스 요약

| # | 심각도 | 대상 | 위반 기준 | 필요 조치 |
|---|-------|-----|----------|----------|
| F1 | **HIGH** | RFC-004 | Criterion 8 (Opt-in) | default `=1`을 `=0`로 수정 |
| F2 | **HIGH** | RFC-007 | G5 메트릭 미정합 | Security 별도 메트릭 추가 |
| F3 | **HIGH** | 전체 로드맵 | Meta-Principle 위반 | "예상 통과" → "측정 후 판정" |
| F4 | **MED** | RFC-001 | M1 측정 모호 | 세션 1 vs 세션 2+ 분리 |
| F5 | **MED** | RFC-003+006 | Cross-RFC 충돌 | Haiku tool_search 정책 |
| F6 | **MED** | RFC-001+002 | Cache invalidation 누락 | 정책 추가 |
| F7 | **MED** | 수치 합산 | Overlap 미검증 | 단순 합산 경고 |
| F8 | **LOW** | BASELINE_SPEC | 통계 power 약함 | σ 계산 3회 → 5회 |
| F9 | **LOW** | RFC-006 | Haiku M4 가드레일 부족 | test dataset 명시 |
| F10 | **LOW** | RFC-004 | Windows 지원 가정 | MINGW64 실제 검증 |

---

## RFC별 상세 적대적 분석

### RFC-001 Prompt Caching

**Finding F4 (MED)**: "M1 -35%" 수치가 세션 2+ 에서만 유효. Cache write는 1.25~2× 비용 → 세션 1 단독 측정 시 +25% 악화. 단일 세션 B1 벤치마크로는 이 개선을 검증 불가.

→ **조치**: BASELINE_SPEC에 "cache-aware 측정 모드" 추가 (세션 1: cache write 비용 포함, 세션 2+: cache read 비용 측정).

**Finding F6 (MED)**: RFC-002와 결합 시 compressed handoff을 cache하는 경우, handoff 내용 변경 시 cache invalidation 정책 없음.

→ **조치**: RFC-001에 "Cache invalidation triggers" 섹션 추가 필요.

**통과 기준 재평가**:
- Criterion 3 (≤2% context): ✓ (cache block 자체는 추가 토큰 없음)
- Criterion 6 (P5 강화): ✓
- Criterion 8 (Opt-in): ✓ (`ENABLE_PROMPT_CACHING=false`)
- G5-a: 단일 세션 측정 시 **15% 미달 가능** → F4 조치 후 재판정

---

### RFC-002 Handoff Compression

**Finding F11 (MED, 신규)**: "M1 -74%" 은 handoff 단독 측정. 세션 전체 컨텍스트에서의 실질 기여는 훨씬 작음 (handoff은 세션 전체 토큰의 ~5%).

→ **조치**: "-74% of handoff only" 명시. 세션 전체 M1 기여는 -3~5%로 보수적 기술.

**Finding F12 (LOW, 신규)**: 5-layer 경계 (Facts/Story/Reasoning/Action/Caution) 모호성. "Story" 와 "Reasoning" bleed 리스크 RFC 본문 인정하지만 unit test 3개에 이 경계 검증 없음.

→ **조치**: RED test 4 추가: "compress5Layer(input) 결과에서 Facts 섹션에 이유(reasoning) 표현 0회".

---

### RFC-003 ToolSearch + Artifact Cache

**Finding F5 (MED)**: RFC-006 Cascade Routing과 치명적 충돌. Cascade는 Haiku 60% 분포 목표, **Haiku는 tool_search 미지원**. Cascade 활성 + ToolSearch 활성 시 Haiku tier-2 subagent는 ToolSearch 효과 0.

→ **조치**: RFC-003에 "Cross-RFC Interaction with RFC-006" 섹션 신설. 결정:
1. Haiku tier-2는 non-deferred catalog full load (ToolSearch 효과 포기)
2. ToolSearch 효과는 Sonnet/Opus tier에서만 측정
3. 또는 Haiku tier-2 Sonnet 업그레이드 (별도 비용)

**Finding F7 (MED)**: "합산 -27%" (ToolSearch -15% + Artifact Cache -12%). **단순 합산 위험** — 두 후보가 동일 토큰 경로 일부 중복.

→ **조치**: "단순 합산 ≠ 실제 절감" 경고. Stage 5.6에서 **독립 측정 후 집합 측정** 2회 필수.

---

### RFC-004 Classical Toolchain

**Finding F1 (HIGH, 치명)**: `A_TEAM_CLASSICAL_TOOLS=1` **default ON** 으로 문서화. 이건 **Criterion 8 (Opt-in 가능) 위반**. Opt-in = 기본 비활성. Opt-out = 기본 활성.

→ **조치 (필수)**: default `=0`로 수정. 명시적 활성화 요구.

```diff
- A_TEAM_CLASSICAL_TOOLS (default=1)
+ A_TEAM_CLASSICAL_TOOLS (default=0, opt-in)
```

**Finding F10 (LOW)**: Windows 지원 명시하지만 사용자 환경은 MINGW64 (Git Bash). scoop/choco 가정은 일반 PowerShell 환경. MINGW64에서 `~/.local/bin` PATH 추가 동작 실제 검증 필요.

→ **조치**: `scripts/install-classical-tools.sh` MINGW64 분기 추가, 설치 검증은 Wave 1 착수 시 실기 테스트.

**Finding F13 (LOW, 신규)**: `rg --json` 파싱 오류 시 M4 저하 리스크 본문 인정. 3 RED tests에 **JSON 파싱 오류 케이스 없음**.

→ **조치**: RED test 4 추가: "rg가 malformed JSON 반환 시 native Grep으로 graceful fallback + M4 유지".

---

### RFC-005 promptfoo + Langfuse

**Finding F14 (MED, 신규)**: promptfoo OpenAI 인수 (2026) 언급했지만 라이선스 변경 대응 구체성 없음. MIT 유지 표명에도 backlash 가능.

→ **조치**: RFC에 "License watch" 섹션: (1) 버전 고정 (`promptfoo@^0.x`), (2) fork fallback 플랜, (3) 6개월마다 CHANGELOG 리뷰.

**Finding F15 (LOW, 신규)**: Langfuse PII 마스킹 policy에 **untrusted input** (RFC-007 Spotlighting 대상) 처리 명시 없음. trace에 datamarked 입력 그대로 들어가나? encoding된 base64 그대로 저장?

→ **조치**: `observability/hooks/masking.js` 에 "spotlighted content은 pattern 유지하며 trace" 명시.

---

### RFC-006 Cascade + Budget-Aware Routing

**Finding F9 (LOW)**: Haiku over-confidence로 M4 dip 리스크 본문 인정. "red-team test set" 언급하지만 구체 dataset 부재.

→ **조치**: `tests/red-team/cascade-correctness/` 디렉터리 + 최소 30케이스 (known-hard: multi-hop reasoning, ambiguous spec, counter-intuitive logic).

**Finding F5 반복**: RFC-003과 tool_search 충돌. 해결 policy 부재.

→ **조치**: RFC-006 본문에 "Interaction with RFC-003" 섹션 추가: Haiku tier-2는 ToolSearch 우회, non-deferred catalog 사용.

**Finding F16 (LOW, 신규)**: Budget tracker tiktoken 의존. **Python 기반**. A-Team은 TS. Node.js `tiktoken` 패키지 (tiktoken-node) 검토 필요.

→ **조치**: 의존성 옵션 2개 명시: (a) `@anthropic-ai/tokenizer` (공식), (b) `tiktoken-node` fallback.

---

### RFC-007 Spotlighting + Worktree

**Finding F2 (HIGH)**: Success Criteria에 "security mitigation +90% ASR 감소" 명시. **이건 M1–M5 어느 것도 아님**. G5는 M1–M5 기준으로 정의 — Security는 G5 바깥.

→ **조치 (필수)**: G5를 확장 or 별도 Security Gate (G6) 신설.

```
G6 (Security Gate):
- G6-a: Injection ASR (Lakera dataset 50 payloads) < 2%
- G6-b: Lethal Trifecta unattended paths = 0
- G6-c: M1 overhead ≤ 1% (spotlighting token 비용)
- G6-d: M4 unchanged
```

**Finding F17 (MED, 신규)**: Datamarking "<1% token overhead" 주장. 근데 `^` marker가 공백마다 삽입되면 문자열 길이 증가 → 토크나이저 기준 토큰 수 실제로 +5~10% 가능. 측정 없이 주장.

→ **조치**: Stage 5.5 첫 A/B에서 **토큰 수 실측** (tiktoken 또는 `messages.countTokens()`).

**Finding F18 (LOW, 신규)**: Encoding mode (base64)는 LLM이 decode 후 처리. base64 인코딩된 페이로드는 원문보다 길고 (~33% 증가), LLM이 decode 과정에서 추론 비용 추가. "1–2% overhead" 심하게 underestimated.

→ **조치**: encoding mode는 **고위험만** (현재 명시), + 실측 후 허용 여부 결정.

---

## Meta-Level Findings

### F3 (HIGH) — Earned Integration 원칙 위반

MANIFEST 명시: "이론적 수용 금지. Baseline 벤치마크를 이긴 후보만 통과."

그런데 여러 문서에 "**예상 통과**", "**G5 통과 예상**", "**pre-estimate**" 등 표현 사용:
- RESUME_STATE.md: "모든 6 DD G5 통과 예상"
- EXECUTIVE_SUMMARY.md: "예상 집합 효과 M1 -40~50%"
- 개별 DD 문서: "G5 pre-estimate"

→ **조치 (필수)**: 모든 "예상/pre-estimate" 표현에 **"실측 전 추정, Gate 판정은 Stage 5.6 이후"** 주석 부착. 승인 여부는 실측만.

### F8 (LOW) — 통계 Power

BASELINE_SPEC: "각 벤치 3회 반복, σ < mean × 0.1". **3 샘플로 표준편차 계산은 statistical power 약함** (신뢰구간 넓음, outlier 민감).

→ **조치**: 3회 → **5회**로 상향 권고. 비용 증가 감수 or 대안 (bootstrap variance).

### F19 (MED, 신규) — Stage 5.5 설계 누락

option (b) 채택으로 Stage 5.5 실제 prototype 없이 RFC까지만 작성. **하지만 G5 gate는 prototype 실제 측정 필수**. 현재 모든 "G5 통과" 주장은 **실측 없는 추정**이라 Meta-Principle 위반.

→ **조치**: Wave 1 착수 시 각 RFC마다 prototype + A/B 먼저, RFC 수용은 **그 이후**.

---

## Cross-RFC Integration 리스크

### X1: RFC-003 × RFC-006 (해결 필요)
Haiku tool_search 미지원 → Cascade 분포 목표(Haiku 60%)와 ToolSearch 효과 충돌.

### X2: RFC-005 × RFC-007 (해결 필요)
Spotlighted content이 Langfuse trace에 들어갈 때 마스킹/datamark 정책.

### X3: RFC-001 × RFC-002 (해결 필요)
Compressed handoff의 cache invalidation.

### X4: 수치 단순 합산 금지
M1 -40~50% 집합 예상은 overlap 고려 안 함. 실측 전까지 **-30~50% 범위**로 보수화 권고.

---

## 반영할 수정사항 (이 리뷰 후속)

**HIGH priority (즉시 수정)**:
1. ✅ RFC-004 default `=0` (Opt-in 준수)
2. ✅ RFC-007에 G6 Security Gate 도입
3. ✅ 모든 "예상 통과" 표현에 실측 전 주석 부착

**MED priority (Wave 1 착수 전)**:
4. RFC-001+002 Cache invalidation 정책 섹션 추가
5. RFC-003+006 cross-interaction policy 명시
6. RFC-005 Langfuse PII policy에 spotlighted content 처리
7. 단순 합산 금지 경고 EXECUTIVE_SUMMARY + INTEGRATION_ROADMAP에 추가
8. RESUME_STATE에 "실측 전 추정" 전역 disclaimer

**LOW priority (Wave 1 실행 시)**:
9. BASELINE_SPEC 3회 → 5회 상향 검토
10. RFC-004 MINGW64 실기 테스트
11. RFC-006 red-team test dataset 명시
12. RFC-007 datamarking 실측 후 overhead 재계산

---

## Earned Integration 준수 선언

이 리뷰 이후 다음을 원칙으로 확립:
> **모든 M1~M5 수치는 Stage 5.5 prototype + Stage 5.6 A/B 측정 후에만 확정. 그 전까지는 "추정" 명시.**

---

## F20 (HIGH, 2026-04-14 추가) — Version Regression Prevention

**사용자 지시**: "통합하면서 이전 버전에서 퍼포먼스 손실이 나선 안돼."

**기존 G5 한계**: G5-b는 "vs 원본 baseline"만 검증. Wave 2/3이 Wave 1 대비 퇴행해도 원본 대비 개선이면 통과 가능 → **누적 버전 간 퇴행 차단 불가**.

**조치 (MANIFEST.md에 반영됨)**:
- **G7 No Regression Across Versions** 신설
- Wave 별 git tag `v-wave-N` + `PERFORMANCE_LEDGER.md` 시계열 기록
- 다음 Wave baseline = 직전 Wave tag
- G7-a~e 5개 조건 (모든 메트릭 유지, M4 절대 하락 금지 등)
- `scripts/verify-g7.js` 자동화 (미래 구현)

**Meta-Principle 확장**:
> "Earned Integration + **No Regression Across Versions**": 개선 증명만으로 부족, **기존 수용분 유지/개선도 함께 증명** 필요.

---

**Date**: 2026-04-14 | **Reviewer**: Self-adversarial
**Methodology**: Selection Criteria 8/8 + P1-P8 + G5 + Meta-Principle
**Related**:
- `MANIFEST.md` (기준 정의)
- `rfc/RFC-001~007.md` (대상)
- `final/EXECUTIVE_SUMMARY.md` + `INTEGRATION_ROADMAP.md` + `PRIORITY_MATRIX.md`
