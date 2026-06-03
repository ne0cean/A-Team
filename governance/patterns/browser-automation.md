# Pattern: Browser Automation (Playwright)

## 언제 사용

Playwright 기반 브라우저 스크립트를 **새로 작성하거나 수정할 때** 이 문서를 먼저 읽는다.
대상: `scripts/browser/snapshot.js`, `flow.js`, `element.js`, `diff.js` 및 유사 스크립트.

---

## 핵심 원칙 (불변 규칙)

1. **API 버전 확인 후 사용** — Playwright는 마이너 버전마다 deprecated API가 생긴다. 코드 작성 전 현재 버전 확인.
2. **goto 없으면 클릭 없다** — 모든 플로우의 첫 스텝은 반드시 `goto`. URL 없이 인터랙션 시 빈 페이지에서 timeout.
3. **에이전트 외부 의존성 금지** — 에이전트가 외부 바이너리(browse, puppeteer 등)에 의존하면 미설치 환경에서 조용히 실패. Playwright 스크립트를 직접 호출할 것.
4. **결과는 stdout JSON 1줄** — 파일 경로만 반환, 내용은 Read로 로드. 토큰 폭발 방지.
5. **headless: true 고정** — CI/자동화 환경에서 GUI 불필요. 옵션으로 노출하지 않는다.

---

## 설계 체크리스트 (구현 전 필수 확인)

```
[ ] Playwright 버전 확인: cd scripts/browser && node -e "require('playwright/package.json').version" 또는 cat node_modules/playwright/package.json | grep version
[ ] 사용하는 API가 현재 버전에서 deprecated 아닌지 확인 (아래 Known Deprecated 목록 참조)
[ ] flow 스크립트: --url 플래그가 있으면 steps 첫 번째에 goto 자동 prepend 로직 포함했는가?
[ ] 에이전트 사전 요건이 외부 바이너리가 아닌 Node.js + Playwright인가?
[ ] 출력이 stdout 1줄 JSON인가? (파일 내용 직접 출력 금지)
[ ] 오류 시 process.exit(1) + JSON error 출력하는가?
```

---

## Known Deprecated APIs

| 버전 | 구버전 API | 대체 API | 비고 |
|------|-----------|---------|------|
| 1.41+ | `page.accessibility.snapshot()` | `page.ariaSnapshot()` | 구버전은 null 반환 |
| 1.46+ | `page.accessibility.snapshot({ interestingOnly })` | `page.ariaSnapshot()` | YAML string 직접 반환 |

**`page.ariaSnapshot()` 주의**:
- 반환값이 **객체가 아닌 YAML 문자열**
- 재귀 포맷터(`formatAriaTree()` 등) 불필요, 직접 파일에 쓰면 됨
- 빈 페이지에서도 동작하나 의미 없는 트리 반환

---

## 안티패턴

```js
// ❌ deprecated (Playwright 1.41+에서 null 반환)
const snapshot = await page.accessibility.snapshot({ interestingOnly: false });

// ❌ goto 없이 클릭 — 빈 페이지에서 timeout
steps = [{ action: 'click', selector: '#btn' }]

// ❌ 에이전트에서 외부 바이너리 의존
// "사전 요건: browse 데몬 설치 필요"

// ❌ 결과를 stdout에 풀 덤프
console.log(JSON.stringify({ aria: fullYamlContent }));  // 토큰 폭발
```

```js
// ✅ 현재 API
const yaml = await page.ariaSnapshot();
fs.writeFileSync(path, yaml || '# Empty', 'utf-8');

// ✅ --url shorthand auto-goto
if (opts.url && steps[0]?.action !== 'goto') {
  steps.unshift({ action: 'goto', url: opts.url });
}

// ✅ 에이전트 사전 요건
// "사전 요건: Node.js 18+ + Playwright (npm install)"

// ✅ 파일 경로만 반환
console.log(JSON.stringify({ ariaPath, screenshotPath }));
```

---

## 참조 구현

- `scripts/browser/snapshot.js` — 전체 패턴 적용됨 (수정 완료: 2026-06)
- `scripts/browser/flow.js` — --url shorthand + ariaSnapshot 수정됨 (2026-06)
- `.claude/agents/ui-inspector.md` — Playwright 직접 호출 에이전트 패턴
