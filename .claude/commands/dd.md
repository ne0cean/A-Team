---
description: /dd — M&A Due Diligence. 외부 레포 실사 6단계 파이프라인 (line-by-line 분석 → 시너지 → 레드팀 → Tech DD → 보안 감사 → 이사회 판정)
---

## 사용법

```
/dd <repo-url>                # 전체 6단계 실사
/dd <repo-url> --fast-track   # Fast-track 가능 항목만 즉시 머지 준비
/dd status                    # 진행 중인 DD 현황 조회
```

---

## 실행 전 준비

1. `orchestrator` 패턴으로 진행 — 전체 6단계를 오케스트레이터가 조율
2. 대상 레포를 **실행하지 않는다** — 코드 읽기 전용, clone 후 정적 분석만
3. 산출물 디렉토리 생성: `.dd/<repo-slug>/`

```bash
REPO_URL="<사용자 입력 URL>"
REPO_SLUG=$(echo "$REPO_URL" | sed 's|.*/||' | sed 's|\.git$||')
mkdir -p ".dd/${REPO_SLUG}"
```

---

## 6단계 워크플로우

### Step 1 — Line-by-line 전수 실사
**담당**: `researcher` + `dd-analyzer` (미존재 시 general-purpose로 대체)
**병렬 가능**: researcher(레포 메타 수집) ↔ dd-analyzer(코드 구조 파싱) 동시 실행

수행 항목:
- 레포 전체 파일 목록 + 라인 수 집계 (`find` / `wc -l`)
- 기능 목록 완전 작성 (README + 소스코드 기반)
- 아키텍처 맵: 디렉토리 구조 → 레이어 분류
- 의존성 그래프: package.json / requirements.txt / go.mod 등 전수
- 커뮤니티 건강도: 커밋 빈도, 이슈 응답률, 메인테이너 수, 스타/포크 추이
- 기술 스택: 언어, 프레임워크, 빌드 시스템
- `/legal-check` 패턴으로 라이선스 리스크 평가 (GPL/AGPL 카피레프트 우선)

산출물: `.dd/<repo-slug>/01-linebylne-report.md`

**라이선스 CRITICAL 차단 규칙**:
- GPL v3 / AGPL → 즉시 REJECT 판정 예비 플래그
- GPL v2 / LGPL → 법적 검토 필요 경고
- MIT / Apache 2.0 / BSD → 통과

---

### Step 2 — 시너지 검토
**담당**: `researcher` + `architect`

수행 항목:
- A-Team 기존 컴포넌트 목록 (`ls .claude/agents/ .claude/commands/ lib/`) 로드
- 시너지/중복/충돌 매트릭스 작성:

```markdown
| 대상 컴포넌트 | A-Team 동등 기능 | 판정 | 흡수 가치 |
|-------------|----------------|------|----------|
| ...         | ...            | 시너지/중복/충돌 | 상/중/하 |
```

- 흡수 시 가치 정량화 기준:
  - A-Team에 없는 핵심 기능 → 가치 HIGH
  - 기존 기능과 중복 → 가치 LOW (cherry-pick 불필요)
  - 아키텍처 충돌 → 위험 플래그

산출물: `.dd/<repo-slug>/02-synergy-matrix.md`

---

### Step 3 — 실무 레드팀 리뷰
**담당**: `adversarial`
**참고**: `.claude/commands/adversarial.md` 패턴 재사용

공격자 관점 5축 코드 리뷰:
1. **인증/인가 우회**: 인증 로직 오류, 권한 상승 경로
2. **인젝션 공격**: SQL injection, command injection, path traversal
3. **데이터 경계 침해**: 민감 데이터 노출, 비밀 하드코딩 (API key, password)
4. **의존성 체인 공격**: 취약한 npm/pip 패키지, 악성 의존성
5. **로직 버그 악용**: 레이스 컨디션, 정수 오버플로우, 예외 처리 누락

실제 악용 가능한 취약점 우선 보고 (이론적 위험 vs 실증 PoC 가능 여부 구분).

산출물: `.dd/<repo-slug>/03-redteam-report.md`

---

### Step 4 — Tech DD
**담당**: `reviewer` + `architect`

수행 항목:
- **기술 부채 정량화**:
  - TODO/FIXME 밀도 (`grep -r "TODO\|FIXME" --include="*.ts" --include="*.py" | wc -l`)
  - 평균 함수 복잡도 (파일 길이, 중첩 깊이 기준)
  - 하드코딩된 매직 넘버/문자열 수
- **테스트 커버리지**: 테스트 파일 비율, 테스트 프레임워크 존재 여부
- **유지보수성**: 문서화 수준, CHANGELOG 유무, 기여자 가이드 존재 여부
- **라이선스 컴플라이언스 재확인**: Step 1 결과 검증 + 의존성 라이선스 전수
- **의존성 노후도**: 마지막 업데이트 날짜, CVE 목록 (`npm audit` / `pip-audit` 등)

산출물: `.dd/<repo-slug>/04-tech-dd-report.md`

---

### Step 5 — 보안 감사
**담당**: `cso`
**필수**: 모든 머지에 PASS 필수. FAIL 시 이사회 진행 불가.

