# /doc-sync — 문서 Drift 감지 & 동기화

코드와 문서 사이의 괴리를 **실시간으로 감지**하고 수정한다.
"나중에 문서 업데이트"는 없다 — 코드가 바뀌면 문서도 지금 바뀐다.

## 핵심 문제 의식

코드는 매일 바뀐다. 문서는 바뀌지 않는다. 결과:
- README가 3개월 전 API를 설명
- 아키텍처 문서가 삭제된 컴포넌트를 참조
- 설치 가이드가 현재 환경에서 동작하지 않음

`/doc-sync`는 이 drift를 **측정 가능한 수치**로 만들고 자동으로 좁힌다.

## 언제 사용하나
- `/ship` 또는 `/review` 전 문서 상태 확인
- 릴리즈 전 전체 문서 점검
- "우리 문서 얼마나 썩었지?" 파악할 때
- 새 팀원이 합류하기 전

---

## Phase 1: 문서 인벤토리

```bash
# 모든 문서 파일 수집
find . -name "*.md" -not -path "*/.git/*" -not -path "*/node_modules/*" | sort

# 마지막 수정일 vs 관련 코드 수정일 비교
git log --format="%ci %s" -- docs/ README.md | head -20
```

---

## Phase 2: Drift 측정 (문서별 점수)

각 문서에 대해 **Drift Score** 계산:

```
관련 코드 마지막 수정일 - 문서 마지막 수정일 = Drift 일수

Drift Score:
  0-7일:   🟢 FRESH (신선)
  7-30일:  🟡 STALE (주의)
  30-90일: 🟠 OUTDATED (오래됨)
  90일+:   🔴 DEAD (사실상 폐기)
```

**코드-문서 연결 매핑:**
```bash
# 문서에서 함수/클래스/경로 참조 추출
grep -r "```\|function\|class\|/api/" docs/ --include="*.md" -h | head -50

# 해당 심볼이 코드에 실제 존재하는지 확인
```

존재하지 않는 심볼 참조 = **BROKEN LINK** (즉시 수정 대상)

---

## Phase 3: 카테고리별 분류

### 🔴 즉시 수정 (BROKEN)
- 존재하지 않는 함수/API 참조
- 삭제된 파일 경로 참조
- 작동하지 않는 코드 예제

### 🟠 업데이트 필요 (OUTDATED)
- 30일 이상 stale + 관련 코드 변경 있음
- API 시그니처 변경 (파라미터 추가/제거)
- 환경변수/설정값 변경

### 🟡 검토 권장 (REVIEW)
- 7-30일 stale + 마이너 코드 변경
- 성능 수치/벤치마크 (더 이상 정확하지 않을 수 있음)

### 🟢 유지 (FRESH)
- 7일 이내 또는 관련 코드 변경 없음

---

## Phase 4: 자동 수정

**AUTO-FIX (판단 불필요):**
- 함수명 변경 → 문서에서 일괄 치환
- 파일 경로 변경 → 링크 업데이트
- 코드 예제의 import 경로 수정

**ASK (판단 필요):**
- API 동작 설명 변경
- 아키텍처 섹션 재작성
- 새로운 섹션 추가 필요

---

## Phase 5: Drift 리포트 + 점수

```markdown
# 문서 Drift 리포트 — 2026-03-23

## 전체 문서 건강도: 67/100

| 파일 | 상태 | Drift | 문제 |
|------|------|-------|------|
| README.md | 🟢 FRESH | 2일 | — |
| docs/api.md | 🔴 BROKEN | 45일 | 3개 없는 함수 참조 |
| docs/setup.md | 🟠 OUTDATED | 38일 | 환경변수 2개 변경됨 |
| ARCHITECTURE.md | 🟡 REVIEW | 12일 | 마이너 컴포넌트 변경 |

## 자동 수정: 5건
## 검토 필요: 2건
## 다음 점검 권장: 7일 후
```

---

## 완료 출력
```json
{
  "status": "DONE | DONE_WITH_CONCERNS",
  "doc_health_score": 67,
  "broken": 1,
  "outdated": 2,
  "auto_fixed": 5,
  "needs_review": 2,
  "report": ".context/doc-reports/YYYY-MM-DD.md"
}
```

## `/ship`과의 연동

`/ship` 실행 시 자동으로 `/doc-sync --quick` 실행 (BROKEN 항목만 체크).
전체 감사는 독립적으로 `/doc-sync` 실행.

## 원칙
- "문서는 나중에" 없음 — drift는 쌓이면 갚기 더 어려워진다
- AUTO-FIX는 기계적 수정만 — 내용 판단은 항상 사람에게
- 점수가 < 50이면 `status: DONE_WITH_CONCERNS`
