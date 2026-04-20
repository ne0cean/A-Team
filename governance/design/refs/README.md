# Design References — 10 Production Brand DESIGN.md

> **출처**: VoltAgent/awesome-design-md 66개 브랜드 DESIGN.md 역엔지니어링 중 **가장 영향력 있는 10개** 축약.
> **용도**: designer 서브에이전트가 tone 결정 시 `references:` 필드로 구체 앱 인용. design-auditor가 비교 기준으로 활용.
> **로드**: on-demand. 필요한 브랜드만 Read.

---

## Catalog

| Brand | tone | variant | 파일 |
|---|---|---|---|
| Linear | editorial | editorial | `linear.md` |
| Stripe | editorial | editorial | `stripe.md` |
| Claude (Anthropic) | editorial | minimalist | `claude.md` |
| Vercel | bold-typographic | industrial | `vercel.md` |
| Raycast | soft-pastel | soft | `raycast.md` |
| Arc | soft-pastel | soft | `arc.md` |
| Notion | editorial | minimalist | `notion.md` |
| Figma | playful | soft | `figma.md` |
| Rauno.me | brutalist | brutalist | `rauno.md` |
| Bloomberg Terminal | brutalist | data-dense | `bloomberg.md` |

---

## 사용법

### designer 서브에이전트
사용자 요청에서 키워드 감지 → 유사 tone의 refs 1-2개를 `.design-override.md`에 인용:
```yaml
tone: editorial
references:
  - Linear (governance/design/refs/linear.md)
  - Stripe (governance/design/refs/stripe.md)
```

### design-auditor
PL-01 tone mismatch critique 시 선언된 tone의 ref를 기준으로 **수치 비교** (`## Quantified Constraints` 섹션):
- 선언: `tone: editorial` → Linear/Stripe/Claude/Notion refs 로드
- 실제: shadow blur 24px + bounce easing
- ref 최댓값: `shadow.blur_max_px: 8`, `easing.forbidden: [bounce]`
- → 수치 비교로 위반 판정 (false positive 감소)

각 ref `## Quantified Constraints` 섹션은 YAML 형식으로 `radius / shadow / easing / transition_ms / gradient / color / typography / density` 키를 제공. 선언 tone과 1차 매칭 후 YAML 상수 위반을 0/1로 판정.

### 확장
새 브랜드 추가 시:
1. `{brand}.md` 파일 생성 (템플릿 `_template.md` 참조)
2. 이 README의 Catalog 표 업데이트
3. `reasoning.json` 의 anti_patterns와 교차 검증

---

## 라이선스 / 출처

모든 DESIGN.md는 **공개된 앱의 디자인 시스템을 역엔지니어링**한 것. 브랜드 자산(로고, 실제 폰트 파일) 포함 X. 구조·색·타이포 원칙만 요약.
참고 복제는 inspiration 용도만 — 그대로 카피 금지.
