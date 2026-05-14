# Red Team Upgrade Benchmarks — 2026-05-14

> /adversarial + /cso + /review 업그레이드 레퍼런스. 복기용.

## 흡수 대상 도구

| 도구 | Stars | 용도 | 통합 대상 | 노력 |
|------|-------|------|----------|------|
| **promptfoo** | 21.2k | LLM 레드팀 + CI/CD 게이트 | /adversarial | 중 |
| **Garak** (NVIDIA) | 7.5k | LLM 취약점 스캐너 (환각/인젝션/독성) | /cso | 저 |
| **PyRIT** (Microsoft) | 3.8k | 멀티턴 공격 (Crescendo/TAP) | /adversarial | 고 |
| **DeepTeam** | 1.8k | OWASP LLM + MITRE ATLAS 정렬 | /cso | 저-중 |
| **Rebuff** | 1.5k | 프롬프트 인젝션 4레이어 방어 | /cso 참조 | 저 |
| **Semgrep** | SaaS+OSS | SAST + LLM 하이브리드, 96% 정확도 | /review | 저 |

## 프레임워크

| 프레임워크 | URL | 핵심 |
|-----------|-----|------|
| OWASP LLM Top 10 2025 | https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/ | LLM07 Prompt Leakage, LLM08 Vector Attack, LLM06 Excessive Agency |
| MITRE ATLAS v5.1 | https://atlas.mitre.org/ | 16 전술 / 84 기법 / 56 서브기법. AI 에이전트 14개 신규 |
| Microsoft 100 GenAI Red Team | https://www.microsoft.com/en-us/security/blog/2025/01/13/ | 다중라운드 필수, 시스템 전체 관점, 자동화+인간 병행 |
| Devil's Advocate Architecture | Worker→Critic→Mediator 3에이전트 | 확증 편향 구조적 제거 |

## 현재 A-Team 갭

| 영역 | 갭 |
|------|-----|
| /adversarial | AI 생성 코드 신뢰 관점 없음, 멀티턴 없음, 단일 에이전트(확증 편향) |
| /cso | OWASP LLM Top 10 미적용, MITRE ATLAS 없음, 프롬프트 인젝션 테스트 없음 |
| /review | SAST 도구 미통합, AI 생성 코드 마커 없음, 피드백 루프 없음 |

## 3단계 업그레이드 로드맵

1. **즉시** (에이전트 파일 수정만): /adversarial 관점 5 + /cso Axis 5
2. **1주** (CLI 통합): Garak → /cso, promptfoo → /adversarial CI/CD
3. **선택** (구조): Worker-Critic 2에이전트 분리
