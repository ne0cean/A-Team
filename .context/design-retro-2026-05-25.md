---
created_at: 2026-05-25T00:10:00Z
period: 6 weeks (2026-04-15 → 2026-05-25)
total_audits: 17
total_ui_commits: 0 (실 프로젝트 UI PR)
previous_retros:
  - .context/retros/design-auditor-2026-04-19.md (10 events)
  - .context/retros/design-auditor-2026-04-26.md (17 events, +7)
---

# Design Retro — 2026-05-25 (6주 실측)

## Summary

- **사용률**: 17회 fire / 예상 50+회 = **34%** (전부 self-audit, 외부 0)
- **평균 smell score**: 79.4/100 (54~92 range)
- **False positive rate**: 2/17 = 12% (의도된 bad case 제외 시 실질 0%)
- **A11y 위반**: 4건 / 17 audits (2건씩 2회, 모두 intentional bad fixture)
- **실 UI PR 통과**: **0건** — 핵심 문제
- **.design-override.md 생성**: **0개** — tone 체인 발화 0회
- **PostToolUse 훅 자동 트리거**: **0회** — hook 미설치/미활성
- **외부 프로젝트 install**: **0개** — connectome/claude-remote 미적용
- **learnings.jsonl**: **파일 미존재** — 사용자 피드백 루프 미작동

## 데이터 근거

### Analytics (design-audits.jsonl)
- 기록된 이벤트: 1건 (analytics.jsonl 리셋됨, 이전 데이터는 retro 보고서에만 잔존)
- 이전 retro 기록 기준: 17 events (2026-04-18 ~ 2026-04-26), 이후 추가 0

### Git (2026-04-15 ~ 2026-05-25)
- design 관련 커밋: 6건 (모두 인프라/거버넌스, UI 변경 0)
- `.tsx`/`.jsx` 변경: 0건 (A-Team 프로젝트)
- `.css` 변경: PPT 테마 파일만 (디자인 감사 대상 아님)

### Tone/Variant/Brand 사용
- tone 사용 분포: `editorial-technical` 2회, 무선언 15회 (88%)
- variant 선택: 0회 (7 preset 중 하나도 명시 선택 안 됨)
- brand refs 인용: 0회 (11개 refs 중 0개 참조)
- reasoning.json 매칭: 0회 (17 domain rules 미활용)

---

## 분석: 왜 발화하지 않았는가

### 근본 원인

A-Team은 **메타 인프라 프로젝트**이다. UI 코드(.tsx/.jsx)를 직접 가지지 않는다. Design Subsystem이 fire하려면 **downstream 프로젝트**(connectome, claude-remote, 기타)에 hook이 설치되어야 하는데, 이 설치가 6주간 실행되지 않았다.

| 차단 요인 | 상태 | 영향 |
|-----------|------|------|
| install-design-hook.sh 외부 실행 | ❌ 미실행 | 자동 트리거 0회 |
| .design-override.md 생성 | ❌ 미생성 | tone 체인 미발화 |
| 실 UI 프로젝트 존재 | ❌ 워크스페이스에 없음 | fire 대상 자체 부재 |
| learnings.jsonl | ❌ 파일 미존재 | 피드백 루프 불가능 |

→ **6주 데이터 부재는 "시스템 결함"이 아니라 "배포 미완료"**. 시스템 자체는 self-audit에서 안정적으로 작동했다.

---

## Delete (유지 비용 > 가치)

> 원칙: 데이터 없으면 삭제 안 함. 6주 0회 fire는 "미검증"이지 "불필요"가 아님.

**삭제 제안 없음.** 다만 아래 항목은 **유지 비용이 극히 낮아 손실도 없음**:

| 항목 | Fire 횟수 | 유지 비용 | 판정 |
|------|----------|----------|------|
| refs/bloomberg.md | 0 | 텍스트 1개 (~50 lines) | 유지 (비용 ≈ 0) |
| refs/arc.md 외 10개 | 0 | 텍스트 11개 | 유지 (비용 ≈ 0) |
| reasoning.json 17 rules | 0 | JSON 1개 | 유지 (비용 ≈ 0) |
| variants.md 7 presets | 0 | 텍스트 1개 | 유지 (비용 ≈ 0) |
| AI-09..15 (7 rules, 문서만) | 0 | 문서 추가됨 (2026-05-24), 구현 안 됨 | 유지 (구현 보류) |

