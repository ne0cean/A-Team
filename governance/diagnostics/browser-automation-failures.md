# Diagnostic: Browser Automation 실패 진단

## 빠른 진단

증상을 보고 해당 섹션으로 바로 이동:

| 증상 | 섹션 |
|------|------|
| 클릭/fill timeout | [A] |
| ARIA 파일 빈값 또는 "unavailable" | [B] |
| 스크린샷은 되는데 빈 페이지 | [C] |
| 에이전트가 "browse 없음"으로 중단 | [D] |
| flow.js --url 이 무시됨 | [E] |

---

## [A] 클릭/fill Timeout

**증상**: `Error: Timeout 5000ms exceeded` on click/fill

```
원인 트리:
  1. goto 스텝이 없거나 실패했는가?
     → YES: steps 첫 번째에 goto 추가
     → NO: 2번으로
  2. 셀렉터가 실제 DOM에 존재하는가?
     → NO: snapshot.js로 ARIA 트리 확인 후 셀렉터 수정
     → YES: 3번으로
  3. 페이지 로딩이 완료됐는가?
     → 의심: goto의 waitUntil 값 확인 ('networkidle' 권장)
     → 로딩 중: wait 스텝 추가 또는 timeout 늘리기
```

**빠른 진단 명령어**:
```bash
# 1. 페이지 실제 상태 확인
node scripts/browser/snapshot.js --url <URL> --out /tmp/diag/

# 2. ARIA 트리에서 셀렉터 찾기
cat /tmp/diag/*.yaml | grep -A2 "버튼텍스트"
```

**수정 예시**:
```js
// ❌ goto 없이 클릭
steps = [{ action: 'click', selector: '#btn' }]

// ✅ goto 먼저
steps = [{ action: 'goto', url: 'http://...' }, { action: 'click', selector: '#btn' }]
// 또는 --url 플래그 사용 (flow.js가 자동 prepend)
```

**재발 방지**: `governance/patterns/browser-automation.md` "goto 없으면 클릭 없다" 규칙

---

## [B] ARIA 파일 빈값 / "unavailable"

**증상**: `.yaml` 파일에 `# Accessibility snapshot unavailable` 또는 빈 내용

```
원인 트리:
  1. page.accessibility.snapshot() 사용 중인가?
     → YES: page.ariaSnapshot()으로 교체 (Playwright 1.41+ deprecated)
     → NO: 2번으로
  2. 페이지 로딩이 완료됐는가?
     → 확인: goto waitUntil: 'networkidle'
  3. 페이지에 접근성 트리가 있는가?
     → 빈 HTML: 정상적으로 빈 트리 반환
```

**진단**:
```bash
# Playwright 버전 확인
cat scripts/browser/node_modules/playwright/package.json | grep '"version"'

# 현재 snapshot.js가 어느 API 사용하는지 확인
grep -n "ariaSnapshot\|accessibility" scripts/browser/snapshot.js
```

**수정**:
```js
// ❌ deprecated (1.41+에서 null 반환)
const snapshot = await page.accessibility.snapshot({ interestingOnly: false });

// ✅ 현재 API (YAML 문자열 반환)
const yaml = await page.ariaSnapshot();
fs.writeFileSync(path, yaml || '# Empty', 'utf-8');
```

**재발 방지**: `governance/patterns/browser-automation.md` "Known Deprecated APIs" 참조

---

## [C] 스크린샷은 되는데 빈 페이지

**증상**: .png 파일이 생성되지만 흰 화면 또는 빈 페이지 캡처됨

```
원인 트리:
  1. goto가 실패하지 않고 빈 URL로 이동했는가?
     → flow.js --url 사용 중: E섹션 참조
     → URL 자체가 잘못됨: 확인
  2. 서버가 실행 중인가?
     → console.json에 에러 없는지 확인
  3. waitUntil 기준 전에 스크린샷?
     → wait 스텝 추가 또는 timeout 늘리기
```

**진단**:
```bash
# console 에러 확인
cat /tmp/diag/*-console.json

# 직접 방문 확인
curl -I <URL>
```

---

## [D] 에이전트 "browse 없음" 중단

**증상**: QA 에이전트가 `browse: command not found` 또는 `browse 데몬 필요` 에러로 중단

```
원인: 에이전트가 외부 browse 바이너리 의존
수정: Playwright 스크립트 직접 호출로 교체
```

**수정 패턴** (`.claude/agents/qa.md` 기준):
```bash
# ❌ 외부 바이너리
browse goto https://example.com
browse screenshot

# ✅ 내부 Playwright 스크립트
BROWSER_DIR="/Users/noir/Projects/a-team/scripts/browser"
node "$BROWSER_DIR/snapshot.js" --url https://example.com --out /tmp/qa/
```

**참조**: `.claude/agents/ui-inspector.md` — 검증된 패턴

---

## [E] flow.js --url 플래그 무시됨

**증상**: `--url https://example.com` 지정했는데 빈 페이지에서 클릭 시도

```
원인: --url 플래그가 파싱만 되고 steps 배열에 goto로 prepend 안 됨
수정: flow.js에 auto-prepend 로직 추가
```

**확인**:
```bash
grep -n "opts.url" scripts/browser/flow.js
# 다음 패턴이 있어야 함:
# if (opts.url && steps[0]?.action !== 'goto') {
#   steps.unshift({ action: 'goto', url: opts.url });
# }
```

**수정 완료 여부**: scripts/browser/flow.js (commit e7a937d6에서 수정됨)

---

## 체크리스트 (모든 browser 스크립트 이슈 공통)

```bash
# 1. Playwright 설치 확인
cd scripts/browser && ls node_modules/playwright 2>/dev/null || echo "npm install 필요"

# 2. 브라우저 바이너리 확인
npx playwright install chromium --dry-run 2>&1 | head -3

# 3. 기본 동작 테스트
node scripts/browser/snapshot.js --url https://example.com --out /tmp/test-diag/
cat /tmp/test-diag/*.yaml | head -5
```
