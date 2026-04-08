# Visual Verification — 자동 시각 검증 거버넌스

UI 파일(.tsx/.jsx/.css/.scss) 수정 시 훅이 자동으로 Before/After 캡처 + diff를 실행하고,
결과를 `additionalContext`로 Claude의 대화 컨텍스트에 주입한다.

---

## 자동 트리거 조건

**대상 파일**: `*.tsx`, `*.jsx`, `*.css`, `*.scss`, `*.styled.ts`
**제외**: `*.test.*`, `*.spec.*`, `*.d.ts`, `*.stories.*`, `node_modules`
**전제**: `UI_INSPECT_ENABLED=true` (기본값) + dev server 실행 중

## Claude의 의무 행동

### additionalContext에 "UI Auto-Verify" 가 나타나면:

1. **diff 이미지를 반드시 Read한다**
   - `Read(diff-{ts}.png)` → 멀티모달로 시각 확인
   - 이 단계를 스킵하면 안 된다. UI 품질 검증의 유일한 수단.

2. **changedElements 좌표를 확인한다**
   - before/after 바운딩박스 좌표 검토
   - delta 값으로 의도한 변경인지 판단

3. **판정**
   - PASS: 의도한 변경만 존재, 레이아웃 정상
   - WARNING: 미세한 부작용 (간격 변화 등) — 사용자에게 보고
   - FAIL: 레이아웃 깨짐, 요소 겹침, 오버플로우, 의도 외 변경 → 즉시 수정

4. **FAIL 시 즉시 수정**
   - 좌표 정보 기반으로 정확한 위치 수정
   - 수정하면 훅이 다시 자동 트리거됨
   - PASS될 때까지 반복 (최대 3회, 이후 에스컬레이션)

## 토큰 예산

| 항목 | 토큰 |
|------|------|
| additionalContext (텍스트) | ~300 |
| diff 이미지 Read | ~400-800 |
| ARIA 스냅샷 Read (필요시) | ~500 |
| **1회 검증 총합** | **~1,000 이내** |

## 스크린샷 해상도 가이드

| 디바이스 | 뷰포트 | 토큰 |
|----------|--------|------|
| 모바일 (기본) | 375x812 | 406 |
| 태블릿 | 768x1024 | 1,049 |
| 데스크톱 | 1280x800 | 1,365 |
| 요소만 | auto-crop | 54-200 |

환경변수 `UI_INSPECT_VIEWPORT`로 기본 뷰포트 설정.

## 환경 설정

```bash
# 프로젝트 .env 또는 CLAUDE.md에 명시
UI_INSPECT_URL=http://localhost:3000   # dev server URL
UI_INSPECT_VIEWPORT=375x812            # 기본 뷰포트
UI_INSPECT_HMR_WAIT=2                  # HMR 대기 초
UI_INSPECT_ENABLED=true                # false로 비활성화
```

## Dev server 미실행 시

훅이 자동으로 graceful skip한다. 에러/경고 없음.
이 경우 코드 리뷰만으로 진행하되, 가능하면 수동으로 `node scripts/browser/snapshot.js`를 실행.

## 설치

최초 1회: `bash scripts/browser/install.sh`
Playwright + Chromium + pngjs 설치됨.
