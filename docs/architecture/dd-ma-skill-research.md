# DD/M&A 스킬 리서치 — Due Diligence + 외부 레포 흡수 통합

> 작성: 2026-06-01 | 담당: researcher 에이전트
> 목적: A-Team에 외부 오픈소스/레포 실사 및 cherry-pick 통합 스킬 구축을 위한 사전 리서치

---

## 1. 유사 도구 탐색 결과

### 1-1. RepoAudit (GitHub: PurCL/RepoAudit)

- **URL**: https://github.com/PurCL/RepoAudit
- **분류**: LLM 기반 저장소 수준 코드 오디팅 멀티에이전트 프레임워크
- **핵심 아키텍처**:
  - `MetaScanAgent` — tree-sitter 파싱으로 구조적 정보 추출 (컴파일 불필요)
  - `DFBScanAgent` — 인터프로시저럴 데이터 흐름 분석 (NPD, MLK, UAF 탐지)
  - 병렬 워커 스레드 지원, C/C++/Java/Python/Go 지원
- **관련성**: 버그/취약점 탐지 특화. DD의 코드 품질 레이어에 참조 가능
- **ICML 2025 채택** — 신뢰도 높음

### 1-2. OpossumUI (GitHub: opossum-tool/OpossumUI)

- **URL**: https://github.com/opossum-tool/opossumUI
- **분류**: 오픈소스 라이선스 컴플라이언스 오디팅 도구
- **특징**: SBOM 생성, M&A 시 IP 블라인드 오디트 지원, 라이선스 충돌/위험 시각화
- **관련성**: DD 라이선스 체크 레이어의 레퍼런스. `legal-check` 커맨드 확장 시 참조

### 1-3. Black Duck (상용) / FossID (상용)

- **분류**: M&A 전문 소프트웨어 컴포지션 분석 + 오디트 서비스
- **참조 가치**: M&A DD 체크리스트 공식 문서 제공 (무료 PDF)

### 1-4. Linux Foundation — Open Source DD 가이드

- **분류**: 1차 소스 (비영리 재단 공식 가이드)
- **내용**: M&A 트랜잭션 시 오픈소스 실사 평가 프레임워크. 업계 표준 체크리스트 포함

### 1-5. VoltAgent/awesome-agent-skills (GitHub)

- **URL**: https://github.com/VoltAgent/awesome-agent-skills
- **분류**: Claude Code / Codex / Gemini CLI 호환 에이전트 스킬 1000+ 모음
- **관련성**: Cherry-pick PR 자동화 스킬 확인됨. DD 전용 스킬은 아직 표준화 없음

---

## 2. A-Team 내부 재사용 가능 컴포넌트

### 2-1. 직접 재사용 가능 (조합만으로 충분)

| 컴포넌트 | 경로 | 재사용 방식 |
|----------|------|-------------|
| `researcher` 에이전트 | `.claude/agents/researcher.md` | Phase 1: 레포 정보 수집 + 구조화 요약 |
| `adversarial` 에이전트 | `.claude/agents/adversarial.md` | Phase 2: 레드팀 코드 리뷰 (5관점) |
| `reviewer` 에이전트 | `.claude/agents/reviewer.md` | Phase 2: 코드 품질 게이트 (2-pass) |
| `judge` 에이전트 | `.claude/agents/judge.md` | Phase 3: 도입 여부 판정 (MoA 충돌 해소) |
| `architect` 에이전트 | `.claude/agents/architect.md` | Phase 3: 아키텍처 적합성 평가 |
| `orchestrator` 에이전트 | `.claude/agents/orchestrator.md` | 전체 파이프라인 조율 |
| `/legal-check` 커맨드 | `.claude/commands/legal-check.md` | Phase 1: 라이선스 컴플라이언스 체크 |
| `/intel` 커맨드 | `.claude/commands/intel.md` | Phase 1: 경쟁사/생태계 포지셔닝 분석 |
| `/absorb` 커맨드 | `.claude/commands/absorb.md` | Phase 4: 내부 흡수 패턴 참조 |
| `/pmi` 커맨드 | `.claude/commands/pmi.md` | Phase 5: 통합 후 검증 |
| `/adversarial` 커맨드 | `.claude/commands/adversarial.md` | Phase 2: 레드팀 트리거 |

### 2-2. 수정/확장이 필요한 컴포넌트

| 컴포넌트 | 현재 한계 | 필요한 확장 |
|----------|----------|------------|
| `/absorb` | A-Team 내부 프로젝트만 스캔 | 외부 레포 URL 입력 → clone → 스캔 지원 |
| `/legal-check` | npm 의존성 라이선스만 체크 | 외부 레포 전체 라이선스 체크로 확장 |
| `researcher` 에이전트 | 일반 정보 수집 목적 | DD 특화 출력 스키마 추가 |

### 2-3. 새로 만들어야 하는 컴포넌트

| 필요 컴포넌트 | 이유 |
|--------------|------|
| `dd-analyzer` 에이전트 | 레포 구조 파싱 + 기술부채 정량화 + 커뮤니티 건강도 평가 특화 |
| `cherry-pick-planner` 에이전트 | 도입 확정 후 선택적 통합 로드맵 자동 생성 |
| `/dd` 커맨드 (entry point) | 전체 파이프라인을 단일 진입점으로 조율 |

---

## 3. 외부 M&A DD 표준 프레임워크 참조

