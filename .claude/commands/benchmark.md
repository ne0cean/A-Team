# /benchmark — 성능 기준선 시스템

성능을 **측정 가능한 수치로 추적**한다. "빠른 것 같다"가 아닌 "이번 변경 후 p95가 23ms 늘었다".
browse 바이너리 없이도 동작 — 가용한 도구를 자동 감지해 사용.

## 핵심 가치

대부분 프로젝트에서 성능 회귀는 조용히 일어난다:
- PR 하나가 번들 크기를 300KB 늘림 → 아무도 모름
- DB 쿼리가 인덱스를 잃음 → 천천히 느려짐
- 렌더링 사이클이 2배로 늘어남 → 체감은 "좀 느린 것 같은데?"

`/benchmark`는 이를 수치로 포착하고 회귀를 차단한다.

---

## 도구 자동 감지

```bash
# 가용한 도구 확인 (우선순위 순)
which lighthouse 2>/dev/null && echo "lighthouse OK"
which k6 2>/dev/null && echo "k6 OK"
ls ~/.claude/skills/gstack/browse/dist/browse 2>/dev/null && echo "browse OK"
node --version 2>/dev/null && echo "node OK"
curl --version 2>/dev/null && echo "curl OK"
```

가용한 도구로 최대한 측정. 없는 도구의 측정은 스킵 (에러 아님).

---

## 측정 카테고리

### 1. 빌드 성능 (항상 측정)
```bash
# 빌드 시간
time npm run build 2>&1 | tail -5

# 번들 크기 (JS/CSS)
find dist/ -name "*.js" -o -name "*.css" 2>/dev/null | xargs du -sh | sort -h
du -sh dist/ 2>/dev/null

# 번들 분석 (있으면)
which source-map-explorer 2>/dev/null && source-map-explorer dist/*.js
```

### 2. API 응답 시간 (curl 사용)
```bash
# 주요 엔드포인트 측정 (CLAUDE.md의 URL 기반)
for endpoint in $ENDPOINTS; do
  curl -s -o /dev/null -w "%{time_total}" $BASE_URL$endpoint
done
```

p50, p95, p99 계산 (10회 측정 기준).

### 3. 프론트엔드 성능 (Lighthouse 있을 때)
```bash
lighthouse $URL --output=json --quiet 2>/dev/null | \
  python3 -c "import sys,json; d=json.load(sys.stdin); \
  print('Performance:', d['categories']['performance']['score']*100)"
```

Core Web Vitals: FCP, LCP, CLS, TTI

### 4. 브라우저 성능 (browse 바이너리 있을 때)
```bash
# 페이지 로드 타이밍 직접 측정
browse goto $URL
browse text  # 렌더링 완료 시간
browse screenshot  # 시각적 확인
```

### 5. 데이터베이스 성능 (감지 시)
```bash
# 슬로우 쿼리 로그 확인
grep -i "slow\|duration\|ms" logs/*.log 2>/dev/null | tail -20

# N+1 패턴 감지 (ORM 사용 시)
grep -r "forEach\|map.*await\|for.*await" src/ --include="*.ts" | head -10
```

---

## 기준선 관리

### 첫 실행: 기준선 생성
```bash
mkdir -p .context/benchmarks/
# 현재 수치를 기준선으로 저장
```

### 이후 실행: 회귀 감지
```bash
# 기준선과 비교
BASELINE=".context/benchmarks/baseline.json"
```

**회귀 임계값 (자동 DONE_WITH_CONCERNS):**
| 지표 | 회귀 기준 |
|---|---|
| 번들 크기 | +10% 이상 |
| API p95 | +50ms 이상 |
| Lighthouse 점수 | -5점 이상 |
| 빌드 시간 | +30% 이상 |

---

## Phase 실행

### `/benchmark` — 전체 측정
모든 카테고리 측정 + 기준선 비교 + 리포트

### `/benchmark --baseline` — 기준선 갱신
현재 수치를 새 기준선으로 설정 (성능 개선 후)

### `/benchmark --diff` — 회귀만 확인
기준선 대비 악화된 항목만 출력 (CI 친화적)

### `/benchmark --category build` — 단일 카테고리
빌드 성능만 빠르게 확인

---

## 리포트 형식

```markdown
# 성능 리포트 — 2026-03-23

## 요약
빌드: ✅ 2.3s (-0.1s)
번들: ⚠️ 847KB (+89KB, +12%) ← 회귀 감지
API p95: ✅ 145ms (-12ms)
Lighthouse: ✅ 87점 (+2점)

## 번들 회귀 분석
+89KB 원인: moment.js 추가 (lodash로 교체 권장, -68KB 예상)

## 측정에 사용된 도구
- 빌드: node 내장 time
- API: curl (10회 평균)
- 번들: du
- Lighthouse: 미설치 (스킵)
- Browse: 미설치 (스킵)
```

---

## 완료 출력
```json
{
  "status": "DONE | DONE_WITH_CONCERNS",
  "regressions": 1,
  "improvements": 2,
  "baseline_updated": false,
  "report": ".context/benchmarks/YYYY-MM-DD.json",
  "tools_used": ["curl", "du", "time"],
  "tools_skipped": ["lighthouse", "browse"]
}
```

## 원칙
- 도구 없다고 실행 안 됨 금지 — 있는 것으로 최대한 측정
- 수치 없는 "느린 것 같다" 판단 금지
- 기준선 없으면 첫 실행이 기준선 — 이후부터 비교 가능
- 회귀 발견 시 원인까지 분석 (단순 수치 보고 금지)
