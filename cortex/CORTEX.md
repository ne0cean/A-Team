# Cortex — 개인 지식 워크스페이스 매뉴얼

> A-Team의 개발 지식 + 개인 경험 + 인생 아카이브를 하나로 통합한 제2의 뇌.
> Private 레포 운영. 모든 지식이 여기서 축적되고, 연결되고, 활용된다.

---

## 구조 (PARA 변용 + 6기둥)

```
cortex/
│
├── inbox/                  ← 빠른 캡처. 정리 전 임시 보관.
│
├── projects/               ← P: 시한부 프로젝트 (완료 시 archive로)
│   └── {project-name}/
│
├── pillars/                ← A(reas): 6 Hexagonal Pillars — 인생 영역
│   ├── 1-character/        ← 인격/가치관/정체성
│   ├── 2-mo-chuisle/       ← 관계/가족/사랑
│   ├── 3-string/           ← 인맥/네트워크/커뮤니티
│   ├── 4-interstellar/     ← 커리어/전문성/야망
│   ├── 5-life-xlab/        ← 건강/루틴/실험
│   └── 6-snowball/         ← 재무/자산/복리
│
├── resources/              ← R: 참고 자료 (책 메모, 아티클, 영상 요약)
│   ├── books/
│   ├── articles/
│   ├── videos/             ← YouTube 분석 리포트 등
│   └── courses/
│
├── archive/                ← A: 완료/비활성 (과거 프로젝트, 직장 기록)
│   ├── interstellar/       ← OneNote 원본 (1,639 md)
│   └── work/               ← 직장 아카이브 ('12~'19)
│
├── daily/                  ← Daily Note (YYYY-MM-DD.md)
│
├── thinking-toolkit.md     ← 멘탈 모델/프레임워크 축적
│
└── CORTEX.md               ← 이 파일 (매뉴얼)
```

### PARA 매핑

| PARA | Cortex | 설명 |
|------|--------|------|
| **P**rojects | `projects/` | 시한부. 완료 시 archive/ |
| **A**reas | `pillars/` | 6기둥. 끝나지 않는 인생 영역 |
| **R**esources | `resources/` | 참고 자료. 나중에 쓸 것 |
| **A**rchive | `archive/` | 비활성. OneNote 원본 + 직장 기록 |

### 6 Hexagonal Pillars

| # | 기둥 | 핵심 질문 |
|---|------|----------|
| 1 | Character | 나는 어떤 사람인가? |
| 2 | Mo chuisle | 누구와 함께하는가? |
| 3 | String | 어떤 인맥을 만드는가? |
| 4 | Interstellar | 어디까지 갈 것인가? |
| 5 | Life Xlab | 몸과 루틴을 어떻게 관리하는가? |
| 6 | Snowball | 자산을 어떻게 굴리는가? |

추가 영역:
- **Zeroing** — 원점 복귀/리셋/비전보드
- **Futures options** — 미래 시나리오/학습 방법론

---

## 커맨드

### 입력

| 커맨드 | 용도 | 예시 |
|--------|------|------|
| `/inbox` | 빠른 캡처. 뭐든 일단 저장 | `/inbox 오늘 미팅에서 들은 아이디어` |
| `/idea` | 대화에서 인사이트 추출 → 분류 저장 | `/idea business` |
| `/daily-note` | 오늘 Daily Note 생성/열기 | `/daily-note` |
| `/learn` | 책/강의/영상에서 배운 것 저장 | `/learn book 제목` |

### 정리

| 커맨드 | 용도 |
|--------|------|
| `/tidy-inbox` | inbox/ 파일들을 적절한 위치로 분류 이동 |
| `/cortex-graph` | 지식 그래프 생성 — 고립 노드/연결 부족 식별 |

### 활용

| 커맨드 | 용도 |
|--------|------|
| `/recall` | 키워드로 cortex 전체 검색 (pillars + resources + archive) |
| `/thinking-partner` | 현재 주제에 관련된 cortex 지식 불러와 함께 사고 |
| `/morning` | 아침 루틴 — 목표 상기 + One Thing + 오늘 할 일 |

### 회고

| 커맨드 | 용도 |
|--------|------|
| `/daily-review` | 어제 변경사항 분석 + 오늘 우선순위 제안 |
| `/weekly-review` | 주간 회고 — 6기둥별 진척 확인 |

---

## 워크플로우

### 1. 일상 흐름

```
아침: /morning → Daily Note 확인 → One Thing 설정
작업 중: /inbox로 즉시 캡처 (생각 중단 안 함)
대화 후: /idea로 인사이트 추출
저녁: /daily-review → 내일 우선순위
주말: /weekly-review → 6기둥 점검
```

### 2. 지식 입력 흐름

```
새 지식 발생
    ↓
inbox/에 캡처 (/inbox)
    ↓
/tidy-inbox로 분류
    ↓
┌─ 프로젝트 관련 → projects/{name}/
├─ 인생 영역 → pillars/{1-6}/
├─ 참고 자료 → resources/{type}/
└─ 완료/비활성 → archive/
```

### 3. 지식 활용 흐름

```
질문/문제 발생
    ↓
/recall "키워드" → 관련 지식 검색
    ↓
/thinking-partner → 검색된 지식 + 대화로 사고 확장
    ↓
결론/결정 → /idea로 새 인사이트 저장 (복리 성장)
```

---

## 파일 포맷

### 일반 노트

```markdown
---
title: "제목"
pillar: 4-interstellar        # 6기둥 중 해당 (없으면 생략)
tags: [career, decision]
created: 2026-05-25
source: book/meeting/idea/video
---

내용...
```

### Daily Note

```markdown
# 2026-05-25 (일)

## One Thing
-

## 오늘 할 일
- [ ]
- [ ]

## 메모
-

## 회고
-
```

---

## InterStellar 아카이브 관계

OneNote에서 마이그레이션한 1,639개 파일은 `archive/interstellar/`에 읽기 전용으로 보존.
새 지식은 `pillars/`에 작성. 과거 기록이 필요할 때 archive에서 검색.

```
archive/interstellar/           ← 과거 기록 (읽기 전용)
  1_Projects/                   ← OneNote Projects
  2_6 hexagonal pillars.../     ← OneNote 6기둥 원본
  3_Archive/                    ← OneNote Archive

pillars/                        ← 현재 살아있는 6기둥 (활발히 작성)
  1-character/
  ...
```

---

## 원칙

1. **Inbox Zero**: inbox/에 3일 이상 방치 금지. /tidy-inbox로 정리.
2. **6기둥 균형**: weekly-review에서 편중 체크. 0 입력 기둥 알림.
3. **연결 복리**: 노트 작성 시 관련 노트 링크 추가. 고립 노트 최소화.
4. **검색 우선**: 완벽한 분류보다 태그 + 검색이 더 중요. 애매하면 inbox.
5. **AI 보조 분류**: /tidy-inbox에서 Claude가 분류 제안, 사용자가 승인.
