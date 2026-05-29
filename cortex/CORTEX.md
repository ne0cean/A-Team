# Cortex — 개인 지식 워크스페이스

> A-Team 개발 지식 + 개인 경험 + 인생 아카이브를 통합한 제2의 뇌.
> Private 레포. 모든 지식이 여기서 축적되고, 연결되고, 활용된다.

---

## 빠른 시작 (2분 안에)

### 1. 뭐든 캡처
```
/inbox 오늘 미팅에서 나온 아이디어
```

### 2. 정리
```
/tidy-inbox
```
→ Claude가 PARA + 6기둥 자동 분류 제안 → 승인하면 이동

### 3. 찾기
```
/recall 투자 전략
```
→ cortex 전체 검색 (areas + resources + archive + wiki)

### 4. 매일 아침
```
/morning
```
→ 목표 + One Thing + 오늘 할 일 + 과거 노트 1개 랜덤

---

## 실전 시나리오

### 시나리오 1: 작업 중 메모
```
마케팅 기획 중 → "아 이거 나중에 써먹어야지"
→ /inbox 경쟁사 A의 가격 전략이 독특했음
→ 2초 저장 → 계속 작업
→ 나중에 /tidy-inbox
→ Claude: "Areas > 4-interstellar 추천" → 승인
```

### 시나리오 2: 책 읽다 인사이트
```
→ /learn book 타이탄의 도구들
→ Claude: "핵심 인사이트를 알려주세요"
→ 3가지 적음
→ resources/books/에 저장 + 관련 6기둥 태그 자동
```

### 시나리오 3: 대화 중 아이디어
```
→ Claude와 전략 논의 후
→ /idea
→ Claude가 대화 분석 → "Areas > 6-snowball" 판정 → 저장
→ 기존 노트와 [[wikilink]] 자동 연결
```

### 시나리오 4: 과거 기록 검색
```
→ /recall 2017년 CVM 캠페인
→ archive/work/'17_CVM/ 에서 관련 파일 발견
→ 현재 프로젝트에 참고
```

---

## 시스템 구조

```
cortex/
├── inbox/                     ← 빠른 캡처 (미분류, 임시)
├── projects/                  ← P: 시한부 프로젝트 (완료 시 archive로)
├── areas/                     ← A: 6 Hexagonal Pillars (인생 영역)
│   ├── 1-character/           ← 인격/가치관/정체성
│   ├── 2-mo-chuisle/          ← 관계/가족/사랑
│   ├── 3-string/              ← 인맥/네트워크/커뮤니티
│   ├── 4-interstellar/        ← 커리어/전문성/야망
│   ├── 5-life-xlab/           ← 건강/루틴/실험
│   ├── 6-snowball/            ← 재무/자산/복리
│   ├── zeroing/               ← 원점 복귀/비전보드
│   └── futures-options/       ← 미래 시나리오/학습법
├── resources/                 ← R: 나중에 다시 꺼내 쓸 참고 자료
│   ├── books/
│   ├── articles/
│   ├── videos/
│   └── courses/
├── archive/                   ← A: 끝난 것 (비활성, 읽기 전용)
│   ├── interstellar-onenote/  ← OneNote 원본 1,639개
│   └── work/                  ← 직장 기록 ('12~'19)
├── daily/                     ← Daily Note
├── thinking-toolkit.md        ← 멘탈 모델/프레임워크
└── CORTEX.md                  ← 이 파일
```

### PARA 매핑

| PARA | 디렉토리 | 핵심 질문 | 쓰기 빈도 |
|------|---------|----------|----------|
| **P**rojects | `projects/` | 지금 진행 중인 프로젝트는? | 프로젝트 기간 중 |
| **A**reas | `areas/` (6기둥) | 내 인생의 6가지 축은 어떤 상태인가? | 상시 |
| **R**esources | `resources/` | 나중에 다시 볼 참고 자료는? | 학습 시 |
| **A**rchive | `archive/` | 끝났지만 기록은 남겨둘 것은? | 드물게 |

### Resources vs Archive

| | Resources | Archive |
|---|---|---|
| **성격** | 살아있는 참고 자료 | 끝난 기록 |
| **예시** | 책 메모, 영상 요약, 아티클 | 완료 프로젝트, 직장 기록, OneNote 원본 |
| **접근** | 자주 (검색/인용) | 드물게 (필요할 때만) |
| **쓰기** | 추가/갱신 가능 | 읽기 전용 |