**사유**: refs, reasoning.json, variants.md는 모두 가벼운 텍스트 파일. 삭제 이익(디스크 <10KB) < 재구축 비용. 실전 fire 후 재평가.

---

## Tune (유지하되 조정)

### T-01. analytics.jsonl 데이터 소실 — 리셋 방지
- **현상**: 이전 17 events가 analytics.jsonl에서 사라짐 (파일 덮어쓰기 추정)
- **제안**: `design-audits.jsonl` 전용 로그를 SSOT로 유지 (이미 `.context/logs/design-audits.jsonl` 존재). `logDesignAudit()`가 이 파일에 append하는지 검증 필요.

### T-02. 회고 트리거 변경 (이전 retro 결정 유지)
- **현상**: 시간 기반 회고가 데이터 없이 반복 → 가치 0
- **제안**: 시간 기반 → **이벤트 기반** (외부 repo ≥ 10 events 시 자동 발화)
- 이번이 시간 기반 마지막 retro. 다음은 이벤트 기반으로만 트리거.

### T-03. AI-09..15 구현 보류 유지
- **현상**: 2026-05-24에 문서 7개 추가. detector 미구현.
- **제안**: 실 UI fire ≥ 5건 전까지 구현 보류. 문서만 유지하여 인지 부하 최소화.

---

## Add (실전에서 필요 확인)

### A-01. **Deployment Gate** (최우선)
- **근거**: 6주간 "connectome/claude-remote install" 미실행이 반복 carry-over. 수동 의존이 bottleneck.
- **제안**: `/vibe` Step에 "UI 파일 변경 감지 → install-design-hook.sh 자동 실행" 로직 추가. 또는 CURRENT.md Next Tasks에 **BLOCKING** 마커로 격상.

### A-02. **Learnings 인프라**
- **근거**: `learnings.jsonl` 파일 자체가 존재하지 않음. `logDesignOutcome()` 호출 경로 미연결.
- **제안**: 첫 외부 fire 시 learnings 파일 자동 생성 + `logDesignOutcome` 함수 검증.

### A-03. 실 UI 프로젝트 파일럿
- **근거**: downstream 프로젝트가 현 워크스페이스에 없음 (원격 환경).
- **제안**: 다음 로컬 세션에서 connectome/claude-remote 중 1개에 hook 설치 → 2주 데이터 수집 → 재회고.

---

## Keep (건드리지 말 것)

| 항목 | 사유 |
|------|------|
| A11Y-01..05 (5 rules) | 비협상. self-audit에서도 100% 정확 감지 |
| AI-01 purple gradient | AI smell 최강 signal. 0 false positive |
| AI-03 AI triad | 구조적 감지. 정확도 높음 |
| RD-04 caption-class + tone-aware | 패치 후 false positive 해결 검증됨 (64→92) |
| AI-02 font pairing detection | 16종 페어링 감지 추가 후 안정 |
| LLM critique (PL-01/02) | false positive 구원 사례 검증 (og-image 64→PASS) |
| lib/design-smell-detector.ts | 22 static rules 결정론적. 토큰 0. 안정 |
| design-config.json | SSOT 역할. 커스텀 threshold 지원 |

---

## 31 Rules 개별 상태 (2026-05-25 기준)

