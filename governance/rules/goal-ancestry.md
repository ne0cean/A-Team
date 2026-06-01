# Goal Ancestry — WHY 계보 추적 규칙

> **목적**: 태스크가 "왜" 존재하는지 추적. 컨텍스트 리셋 후에도 방향성 유지.
> **적용 위치**: `CURRENT.md`의 Next Tasks 항목

---

## 규칙

### 1. why 필드 필수 (High Priority 태스크)

`CURRENT.md`의 High Priority Next Tasks 항목에는 반드시 `why:` 계보를 명시한다.

```markdown
- [ ] **태스크명** — 설명
  - why: Phase N 목표 → 상위 목표 → A-Team 비전
```

**Medium / Low Priority**: 선택 사항. 맥락이 불분명한 항목에만 추가.

### 2. why 계보 형식

```
Phase N [완료 기준] → [상위 목표] → [A-Team 비전 연결]
```

예시:
```
Phase 1 분석/BI → 데이터 기반 의사결정 자동화 → 1인 팀의 대기업 수준 운영
Phase 2 인텔리전스 → 시장 트렌드 조기 감지 → 마케팅 자동화 스택 완성
Phase 0 메타 인프라 → 신뢰할 수 있는 실행 루프 → 자율 AI 팀 기반 구축
```

### 3. 업데이트 시점

| 시점 | 동작 |
|------|------|
| `/vibe` 신규 태스크 추가 | `why:` 동시 작성 |
| `/pickup` 기존 태스크 재확인 | `why:` 누락 시 보완 |
| `/end` 태스크 완료 처리 | `why:` 삭제 (태스크와 함께 제거) |
| Phase 목표 변경 | 영향받는 `why:` 전수 업데이트 |

### 4. 단계 표기 규칙

```
Phase N → [목표] → [비전]
```

- `Phase N` — 현재 로드맵 단계 (team-roadmap.md 기준)
- `→` 구분자 고정 (화살표 하나, 공백 포함)
- 3단계 계보: Phase → 중간 목표 → A-Team 비전
- 최소 2단계 이상 (Phase → 비전 직결도 허용)

### 5. 비전 문구 참조

A-Team 비전 (고정):
> 1인 + AI 팀이 대기업 마케팅/디자인/QA/분석 팀 수준 대체

why 계보의 최종 항목은 위 비전의 부분집합이어야 한다.

---

## 안티패턴

```markdown
# 금지: 이유 없는 태스크
- [ ] **MeiliSearch launchd 등록**

# 금지: 비전과 무관한 why
- [ ] **MeiliSearch launchd 등록**
  - why: 편리해서

# 올바른 예시
- [ ] **MeiliSearch launchd 등록**
  - why: Phase 1 검색 인프라 → Cortex 노트 검색 자동화 → 1인 팀 정보 접근 속도 대기업 수준
```

---

## CURRENT.md 적용 예시

```markdown
### High Priority
- [ ] **Dashboard 통합 앱 안정화** — 모바일 UX 피드백, 이미지 업로드 실기기 검증
  - why: Phase 0 인프라 완성 → 일일 업무 루프 신뢰성 확보 → 1인 팀 운영 자동화 기반

- [ ] **모델 오케스트레이션 강제 훅 등록** — enforce-model-param.sh settings.json 등록
  - why: Phase 0 거버넌스 → 모델 비용 과소비 방지 → 지속 가능한 1인 AI 팀 운영

- [ ] **제품 빌드 시작** — Connectome MVP 이번 주 배포
  - why: Phase 0 인프라 → 실제 제품 출시 → Pieter Levels $3.5M/년 벤치마크 달성
```

---

**Last updated**: 2026-06-01
**Related**: `.context/CURRENT.md`, `.context/team-roadmap.md`
