# A-Team Design Subsystem — Deep Dive Research

**Date**: 2026-04-14
**Context**: AI 냄새 + 디자인 퀄리티 저하 페인포인트 해결
**Research Scope**: AI 에이전트(LLM) 전용으로 설계된 디자인 리소스만 (일반 디자이너용 X)

---

## TL;DR — Top 3 즉시 흡수 대상

1. **Taste-Skill** (Leonxlnx) — Design Variance/Motion/Density 1-10 스케일 + 7 variants (soft/minimalist/brutalist 등). SKILL.md 포팅만으로 즉시 taste 주입.
2. **UI Design Brain** (carmahhawwari) — 60 component best practices + anti-patterns 명시. "Button은 이렇게, Modal은 저렇게" 의사결정 객체화.
3. **Awesome Design MD** (VoltAgent) — Stripe/Linear/Claude 등 **66개 실제 production design system을 markdown으로 역엔지니어링**. Brand selector로 직접 inject.

보조:
4. **Anthropic Frontend Design** (공식) — Tone-first 철학 (brutalist/luxury/playful 극단 선택 강제) + anti-pattern (Inter/purple gradient 금지)
5. **Impeccable** (pbakaus) — 24개 정량 anti-pattern 자동 감지 엔진 + 18개 steering commands (`/audit`, `/polish`, `/critique`)
6. **UX Designer Skill** (szilu) — 9 domain × 2-tier (core SKILL.md + on-demand detail 22 files) 아키텍처, 2026 AI chat UI 트렌드 포함
7. **Figma MCP Server** (공식) — Design↔Code 양방향 sync (tokens 자동 추출, code→figma reverse)
8. **UI/UX Pro Max Skill** (nextlevelbuilder) — 161 industry reasoning rules + 67 styles + 161 palettes + 57 font pairs 데이터베이스
9. **Design Arena** (Arcada Labs YC S25) — Elo 기반 AI 디자인 선호도 crowdsourced benchmark (webdev-arena-preference-10k 공개 데이터셋)
10. **Frontend Design Toolkit** (wilwaldon) — 위 리소스들을 **한 파이프라인으로 묶은 통합 가이드** (10 sections, A-Team 청사진으로 직접 차용 가능)

---

## 핵심 발견 — 왜 이 리소스들이 작동하는가

### 공통 메커니즘
1. **Tone-First Gate** (Anthropic, Taste-Skill) — 생성 전에 극단적 방향 선택 강제 → "generic AI slop" 원천 차단
2. **Explicit Anti-Pattern Lists** (Impeccable, UI Design Brain) — "하지 마" 목록화 → AI가 기본값(Inter, purple gradient, rounded-2xl)으로 회귀 방지
3. **Real Production References** (Awesome Design MD) — 66개 실제 성공 앱 design system → 이론 대신 실사례
4. **Component-Level Decisioning** (UI Design Brain, UI/UX Pro Max) — "좋은 디자인" 추상화 대신 "이 컴포넌트는 이 규칙" 구체적 객체화
5. **Bidirectional Feedback Loop** (Impeccable, Figma MCP) — 생성 후 audit → 실시간 steering

### 1차 리서치와의 차이
1차(표면 스캔)가 놓친 것:
- **Taste-Skill 생태계**: 이미 커뮤니티 표준으로 자리잡은 SKILL.md 포맷
- **UI Design Brain의 60 component DB**: 단순 가이드가 아닌 의사결정 트리
- **Impeccable의 24 anti-pattern 자동 감지**: 1차에서 "없다"고 결론 냈으나 실제 존재
- **Design Arena dataset**: 공개 10K 선호도 데이터로 fine-tuning 가능
- **Frontend Design Toolkit**: 위 모든 리소스를 묶은 통합 청사진 이미 존재

---

## A-Team 흡수 청사진

