---
description: /ppt — 업무용 PPT 자동 생성 (.pptx, 한글 지원, AI 느낌 차단)
---

# /ppt — 업무용 PPT 생성

> python-pptx 기반. 실제 편집 가능한 .pptx 출력. Malgun Gothic 한글 완전 지원.

## 사용법

```
/ppt "Q1 사업 성과 보고"
/ppt "신규 사업 기획안" --theme executive --slides 15
/ppt "팀 교육자료" --theme minimal
/ppt "투자 제안서" --data data.json
```

## 플래그

- `--theme`: consulting(기본) / minimal / executive
- `--slides`: 슬라이드 수 (기본: 10-12)
- `--data`: 실제 데이터 JSON 파일 경로 (수치 자동 삽입)
- `--author`, `--company`, `--date`: 메타 정보
- `--spec-only`: JSON 스펙만 생성 (generate 미실행)

## 테마 선택 가이드

| 테마 | 적합한 상황 | 색상 |
|------|-----------|------|
| consulting | 실적 보고, 전략 발표, 데이터 중심 | 네이비/블루 |
| executive | 임원 보고, 투자 제안, 공식 프레젠 | 다크/레드 |
| minimal | 내부 공유, 교육 자료, 심플 브리핑 | 흑백 모노 |

## 레이아웃 유형 (8종)

| 레이아웃 | 용도 |
|---------|------|
| cover | 타이틀 슬라이드 |
| agenda | 목차 |
| section_break | 챕터 구분 |
| single | 핵심 주장 + 불릿 (최대 3개) |
| two_column | 비교 / 좌우 대비 |
| data_table | 수치 표 |
| quote | 핵심 메시지 인용 |
| closing | 마무리 / Q&A |

## 워크플로우

### Step 1: 요청 파악

사용자 입력에서 추출:
- 발표 목적 (보고/기획/교육/설득)
- 청중 (임원/팀원/외부)
- 제공된 데이터 (있으면 data 파라미터로)
- 슬라이드 수, 테마

### Step 2: 콘텐츠 전략

Agent 호출: ppt-strategist
- 내러티브 구조 설계
- 슬라이드별 레이아웃 결정
- JSON 스펙 생성 + 저장

### Step 3: .pptx 생성

```bash
pip install python-pptx  # 최초 1회
python scripts/ppt/generate.py content/ppt/{date}-{slug}/spec.json
```

출력: content/ppt/{date}-{slug}/{title}.pptx

### Step 4: 결과 안내

```
생성 완료:
  파일: content/ppt/{date}-{slug}/{title}.pptx
  슬라이드: {N}장
  테마: {theme}
  
[DATA] 플레이스홀더가 있으면 spec.json을 편집 후 재실행:
  python scripts/ppt/generate.py spec.json --output updated.pptx
```

## python-pptx 설치 확인

```bash
python scripts/ppt/generate.py --help
# 설치 안 된 경우:
pip install python-pptx
```

## 스펙 직접 편집 후 재생성

```bash
# spec.json 수정 후
python scripts/ppt/generate.py content/ppt/2026-05-14-q1-report/spec.json

# 테마 변경
python scripts/ppt/generate.py spec.json --theme executive

# 다른 이름으로 저장
python scripts/ppt/generate.py spec.json --output final.pptx
```
