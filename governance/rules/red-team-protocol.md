# Red Team Protocol — 실행 시점과 강도

> 레드팀/보안 검토의 트리거 조건, 강도, 실행 커맨드를 정의하는 영구 규칙.

## 트리거 매트릭스

| 트리거 | 강도 | 실행 커맨드 | 자동/수동 |
|--------|------|-------------|-----------|
| PR 머지 전 | 경량 (관점 1-4) | `/review` Phase 6 자동 | 자동 |
| 보안 민감 코드 수정 | 전체 (5관점 + CSO) | `/adversarial` + `/cso` | 수동 |
| 출시 전 | 풀 레드팀 | `/adversarial --full` + `/cso` + Semgrep + Garak | 수동 |
| 월간 정기 | CSO 전체 | `/cso` (cold-review 연동) | 수동 |

## 보안 민감 코드 정의

파일 경로/이름에 다음 키워드가 포함되면 보안 민감으로 분류:
```
auth, crypto, token, payment, permission, session,
secret, credential, oauth, jwt, password, api-key
```

이 파일이 변경된 PR은 `/review` Phase 6에서 diff 크기와 무관하게 적대적 리뷰가 자동 트리거된다.

## 강도별 상세

### 경량 (PR 머지 전)
- `/review` Phase 2 Critical Pass (Semgrep 포함)
- `/review` Phase 6 적대적 리뷰 (보안 민감 파일 or 50줄+)
- 소요: 1-3분

### 전체 (보안 민감 코드 수정)
- `/adversarial` 5관점 (Worker-Critic 패턴 권장)
- `/cso` 5축 감사
- 소요: 5-10분

### 풀 레드팀 (출시 전)
- `/adversarial --full` (5관점 + CSO 연동)
- Semgrep 정적 분석: `semgrep scan --config auto --json`
- Garak LLM 펜테스트: `garak --model_type litellm --model_name ollama/qwen2.5-coder --probes encoding,knownbadsignatures`
- 이력 비교: `.context/red-team-history.jsonl` 기반 미수정 취약점 추적
- 소요: 15-30분

### CSO 정기 (월간)
- `/cso` 5축 전체 (Axis 1-5)
- `/cold-review`와 연동하여 cold spot 교차 검증
- `.context/security-reports/YYYY-MM-DD.json`에 저장

## 실행 이력 추적

모든 `/adversarial` 실행 결과는 `.context/red-team-history.jsonl`에 자동 기록.
동일 취약점 2회 이상 반복 발견 시 severity 자동 상향.

## 도구 설치 안내

| 도구 | 설치 | 용도 |
|------|------|------|
| Semgrep | `pip install semgrep` | 정적 분석 (SAST) |
| Garak | `pip install garak` | LLM 자동 펜테스트 |

미설치 시 수동 체크리스트로 대체 (graceful degradation).