### 제안 아키텍처
```
User Brief ("SaaS dashboard for fintech, tone: professional")
    ↓
[Tone Selector]       ← Anthropic Frontend Design (극단 선택)
    ↓
[Domain Intelligence] ← UI/UX Pro Max (161 reasoning rules)
    ↓
[Brand Selector]      ← Awesome Design MD (66 production DS)
    ↓
[Component Selection] ← UI Design Brain (60 best practices)
    ↓
[Code Generation]     ← Claude Code + Taste-Skill variants (variance/motion/density)
    ↓
[Design Audit]        ← Impeccable (24-point anti-pattern check)
    ↓
[Bidirectional Sync]  ← Figma MCP (optional)
    ↓
[Quality Benchmark]   ← Design Arena (external reference)
```

### 제안 파일 구조
```
a-team/
├── governance/
│   ├── design-philosophy/
│   │   ├── tone-first-design.md          # Anthropic Frontend Design 철학
│   │   └── design-taste-variants.md      # Taste-Skill 7 variants
│   ├── design-patterns/
│   │   ├── components-reference.md       # UI Design Brain 60
│   │   └── ux-domains.md                 # UX Designer Skill 9 domains
│   ├── design-references/
│   │   └── brands/                       # Awesome Design MD 66 DESIGN.md (submodule)
│   ├── design-validation/
│   │   └── anti-patterns.md              # Impeccable 24 rules
│   └── design-intelligence/
│       ├── reasoning-rules.json          # UI/UX Pro Max 161 rules
│       ├── color-palettes.json           # 161 palettes
│       └── font-pairings.json            # 57 pairs
├── .claude/agents/
│   ├── designer.md                       # Tone/variance selector (신규)
│   ├── design-auditor.md                 # Impeccable 24-point 실행 (신규)
│   └── ui-inspector.md                   # 기존, Impeccable과 통합
└── .claude/skills/
    ├── design-brief/                     # /design-brief 신규 스킬
    ├── figma-bridge/                     # Figma MCP wrapper (Phase 3)
    └── design-system-generator/          # CLAUDE.md 자동 생성 (Phase 3)
```

### 기존 A-Team 컴포넌트 매핑

| 기존 컴포넌트 | 흡수 리소스 | 통합 방식 |
|---|---|---|
| `orchestrator.md` | Taste-Skill + UI/UX Pro Max | Phase 1에 tone/domain selector 추가 |
| `/craft.md` | Anthropic Frontend Design | 생성 전 tone 강제 + anti-pattern 명시 |
| `ui-inspector.md` | Impeccable 24 rules | ARIA 검증 + anti-pattern 자동 감지 |
| `/qa.md` | Design Arena benchmark | 생성 후 품질 점수 산출 |
| `CLAUDE.md` | Awesome Design MD | 프로젝트별 brand DESIGN.md inject |

---

## Top 10 상세 분석

### 1. Taste-Skill ⭐⭐⭐⭐⭐
- **URL**: https://github.com/Leonxlnx/taste-skill
- **핵심**: Design Variance (1-10) + Motion Intensity (1-10) + Visual Density (1-10) + 7 variants (soft/minimalist/brutalist/redesign/output/stitch)
- **왜 작동**: 고정 규칙이 아닌 **파라미터화된 설정 시스템** → AI가 값 조정하며 학습. Framework-agnostic (React/Vue/Svelte 모두).
- **A-Team 포팅**: SKILL.md 구조 그대로 `/governance/design-taste/` 복제. orchestrator에서 프로젝트별 기본값 저장.
- **라이선스**: MIT
- **리스크**: 정량 eval 없음 (주관적)

### 2. UI Design Brain ⭐⭐⭐⭐⭐
- **URL**: https://github.com/carmahhawwari/ui-design-brain
- **핵심**: 60+ component reference, 6 core principle (restraint/typography hierarchy/one accent/8px grid/a11y/context), anti-patterns 명시 (rainbow badges, placeholder-only labels, equal-weight buttons)
- **왜 작동**: 컴포넌트 단위 의사결정 기준 + "Anti-patterns to Reject" 명시적 거부 목록
- **A-Team 포팅**: `components.md` 전체를 `/governance/design-patterns/` 포팅 + 4-step workflow를 orchestrator에 흡수
- **라이선스**: MIT

