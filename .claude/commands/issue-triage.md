---
description: GitHub 이슈 트리아지 — 자동 분류, 우선순위 배정, CURRENT.md Next Tasks 동기화
---

GitHub 이슈를 분류하고 우선순위를 배정합니다. 인수 없으면 열린 이슈 전체를 트리아지합니다.

## 실행 흐름

### 1. 이슈 목록 조회
```bash
gh issue list --state open --limit 20 --json number,title,body,labels,createdAt
```

### 2. 우선순위 분류 기준
각 이슈를 다음 기준으로 분류합니다:

| 우선순위 | 조건 | 라벨 |
|---------|------|------|
| P0 — 긴급 | 서비스 다운, 데이터 손실, 보안 취약점 | `priority:critical` |
| P1 — 높음 | 핵심 기능 장애, 주요 사용자 영향 | `priority:high` |
| P2 — 보통 | 개선 요청, 부분 기능 오류 | `priority:medium` |
| P3 — 낮음 | 문서, 미미한 UI 이슈 | `priority:low` |

### 3. 라벨 배정
```bash
gh issue edit [number] --add-label "priority:high"
gh issue edit [number] --add-label "type:bug" # 또는 type:feature, type:docs
```

사용자 승인 없이 라벨 배정은 자동으로 진행합니다 (되돌리기 쉬우므로).

### 4. CURRENT.md 동기화
P0/P1 이슈를 `.context/CURRENT.md` Next Tasks에 추가합니다:
```
- [ ] #[번호] [제목] — [우선순위]
```

### 5. 트리아지 결과 보고
```
[이슈 트리아지 완료]
총 N개 이슈 처리:
  P0 (긴급): N개 → CURRENT.md Next Tasks 최상단 추가
  P1 (높음): N개 → CURRENT.md Next Tasks 추가
  P2 (보통): N개 → 라벨만 배정
  P3 (낮음): N개 → 라벨만 배정
```

## 전제 조건
- `gh` CLI 인증 완료
- 저장소에 priority:* 라벨 사전 생성 권장
