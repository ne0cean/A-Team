---
description: /ppt — 업무용 PPT 자동 생성. 질문을 하나씩 순차 진행 → 스펙 확정 → PPTX 생성.
---

# /ppt — 업무용 프레젠테이션 생성

> **엔진**: python-pptx (generate_v2.py) — 편집 가능 PPTX

---

## 인테이크 — AskUserQuestion 도구로 순차 질문

**규칙: 반드시 AskUserQuestion 도구를 사용해 질문. 한 번에 하나씩. 모든 답변 전까지 PPT 생성 금지.**

주제가 $ARGUMENTS로 이미 제공됐으면 Q1 생략하고 Q2부터.

---

### Q1 — 주제 (미제공 시)

AskUserQuestion 도구 호출:
> 어떤 PPT를 만들까요? 주제/제목을 알려주세요.

---

### Q2 — 발표 유형

AskUserQuestion 도구 호출:
> 발표 유형을 선택해주세요:
>
> 1. 보고형 — 실적·현황·결과 보고
> 2. 기획형 — 제안·계획·전략 수립
> 3. 교육형 — 내부 교육·온보딩·설명
> 4. 설득형 — 투자 유치·경영진 승인·외부 제안

---

### Q3 — 청중

AskUserQuestion 도구 호출:
> 주요 청중은 누구인가요?
>
> 1. 임원진
> 2. 팀원
> 3. 외부 고객
> 4. 투자자
> 5. 직접 입력

---

### Q4 — 핵심 데이터

AskUserQuestion 도구 호출:
> 핵심 데이터·수치가 있나요?
> 있으면 붙여넣기, 없으면 "없음". (없으면 [DATA] 플레이스홀더로 처리)

---

### Q5 — 슬라이드 수 + 테마

AskUserQuestion 도구 호출:
> 슬라이드 수와 테마를 선택해주세요.
>
> 슬라이드 수:
> 1.  8장 (간결)
> 2. 10장 (기본)
> 3. 12장 (표준)
> 4. 15장 (상세)
>
> 테마:
> A. Dark Editorial   — 사업 보고·전략·데이터
> B. Consulting Clean — 컨설팅·내부 제안서·교육
> C. Executive Deep   — 임원 보고·투자 제안

---

## 스펙 확정 — AskUserQuestion으로 최종 확인

모든 답변 완료 후 AskUserQuestion 도구 호출:
> --- PPT 스펙 확인 ---
> 제목    : {제목}
> 유형    : {보고형|기획형|교육형|설득형}
> 청중    : {청중}
> 슬라이드: {N}장
> 테마    : {dark_editorial|consulting_clean|executive_deep}
> 데이터  : {있음 / 없음 — [DATA] 처리}
> ---------------------
> 이대로 생성할까요? (예/아니오)

"예" 받으면 → 생성 실행.

---

## 생성 실행

```bash
python scripts/ppt/generate_via_intake.py \
  --topic "{제목}" \
  --ptype "{유형}" \
  --audience "{청중}" \
  --slides {N} \
  --theme {테마} \
  --data "{데이터}"
```

출력: `content/ppt/YYYY-MM-DD-{slug}/{slug}.pptx`

---

## 유형별 슬라이드 구조

| 유형 | 흐름 |
|------|------|
| 보고형 | 결론 요약 → 데이터 증거 → 원인 분석 → 시사점 → Next Action |
| 기획형 | 문제 정의 → 기회/목표 → 솔루션 → 실행 계획 → 기대 효과 |
| 교육형 | Why(배경) → What(개념) → How(방법) → Example → 요약 |
| 설득형 | Why Now → What → How → 리스크 대응 → Ask |

---

## 테마

| 코드 | 이름 | 적합한 상황 |
|------|------|-----------|
| `dark_editorial` | Dark Editorial | 사업 보고, 전략 발표, 데이터 |
| `consulting_clean` | Consulting Clean | 컨설팅 보고서, 교육 자료 |
| `executive_deep` | Executive Deep | 임원 보고, 투자 제안 |
