# Stripe — Editorial Credibility

**tone**: editorial | **variant**: editorial | **variance**: 4 | **motion**: 4 | **density**: 5

## Brand Essence

Developer docs = art form. 금융의 신뢰감. 코드 예시가 주인공. 현실적 데모, 과한 마케팅 최소화.

## Typography

- Display: Sohne (custom sans, Stripe 전용)
- Body: Sohne / system-ui fallback
- Mono: Source Code Pro
- Scale: 14 / 16 / 18 / 20 / 24 / 32 / 44 / 60
- Line-height: 1.5 body, 1.15 display
- Display는 tight letter-spacing

## Color Palette

- Primary: `#635BFF` (Stripe purple — Stripe 고유, 일반 "AI purple"과 다름)
- Background: `#FFFFFF` / `#0A2540` (marketing dark)
- Surface: `#F6F9FC`
- Text: `#0A2540` / `#425466`
- Success: `#00D4FF` (Stripe cyan)
- Code 블록: 고유 syntax highlight palette

## Spacing

8px grid. 대담한 세로 여백 (섹션 간 96-128px).

## Motion

- Transition: 200-400ms, `ease-out`
- Scroll-triggered reveal (Stripe Sessions에서 advanced)
- 그래디언트 애니메이션 (marketing만, 제품 UI 아님)
- `prefers-reduced-motion` 완벽 지원

## Components Signature

- Button: 40-48px, 6px radius, 컬러 flat, no shadow default
- Card (docs): border만, shadow 없음
- Gradient hero (marketing): 복잡한 mesh gradient — 그러나 brand-specific (generic 아님)
- Code block: 4px radius, mono 14-15px, syntax-colored

## Anti-Patterns

- ❌ 순수 보라 그라디언트 (Stripe는 brand purple + gradient 복합)
- ❌ Rainbow badges
- ❌ Rounded-2xl (Stripe 카드는 항상 4-8px)

## 언제 참고

- Developer-facing product, API, financial tool
- "credibility + clarity + typography respect" 필요 시
- marketing landing에서 신뢰도 강조
