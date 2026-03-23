# /review — Pre-Landing PR 리뷰 파이프라인

코드를 병합하기 전 실행하는 독립형 전체 검토 파이프라인.
reviewer 에이전트(orchestrator 내부 호출용)와 달리, 이것은 **수동 PR 게이트**다.

## 언제 사용하나
- PR을 열기 전 마지막 검토
- `/ship` 실행 전 품질을 직접 확인하고 싶을 때
- 다른 사람의 코드를 리뷰할 때
- 큰 diff에서 놓친 게 없는지 확인할 때

---

## Phase 1: 베이스 브랜치 감지 & 범위 확인

```bash
# 베이스 브랜치 자동 감지
BASE=$(git remote show origin | grep "HEAD branch" | cut -d: -f2 | xargs)
DIFF_FILES=$(git diff $BASE...HEAD --name-only)
DIFF_STAT=$(git diff $BASE...HEAD --shortstat)
echo "변경: $DIFF_STAT"
```

**범위 drift 체크**: diff가 PR 설명/커밋 메시지와 일치하는가?
- ✅ CLEAN — diff가 의도와 일치
- ⚠️ DRIFT DETECTED — 관련 없는 파일 포함
- ❌ REQUIREMENTS MISSING — 구현이 요구사항 미충족

---

## Phase 2: 2-Pass 리뷰 (Critical → Informational)

### Critical Pass (블로커만)
- SQL/NoSQL/Command injection 가능성
- 인증 우회 경로
- 경쟁 조건 (race condition)
- 데이터 손실 경로
- 하드코딩된 시크릿/자격증명
- LLM 신뢰 경계 (사용자 입력 → AI 프롬프트)

### Informational Pass
- 사이드 이펙트 (전역 상태 변경)
- 매직 넘버/하드코딩된 값
- 데드 코드
- 테스트 누락 경로
- 문서 staleness

**증거 기반 원칙**: "아마 처리됨" 표현 금지. 코드를 직접 읽고 인용.

---

## Phase 3: 디자인 리뷰 (프론트엔드 변경 시만)

`.tsx`, `.vue`, `.svelte`, `.css` 파일이 diff에 있을 때만 실행:
- 기존 컴포넌트와 일관성
- 반응형 처리
- 접근성 (ARIA)
- 불필요한 재렌더링

기계적 수정(CSS 오타 등) → AUTO-FIX
판단 필요 → Phase 6에서 배치 질의

---

## Phase 4: 테스트 커버리지 감사

변경된 코드의 모든 경로를 ASCII로 매핑:
```
[변경 함수]
  ├── 정상 흐름 ✓ 테스트 있음
  ├── 에러 케이스 A ✗ 없음 ← 자동 생성 대상
  └── 엣지 케이스 B ✗ 없음 ← AskUserQuestion
```

**회귀 규칙**: 기존 동작이 깨졌으면 회귀 테스트 즉시 추가. 지연 금지.

---

## Phase 5: Fix-First 파이프라인

**AUTO-FIX 대상** (판단 없는 기계적 수정):
- 오타, 불필요한 공백
- 명백한 스타일 불일치
- 단순 누락된 null 체크

**ASK 대상** (판단 필요):
- 아키텍처 결정
- 테스트 전략 선택
- 디자인 방향

모든 AUTO-FIX 적용 후 → Phase 6에서 ASK 항목 배치 질의

---

## Phase 6: 적대적 리뷰 (diff 크기에 따라 자동 조정)

| diff 크기 | 실행 방식 |
|---|---|
| < 50줄 | 스킵 |
| 50~200줄 | Claude 구조적 리뷰 1회 |
| 200~500줄 | Claude 구조적 + 적대적 2회 |
| 500줄 이상 | 전체 4패스 (구조적 2 + 적대적 2) |

적대적 리뷰 관점: "이 코드를 어떻게 악용할 수 있는가?"

---

## Phase 7: 문서 staleness 체크

변경된 코드와 연관된 `.md` 파일 목록화:
```bash
# 변경 파일 → 관련 문서 매핑
git diff $BASE...HEAD --name-only | xargs -I{} find docs/ -name "*.md" | sort -u
```

stale 문서 발견 시 → `/doc-sync` 실행 권장

---

## 출력 형식

```
## Pre-Landing 리뷰 결과
범위: CLEAN | DRIFT | MISSING
이슈: N개 (CRITICAL X, HIGH Y, MEDIUM Z)

[CRITICAL] src/auth/login.ts:47 — SQL injection 가능
  근거: `db.query("... WHERE id = " + userId)`
  수정: 파라미터화 쿼리 사용

[AUTO-FIXED] src/utils/format.ts:12 — 불필요한 console.log 제거

완료: DONE | DONE_WITH_CONCERNS | BLOCKED
```

## 원칙
- `/ship`의 리뷰 단계를 앞당겨 수동으로 실행하는 것
- reviewer 에이전트는 orchestrator가 자동 호출하는 in-flow 게이트
- 이 커맨드는 사람이 직접 "확인하고 싶을 때" 사용하는 독립 도구