OWASP Top 10 전수:
1. Broken Access Control
2. Cryptographic Failures
3. Injection
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable and Outdated Components
7. Identification and Authentication Failures
8. Software and Data Integrity Failures
9. Security Logging and Monitoring Failures
10. Server-Side Request Forgery (SSRF)

추가 항목:
- 인증/인가 경계 명확성
- 데이터 경계 (사용자 데이터 격리, PII 처리)
- 비밀 노출 (`.env`, API key, private key 하드코딩 여부)
- Step 3 레드팀 발견 사항 중 미해결 항목 재검증

산출물: `.dd/<repo-slug>/05-security-audit.md`
**필수 헤더**: 파일 첫 줄에 `SECURITY_AUDIT: PASS` 또는 `SECURITY_AUDIT: FAIL` 명시

---

### Step 6 — 이사회 보고
**담당**: `judge`
**트리거**: Step 1-5 모두 완료 후 자동 실행 (단, Fast-track 경로는 Step 5 통과 항목만)

`judge` 에이전트에 Step 1-5 산출물 경로 전달. MoA 패턴으로 최종 판정:

**Verdict 3종**:
- `ADOPT`: 전체 레포 흡수 권장. Full approval 필요.
- `PARTIAL`: 선별 cherry-pick 권장. fast-track 목록 포함.
- `REJECT`: 흡수 불가. 사유 명시.

**REJECT 자동 조건** (judge 판정 전 즉시 REJECT):
- Step 5 `SECURITY_AUDIT: FAIL`
- Step 1에서 GPL v3 / AGPL 카피레프트 감염 확인

산출물: `.dd/<repo-slug>/06-board-report.md`

---

## VERDICT.md 생성 (Step 6 완료 후)

`.dd/<repo-slug>/VERDICT.md`:

```markdown
# DD Verdict — <repo-slug>

**Date**: YYYY-MM-DD
**Verdict**: ADOPT | PARTIAL | REJECT
**Security Audit**: PASS | FAIL

## 판정 근거
...

## Fast-track 목록 (PARTIAL/ADOPT 시)
조건: 보안 감사 PASS + A-Team 현재 기능에 없는 핵심 기능

| 컴포넌트 | 경로 | 흡수 방식 | 우선도 |
|---------|------|---------|-------|
| ...     | ...  | copy / adapt | HIGH/MED |

## Full approval 필요 항목
- 전체 레포 흡수
- 아키텍처 변경 수반 항목
- 라이선스 리스크 있는 항목

## Next Steps
...
```

---

## Fast-track 규칙 (`--fast-track` 플래그)

**Fast-track 가능 조건** (이사회 승인 없이 머지 준비):
1. Step 3-4 실무 단계에서 "꼭 필요한 요소"로 판정
2. A-Team 현재 기능에 없는 핵심 기능
3. Step 5 보안 감사 **PASS 필수**

**Full approval 필요** (Fast-track 불가):
- 전체 레포 흡수
- 아키텍처 변경 수반
- 라이선스 리스크 항목 (GPL v2 이상)

`--fast-track` 실행 시: Step 1-5 완료 후 Fast-track 조건 충족 항목만 VERDICT.md에 분리 기록. `/absorb` 커맨드 연계 준비.

---

## `dd status` 명령

```bash
ls .dd/ 2>/dev/null || echo "진행 중인 DD 없음"
for dir in .dd/*/; do
  echo "--- $(basename $dir) ---"
  ls "$dir" 2>/dev/null
  head -1 "${dir}VERDICT.md" 2>/dev/null || echo "판정 대기 중"
done
```

---

## 에이전트 배분 요약

| 단계 | 에이전트 | 병렬 가능 |
|------|---------|---------|
| Step 1 | researcher + dd-analyzer | researcher ↔ dd-analyzer 병렬 |
| Step 2 | researcher + architect | Step 1 완료 후 |
| Step 3 | adversarial | Step 1 완료 후 (Step 2와 병렬 가능) |
| Step 4 | reviewer + architect | Step 1-3 완료 후 |
| Step 5 | cso | Step 1-4 완료 후. 필수 게이트 |
| Step 6 | judge | Step 5 PASS 후에만 |

**Step 2 ↔ Step 3 병렬 실행 가능**: 시너지 검토와 레드팀은 독립적이므로 동시 진행.

---

## 보안 주의사항

- 대상 레포 코드를 **절대 실행하지 않는다** (악성 코드 포함 가능)
- `npm install`, `pip install`, `make`, `./install.sh` 등 빌드/설치 명령 금지
- 정적 분석(Read, Grep, Glob)만 사용
- 민감 발견 사항은 `.dd/<repo-slug>/` 로컬에만 저장 (git에 커밋 금지 권장)

---

## 관련 커맨드

- `/absorb` — DD 판정 후 실제 통합 실행
- `/adversarial` — 레드팀 단독 실행
- `/legal-check` — 라이선스 단독 점검
- `/pmi` — 통합 완료 후 후처리
- `/cso` — 보안 감사 단독 실행
