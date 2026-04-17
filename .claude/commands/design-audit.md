# /design-audit — AI 냄새 감지 + 브랜드 체크

**용도**: 생성된 이미지/비주얼의 AI 냄새 감지, 브랜드 일관성 검사, 개선안 제시.
발행 전 필수 게이트. `/design-generate` 후 자동 호출 또는 수동 실행.

## 실행 흐름

### Step 0: 입력 파싱

```
사용법:
  /design-audit --file content/visuals/2026-04-18-slug/thumbnail.png
  /design-audit --folder content/visuals/2026-04-18-slug/
  /design-audit --describe "중앙에 노트북이 있고 주변에 빛나는 아이콘들, 파란 배경"
  /design-audit --quick (7-point 체크리스트만)

플래그:
  --file        단일 이미지 파일 경로
  --folder      폴더 내 모든 이미지 일괄 감사
  --describe    이미지 설명 텍스트 (이미지 파일 없을 시)
  --brand       브랜드 가이드 경로 (기본: content/brand/style-guide.md)
  --quick       7-point 체크리스트만 (빠른 모드)
  --fix         발견된 문제에 대해 수정 프롬프트 자동 생성
```

### Step 1: Image Critic 분석

`governance/skills/design/agents/image-critic.md` 실행.

분석 항목:
- 구도 (중앙 배치 여부, 여백 처리)
- 색상 (과포화, 팔레트 일관성)
- 텍스처/품질 (AI 과잉 완벽함)
- 사진적 진정성 (조명 일관성, 원근)
- 기능 성능 (작은 썸네일에서 가독성)

### Step 2: Brand Guard 체크

`governance/skills/design/agents/brand-guard.md` 실행.

색상/폰트/스타일 일관성 빠른 체크.

### Step 3: 결과 출력

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 DESIGN AUDIT REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AI 냄새 점수: {N}/10  (0=인간 제작 느낌, 10=명백한 AI)
브랜드 점수:  {N}/10
기능 점수:    {N}/10

종합 판정: ✅ PUBLISH / ⚠️ MINOR_FIXES / 🔄 REGENERATE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
발견된 문제

[CRITICAL — 발행 전 필수 수정]
1. {문제}: {구체적 수정 지시}
   도구: {Canva / 이미지 편집 / 재생성}

[MINOR — 개선 권장]
1. {문제}: {권장 사항}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI 패턴 감지

□ 중앙 배치 주체 — {detected/clear}
□ 과포화 색상    — {detected/clear}
□ 불가능한 조명  — {detected/clear}
□ 플라스틱 질감  — {detected/clear}
□ 손/해부학 오류 — {detected/clear}
□ 텍스트 렌더링  — {detected/clear}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: `--fix` 모드 시 수정 프롬프트 생성

문제 발견 시 자동으로 개선된 재생성 프롬프트 제공:

```
개선된 Midjourney 프롬프트:
"{원본_프롬프트} + [수정사항]"

주요 변경:
- {원인}: {추가/제거한 프롬프트 요소}
```

---

## Quick Mode (7-Point 체크리스트)

`--quick` 플래그 또는 빠른 체크가 필요할 때:

```
AI 냄새 빠른 체크 (7 Points):

□ 주체가 중앙에 없음 (off-center)
□ 색상 과포화 없음
□ 불가능한 조명 없음 (여러 광원 방향 충돌)
□ 브랜드 색상 포함
□ 그레인/텍스처 있음 (완벽하지 않음)
□ 작은 크기(120px)에서도 핵심 요소 인식 가능
□ 같은 브랜드의 다른 자산과 스타일 일관성

6-7개 통과 → PUBLISH
4-5개 통과 → MINOR_FIXES
0-3개 통과 → REGENERATE
```

---

## 사용 예시

```bash
# 단일 이미지 감사
/design-audit --file content/visuals/2026-04-18-ai-marketing/thumbnail.png

# 폴더 전체 일괄 감사
/design-audit --folder content/visuals/2026-04-18-ai-marketing/

# 이미지 없이 텍스트 설명으로 감사
/design-audit --describe "파란 배경에 AI 로봇이 중앙에 있고 주변에 아이콘들 떠있음"

# 문제 발견 + 수정 프롬프트 자동 생성
/design-audit --file thumbnail.png --fix

# 빠른 7-point 체크
/design-audit --file thumbnail.png --quick
```
