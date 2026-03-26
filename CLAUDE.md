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
