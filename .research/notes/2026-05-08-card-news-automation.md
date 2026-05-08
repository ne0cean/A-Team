# 카드뉴스 자동화 — 짐코딩

> **출처**: https://youtu.be/501KRO5QSXM (2026-05-08 저장)
> **상태**: 흡수 검토 대기

## 핵심 아이디어

`/카드뉴스` 명령어 한 줄 → 인스타 카드뉴스 8장 자동 생성

## 왜 HTML/CSS인가 (AI 이미지 생성 대신)

- 폰트, 컬러, 간격 **1픽셀 단위** 정밀 제어
- 템플릿 1회 → 100장/1000장 동일 퀄리티
- Claude 구독자 추가 비용 **0원**

## 워크플로우

```
1. 원문 자료 수집 (웹 URL 한국어 번역)
2. Plan Mode로 카드뉴스 제작 계획
3. HTML 8장 자동 생성
4. Playwright CLI로 HTML → 1080×1350 PNG 캡처
5. skill-creator로 전 과정 "스킬"화
```

## A-Team 적용 방안

### 기존 자산 활용
- `scripts/snapshot.js` — Playwright 캡처 이미 존재
- `governance/design/` — 톤/컴포넌트/안티패턴 규칙
- `/design-generate` — 비주얼 생성 오케스트레이터

### 신규 필요
1. **카드뉴스 HTML 템플릿** — `templates/card-news/`
   - 1080×1350 (Instagram portrait)
   - 8장 시퀀스 구조 (Hook → Content → CTA)
2. **`/card-news` 스킬** — `.claude/commands/card-news.md`
   - 입력: URL 또는 텍스트
   - 출력: `content/card-news/{date}-{slug}/slide-{01-08}.png`
3. **Playwright 배치 캡처** — `scripts/card-news-capture.sh`

### 예상 구조

```
/card-news https://example.com/article

→ Step 1: URL 크롤링 + 핵심 추출
→ Step 2: 8장 슬라이드 구성 (Hook/3 Points/CTA)
→ Step 3: HTML 8개 생성 (templates/card-news/base.html)
→ Step 4: Playwright 캡처 → PNG 8개
→ Step 5: content/card-news/{slug}/ 저장
```

## 우선순위

- **현재**: 저장 (별도 프로젝트)
- **트리거**: 인스타그램 콘텐츠 수요 발생 시
- **예상 공수**: 반나절 (기존 Playwright + design 활용)

## 참고

짐코딩 채널: 클로드 코드 활용 콘텐츠 다수
