# Mesh Health History

`/mesh` 실행 결과가 누적된다. `node scripts/mesh-scan.mjs` 로 최신 스코어 확인.

## 헬스 스코어 기준

| 범위 | 등급 | 의미 |
|------|------|------|
| 90-100 | A | 모든 연결 정상, 체인 완전 |
| 75-89 | B | 경미한 갭, 즉시 패치 가능 |
| 60-74 | C | 중요 갭 존재, /mesh patch 권장 |
| 40-59 | D | 연결 심각 저하, 즉시 수정 |
| 0-39 | F | 시스템 재점검 필요 |

## 히스토리

| Date | Score | Chains | Gaps | Patched | Notes |
|------|-------|--------|------|---------|-------|
| (초기값 — /mesh 첫 실행 시 자동 채워짐) | | | | | |

## 체인 레지스트리

`governance/skill-chains.yaml` 편집으로 체인 추가/수정.

새 체인 템플릿:
```yaml
- id: my-chain
  name: "내 워크플로우"
  trigger_after: [커맨드명]    # 이 커맨드 완료 후 감지 (/ 없이)
  steps: [step1, step2, step3] # 실행 순서
  auto_advance: false          # false=제안만
  description: "설명"
```

## 관련 파일

| 파일 | 역할 |
|------|------|
| `governance/skill-chains.yaml` | 체인 레지스트리 |
| `governance/mesh-health.json` | 최근 스캔 결과 JSON |
| `.context/chain-state.json` | 현재 활성 체인 위치 |
| `scripts/hooks/chain-suggester.sh` | Stop 훅 — 다음 스텝 제안 |
| `scripts/mesh-scan.mjs` | Census + Gap Detection |
| `scripts/mesh-patch.mjs` | 자동 패치 |