| 레이어 | 평가 항목 | 우선도 |
|--------|----------|--------|
| 라이선스 컴플라이언스 | 오픈소스 라이선스 충돌, 카피레프트 감염 리스크 | CRITICAL |
| 코드 품질 | 테스트 커버리지, 기술부채 수준, 코딩 컨벤션 | HIGH |
| 보안 취약점 | CVE, SQL injection, 인증 우회, 의존성 취약점 | CRITICAL |
| 아키텍처 | 모놀리식/마이크로서비스 구조, 확장성, 결합도 | HIGH |
| 커뮤니티 건강도 | 커밋 빈도, 이슈 응답률, 메인테이너 수, 스타/포크 추이 | MEDIUM |
| IP 및 소유권 | 기여자 CLA 여부, 특허 리스크 | HIGH |
| 기술부채 | TODO/FIXME 밀도, 문서화 수준, 의존성 노후도 | MEDIUM |

---

## 4. 제안 설계

### 4-1. 스킬명

**`/dd`** — Due Diligence (기본 실사)
**`/dd --absorb`** — 도입 결정 후 cherry-pick 로드맵까지 (전체 M&A 플로우)

### 4-2. 워크플로우 (5단계)

```
/dd <repo-url> [--absorb]
```

```
Phase 1 — RECON (정찰)
  담당: researcher + dd-analyzer (신규)
  - 레포 기본 정보: README, CHANGELOG, 라이선스, 의존성
  - 커뮤니티 건강도: 커밋 빈도, 이슈/PR 응답률, 메인테이너
  - 기술 스택: 언어, 프레임워크, 빌드 시스템
  - /intel 패턴으로 생태계 포지셔닝
  - /legal-check 패턴으로 라이선스 리스크 평가
  출력: recon-report.json

Phase 2 — RED TEAM (적대적 분석)
  담당: adversarial + reviewer
  - adversarial 5관점으로 코드 취약점 탐지
  - reviewer 2-pass로 코드 품질 게이트
  - 기술부채 정량화 (TODO/FIXME 밀도, 테스트 커버리지)
  출력: redteam-report.json

Phase 3 — BOARD (이사회 심의)
  담당: judge + architect
  - Phase 1+2 결과 종합해 도입 여부 판정
  - verdict: ADOPT | REJECT | PARTIAL
  출력: board-verdict.json

Phase 4 — CHERRY-PICK PLAN (통합 로드맵, --absorb 시)
  담당: cherry-pick-planner (신규) + architect
  - ADOPT/PARTIAL verdict 시에만 실행
  - 흡수 대상 컴포넌트 선별 (value/risk 매트릭스)
  - A-Team 기존 컴포넌트와 충돌 영역 식별
  출력: cherry-pick-roadmap.md

Phase 5 — POST-INTEGRATION (통합 후 검증, 실제 통합 후)
  담당: /pmi (기존 재사용)
  출력: pmi-report.md
```

### 4-3. 에이전트 조합 다이어그램

```
/dd <url>
  └── orchestrator
        ├── Phase 1: researcher + dd-analyzer(신규)
        │     └── /intel, /legal-check 패턴 재사용
        ├── Phase 2: adversarial + reviewer
        ├── Phase 3: judge + architect
        ├── Phase 4: cherry-pick-planner(신규) [--absorb 시]
        └── Phase 5: /pmi [통합 후 별도 호출]
```

### 4-4. 신규 제작 필요 목록

| 항목 | 유형 | 우선도 |
|------|------|--------|
| `/dd` 커맨드 | command | MUST |
| `dd-analyzer` 에이전트 | agent | MUST |
| `cherry-pick-planner` 에이전트 | agent | SHOULD |
| `governance/skills/dd/` | skill docs | SHOULD |

### 4-5. `/absorb` vs `/dd` 분리 근거

| 차이점 | /absorb | /dd |
|--------|---------|-----|
| 대상 | 내부 프로젝트 | 외부 오픈소스/레포 |
| 라이선스 리스크 | 낮음 | 높음 (카피레프트 주의) |
| 보안 검토 | 불필요 | 필수 (adversarial) |
| 판정 주체 | 자동화 (heuristic) | Judge 에이전트 (MoA) |

---

## 5. 리스크 및 주의사항

- **라이선스 감염**: GPL/AGPL 코드 흡수 시 A-Team 전체 카피레프트 영향. Phase 1에서 반드시 차단
- **외부 레포 clone 보안**: 악성 코드 포함 가능. 실행 금지 / 샌드박스 환경 필요
- **cherry-pick 범위 크리프**: value/risk 매트릭스로 Phase 4 범위 엄격히 제한
- **Phase 3 판정의 비가역성**: ESCALATE 조건 엄격 적용, 사람 승인 필수

---

## 6. Next Steps

1. `/dd` 커맨드 파일 작성: `.claude/commands/dd.md`
2. `dd-analyzer` 에이전트 파일 작성: `.claude/agents/dd-analyzer.md`
3. `cherry-pick-planner` 에이전트 파일 작성: `.claude/agents/cherry-pick-planner.md`
4. `governance/skills/dd/` 상세 체크리스트 작성
5. `/legal-check` 커맨드 외부 레포 URL 지원 확장

---

## 참고 소스

- RepoAudit: https://github.com/PurCL/RepoAudit
- OpossumUI: https://github.com/opossum-tool/opossumUI
- Linux Foundation DD 가이드: https://www.linuxfoundation.org/resources/publications/assessment-of-open-source-practices-as-part-of-due-diligence-in-merger-and-acquisition-transactions
- VoltAgent awesome-agent-skills: https://github.com/VoltAgent/awesome-agent-skills
- DependencyDesk M&A Checklist 2026: https://dependencydesk.com/blog/ma-due-diligence-checklist-software-companies-2026
