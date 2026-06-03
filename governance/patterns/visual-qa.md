# Pattern: Visual QA 도구 선택

## 언제 사용

UI 변경 후 **시각 QA, 스크린샷 비교, 접근성 검사**를 수행할 때 도구를 선택하기 전에 이 문서를 읽는다.

---

## 핵심 원칙 (불변 규칙)

1. **정적 회귀 감지 = 내부 스킬로 충분** — 코드 수정 전/후 비교, 반응형 스냅샷, ARIA 트리는 `scripts/browser/`로 가능.
2. **동적 탐색 = Glance MCP** — 조건부 분기, 인증, hover/drag, 인터랙티브 탐색은 내부 스킬로 불가.
3. **토큰 효율 우선** — 내부 스킬이 5-10x 저렴. 불필요하게 Glance 사용 금지.
4. **스크린샷은 파일로** — 이미지를 메모리에 올리지 않고 디스크에 저장, 필요 시 Read로 로드.

---

## 도구 선택 기준

| 작업 | 도구 | 이유 |
|------|------|------|
| 코드 수정 전/후 픽셀 비교 | `diff.js` | 토큰 0, 픽셀 레벨 정확도 |
| 페이지 스크린샷 + ARIA + 콘솔에러 | `snapshot.js` | ~400 tok (375×812) |
| 특정 요소만 캡처 | `element.js` | 54-200 tok |
| 선형 멀티스텝 플로우 | `flow.js` | goto/click/fill/wait/screenshot |
| 3개 뷰포트 반응형 QA | `snapshot.js x3` | mobile/tablet/desktop 동시 |
| 조건부 분기 플로우 | Glance MCP | flow.js는 선형 JSON만 지원 |
| 인증 필요 (로그인) | Glance MCP | storageState/cookies 미지원 |
| hover/drag/포커스 상태 | Glance MCP | 내부 액션 목록에 없음 |
| 인터랙티브 즉흥 탐색 | Glance MCP | 세션 연속성 없음 |

---

## 설계 체크리스트

```
[ ] 정적 스크린샷/비교인가? → scripts/browser/ 사용
[ ] 로그인이 필요한가? → Glance MCP 필요
[ ] 조건에 따라 다른 경로인가? → Glance MCP 필요
[ ] 선형 클릭/입력 자동화인가? → flow.js 충분
[ ] 토큰 예산이 빠듯한가? → element.js (요소 단위) 우선
```

---

## 토큰 비용 비교

| 방식 | 스크린샷당 토큰 | QA 세션 합계 | 제어 가능성 |
|------|--------------|------------|-----------|
| Glance MCP | 무제한 스트리밍 | 5,000–20,000+ | 불가 |
| snapshot.js (375×812) | ~400 tok | 500–2,000 | 완전 제어 |
| element.js | 54–200 tok | 필요시만 | 완전 제어 |
| diff.js | 0 tok (픽셀 비교) | 0 | 해당 없음 |

---

## 실행 패턴

```bash
# 단일 스냅샷
node scripts/browser/snapshot.js \
  --url http://localhost:3000 --viewport 375x812 \
  --out /tmp/qa/ --prefix mobile

# 3뷰포트 반응형
for VP in 375x812 768x1024 1440x900; do
  node scripts/browser/snapshot.js --url $URL --viewport $VP --out /tmp/qa/ --prefix $VP
done

# 멀티스텝 플로우
node scripts/browser/flow.js \
  --url http://localhost:3000 \
  --steps '[{"action":"click","selector":"#btn"},{"action":"screenshot"}]' \
  --out /tmp/qa/flow

# before/after 비교
node scripts/browser/snapshot.js --url $URL --prefix before --out /tmp/qa/
# ... 코드 수정 ...
node scripts/browser/snapshot.js --url $URL --prefix after --out /tmp/qa/
node scripts/browser/diff.js --before /tmp/qa/before.png --after /tmp/qa/after.png
```

---

## 내부 스킬 한계 (P0 갭)

| 기능 | 상태 | 대안 |
|------|------|------|
| 조건부 분기 | 미지원 | Glance MCP |
| 세션 지속 (쿠키) | 미지원 | Glance MCP |
| hover/drag | 미지원 | Glance MCP |
| 파일 업로드 | 미지원 | Glance MCP |

---

## 참조

- `scripts/browser/snapshot.js` — 메인 스냅샷 스크립트
- `scripts/browser/flow.js` — 멀티스텝 자동화
- `scripts/browser/diff.js` — 픽셀 비교
- `.claude/agents/ui-inspector.md` — UI 진단 에이전트
- `lesson_internal_qa_vs_glance_mcp.md` (memory/)
