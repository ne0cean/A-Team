# Competitive Analysis — 2026-05-15

## A-Team의 포지션: 프롬프트 레이어 vs 인프라 레이어

경쟁자 전부 = "마크다운 파일 모음". A-Team = "실제 시스템 자동화".

## 고유 강점 (경쟁자 0개가 보유)

| 기능 | 내용 |
|------|------|
| /zzz 자율 수면 + 토큰 리셋 복구 | launchd + CronCreate + RESUME.md + CB + dual-exit |
| 계정 자동 전환 | PTY 주입 + 60초 크론 + keychain swap |
| Circuit Breaker | no-progress 3x, same-error 5x, 30분 cooldown |
| 디자인 스멜 22룰 | 정적 감지 + WCAG 점수 + 머지 게이트 |
| AI 이사회 /board | 4인 페르소나 충돌 토론 + 데이터 기반 |
| MoA 합의 프로토콜 | 3레이어 숙의 + judge 에스컬레이션 + 조기 종료 |
| 마케팅 1→15 파이프라인 | research→generate→repurpose→publish (Postiz 22채널) |
| 법무/컴플라이언스 | /legal-check + 템플릿 (Privacy/ToS/GDPR) |
| 자기 개선 autoresearch | 섀도우 평가 + 자동 최적화 루프 |
| 507 테스트 | 경쟁자 전부 테스트 0 |

## 경쟁자 비교

| | A-Team | SuperClaude (22.8k) | BMAD (47k) | spec-kit (90k) |
|---|---|---|---|---|
| 본질 | 인프라 시스템 | 프롬프트 모음 | 워크플로우 문서 | 스펙 방법론 |
| 자율 운영 | /zzz + CB + auto-switch | 없음 | 없음 | 없음 |
| 비즈니스 운영 | board/okr/legal/marketing | 없음 | 없음 | 없음 |
| 테스트 | 507 | 0 | 0 | 0 |
| 약점 | 비공개, 높은 셋업 복잡도 | 깊이 없음 | Party Mode 불안정 | 코딩 이후 영역 없음 |

## 흡수 대상

| 소스 | 흡수할 것 |
|------|----------|
| BMAD | 에이전트 이름+성격 부여 (John PM, Amelia Dev) — 기억하기 쉬움 |
| spec-kit | Constitution(헌법) 레이어 — 프로젝트 최상위 원칙 명시 |
| SuperClaude | /sc:doctor 프레임워크 자가진단 커맨드 |
| founder-os | /queue:research 패턴 — 리서치 → 승인 게이트 → 코드 |

## 1위 확정 조건

1. ~~기능~~ — 이미 1위
2. **셋업 복잡도 낮추기** — zero-config 첫 경험 (SessionStart 스캐폴딩으로 일부 해결)
3. **공개 시 영문 README** — 프론트도어만 영어 (비공개 결정이므로 보류)
4. **실전 검증** — Connectome을 A-Team으로 빌드해서 "이걸로 만든 제품" 증명
