# /land — 배포 신뢰도 검증 파이프라인

PR 머지 후 **배포가 실제로 성공했는지** 검증한다.
머지 자체가 아니라 "프로덕션에서 작동하는가"가 핵심.

## `/ship`과의 차이

| `/ship` | `/land` |
|---|---|
| 머지 전 품질 게이트 | 머지 후 배포 검증 |
| 코드 리뷰, 테스트 | 실제 환경 동작 확인 |
| PR 생성까지 | 서비스 정상화 확인까지 |

## 언제 사용하나
- 배포 후 "실제로 됐는지" 확인할 때
- 인시던트 후 롤백/재배포 검증
- 스테이징 → 프로덕션 승격 전 확인

---

## Phase 1: 배포 상태 감지

```bash
# CLAUDE.md에서 배포 URL + 헬스체크 엔드포인트 읽기
PROD_URL=$(grep -i "production\|prod.*url" CLAUDE.md | head -1)
STAGING_URL=$(grep -i "staging\|local.*url" CLAUDE.md | head -1)

# 최근 배포 커밋 확인
git log --oneline -3
```

배포 URL이 없으면 → AskUserQuestion: "확인할 URL을 알려주세요"

---

## Phase 2: 헬스체크

```bash
# HTTP 상태 확인
curl -s -o /dev/null -w "%{http_code}" $PROD_URL
curl -s -o /dev/null -w "%{http_code}" $PROD_URL/health 2>/dev/null

# 응답 시간 측정
curl -s -o /dev/null -w "%{time_total}" $PROD_URL
```

| 결과 | 판정 |
|---|---|
| 200, 응답 < 2s | ✅ 정상 |
| 200, 응답 2-5s | ⚠️ 느림 — 모니터링 필요 |
| 200, 응답 > 5s | 🔴 성능 저하 |
| 4xx/5xx | 🔴 배포 실패 |

---

## Phase 3: 스모크 테스트

이번 배포에서 변경된 기능을 중심으로 핵심 흐름 검증:

```bash
# 변경된 엔드포인트 목록 (이번 PR diff 기반)
CHANGED_ROUTES=$(git diff origin/main...HEAD -- "*.ts" "*.js" | grep "router\|app\." | head -10)
```

browse 바이너리 있으면:
- 핵심 사용자 흐름 브라우저 자동화 검증
- before/after 스크린샷 비교

없으면:
- `curl` 기반 API 엔드포인트 검증
- 응답 스키마 확인

---

## Phase 4: 롤백 준비도 확인

```bash
# 이전 배포 커밋 확인
git log --oneline origin/main~3..origin/main

# 롤백 명령 생성
PREV_SHA=$(git log --oneline origin/main~1 | cut -d' ' -f1)
echo "롤백 필요 시: git revert $PREV_SHA && git push"
```

롤백 절차를 미리 준비해두고 판정.

---

## Phase 5: 판정 & 알림

**HEALTHY**: 헬스체크 통과 + 스모크 테스트 통과
→ `.context/CURRENT.md` Access URLs 섹션 업데이트

**DEGRADED**: 부분 기능 문제
→ `DONE_WITH_CONCERNS` + 모니터링 지점 명시

**FAILED**: 배포 실패
→ `BLOCKED` + 롤백 명령 즉시 제시

```json
{
  "status": "DONE | DONE_WITH_CONCERNS | BLOCKED",
  "health": "HEALTHY | DEGRADED | FAILED",
  "response_time_ms": 320,
  "smoke_tests_passed": 5,
  "smoke_tests_failed": 0,
  "rollback_sha": "abc1234",
  "rollback_cmd": "git revert abc1234"
}
```

## 원칙
- 배포 확인 없는 "완료" 선언 금지
- 실패 시 롤백 명령을 즉시 제공 (찾는 시간 낭비 방지)
- CLAUDE.md에 배포 URL이 없으면 매번 묻지 않고 한 번만 확인 후 저장 권장