### 3. Anthropic Frontend Design ⭐⭐⭐⭐
- **URL**: https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design
- **핵심**: Tone-first methodology (brutalist/luxury/playful 극단 선택 강제) + anti-pattern (Inter/Roboto/Arial/Space Grotesk 금지, purple gradient on white 금지)
- **왜 작동**: "Intentionality matters more than intensity" — 방향 강제하면 일관성 확보
- **A-Team 포팅**: 철학만 차용 (`/governance/design-philosophy/tone-first.md`) → 구체는 다른 리소스로 보강

### 4. Awesome Design MD ⭐⭐⭐⭐⭐
- **URL**: https://github.com/VoltAgent/awesome-design-md
- **핵심**: Claude/Stripe/Linear/Figma/Raycast 등 66개 production DS를 markdown으로 역엔지니어링
- **왜 작동**: 마크다운은 LLM-native 포맷. 실제 성공 앱 패턴 → AI가 "이건 Linear식이다" 인식
- **A-Team 포팅**: Git submodule 또는 periodic sync script. orchestrator의 brand selector 단계에 연결.

### 5. Frontend Design Toolkit ⭐⭐⭐⭐⭐
- **URL**: https://github.com/wilwaldon/Claude-Code-Frontend-Design-Toolkit
- **핵심**: Taste-Skill + Impeccable + awesome-design-md 등을 **10 section 파이프라인**으로 조립 (design skills → theming → animation → UI/UX intel → D2C → testing → docs → framework → deploy → stacks)
- **왜 작동**: 개별 리소스들 간 상호작용 명시. "recommended stacks" 큐레이션으로 선택 부담 제거.
- **A-Team 포팅**: **구조 자체를 A-Team design subsystem 청사진으로 직접 차용**

### 6. Impeccable ⭐⭐⭐⭐⭐
- **URL**: https://github.com/pbakaus/impeccable (Philipp Bakaus, Google/Anthropic 경력)
- **핵심**: 24개 정량 anti-pattern 자동 감지 + 18 steering commands (`/audit`, `/polish`, `/critique`)
  - AI slop: side-tab borders, purple gradients, bounce easing, dark glows
  - Quality: line length >80, padding <8px, touch target <44px, skipped heading hierarchy
- **왜 작동**: Feedback loop — 생성 중 실시간 steering. Standalone CLI로 기존 코드 audit 가능.
- **A-Team 포팅**: 24 rule을 `/governance/design-validation/` + detection engine을 `lib/design-smell-detector.ts`로 TS 포팅

### 7. UI/UX Pro Max Skill ⭐⭐⭐⭐
- **URL**: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- **핵심**: 161 industry reasoning rules + 67 styles + 161 palettes + 57 font pairs + 25 chart types. Parallel search + BM25 ranking.
- **왜 작동**: Domain-specific — "fintech → 신뢰성 + 즉시성 색" 같은 컨텍스트 인식
- **A-Team 포팅**: JSON 데이터베이스만 포팅 (`/governance/design-intelligence/`). 추론 로직은 A-Team 고유 확장.
- **리스크**: 미국 중심 bias (한국 startup 맥락 추가 필요)

### 8. Design Arena ⭐⭐⭐⭐
- **URL**: https://www.everydev.ai/tools/design-arena + HuggingFace `lmarena-ai/webdev-arena-preference-10k`
- **핵심**: Elo 기반 AI 디자인 선호도 crowdsourced voting (50+ LLM 추적). 공개 데이터셋 10K+ 투표 기록.
- **왜 작동**: 객관적 ranking. Training data로 활용 가능.
- **A-Team 포팅**: 외부 벤치마크로만 참고 (`/research/design-quality-benchmarks/` mirror). 자체 quality-evaluator fine-tuning 소스.

### 9. UX Designer Skill ⭐⭐⭐⭐
- **URL**: https://github.com/szilu/ux-designer-skill (2026 최신)
- **핵심**: 2-tier (core SKILL.md 23 anti-patterns + 22 on-demand detail guides = 10,700 lines). 9 domain (Foundations/Structure/Platform/Content/Collaboration/Canvas/Modern/Flows/Data).
- **왜 작동**: 토큰 효율 (core는 slim, detail은 on-demand). AI chat UI / ethical design 같은 2026 트렌드 포함.
- **A-Team 포팅**: 2-tier 아키텍처를 **A-Team의 모든 design doc에 적용** (best practice). domain별 on-demand inject.

