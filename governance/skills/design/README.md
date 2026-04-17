# Design Module — AI 디자인팀

> 버전: v1.0 | 상태: Phase 1 설계
> 목표: AI로 생성했다는 티가 나지 않는 프로 수준 비주얼 + 인터랙티브 디자인 자동화
> 철학: 도구는 AI지만 결과물은 디렉터가 있는 스튜디오 수준

---

## 핵심 문제

AI 이미지/디자인의 전형적 실패 패턴:
- **Midjourney 문법** — 과포화 색상, 중앙 배치, 무한히 깔끔한 구도
- **Stock-photo syndrome** — 어디서 본 것 같은 느낌, 개성 없음
- **Typography 무능** — 텍스트가 어색하거나 아예 없음
- **문화적 맥락 없음** — 어느 브랜드에나 붙여도 어울림
- **과잉 완벽함** — 실제 사진/디자인의 '결'이 없음

이 모듈은 그 패턴을 체계적으로 파괴한다.

---

## 아키텍처

```
Design Module
├── agents/
│   ├── art-director.md     — 비주얼 전략 결정 (Opus 4.7)
│   ├── brand-guard.md      — 브랜드 일관성 감시 (Haiku 4.5)
│   └── image-critic.md     — AI 냄새 감지 + 개선안 (Sonnet 4.6)
├── prompts/
│   ├── image-gen.md        — 생성형 AI 이미지 프롬프트 라이브러리
│   ├── thumbnail.md        — 유튜브/블로그 썸네일 특화
│   ├── social-visual.md    — SNS 플랫폼별 비주얼 스펙
│   ├── brand.md            — 브랜드 아이덴티티 + 일관성
│   └── interactive.md      — 인터랙티브 디자인 스펙 (CSS/Framer)
└── stacks/
    ├── starter.md          — $30/월 (Midjourney Basic + Canva Pro)
    ├── pro.md              — $100/월 + Framer
    └── enterprise.md       — $300/월 + 전담 스타일 학습
```

```
.claude/commands/
├── design-brief.md         — 디자인 브리핑 생성 (작업 전 방향 설정)
├── design-generate.md      — 이미지/비주얼 생성 오케스트레이터
├── design-thumbnail.md     — 썸네일 원스탑 생성
└── design-audit.md         — AI 냄새 감지 + 개선안
```

---

## 품질 기준

| 지표 | AI 평균 | 이 모듈 목표 |
|------|--------|------------|
| "AI 만든 것 같아" 식별률 | ~80% | <20% |
| 브랜드 일관성 점수 | 무작위 | >85% |
| 클릭율 (CTR) vs 스톡 이미지 | +0% | +40%+ |
| 썸네일 생성 시간 | 30분 | <5분 |
| 이미지당 비용 | $2-5 (디자이너) | $0.10-0.50 |

---

## AI 냄새 제거 전략 (핵심)

### 1. 스타일 레이어링
단일 모델에 의존하지 않음:
```
Midjourney (기본 구성) → Photoshop (질감 추가) → Canva (타이포)
또는
DALL-E 3 (사진형) → 색보정 + 크롭 조작 → 텍스트 레이어
```

### 2. 레퍼런스 인젝션
AI에게 구체적 레퍼런스 제공:
- "Shot on Fujifilm X100V" → 필름 질감
- "Inspired by Dieter Rams" → 기능주의 미학
- "Like a 1970s science textbook illustration" → 빈티지 인쇄물 느낌

### 3. 의도적 불완전함
- 가벼운 그레인 추가
- 완벽한 대칭 의도적 회피
- 배경에 미세한 노이즈
- "실수처럼 보이는" 구도 여백

### 4. 브랜드 각인
공통 AI 미학에서 탈출:
- 자신만의 색상 팔레트 (HEX 6개 이하로 고정)
- 반복되는 레이아웃 구조 (그리드 시스템)
- 고유한 타이포그래피 조합

### 5. 사진 vs 일러스트 전략
- 사람 포함 이미지: Midjourney보다 DALL-E 3 (손 문제 개선됨)
- 추상/개념: Midjourney (품질 우위)
- 데이터 시각화: 코드 생성 (Recharts/D3)

---

## 인터랙티브 디자인 전략

일반 AI 이미지의 한계를 뛰어넘는 방향:

### CSS 인터랙티브
- Claude → CSS + HTML 코드 생성
- 스크롤 애니메이션, hover 효과
- 정적 이미지 불가한 움직임

### Lottie 애니메이션
- Claude → SVG 경로 설계 → Lottie JSON 변환
- 로딩 화면, 아이콘 애니메이션

### 데이터 비주얼라이제이션
- Claude → Recharts/D3/Observable 코드
- 인터랙티브 차트, 실시간 업데이트 가능

---

## 구현 로드맵

### Phase 1 — Foundation (현재)
- [ ] 에이전트 프롬프트 3개
- [ ] 이미지 생성 프롬프트 라이브러리
- [ ] 썸네일 + SNS 비주얼 스펙
- [ ] 스킬 커맨드 4개

### Phase 2 — Automation
- [ ] Midjourney MCP 연동 (또는 API 래퍼)
- [ ] Make.com 워크플로우 (블로그 발행 → 썸네일 자동 생성)
- [ ] 브랜드 스타일 가이드 자동 생성

### Phase 3 — Intelligence
- [ ] 성과 데이터 기반 비주얼 A/B 테스트
- [ ] 자가 학습 브랜드 일관성 모델
- [ ] 인터랙티브 템플릿 라이브러리

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|---------|
| 2026-04-18 | v1.0 초기 설계 |
