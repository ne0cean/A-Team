# Performance Ledger — 버전 간 성능 추적

> Wave별 B1–B6 전체 메트릭 실측치 시계열. G7 (No Regression Across Versions) 검증용 SSOT.

---

## 사용 방법

### Wave 완료 시
```bash
# 1. Wave N 통합 완료 후 B1–B6 × 3 runs 실측
npm run bench:all -- --runs 3 --output .bench/wave-N/

# 2. 결과를 이 파일에 append (아래 템플릿)

# 3. Tag 생성
git tag v-wave-N
git push origin v-wave-N
```

### 다음 Wave A/B 시
```bash
# Baseline = 직전 wave tag
git checkout v-wave-N
npm run bench:all -- --runs 3 --output .bench/baseline-wave-N/

# Candidate = Wave N+1 통합 후
git checkout master  # Wave N+1 적용된 상태
npm run bench:all -- --runs 3 --output .bench/wave-(N+1)/

# G7 verification
node scripts/verify-g7.js v-wave-N v-wave-(N+1)
```

---

## Baseline (pre-integration)

_**아직 측정 전**_. 첫 Wave 1 착수 시 `v-baseline` tag 생성 + 실측 후 이 섹션 채움.

| Metric | B1 | B2 | B3 | B4 | B5 | B6 | Avg |
|--------|----|----|----|----|----|----|-----|
| M1 tokens | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| M2 time (s) | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| M3 tool calls | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| M4 correctness | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| M5 regressions | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Composite score | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

**Measurement spec**: `BASELINE_SPEC.md` 참조. 3회 반복 (향후 5회 상향 검토, F8).

---

## Wave 1 (Planned: RFC-001/003/004-P1/007-S)

_**미착수**_. 통합 완료 후 기록.

### Expected (추정, 실측 전)
- M1: baseline -20~30%
- M4: ≥ baseline
- Security ASR: >50% → <2% (RFC-007 Phase S 효과)

### Actual (실측 기록)
| Metric | B1 | B2 | B3 | B4 | B5 | B6 | Δ vs baseline |
|--------|----|----|----|----|----|----|---------------|
| M1 | TBD | ... | ... | ... | ... | ... | TBD |
| M2 | ... | ... | ... | ... | ... | ... | ... |
| M3 | ... | ... | ... | ... | ... | ... | ... |
| M4 | ... | ... | ... | ... | ... | ... | ... |
| M5 | ... | ... | ... | ... | ... | ... | ... |

### G5 (vs baseline) 판정
- [ ] G5-a: ≥15% 개선 1개+
- [ ] G5-b: 모든 메트릭 ≤5% 악화
- [ ] G5-c: M4 ≥ baseline
- [ ] G5-d: B1–B6 중 4개+ 개선
- [ ] G5-e: σ < mean × 0.1

### G7 (vs 직전 Wave) 판정 — Wave 1은 baseline 대비이므로 G5와 동일
N/A for Wave 1.

### Tag
```
git tag v-wave-1 (통합 + 전 gate 통과 후)
```

---

## Wave 2 (Planned: RFC-002/005/006-P1/007-M)

_**미착수**_. Wave 1 완료 후 기록.

### G5 (vs 원본 baseline)
통과 조건은 위와 동일.

### G7 (vs v-wave-1)
- [ ] G7-a: 모든 메트릭 ≥ wave-1 (1% 노이즈 허용)
- [ ] G7-b: M4 절대 하락 금지
- [ ] G7-c: B1–B6 개별 regression 없음
- [ ] G7-d: Wave 1 수용 RFC 기능 훼손 없음 (통합 테스트)
- [ ] G7-e: 이 테이블에 수치 기록 완료

---

## Wave 3 (Planned: RFC-004-P2/006-P2/007-L)

_**미착수**_.

### G7 (vs v-wave-2)
Wave 2와 동일 구조.

---

## Stage 9 Holistic (Planned: 재통합 + 최적화)

_**미착수**_. Wave 3 완료 후.

### G7 (vs v-wave-3)
Stage 9는 Wave 1–3 통합 후 집합 최적화이므로, 개별 RFC 성능이 상호 영향으로 **퇴행**하는지 엄격 검증. 집합 개선이 개별 퇴행을 정당화하지 못함.

- [ ] 각 RFC의 단독 메트릭이 v-wave-3 수준 유지
- [ ] 집합 메트릭이 추가 개선 (중복 제거 효과)

---

## Regression Detection Automation (미래 구현)

`scripts/verify-g7.js` (Wave 1 착수 시 작성):
```javascript
// node scripts/verify-g7.js <prev-tag> <current-tag>
// Returns: exit 0 if G7 pass, exit 1 if regression

const prevMetrics = parseBenchOutput(`.bench/${prevTag}/results.json`);
const currMetrics = parseBenchOutput(`.bench/${currTag}/results.json`);

for (const metric of ['M1', 'M2', 'M3', 'M4', 'M5']) {
  for (const bench of ['B1', 'B2', 'B3', 'B4', 'B5', 'B6']) {
    const prev = prevMetrics[bench][metric];
    const curr = currMetrics[bench][metric];
    const delta = (curr - prev) / prev;

    // M4는 0% 허용치 (절대 하락 금지)
    if (metric === 'M4' && delta < 0) {
      console.error(`G7-b FAIL: ${bench} M4 dropped ${delta * 100}%`);
      process.exit(1);
    }

    // 다른 메트릭은 1% 노이즈 허용, 낮을수록 좋은 메트릭 (M1/M2/M3/M5) 기준
    if (['M1', 'M2', 'M3', 'M5'].includes(metric) && delta > 0.01) {
      console.error(`G7-a FAIL: ${bench} ${metric} regressed ${delta * 100}%`);
      process.exit(1);
    }
  }
}

console.log('G7 PASS: No regression detected');
process.exit(0);
```

CI (GH Actions)에서 매 Wave PR에 자동 실행.

---

## 참조
- `MANIFEST.md` G5 + G7 정의
- `BASELINE_SPEC.md` B1–B6 + M1–M5 측정 방식
- `final/INTEGRATION_ROADMAP.md` Wave 순서 + Gate
- `final/ADVERSARIAL_REVIEW.md` F3/F7/F8 관련 사항