| Rule | 구현 | Fire | Override | 판정 |
|------|------|------|----------|------|
| AI-01 | ✅ static | self-audit only | 0 | Keep |
| AI-02 | ✅ static | self-audit only | 0 | Keep (pairing 패치 완료) |
| AI-03 | ✅ static | self-audit only | 0 | Keep |
| AI-04 | ✅ static | 0 | 0 | Keep (미검증) |
| AI-05 | ✅ static | 0 | 0 | Keep (미검증) |
| AI-06 | ✅ static | 0 | 0 | Keep (미검증) |
| AI-07 | ✅ signal | 0 | 0 | Keep (미검증) |
| AI-08 | ✅ static | 0 | 0 | Keep (미검증) |
| AI-09 | ❌ 문서만 | — | — | 구현 보류 |
| AI-10 | ❌ 문서만 | — | — | 구현 보류 |
| AI-11 | ❌ 문서만 | — | — | 구현 보류 |
| AI-12 | ❌ 문서만 | — | — | 구현 보류 |
| AI-13 | ❌ 문서만 | — | — | 구현 보류 |
| AI-14 | ❌ 문서만 | — | — | 구현 보류 |
| AI-15 | ❌ 문서만 | — | — | 구현 보류 |
| RD-01 | ❌ 미구현 | — | — | 로드맵 유지 |
| RD-02 | ✅ static | self-audit only | 0 | Keep |
| RD-03 | ✅ static | 0 | 0 | Keep (미검증) |
| RD-04 | ✅ static | self-audit only | 0 | Keep (패치됨) |
| RD-05 | ❌ 미구현 | — | — | 로드맵 유지 |
| RD-06 | ✅ static | 0 | 0 | Keep (미검증) |
| A11Y-01 | ✅ static | self-audit only | 0 | **Keep (비협상)** |
| A11Y-02 | ✅ static | self-audit only | 0 | **Keep (비협상)** |
| A11Y-03 | ✅ static | self-audit only | 0 | **Keep (비협상)** |
| A11Y-04 | ✅ static | self-audit only | 0 | **Keep (비협상)** |
| A11Y-05 | ✅ static | 0 | 0 | **Keep (비협상)** |
| LS-01 | ✅ static | self-audit only | 0 | Keep |
| LS-02 | ❌ 미구현 | — | — | 로드맵 유지 |
| LS-03 | ❌ 미구현 | — | — | 로드맵 유지 |
| PL-01 | ✅ LLM | 1회 (og-image) | 0 | Keep (가치 입증) |
| PL-02 | ✅ LLM | 0 | 0 | Keep (미검증) |

---

## 결론: 시스템은 Ready, 배포가 Blocked

Design Subsystem은 **6주간 self-audit에서 안정성을 입증**했다:
- 결정론적 점수 (동일 파일 반복 시 drift 0)
- LLM critique의 false positive 구원 가치 확인
- tone-aware 룰 패치 효과 검증 (64→92)

그러나 **실 사용 데이터는 0**. 이는 시스템 품질 문제가 아니라 **배포 미완료** 문제:
1. 외부 프로젝트에 hook 미설치
2. 현 워크스페이스에 UI 프로젝트 미존재
3. .design-override.md 생성 경로 미활성

→ **이번 retro의 Delete/Tune/Add 결정은 신뢰도가 낮다** (데이터 부재). 실전 데이터 없이 추가 retro는 가치 0.

---

## 커밋 액션

- **삭제 PR**: 없음 (삭제 후보 0)
- **튜닝 PR**: T-01 analytics 리셋 방지 (검증 후 판단)
- **구현 PR**: 없음 (A-01~A-03는 배포 차단 해소 후)

## Next Actions (우선순위)

1. **[BLOCKING]** 로컬 환경에서 connectome 또는 claude-remote에 `install-design-hook.sh` 실행
2. **[BLOCKING]** 해당 프로젝트에서 UI PR 1건 이상 작성 → 자동 트리거 검증
3. 외부 ≥ 10 events 누적 후 이벤트 기반 `/design-retro` 재실행
4. 그 전까지 **시간 기반 retro 중단** — 이번이 마지막 scheduled retro

---

## 메타: 회고의 회고

| 회고 | 일자 | 새 발견 | 가치 |
|------|------|---------|------|
| 1차 | 2026-04-19 | LLM critique 가치, false positive 수정 | 높음 |
| 2차 | 2026-04-26 | 없음 (동일 데이터 반복) | 낮음 |
| **3차 (이번)** | **2026-05-25** | **없음 (6주 추가 fire 0)** | **낮음 — 최종 확인** |

→ **시간 기반 retro ROI 감소 패턴 확인**. 이벤트 기반 전환 확정.
