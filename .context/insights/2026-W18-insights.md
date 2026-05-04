# 주간 인사이트 — 2026년 18주차 (Apr 27 ~ May 4)

## 모듈 사용 현황
| 모듈 | 사용 횟수 | 평균 점수 | 성공률 | 전주 대비 |
|------|---------|---------|-------|---------|
| design-auditor | 160 | 55 | 53% | +147 (+1131%) |
| unknown | 8 | - | - | +8 (신규) |

**총 이벤트**: 166 (전주 13 → +1177% 급증)

## 주요 관찰
1. **폭발적 사용 증가 vs 품질 붕괴**: design-auditor가 이번 주 160회 실행되며 전주(13회) 대비 1131% 급증했으나, 성공률은 92% → 53%로 39%p 하락. 평균 점수도 86 → 55로 하락.
2. **과반 실패 크리티컬**: 160회 중 76회 실패(47%). 디자인 감사의 절반이 기대치를 충족하지 못하는 상태.
3. **광범위한 역량 갭 노출**: 6개 영역(marketing.publishing 0.2, marketing.performance-marketing 0, operations.autonomous-mode, analytics.external-bi 0, engineering.ci-cd 0.5, marketing.social-media 0.5)에서 마찰 발생. 모두 단일 이벤트로 산발적이나, 미개발 영역 분포 확인.
4. **마케팅 역량 전반 취약**: publishing(0.2), performance-marketing(0), social-media(0.5) 등 마케팅 도메인 하위 영역 대부분이 0~0.5 범위. friction도 3건 중 마케팅에 집중.

## 다음 주 우선순위 제안
1. **긴급: design-auditor 품질 개선** — 53% 성공률은 프로덕션 사용 불가 수준. 실패 76건 중 상위 10건 로그 분석 → 평가 기준 또는 구현 로직 재검토 필요. 목표: 성공률 80% 이상 회복.
2. **마케팅 역량 체계적 구축** — publishing, performance-marketing, social-media 3개 영역 우선. friction 발생 빈도는 낮지만 capability 점수가 0~0.2로 사실상 공백. 최소 0.6 이상으로 끌어올리는 단계별 플랜 수립.
3. **design-auditor 사용 패턴 분석** — 1주 만에 13 → 160회 폭증 배경 파악. 특정 프로젝트/워크플로우에서 자동 호출되는지, 단순 반복 실행인지 확인 후 사용 맥락 최적화.

## 플래그
- `high_failure`: design-auditor (53%, -39%p WoW)
- `no_usage`: sales-cs 전체 영역 (lead-generation, sales-automation, customer-support, onboarding 모두 0 점수 + 0 사용)
- `coverage_drop`: design.quality-audit 0.85 유지 중이나 실사용 성공률 53%로 괴리 — capability 점수 재평가 필요

---
_자동 생성: /insights 에이전트 | 데이터: .context/analytics.jsonl_
