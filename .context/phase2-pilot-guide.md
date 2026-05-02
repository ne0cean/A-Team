# Phase 2 Intel 시스템 파일럿 가이드

> **목표**: Phase 2 Gate 달성 — 마케팅 콘텐츠 1편이 인텔리전스 데이터 인용해 작성됨

## 준비 상태

✅ **구현 완료** (2026-05-02):
- T1-T6: 타입 정의, 에이전트, 커맨드, 집계 스크립트, 테스트 (489 tests PASS)
- `/intel` 커맨드 설치 완료 (~/.claude/commands/intel.md)
- Blueprint 작성 (blueprint-market-intel.md, 726 lines)

## 파일럿 시나리오

### Step 1: 경쟁사 분석

```bash
/intel competitor vercel
```

**예상 결과**:
- 파일: `.intel/competitors/2026-05-02-vercel.json`
- 내용: 가격 티어, 핵심 기능, 포지셔닝
- 터미널 출력: 3-5줄 요약 (티어 수, 기능 수, 데이터 품질)

**검증**:
```bash
cat .intel/competitors/2026-05-02-vercel.json | jq '.dataQuality'
# 기대값: "complete" 또는 "partial"
```

---

### Step 2: 트렌드 수집

```bash
/intel trend "edge computing"
```

**예상 결과**:
- 파일: `.intel/trends/2026-05-02-edge-computing.json`
- 내용: 언급 수, 감정 분석, 핵심 주제, 트렌드 방향
- 터미널 출력: 언급 건수, 트렌드, 긍정도

**검증**:
```bash
cat .intel/trends/2026-05-02-edge-computing.json | jq '.trend'
# 기대값: "rising" / "stable" / "declining" / "dormant"
```

---

### Step 3: 페르소나 정의

```bash
/intel persona "indie hackers"
```

**예상 결과**:
- 파일: `.intel/personas/2026-05-02-indie-hackers.json`
- 내용: JTBD 2개 이상, Pain Points 3개 이상
- 터미널 출력: JTBD 개수, Pain Points 개수, 신뢰도

**검증**:
```bash
cat .intel/personas/2026-05-02-indie-hackers.json | jq '.jtbd | length'
# 기대값: >= 2
```

---

### Step 4: 브리프 생성

```bash
/intel brief edge-saas-launch
```

**예상 결과**:
- 파일: `.context/briefs/2026-05-02-edge-saas-launch.md`
- 내용: 경쟁사 비교표, 타겟 페르소나, 트렌드 요약

**검증**:
```bash
grep -c "## 경쟁사 분석" .context/briefs/2026-05-02-edge-saas-launch.md
# 기대값: 1 (섹션 존재)
```

---

### Step 5: 마케팅 실행 (Phase 2 Gate 달성)

```bash
/marketing-generate --input .context/briefs/2026-05-02-edge-saas-launch.md --format blog
```

**검증 조건**:
1. 블로그 초안에 "According to our competitive analysis..." 문구 포함
2. Vercel 데이터 인용 (가격 또는 기능)
3. analytics.jsonl 이벤트 로그:
   ```json
   {
     "event": "marketing_content_generated",
     "intel_used": true,
     "sources": ["vercel.json", "edge-computing.json"]
   }
   ```

---

## 트러블슈팅

### Paywalled 우회 실패

**증상**: `dataQuality: "low"` + 에러 로그에 "5단계 전부 실패"

**해결**:
1. `.intel/errors/YYYY-MM-DD-{slug}.log` 확인
2. Archive.org/Google Cache 성공률 체크
3. 수동으로 공식 사이트 확인 후 데이터 수정

### 데이터 0건 (트렌드 dormant)

**증상**: `trend: "dormant"`, `mentions: 0`

**해결**: 에러 아님. 다른 키워드 시도 권장.

### 집계 스크립트 에러

**증상**: `/intel brief` 실행 시 "관련 데이터 없음"

**해결**:
```bash
# 수동 집계 테스트
node scripts/intel-aggregate.mjs "edge-saas-launch"

# 디렉토리 확인
ls -la .intel/{competitors,trends,personas}/
```

---

## Phase 2 Gate 판정 기준

✅ **PASS 조건**:
- [ ] 경쟁사 분석 1건 이상 (`dataQuality: "complete"` 또는 `"partial"`)
- [ ] 트렌드 분석 1건 이상 (`trend: "rising"` / `"stable"` / `"declining"`)
- [ ] 페르소나 1건 이상 (`confidence: "high"` 또는 `"medium"`)
- [ ] 브리프 1건 생성 (섹션 3개 존재)
- [ ] 마케팅 콘텐츠에 인텔 데이터 인용 (1개 이상)
- [ ] `analytics.jsonl`에 `intel_used: true` 이벤트 1건

---

## 비용 추정

| 작업 | 토큰 (RTK 적용) | 비용 (Sonnet) |
|------|----------------|--------------|
| /intel competitor | ~6,000 tok | $0.02 |
| /intel trend | ~4,000 tok | $0.01 |
| /intel persona | ~5,000 tok | $0.015 |
| /intel brief | ~1,000 tok | $0.003 |
| **합계** | ~16,000 tok | **$0.048** |

**참고**: Paywalled 우회 5단계 전부 실행 시 최대 2배 증가 가능.

---

## 다음 단계

파일럿 완료 후:
1. `.intel/` 디렉토리를 `.gitignore` 확인 (이미 추가됨)
2. CURRENT.md 갱신 — Phase 2 Gate 달성 기록
3. Phase 2.1 확장 고려:
   - 24h 캐싱
   - 자동 리포트 (주간 트렌드 변화)
   - Visualping 통합
