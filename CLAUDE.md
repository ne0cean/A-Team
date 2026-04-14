# A-Team — 글로벌 AI 툴킷

## 이 레포의 역할
모든 프로젝트에서 끌어다 쓰는 글로벌 툴킷. 특정 프로젝트에 종속되지 않는 독립 레포.

- **원본 레포**: `~/tools/A-Team` (이 디렉토리)
- **GitHub**: https://github.com/ne0cean/A-Team
- **프로젝트별 사본**: `{project}/A-Team` (서브디렉토리로 참조)

## 작업 시 원칙
- 변경사항은 반드시 `~/tools/A-Team`에서 작업 후 push
- 프로젝트 사본에서 작업한 경우 즉시 push → 원본 pull로 동기화
- `scripts/install-commands.sh` 로 `~/.claude/commands/`에 배포

## 자율 모드 진입 시 (의무)
사용자가 "랄프 모드", "자동으로", "자는 동안", "풀자동", "알아서 해" 등 트리거 사용 시:
1. **반드시 `governance/rules/autonomous-loop.md` 먼저 Read** (6개 강제 조항)
2. 특히 **강제 조항 6 (나레이션 금지)** — 질문뿐 아니라 상태 요약·인사·경계 선언 등 모든 사용자 대상 텍스트 최소화
3. 위반 시 자율 모드 자동 중단, 다음 iteration에서 이 문서 재독

## Sleep 모드 (수면 + 자율 조합)
사용자 메시지에 **수면 의도** ("자러간다", "잘게", "주무세요", "컴 앞에 없을거") + **자율 의도** ("랄프 모드", "자동으로", "묻지 마") **둘 다** 포함 시:
1. **즉시 `/sleep` 스킬 호출** (`.claude/commands/sleep.md`)
2. 단일 진입으로 RESUME.md + CronCreate + 나레이션 금지 통합
3. `/usage` 파싱 시도 → 실패 시 사용자 명시 시간 → 실패 시 5시간 기본
4. 재귀 wake-up 자동 예약, 토큰 한계 직전 commit/push 후 대기
5. 아침에 1회 ≤10줄 요약만 허용

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
