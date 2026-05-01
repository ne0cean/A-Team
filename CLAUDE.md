# A-Team — 글로벌 AI 툴킷

## 이 레포의 역할
모든 프로젝트에서 끌어다 쓰는 글로벌 툴킷. 특정 프로젝트에 종속되지 않는 독립 레포.

- **원본 레포**: `~/Projects/a-team` (canonical) — 과거 `~/tools/A-Team` 언급은 deprecated
- **GitHub**: https://github.com/ne0cean/A-Team
- **프로젝트별 사본**: `{project}/A-Team` (서브디렉토리로 참조)

## 작업 시 원칙
- 변경사항은 반드시 `~/Projects/a-team`에서 작업 후 push
- 프로젝트 사본에서 작업한 경우 즉시 push → 원본 pull로 동기화
- `scripts/install-commands.sh` 로 `~/.claude/commands/`에 배포 (symlink 구조면 불필요 — 이 머신 기본값)
- 다른 머신은 `/vibe` Step 0.2 가 6h 초과 시 자동 `git pull`

## 완성 선언 규칙 (필수)

**"완성됐습니다", "구현 완료", "done" 등 완료 선언은 반드시 테스트 증거를 첨부해야 한다.**

| 상황 | 최소 요건 |
|------|-----------|
| 기존 테스트 있음 | 테스트 실행 후 결과(pass/fail 수) 첨부 |
| 새 로직 추가 | 핵심 케이스 테스트 1개 이상 추가 + 실행 결과 첨부 |
| 리팩토링 | 기존 테스트 실행 결과 첨부 |
| 스크립트/설정 변경 | 실행 결과 또는 검증 커맨드 출력 첨부 |

**예외**: 테스트가 구조적으로 불가한 경우(순수 문서 수정 등) → "테스트 없음, 이유: ___" 명시 필수.

테스트 증거 없이 완성 선언 = 위반. 사용자가 지적하기 전에 스스로 테스트를 실행하거나 이유를 명시할 것.

## 모델 적정성 (필수, 매 사용자 메시지 직후 자가평가)

**원칙**: Opus는 진짜 Opus가 필요한 작업에만. 관성으로 메인 세션 모델 유지하지 않는다.

매 사용자 요청 직후, 첫 행동 전에:
1. 이 작업이 (a) 새 시스템 설계 / (b) 옵션 비교 / (c) 5+ 파일 강한 의존성 / (d) MoA 충돌 해소 중 하나인가?
2. 아니면 → **응답 시작 1줄**: "이 작업은 Sonnet으로 충분합니다. `/model sonnet` 권장 (비용 ~3-5x 절약)." 또는 적절한 서브에이전트(coder/researcher 등)에 위임.
3. 사용자가 "Opus 유지" 명시 → 한 세션 내 재추천 금지.
4. 자율 모드(zzz/ralph)에서는 추천 메시지 생략 — 서브에이전트 위임으로 대체.
5. 매 5턴마다 자가점검 — 단순 작업 연속이면 다음 응답에 1줄 push.

상세: [governance/rules/model-allocation.md](governance/rules/model-allocation.md)

**위임 우선 원칙**: 메인이 Opus여도 작업 80%+를 Sonnet/Haiku 서브에이전트에 위임. 메인은 분배 + 통합 + 대화만.

## 자율 모드 진입 시 (의무)
사용자가 "랄프 모드", "자동으로", "자는 동안", "풀자동", "알아서 해" 등 트리거 사용 시:
1. **반드시 `governance/rules/autonomous-loop.md` 먼저 Read** (6개 강제 조항)
2. 특히 **강제 조항 6 (나레이션 금지)** — 질문뿐 아니라 상태 요약·인사·경계 선언 등 모든 사용자 대상 텍스트 최소화
3. 위반 시 자율 모드 자동 중단, 다음 iteration에서 이 문서 재독

## Zzz 모드 (수면 + 자율 조합, 과거 Sleep 모드)
사용자 메시지에 **수면 의도** ("자러간다", "잘게", "주무세요", "컴 앞에 없을거", "맡겨두고") + **자율 의도** ("랄프 모드", "자동으로", "묻지 마") **둘 다** 포함 시:
1. **즉시 `/zzz` 스킬 호출** (`.claude/commands/zzz.md`)
2. **핵심 의도**: "맡겨두고 잘게" = **지금 하던 작업을 그대로 이어서 계속**. 새 태스크 큐가 아님
3. 단일 진입으로 RESUME.md + CronCreate + launchd + 나레이션 금지 + 계정 자동 전환 통합
4. `/usage` 파싱 시도 → 실패 시 사용자 명시 시간 → 실패 시 5시간 기본
5. 재귀 wake-up 자동 예약, 토큰 한계 직전 commit/push 후 대기
6. 아침에 1회 ≤10줄 요약만 허용

**구분**:
- `/zzz` — 풀 오토 (하던 작업 이어서 + 수면 + 리셋 자동 이어받기 + 계정 자동 전환)
- `/zzz --fresh` — 예외: 새 태스크 큐 디스패치 (구 /overnight 호환)
- `/resume` — 리셋 후 재개만 (시점 무관, 주간/단기). 자율 작업 없음
- `/pickup` — 재개 실행 로직 (RESUME.md 읽고 이어받기)

