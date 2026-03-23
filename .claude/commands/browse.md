# /browse — 브라우저 자동화

헤드리스 Chromium 데몬을 통해 웹 앱을 자동화한다.
cold-start 없이 ~100ms/커맨드. 세션 간 쿠키/상태 유지.

## 사전 요건
```bash
# 설치 확인
ls ~/.claude/skills/gstack/browse/dist/browse 2>/dev/null && echo "설치됨" || echo "미설치"

# 미설치 시 설치 방법
# 1. gstack 클론
git clone https://github.com/garrytan/gstack ~/.claude/skills/gstack
# 2. browse 엔진 빌드
cd ~/.claude/skills/gstack && ./setup
```

---

## 기본 커맨드

### 네비게이션
```
goto <url>           페이지 이동
back                 뒤로
reload               새로고침
```

### 페이지 읽기
```
snapshot             ARIA 접근성 트리 + @ref 요소 목록 출력
text                 페이지 텍스트 추출
html                 페이지 HTML
links                모든 링크 목록
console              브라우저 콘솔 로그
```

### 인터랙션 (@ref 사용)
```
click @e1            요소 클릭
fill @e2 "값"        입력 필드에 값 입력
select @e3 "옵션"    드롭다운 선택
upload @e4 /path     파일 업로드
scroll down/up       스크롤
```

### 검증
```
screenshot           스크린샷 저장
diff                 이전 스냅샷 대비 변경 사항
```

### 탭 관리
```
tabs                 열린 탭 목록
tab new              새 탭
tab close            현재 탭 닫기
```

---

## @ref 시스템

DOM 선택자 대신 ARIA 접근성 트리 기반 참조를 사용한다.
`snapshot` 실행 후 `@e1`, `@e2` 형태로 요소 참조.

```
snapshot 결과 예시:
@e1 button "로그인"
@e2 input "이메일 주소"
@e3 input "비밀번호"
@e4 link "회원가입"

→ fill @e2 "test@example.com"
→ fill @e3 "password123"
→ click @e1
```

CSS 선택자, XPath 불필요. shadow DOM, CSP 제약 회피.

---

## 일반 워크플로우

### 로그인이 필요한 앱 테스트
```
1. goto http://localhost:3000
2. snapshot  ← 요소 확인
3. fill @e1 "admin@test.com"
4. fill @e2 "password"
5. click @e3
6. snapshot  ← 로그인 후 상태 확인
```

### 실제 브라우저 쿠키 가져오기 (Chrome/Arc)
```
# macOS만 지원 (Windows 미지원)
browse import-cookies chrome
```

### CAPTCHA/MFA 처리
```
# 자동화 불가 구간에서 사람에게 넘기기
browse handoff "MFA 코드를 입력해주세요"
# 완료 후 자동화 재개
```

---

## 데몬 관리

```bash
# 상태 확인
cat ~/.gstack/browse.json 2>/dev/null

# 수동 종료 (30분 유휴 시 자동 종료)
kill $(cat ~/.gstack/browse.json | python3 -c "import sys,json; print(json.load(sys.stdin)['pid'])")
```

---

## QA 워크플로우와 연동

브라우저 자동화가 필요한 체계적 QA는 `/qa` 사용.
`/browse`는 단발성 자동화 또는 탐색에 적합.

## 원칙
- iframe 미지원 (현재 구조적 한계)
- Windows에서 쿠키 import 미지원
- 데몬이 없으면 첫 커맨드에서 자동 시작 (~3초)
- 버전 불일치 시 자동 재시작
