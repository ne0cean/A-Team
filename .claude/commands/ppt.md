---
description: /ppt — 업무용 PPT 자동 생성. 인테이크 인터뷰 → 스펙 확정 → Marp 생성. Gamma 수준 퀄리티, 한글 Pretendard 폰트.
---

# /ppt — 업무용 프레젠테이션 생성

> **엔진**: Marp (Markdown + HTML + CSS) — Gamma/Genspark 수준 시각 퀄리티
> **폰트**: Pretendard — 한글 완전 지원
> **출력**: PDF (고품질) / PPTX (PowerPoint 호환) / HTML (인터랙티브)

---

## STEP 1: 인테이크 인터뷰 [STOP — 사용자 응답 대기]

`/ppt`가 호출되면 **즉시 아래 5개 질문을 한 번에** 제시한다.
주제가 이미 제공됐으면 Q1은 생략.

```
PPT 제작을 시작합니다. 아래 항목을 답해주세요.
(모르면 "기본값"이라고 하면 됩니다)

Q1. 주제/제목이 무엇인가요?
Q2. 발표 유형을 골라주세요:
    (1) 보고형 — 실적·현황·결과 보고
    (2) 기획형 — 제안·계획·전략 수립
    (3) 교육형 — 내부 교육·온보딩·설명
    (4) 설득형 — 투자 유치·경영진 승인·외부 제안
Q3. 주요 청중은 누구인가요?
    예) 임원진, 팀원, 외부 고객, 투자자
Q4. 핵심 데이터·수치가 있나요?
    있으면 지금 붙여넣기. 없으면 [DATA] 플레이스홀더로 처리.
Q5. 테마와 슬라이드 수 (기본: ko-dark, 10장)
    테마: ko-dark(사업보고) / ko-light(컨설팅) / ko-executive(임원보고)
```

사용자가 응답하면 → **STEP 2**로 진행.

---

## STEP 2: 스펙 확정 [STOP — 사용자 확인]

인테이크 응답을 분석해 아래 스펙을 도출하고 **한 블록으로 요약 제시**:

```
--- PPT 스펙 확인 ---
제목    : {제목}
유형    : {보고형|기획형|교육형|설득형}
청중    : {청중}
슬라이드: {N}장
테마    : {ko-dark|ko-light|ko-executive}
구조    : 커버 → 목차 → [섹션01: 슬라이드 제목들] → [섹션02: ...] → 클로징
데이터  : {있음 / 없음 — [DATA] 처리}
-----------------------
이대로 진행할까요?
```

확인 받으면 → **STEP 3**으로 진행.

---

## STEP 3: 슬라이드 구조 설계

유형별 내러티브 구조 적용:

| 유형 | 흐름 |
|------|------|
| 보고형 | 결론 요약 → 데이터 증거 → 원인 분석 → 시사점 → Next Action |
| 기획형 | 문제 정의 → 기회/목표 → 솔루션 → 실행 계획 → 기대 효과 |
| 교육형 | Why(배경) → What(개념) → How(방법) → Example → 요약 |
| 설득형 | Why Now → What → How → 리스크 대응 → Ask(요청 사항) |

슬라이드 구성 원칙:
- 각 섹션은 `section_break` 슬라이드로 시작
- 데이터 집중 슬라이드는 `data_table` 또는 메트릭 카드 컴포넌트
- 비교 슬라이드는 2열 그리드
- 핵심 메시지 1개는 `quote` 레이아웃
- 같은 레이아웃 3장 연속 금지

---

## STEP 4: 마크다운 생성

Agent `marp-writer` 호출:
- `scripts/ppt/examples/marp_comparison.md` 참조 (컴포넌트 패턴)
- `scripts/ppt/examples/marp_sample.md` 참조 (전체 카탈로그)
- Anti-AI 라이팅 룰 전면 적용 (`governance/skills/ppt/anti-ai-writing.md`)

**Anti-AI 핵심 룰**:
- 헤드라인 = 결론 + 수치 ("Q1 매출 23억 달성 — 목표 대비 +7%")
- 불릿 최대 3개 / 슬라이드, 최대 30자 / 불릿, 명사형 마무리
- 금지 표현: "다양한", "혁신적", "상당한", "지속적으로", "전략적으로", "추진 중"
- 수치 없으면 반드시 `[DATA: 설명]` 플레이스홀더

저장: `content/ppt/YYYY-MM-DD-{slug}/{slug}.md`

---

## STEP 5: 변환 실행

```bash
cd "content/ppt/YYYY-MM-DD-{slug}"

# PDF (최고 품질 — 공유/인쇄 권장)
npx @marp-team/marp-cli {slug}.md --pdf --allow-local-files \
  --theme-set ../../../scripts/ppt/themes/ --output {slug}.pdf

# PPTX (PowerPoint 호환)
npx @marp-team/marp-cli {slug}.md --pptx --allow-local-files \
  --theme-set ../../../scripts/ppt/themes/ --output {slug}.pptx
```

---

## STEP 6: 결과 안내

```
완료:
  content/ppt/{date}-{slug}/{slug}.pdf   ({크기})
  content/ppt/{date}-{slug}/{slug}.pptx  ({크기})

슬라이드 {N}장 / 테마: {theme}

[DATA] 플레이스홀더 {n}개 — 실제 수치 교체 후 재생성 가능
```

---

## 테마 가이드

| 테마 | 배경 | 포인트 컬러 | 적합한 상황 |
|------|------|------------|-----------|
| `ko-dark` | 다크 (#09090b) | 블루 (#3b82f6) | 사업 보고, 전략 발표, 데이터 대시보드 |
| `ko-light` | 화이트 (#ffffff) | 블루 (#2563eb) | 컨설팅 보고서, 내부 제안서, 교육 자료 |
| `ko-executive` | 다크 브라운 (#0c0a09) | 딥 레드 (#9f1239) | 임원 보고, 투자 제안, 공식 발표 |

---

## 빠른 사용

```
/ppt                                                          ← 인테이크 인터뷰 시작
/ppt "Q2 영업 전략 기획안"                                    ← Q1 생략, 나머지 질문
/ppt "Series A 투자 제안서" --theme executive --slides 15     ← 플래그 제공 시 해당 질문 생략
```

---

## 레퍼런스 예제

`scripts/ppt/examples/` 에 포함:
- `marp_comparison.md` — 비교 분석 덱 (컴포넌트 패턴)
- `marp_facebook-ads.md` — 데이터 대시보드 덱 (복잡한 SVG)
- `marp_sample.md` — 전체 컴포넌트 카탈로그

---

## 대안 엔진: python-pptx (텍스트 편집 가능)

```bash
python scripts/ppt/generate.py spec.json --theme consulting
```
스펙 포맷: `governance/skills/ppt/slide-spec-template.json`
