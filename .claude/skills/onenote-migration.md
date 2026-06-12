---
name: onenote-migration
description: OneNote HTML → Markdown 마이그레이션 패턴 — SECTION_MAP, verify, fetch ≠ migration
tags: [onenote, migration, markdown, cortex, html]
---

# OneNote Migration

## 언제 사용

- OneNote HTML 파일을 Cortex Markdown으로 마이그레이션할 때
- 누락 페이지 감지 및 복원 시
- `migrate-onenote-html.mjs` 실행 전후

## 패턴

### 핵심 원칙: fetch ≠ migration

`migrate-onenote-html.mjs`는 **SECTION_MAP에 등록된 섹션만** 처리.
미포함 섹션은 무음 스킵 → 실사 없이 "완료" 선언 금지.

실사 사례: 2026-06-11, `3_Archive` 451개 페이지 전량 누락 발견.

### 실행 전 체크

```bash
# 1. 원본 소스 파일 확인 (의무 - 미확인 상태 배포 = Truth Contract 위반)
ls /path/to/onenote-source/*.html | head -20

# 2. SECTION_MAP coverage 확인
grep "SECTION_MAP" scripts/migrate-onenote-html.mjs

# 3. 누락 섹션 있으면 SECTION_MAP 먼저 업데이트
```

### 마이그레이션 실행 흐름

```bash
# 1. dry-run (실제 변경 없이 미리보기)
node scripts/migrate-onenote-html.mjs --dry-run

# 2. apply (실제 마이그레이션)
node scripts/migrate-onenote-html.mjs --apply

# 3. verify (반드시 실행, PASS 후에만 완료 선언)
node scripts/verify-migration.mjs
```

`verify-migration.mjs` PASS 후에만 "완료" 선언 가능.

### OneNote 링크 분석 순서

```
onenote: 링크 분석 시:
1. page-id로 실제 소스 .md 존재 여부 먼저 확인
2. base-path (노트북명)만 보고 "다른 노트북" 오진 금지
3. page-id 기반으로 원본 HTML 위치 추적
```

### 누락 페이지 보충

```bash
# 누락 페이지 감지
node scripts/audit-onenote-pages.mjs

# 개별 페이지 fetch
node scripts/onenote-fetch-missing.mjs --page-id <ID>
```

## 디렉토리 구조

```
cortex/4/interstellar-onenote/
├── 1_Projects/
├── 2_Areas/
├── 3_Archive/     ← SECTION_MAP 미포함 시 누락 위험
└── 4_Resources/
```

## 주의사항

- 원본 소스 파일 확인 없이 작업 시작 금지
- SECTION_MAP 미포함 섹션은 무음 스킵 — 신규 소스 섹션 추가 시 coverage 먼저 확인
- 마이그레이션 완료 기준 = `verify-migration.mjs` PASS
- HTML 소스 경로: `cortex/4/interstellar-onenote/*.onenote.html`
