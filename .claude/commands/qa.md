# /qa — 웹 앱 체계적 QA 테스트

브라우저 자동화로 웹 앱을 8개 카테고리에 걸쳐 체계적으로 테스트한다.
헬스 스코어를 계산하고, 이슈를 심각도별로 분류하며, 수정을 원자적으로 적용한다.

## 사전 요건
`/browse` 데몬이 필요합니다. 설치 확인:
```bash
ls ~/.claude/skills/gstack/browse/dist/browse 2>/dev/null || echo "→ /browse 설치 가이드 참조"
```

## 호출 방법
- `/qa` — 현재 실행 중인 앱 전체 테스트 (CLAUDE.md의 URL 참조)
- `/qa http://localhost:3000` — URL 직접 지정
- `/qa --pages /login,/dashboard` — 특정 페이지만
- `/qa --category visual` — 특정 카테고리만

---

## 8개 테스트 카테고리 (가중치)

| # | 카테고리 | 가중치 | 검사 항목 |
|---|---|---|---|
| 1 | 기능 정확성 | 30% | 핵심 사용자 흐름 동작 여부 |
| 2 | 시각적 품질 | 20% | 레이아웃 깨짐, 겹침, 잘림 |
| 3 | 반응형 | 15% | 모바일/태블릿/데스크탑 뷰포트 |
| 4 | 접근성 | 10% | ARIA, 키보드 내비게이션, 대비 |
| 5 | 성능 | 10% | 로딩 시간, 렌더링 블로킹 |
| 6 | 폼 검증 | 8% | 유효성 검사, 에러 메시지 |
| 7 | 에러 처리 | 4% | 404, 네트워크 오류 UI |
| 8 | 콘솔 에러 | 3% | JS 에러, 경고 |

---

## 실행 절차

### Phase 1: 앱 탐색
```
goto <url>
snapshot  ← 페이지 구조 파악
links     ← 내부 링크 수집
```
주요 페이지 목록 자동 수집 (최대 10개).

### Phase 2: 카테고리별 테스트

각 페이지 × 각 카테고리 조합으로 테스트:

**기능 테스트 예시:**
```
# 로그인 흐름
goto /login
snapshot
fill @e1 "test@example.com"  → fill @e2 "password" → click @e3
snapshot  ← 로그인 성공 확인
screenshot  ← before 저장
```

**반응형 테스트:**
```
# 각 뷰포트에서 스크린샷
viewport 375x667   ← 모바일
screenshot
viewport 768x1024  ← 태블릿
screenshot
viewport 1440x900  ← 데스크탑
screenshot
```

**콘솔 에러:**
```
console  ← JS 에러, 경고 수집
```

### Phase 3: 헬스 스코어 계산

```
헬스 스코어 = Σ(카테고리 점수 × 가중치)

예시:
기능(85%) × 0.30 = 25.5
시각(70%) × 0.20 = 14.0
반응형(90%) × 0.15 = 13.5
...
총점: 78 / 100
```

### Phase 4: 이슈 분류 및 수정

**심각도별 분류:**
- 🔴 **CRITICAL** (즉시 수정): 기능 완전 불작동, 데이터 손실
- 🟠 **HIGH** (수정 권장): 주요 흐름 일부 불작동
- 🟡 **MEDIUM** (개선 권장): 시각적 문제, 성능
- 🟢 **LOW** (참고): 미세 개선 사항

**원자적 수정 적용:**
```
각 이슈: 수정 → 테스트 → before/after 스크린샷 → 커밋
다음 이슈로 이동 (롤백 가능 단위 유지)
```

### Phase 5: 리포트 생성

```bash
mkdir -p .context/qa-reports/
# 저장: .context/qa-reports/YYYY-MM-DD-HH.md
```

```markdown
# QA 리포트 — [날짜]
URL: [테스트 URL]
헬스 스코어: 78/100

## 요약
- CRITICAL: 1개
- HIGH: 3개
- MEDIUM: 5개
- LOW: 8개
- 자동 수정: 4개

## 이슈 목록

### 🔴 CRITICAL
**로그인 버튼 클릭 시 500 에러**
- 페이지: /login
- 재현: fill email → fill password → click 로그인
- 스크린샷: before.png / after.png (수정 후)
- 수정: [적용된 수정 내용]

### 🟠 HIGH
...
```

---

## 완료 출력
```json
{
  "status": "DONE | DONE_WITH_CONCERNS",
  "health_score": 78,
  "critical": 1,
  "high": 3,
  "auto_fixed": 4,
  "report": ".context/qa-reports/YYYY-MM-DD.md",
  "screenshots_dir": ".context/qa-reports/screenshots/"
}
```

## 원칙
- 수정은 원자적으로 — 이슈 하나씩, 커밋 하나씩
- before/after 스크린샷 필수 (수정 검증)
- CRITICAL 이슈는 수정 후 반드시 재테스트
- 헬스 스코어 < 60이면 `status: DONE_WITH_CONCERNS`
- reviewer 에이전트와 연동: QA 완료 후 reviewer 호출 권장
