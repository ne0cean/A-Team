---
mode: normal
status: active
created: 2026-06-01T20:15:07+0900
updated: 2026-06-02T05:00:00+0900
task: 자동 재개 — model-compliance.sh + generate_from_template.py 구현 완료
---

# RESUME — 세션 자동 저장 (auto-save-on-stop)

## 재개 포인트
- CURRENT.md Next Tasks 확인 후 최우선 항목부터 시작

## Completed (자동 재개 세션)
- [x] **MeiliSearch launchd 등록** — 이미 실행 중 (health: available, port 7700). com.ateam.meilisearch 서비스 확인 완료.
- [x] **모델 오케스트레이션 훅 확인** — enforce-model-param.sh는 settings.json PreToolUse/Agent에 이미 등록.
- [x] **model-compliance.sh 생성** — `scripts/orchestration/model-compliance.sh` 작성 완료. SubagentStop 감사, /tmp/model-usage.jsonl 로깅, 위반 시 analytics.jsonl 동기 기록.
- [x] **generate_from_template.py 구현** — `scripts/ppt/generate_from_template.py` 작성 완료. 형식A(search/replace), 형식B(shape 직접 지정), --inspect, --dry-run, QA 자동 연동.

## 미완료 Next Tasks
- [ ] **settings.json SubagentStop hook 등록** — `scripts/orchestration/model-compliance.sh` 경로 추가 필요. 사용자 IDE에서 직접 편집 권장.
  ```json
  "SubagentStop": [{"hooks": [{"type":"command","command":"/Users/noir/Projects/a-team/scripts/orchestration/model-compliance.sh"}]}]
  ```
- [ ] **ppt.md Q0 템플릿 분기 추가** — 권한 거부로 defer. 수동 추가 또는 권한 승인 후 재시도.
- [ ] **Dashboard 통합 앱 안정화** — 모바일 UX 피드백, 사이드바 노트 로딩 속도, 이미지 업로드 실기기 검증, 동기화 이슈
- [ ] **제품 빌드 시작** — Connectome MVP 이번 주 배포 (인프라 중독 탈피)

## 메모
자동 재개 세션(launchd/cron 트리거). model-compliance.sh + generate_from_template.py 구현 완료. ppt.md 편집 권한 거부 — 사용자 수동 추가 필요.