## 계정 자동 전환 (a-team 글로벌 엔진, zzz/일반 모드 공통)
엔진: `scripts/auto-switch/trigger.mjs` (launchd 60초 크론). claude-remote 서버 떠있으면 PTY 기반 실시간 전환, 없으면 Telegram 수동 알림. 상세: `governance/rules/auto-switch-protocol.md`.

발동: OAuth 계정 ≥ 2개 + 활성 계정 ≥ 96% + 후보 계정 < 80% + 10분 쿨다운 경과. 서버가 autosave 프롬프트 주입 시 Claude는:
1. RESUME.md에 현재 상태 저장 + git commit
2. 마지막 줄에 `READY_TO_SWITCH` 단독 출력
3. 서버가 keychain swap → `/pickup` 자동 주입
4. zzz 모드 유지하며 새 계정에서 이어서 진행

타임아웃 180s, 쿨다운 10분, 양 계정 소진 시 Telegram 알림 후 생략. 설치: `bash scripts/install-auto-switch-cron.sh install`.

## Autoresearch Shadow Mode (의무 자동 트리거)

`.context/AUTORESEARCH-PLAN.md`의 `Mode`가 `SHADOW-TRACKING`일 때, Claude는 다음을 **자동 수행**한다. 사용자 명시 지시 없음.

### Trigger 1: Tracked command 사용 후 로깅 (매 사용)

`governance/skills/autoresearch/shadow-evals.yaml`에 정의된 tracked 커맨드(현재 `/office-hours`, `/blueprint`, `/plan-eng`)가 이 세션에서 호출·완료되면, 해당 커맨드 완료 직후 Claude는 **조용히** 다음을 실행:

1. `.autoresearch/_shadow/<name>/` 디렉토리 없으면 생성
2. 해당 yaml의 `binary_evals` 각각에 대해 self-score (pass=1, fail=0). 총점/최대점수 계산
3. `log.jsonl`에 1줄 append (JSON):
   ```json
   {"ts":"ISO8601","command":"<name>","input_first_30":"...","session_id":"<short>","git_commit":"<sha>","self_score":{"binary_pass":N,"binary_total":M,"binary_rate":0.xx,"comparative_note":"..."},"duration_turns":N}
   ```
4. 로깅은 **사용자에게 노출하지 않는다** (`governance/rules/autonomous-loop.md` 강제 조항 6 나레이션 금지 준수). "로그 기록됨" 류의 언급 금지.
5. append 실패는 graceful degrade. 커맨드 결과 제공을 방해하지 않음.

**Baseline 측정**: 각 tracked 커맨드의 최초 3 runs는 "baseline 측정". 이 구간에 커맨드 파일을 수정하면 사용자에게 경고하고 baseline 리셋.

### Trigger 2: 세션 시작 시 집계 + 판정 확인

세션 시작 첫 응답 작성 직전:

1. `.autoresearch/_shadow/` 존재 확인. 없으면 스킵.
2. 각 tracked 커맨드에 대해:
   - `log.jsonl` 로드
   - `weekly-report.md` 마지막 집계 날짜 확인
   - ≥ 7일 경과 OR 신규 엔트리 ≥ 10 → 새 주간 집계를 `weekly-report.md` 상단에 추가
3. 집계 후 판정 조건 확인:
   - 3주 경과 AND 누적 runs ≥ 15 (커맨드당) → `DECISION-REPORT.md` 작성 + 아래 알림
   - OR 6주 경과 (데이터 불충분해도)
4. 판정 조건 충족 시 **첫 응답 상단에 한 블록 알림** (조건 미충족이면 알림 없음):
   ```
   🔬 Autoresearch Shadow: <command> 판정 준비
      4주 평균 binary: X% (baseline Y%, delta +Z%p)
      제안: Phase 4[A/B/C] — <설명>. 지금 적용할까요?
   ```

### Trigger 3: Eval drift 감지 (자체 보호)

매 10회 로깅마다 최근 10 엔트리 binary_rate 체크:
- 전부 1.0 또는 전부 0.0 → eval 구분력 상실 → `.autoresearch/_shadow/<name>/DRIFT-WARNING.md` 작성
- 다음 세션 시작 시 알림: `⚠️ <command> eval 재설계 필요 — 최근 10회 모두 [100%/0%]`

### Override

- `AUTORESEARCH-PLAN.md`의 `Mode`를 `PAUSED` → 모든 자동 트리거 중단
- `Mode`를 `DECIDED`/`DISMISSED` → 자동 트리거 + 세션 알림 모두 영구 중단
- tracked 확장은 `shadow-evals.yaml` 편집 + `AUTORESEARCH-PLAN.md` 표 갱신

### 파일 위치

- 계획: `.context/AUTORESEARCH-PLAN.md`
- Eval suites: `governance/skills/autoresearch/shadow-evals.yaml`
- 로그: `.autoresearch/_shadow/<command>/{log.jsonl, baseline.json, weekly-report.md, DRIFT-WARNING.md}` (gitignored)
- 판정: `.autoresearch/_shadow/DECISION-REPORT.md`

## 주요 디렉토리
- `.claude/commands/` — 슬래시 커맨드 원본
- `docs/` — 레슨런드 (docs/INDEX.md로 on-demand 참조)
- `governance/` — 규칙/워크플로우/스킬
- `scripts/` — 자동화 스크립트
- `templates/` — 신규 프로젝트 스캐폴드

## 명령어 배포
```bash
bash scripts/install-commands.sh   # ~/.claude/commands/ 에 동기화
```
