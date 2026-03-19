# 03. 모델 선택 가이드

태스크 특성에 따라 모델을 배정한다. 비싼 모델을 쓸 필요가 없는 작업에 쓰지 않는 것이 속도와 비용 모두에 이득이다.

---

## 모델별 강점

| 모델 | 강점 | 약점 |
|------|------|------|
| Claude Opus 4.6 | 복잡한 추론, 아키텍처 설계, 장문 컨텍스트 유지 | 느림, 비용 높음 |
| Claude Sonnet 4.6 | 코딩 품질, 중간 복잡도 태스크, 속도/품질 균형 | Opus 대비 추론 한계 |
| Claude Haiku 4.5 | 반복적 단순 작업, 파일 수정, 요약 | 복잡한 설계 어려움 |
| Gemini 2.5 Pro | 대규모 코드베이스 탐색, 멀티파일 리팩토링 | Claude 대비 지시 정밀도 낮음 |
| Gemini 2.0 Flash | 빠른 클린업, 반복 처리, 포맷 정돈 | 복잡한 로직 변경 어려움 |

---

## 태스크 → 모델 배정표

```
신규 기능 설계            →  Claude Sonnet / Opus
보안 취약점 분석 & 패치    →  Claude Sonnet
아키텍처 리팩토링          →  Claude Sonnet / Opus
코드 중복 제거             →  Claude Haiku / Gemini Flash
성능 최적화 (프로파일링)   →  Gemini Pro / Claude Sonnet
배포 설정 정리             →  Claude Haiku / Gemini Flash
E2E 테스트 작성            →  Claude Sonnet
문서 작성 / 정리           →  Claude Haiku / Gemini Flash
Research (리서치 전용)     →  Claude Haiku (비용 절감)
```

---

## 병렬 배정 예시

```
Agent A (Claude Sonnet):
  - useCanvasInteraction 훅 추출 (아키텍처 리팩토링)
  - WebRTC 공간 오디오 설계 (신규 기능)

Agent B (Gemini Pro / Antigravity):
  - 서버-봇 로직 분리 (클린업)
  - 렌더링 최적화 (성능)
  - E2E 테스트 작성 (반복 작업)
```

Agent B에 태스크가 더 많아도 된다 — 처리 속도가 빠르고 병렬로 실행되기 때문이다.

---

## 비용 절감 팁

```
1. Research 에이전트는 항상 Haiku — 읽기/분석만 하므로 Opus 불필요
2. 명확한 지시가 가능한 작업은 Haiku 또는 Flash 우선 시도
3. 긴 컨텍스트(전체 파일 여러 개)가 필요한 작업은 Gemini Pro (컨텍스트 창 우위)
4. 실패 시 한 단계 위 모델로 에스컬레이션
```
