# 워크플로우 — 팀 운영 패턴

## 기본 팀 셋업 워크플로우

```bash
# 1. 리더 Identity 설정
export CLAWTEAM_AGENT_NAME="leader"
export CLAWTEAM_AGENT_TYPE="leader"

# 2. 팀 생성
clawteam team spawn-team my-team -d "프로젝트 설명" -n leader

# 3. 태스크 생성 (의존성 포함)
T1=$(clawteam --json task create my-team "DB 마이그레이션" -o worker1 | jq -r '.id')
T2=$(clawteam --json task create my-team "백엔드 API" -o worker2 --blocked-by $T1 | jq -r '.id')
T3=$(clawteam --json task create my-team "프론트엔드" -o worker3 --blocked-by $T1 | jq -r '.id')
clawteam task create my-team "통합 테스트" -o worker4 --blocked-by $T2,$T3

# 4. 워커 스폰 (tmux + worktree, 병렬)
clawteam spawn --team my-team --agent-name worker1 --task "DB 마이그레이션 수행"
clawteam spawn --team my-team --agent-name worker2 --task "백엔드 API 구현"
clawteam spawn --team my-team --agent-name worker3 --task "프론트엔드 컴포넌트 구현"

# 5. 모니터링
clawteam board attach my-team      # tmux 타일뷰 (추천)
clawteam board live my-team        # 터미널 칸반

# 6. 완료 대기
clawteam task wait my-team --timeout 3600
```

---

## 에이전트 간 통신 패턴

### 리더 → 워커 (지시)
```bash
clawteam inbox send my-team worker1 "인증 모듈 완료 후 worker2에게 API 스펙 공유해줘"
```

### 워커 → 리더 (보고)
```bash
# 워커 에이전트 내부에서 실행:
clawteam inbox send my-team leader "worker1 완료: auth.js 구현, 테스트 3개 통과"
clawteam task update my-team $TASK_ID --status completed
```

### 브로드캐스트 (전체 공지)
```bash
clawteam inbox broadcast my-team "API 스펙이 변경됐습니다: /auth → /api/auth"
```

### 비파괴적 읽기 (엿보기)
```bash
clawteam inbox peek my-team worker1     # 메시지 삭제 안 함
clawteam inbox receive my-team worker1  # 메시지 소비 (삭제)
```

---

## Plan 승인 워크플로우

복잡한 작업 전 리더가 워커의 계획을 승인하는 패턴:

```bash
# 워커가 계획 제출
clawteam plan submit my-team worker1 "OAuth 구현 계획: passport.js 사용, /auth/google 엔드포인트 추가"

# 리더가 검토 후 승인/거절
clawteam plan approve my-team worker1
# 또는
clawteam plan reject my-team worker1 "passport 대신 직접 구현해줘, 의존성 최소화"
```

---

## 모니터링 패턴

```bash
# 태스크 보드 확인
clawteam board show my-team

# 실시간 갱신 (3초 간격)
clawteam board live my-team --interval 3

# 모든 팀 개요
clawteam board overview

# 웹 대시보드
clawteam board serve --port 8080

# 특정 에이전트 태스크만
clawteam task list my-team --owner worker1
clawteam task list my-team --status blocked
```

---

## 종료 워크플로우

```bash
# 모든 태스크 완료 확인
clawteam task list my-team --status pending      # 비어있어야 함
clawteam task list my-team --status in_progress  # 비어있어야 함

# 순차 종료
clawteam lifecycle request-shutdown my-team worker1
clawteam lifecycle approve-shutdown my-team worker1

# 팀 정리
clawteam team cleanup my-team
```

---

## 크로스 머신 패턴 (SSHFS)

```bash
# 머신 A (리더)
export CLAWTEAM_DATA_DIR=/mnt/shared/clawteam
clawteam team spawn-team remote-team -n leader

# 머신 B (워커) — 같은 공유 경로 마운트
export CLAWTEAM_DATA_DIR=/mnt/shared/clawteam
clawteam team request-join remote-team --agent worker1

# 머신 A에서 승인
clawteam team approve-join remote-team worker1
```

---

## JSON 출력 + 스크립팅

```bash
# 태스크 ID 추출
TASK_ID=$(clawteam --json task create my-team "작업명" | jq -r '.id')

# 팀 상태 파싱
clawteam --json board show my-team | jq '.taskSummary'
# { "total": 6, "pending": 2, "in_progress": 3, "completed": 1, "blocked": 0 }

# 완료된 태스크 목록
clawteam --json task list my-team | jq '[.[] | select(.status == "completed") | .subject]'
```

---

## 실전 팁

| 상황 | 권장 |
|------|------|
| 에이전트 수 | 태스크 수 ÷ 2~3 (너무 많으면 조율 오버헤드) |
| 태스크 크기 | 30분~2시간 단위 |
| 메시지 vs 태스크 | 일회성 신호 → inbox, 지속 상태 → task |
| 인터페이스 합의 | 공유 스펙 파일 먼저 작성, worktree에 커밋 |
| 병목 발견 | `board live` + `task list --status blocked` |