### 10. Figma MCP Server ⭐⭐⭐⭐
- **URL**: https://github.com/figma (official)
- **핵심**: Figma 파일 직접 read + code→figma reverse export (design tokens, components, auto layout, breakpoints)
- **왜 작동**: Design system SoT를 Figma에 두고 AI가 자동 sync → manual 누락 제거
- **A-Team 포팅**: Phase 3 (Figma 헤비 사용 팀만). MCP wrapper를 `skills/figma-bridge/`로.
- **리스크**: Figma 유료 plan 의존, Code→Figma export는 beta

---

## 구현 로드맵

### Phase 1 (1-2일) — Zero-Dep 흡수
1. `/governance/design-philosophy/tone-first.md` — Anthropic 철학 정규화
2. `/governance/design-taste/variants.md` — Taste-Skill 7 variants 포팅
3. `/governance/design-patterns/components.md` — UI Design Brain 60 포팅
4. `/governance/design-validation/anti-patterns.md` — Impeccable 24 포팅
5. `orchestrator.md`에 "Design Brief" phase 신규 (tone + variance + domain 3질문)

**측정**: 전/후 생성 UI 100개 → purple gradient 감지율, rounded-2xl 남용률

### Phase 2 (3-5일) — Audit Loop
6. `.claude/agents/designer.md` 신규 — Taste variant + tone selector subagent
7. `.claude/agents/design-auditor.md` 신규 — Impeccable 24 실행 + 리포트
8. `lib/design-smell-detector.ts` — CSS/React AST 기반 정량 감지
9. `/qa --design` 확장 — ui-inspector + design-auditor 병렬

### Phase 3 (1-2주) — External Integration
10. `/governance/design-references/brands/` — Awesome Design MD submodule (66 brands)
11. `/governance/design-intelligence/` — UI/UX Pro Max 161 rules + palettes + fonts JSON
12. `skills/figma-bridge/` — Figma MCP wrapper (optional)
13. `/research/design-quality-benchmarks/` — Design Arena dataset mirror

---

## 트레이드오프 & 리스크

1. **토큰 비용**: design-auditor 추가 시 UI 생성당 ~300 tok (Haiku 기준 월 $0.5/100 UI). 재작업 감소로 상쇄.
2. **Taste는 템플릿화 불가**: 레퍼런스 선택은 사람이. A-Team은 "선택 강제 + 이탈 감지"만 담당.
3. **maintenance**: Awesome Design MD / UI/UX Pro Max는 외부 의존 → periodic sync script 필요.
4. **미국 중심 bias**: UI/UX Pro Max의 reasoning rules → 한국 startup 맥락 추가 필요.
5. **Figma 의존**: Phase 3는 Figma plan 필요. Optional로 분리.

---

## 참고 URL (전체)

**Top 10**:
- https://github.com/Leonxlnx/taste-skill
- https://github.com/carmahhawwari/ui-design-brain
- https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design
- https://github.com/VoltAgent/awesome-design-md
- https://github.com/wilwaldon/Claude-Code-Frontend-Design-Toolkit
- https://github.com/pbakaus/impeccable
- https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- https://www.everydev.ai/tools/design-arena + https://huggingface.co/datasets/lmarena-ai/webdev-arena-preference-10k
- https://github.com/szilu/ux-designer-skill
- https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server

**관련 (Top 10 제외)**:
- https://github.com/bergside/awesome-design-md-skills
- https://github.com/vercel/ai-elements
- https://github.com/vercel-labs/agent-skills
- https://github.com/magicuidesign/mcp
- https://github.com/rudra016/aceternityui-mcp
- https://github.com/thedaviddias/llms-txt-hub
- https://github.com/mustafakendiguzel/claude-code-ui-agents
- https://github.com/abhishekray07/claude-md-templates
- https://github.com/wondelai/skills

**공식 레퍼런스**:
- https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics
- https://vercel.com/blog/ai-powered-prototyping-with-design-systems
- https://www.figma.com/blog/introducing-claude-code-to-figma/
- https://lovable.dev/blog/2025-01-16-lovable-prompting-handbook