### 6 Hexagonal Pillars

| # | 기둥 | 핵심 질문 |
|---|------|----------|
| 1 | Character | 나는 어떤 사람인가? |
| 2 | Mo chuisle | 누구와 함께하는가? |
| 3 | String | 어떤 인맥을 만드는가? |
| 4 | Interstellar | 어디까지 갈 것인가? |
| 5 | Life Xlab | 몸과 루틴을 어떻게 관리하는가? |
| 6 | Snowball | 자산을 어떻게 굴리는가? |

---

## 커맨드 레퍼런스

### 입력 (지식 넣기)

| 커맨드 | 용도 | 예시 |
|--------|------|------|
| `/inbox` | 뭐든 일단 저장 | `/inbox 미팅에서 들은 아이디어` |
| `/idea` | 대화에서 인사이트 추출 → 자동 분류 | `/idea` 또는 `/idea area` |
| `/learn` | 책/영상/강의 요약 저장 | `/learn book 제목` |
| `/daily-note` | Daily Note 생성/열기 | `/daily-note` |

### 정리 (분류하기)

| 커맨드 | 용도 |
|--------|------|
| `/tidy-inbox` | inbox 파일 → PARA + 6기둥 자동 분류 → 승인 후 이동 |

### 활용 (꺼내 쓰기)

| 커맨드 | 용도 |
|--------|------|
| `/recall` | cortex 전체 키워드 검색 |
| `/thinking-partner` | cortex 지식 기반 사고 파트너 |
| `/morning` | 아침 루틴 + 랜덤 과거 노트 |

### 회고 (돌아보기)

| 커맨드 | 용도 |
|--------|------|
| `/daily-review` | 어제 분석 + 오늘 우선순위 |

---

## 자동 분류: 어떻게 작동하나?

**사용자는 PARA만 지정. 6기둥은 Claude가 자동 분류.**

```
/idea area  ← "이건 Areas야" 라고만 알려주면

Claude가 내용 분석:
  "투자 포트폴리오 리밸런싱" → 6-snowball
  "아침 루틴 개선 실험" → 5-life-xlab
  "커리어 전환 고민" → 4-interstellar
  "가족 여행 계획" → 2-mo-chuisle

→ 1줄 제안: "Areas > 6-snowball 추천. 맞나요?"
→ 승인하면 저장
```

PARA도 안 적으면? Claude가 내용 기반으로 PARA까지 자동 판정.
모르겠으면? `/inbox`에 넣고 나중에 `/tidy-inbox`.

---

## 연결 복리 시스템

### wikilink
모든 노트에서 `[[다른-노트]]` 형식으로 연결. 링크가 많을수록 지식 가치 상승.

### cortex-graph
```bash
node scripts/cortex-graph.mjs --stats
```
→ 연결 밀도, 고립 노트, 기둥별 분포 확인

### Serendipity Engine
`/morning`과 `/daily-note` 실행 시 OneNote 아카이브 1,639개에서 랜덤 1개 제시.
잊혀진 과거 인사이트를 우연히 재발견.

### 지식 성숙도
```
seed (초안) → growing (갱신됨) → mature (3+ 연결) → evergreen (실전 사용 확인)
```

---

## 파일 포맷

```yaml
---
title: "제목"
para: areas               # projects | areas | resources
pillar: 4-interstellar    # areas일 때만 (Claude 자동 분류)
tags: [career, strategy]
created: 2026-05-25
source: conversation       # capture | conversation | book | video | meeting
links: []                 # [[wikilink]] 대상
---

내용...
```

---

## FAQ

**Q: 어디에 넣어야 할지 모르겠어요**
A: `/inbox`. 나중에 `/tidy-inbox`로 정리.

**Q: Projects와 Areas 차이?**
A: Projects는 끝이 있음 (출시, 마감). Areas는 끝이 없음 (건강, 커리어).

**Q: Resources와 Archive 차이?**
A: Resources는 다시 꺼내 쓸 참고 자료. Archive는 끝나서 보관만.

**Q: 개발 지식은 어디?**
A: `.wiki/entries/` (A-Team wiki). cortex와 분리되지만 `/recall`로 함께 검색됨.

**Q: OneNote 원본은?**
A: `archive/interstellar-onenote/`에 읽기 전용으로 보존. `/recall`로 검색 가능.
