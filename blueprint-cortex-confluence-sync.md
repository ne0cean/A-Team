# Cortex-Confluence 실시간 동기화 시스템 설계서

> 작성일: 2026-05-30
> 목적: Claude Code 구현 참조용 계획서

---

## 1. 작업 컨텍스트

### 배경 및 목적

VDI(사내 가상 데스크톱)에서 외부망 접근이 불가하여, 로컬 Mac의 Cortex Ritual Dashboard를 사용할 수 없다. Confluence는 VDI와 로컬 Mac 양쪽에서 접근 가능한 유일한 공유 레이어이므로, Cortex 스케줄러 데이터를 Confluence 페이지로 양방향 실시간 동기화하여 VDI에서도 일정 관리가 가능하게 한다.

**핵심 원칙**: Cortex JSON이 SSOT(Single Source of Truth). Confluence는 VDI 접근용 미러.

### 범위

- 포함:
  - 월별 캘린더 데이터 (YYYY-MM.json) → Confluence 월간 캘린더 페이지
  - Standing Orders → Confluence 하위 페이지
  - Day Frames → Confluence 하위 페이지
  - 양방향 동기화 (Cortex ↔ Confluence)
  - 충돌 해소 (시간순 latest-wins)
- 제외:
  - Vision Roadmap (읽기 전용으로 추후 확장 가능)
  - Cortex 노트/위키 동기화 (2차 스코프 — GitLab 미러)
  - 동료 공유 기능 (1인 사용)
  - Cortex Dashboard 웹앱 변경 (기존 유지)

### 입출력 정의

| 항목 | 내용 |
|------|------|
| **입력 (로컬→Confluence)** | `cortex/data/ritual-routine/YYYY-MM.json`, `standing-orders.json`, `day-frames.json` |
| **입력 (Confluence→로컬)** | Confluence 페이지 편집 내용 (Storage Format XHTML) |
| **출력** | 양쪽 데이터 동기화 상태. 동기화 로그 (`logs/confluence-sync.jsonl`) |
| **트리거** | (로컬→Conf) 파일 변경 감지 (fs.watch). (Conf→로컬) polling (30초 간격) |

### 제약조건

- **네트워크**: VDI → 외부망 차단. 로컬 Mac → Confluence/GitLab 접근 가능 (로그인 필요)
- **Confluence API**: Server/Data Center REST API v2. Rate limit 확인 필요 (일반적으로 초당 10-50 요청)
- **데이터 보호**: `cortex/data/ritual-routine/` 파일 덮어쓰기 금지 (CLAUDE.md 규칙). 동기화 전 `.bak` 생성 필수
- **개인 정보**: 전체 스케줄러(개인 일정 포함)가 사내 Confluence에 올라감 — 사용자 인지 하에 진행
- **실시간 정의**: polling 기반 30초 이내. Confluence에는 범용 webhook이 없으므로 polling 필수

### 용어 정의

| 용어 | 정의 |
|------|------|
| Cortex JSON | `cortex/data/ritual-routine/` 하위의 월별/설정 JSON 파일들 |
| Storage Format | Confluence 페이지 본문의 내부 표현 (XHTML 기반) |
| Sync Daemon | 로컬 Mac에서 상시 실행되는 동기화 프로세스 |
| Conflict | 동일 아이템이 양쪽에서 동시에 수정된 상태 |
| Category | 일정 아이템의 분류: ritual, input, work, outcome, EX |

---

## 2. 워크플로우 정의

### 전체 흐름도

```
[Cortex JSON 변경] ──fs.watch──► [Sync Daemon] ──API PUT──► [Confluence 페이지]
                                      │
[Confluence 편집] ──polling 30s──► [Sync Daemon] ──file write──► [Cortex JSON]
                                      │
                                 [Conflict?]
                                  ↙        ↘
                           [No: 적용]    [Yes: timestamp 비교 → latest wins]
```

### LLM 판단 vs 코드 처리 구분

| LLM이 직접 수행 | 스크립트로 처리 |
|----------------|----------------|
| 없음 (전체가 결정론적) | JSON ↔ Confluence XHTML 변환 |
| | 파일 변경 감지 (fs.watch) |
| | Confluence API 호출 (CRUD) |
| | 충돌 감지 및 해소 (timestamp) |
| | 백업 생성 (.bak) |

### 단계별 상세

#### Step 1: 초기 설정 (Setup)

- **처리 주체**: 스크립트 (`scripts/confluence-sync/setup.mjs`)
- **입력**: Confluence base URL, Space key, API token (환경변수 또는 `.env`)
- **처리 내용**:
  1. Confluence 연결 테스트 (GET /rest/api/space/{key})
  2. 페이지 트리 생성: 루트 페이지 "Cortex Scheduler" + 하위 3개 (Calendar, Standing Orders, Day Frames)
  3. 초기 데이터 push (현재 월 + 다음 월)
  4. 페이지 ID 매핑 저장 (`scripts/confluence-sync/page-map.json`)
- **출력**: `page-map.json` (페이지 경로 ↔ Confluence pageId 매핑)
- **성공 기준**: 3개 하위 페이지 생성 + 초기 데이터 렌더링 확인
- **검증 방법**: 각 페이지 GET 후 title/content 존재 확인
- **실패 시 처리**: 연결 실패 → 에러 로그 + 재시도 3회. 권한 부족 → 에러 메시지 출력 후 중단

#### Step 2: JSON → Confluence 변환 (Outbound Sync)

- **처리 주체**: 스크립트 (`scripts/confluence-sync/json-to-confluence.mjs`)
- **입력**: Cortex JSON 파일 (변경 감지된 것)
- **처리 내용**:
  1. JSON 파싱
  2. Confluence Storage Format(XHTML) 생성:
     - 월간 캘린더: `<table>` 7열(월~일) × 주차 행. 각 셀에 카테고리별 체크리스트
     - Standing Orders: 카테고리별 섹션 (`<h2>`) + 아이템 목록
     - Day Frames: 프레임 타입별 섹션 + 카테고리별 아이템
  3. 기존 페이지 버전 번호 조회 (GET)
  4. 페이지 업데이트 (PUT /rest/api/content/{id}) — version 번호 +1
  5. sync 메타데이터 기록 (마지막 동기화 시각, 버전)
- **출력**: Confluence 페이지 업데이트 완료. `sync-state.json` 갱신
- **성공 기준**: PUT 응답 200 + 버전 번호 증가
- **검증 방법**: 업데이트 후 GET으로 content hash 비교
- **실패 시 처리**: API 에러 → 재시도 3회 (exponential backoff). 버전 충돌 (409) → Step 4 충돌 해소로 분기

#### Step 3: Confluence → JSON 변환 (Inbound Sync)

- **처리 주체**: 스크립트 (`scripts/confluence-sync/confluence-to-json.mjs`)
- **입력**: Confluence 페이지 content (polling으로 감지된 변경)
- **처리 내용**:
  1. 페이지 GET (expand=body.storage,version)
  2. 버전 번호가 `sync-state.json`의 마지막 동기화 버전과 다르면 → 변경 감지
  3. Storage Format XHTML 파싱 → JSON 구조 복원
     - `<table>` → days 객체 (날짜별 카테고리별 아이템 배열)
     - 체크박스 상태 (`<ac:task-status>`) → `done: true/false`
     - 텍스트 + URL 추출
  4. `.bak` 파일 생성 (기존 JSON 백업)
  5. JSON 파일 쓰기
  6. `sync-state.json` 갱신
- **출력**: 갱신된 Cortex JSON + `.bak` 백업
- **성공 기준**: JSON 파일 유효성 (파싱 가능 + 기존 대비 30% 이상 축소 아님)
- **검증 방법**: JSON.parse 성공 + 아이템 수 비교 (30% 축소 차단 — D1 안전장치와 동일)
- **실패 시 처리**: 파싱 실패 → `.bak`에서 복원 + 에러 로그. 축소 차단 → 동기화 스킵 + 경고 로그

#### Step 4: 충돌 해소 (Conflict Resolution)

- **처리 주체**: 스크립트 (`scripts/confluence-sync/conflict-resolver.mjs`)
- **입력**: 로컬 JSON + Confluence 버전 + 양쪽 타임스탬프
- **처리 내용**:
  1. 아이템 단위로 diff (id 기반 매칭)
  2. 동일 아이템이 양쪽에서 변경됨 → 타임스탬프 비교 → latest wins
  3. 한쪽에만 추가된 아이템 → 그대로 반영
  4. 한쪽에서 삭제된 아이템 → 삭제 반영
  5. 패배한 쪽의 변경은 `logs/conflict-log.jsonl`에 기록 (복원 가능)
- **출력**: 병합된 JSON + 양쪽 동기화
- **성공 기준**: 병합 후 양쪽 데이터 일치 (hash 비교)
- **검증 방법**: 병합 결과 JSON.parse + 아이템 수 보존 확인
- **실패 시 처리**: 병합 불가 → 로컬 JSON 우선 (SSOT 원칙) + 경고 로그

#### Step 5: Sync Daemon (상시 실행)

- **처리 주체**: 스크립트 (`scripts/confluence-sync/daemon.mjs`)
- **입력**: 없음 (이벤트 기반)
- **처리 내용**:
  1. `fs.watch`로 `cortex/data/ritual-routine/*.json` 변경 감지 → Step 2 트리거
  2. 30초 polling으로 Confluence 페이지 버전 확인 → 변경 시 Step 3 트리거
  3. debounce 1초 (fs.watch 연속 이벤트 방지)
  4. 월 전환 시 새 월 페이지 자동 생성
  5. 헬스 체크: 5분마다 Confluence 연결 확인
- **출력**: `logs/confluence-sync.jsonl` (동기화 이벤트 로그)
- **성공 기준**: 데몬이 중단 없이 실행 + 양쪽 데이터 30초 이내 동기화
- **검증 방법**: 로그에 에러 없음 + 수동 편집 후 동기화 확인
- **실패 시 처리**: Confluence 연결 끊김 → 로컬 변경 큐잉, 재연결 시 일괄 동기화. 데몬 크래시 → launchd 자동 재시작

### 상태 전이

| 상태 | 전이 조건 | 다음 상태 |
|------|----------|----------|
| IDLE | fs.watch 이벤트 또는 polling 변경 감지 | SYNCING |
| SYNCING | 변환 + API 호출 완료 | VERIFYING |
| VERIFYING | 양쪽 hash 일치 | IDLE |
| VERIFYING | hash 불일치 또는 409 | CONFLICT |
| CONFLICT | timestamp 비교 후 병합 완료 | IDLE |
| SYNCING | API 에러 (네트워크) | QUEUED |
| QUEUED | 연결 복구 | SYNCING |

---

## 3. 구현 스펙

### 폴더 구조

```
/Users/noir/Projects/a-team
  ├── scripts/confluence-sync/
  │   ├── daemon.mjs              # 상시 실행 데몬
  │   ├── setup.mjs               # 초기 설정 + 페이지 생성
  │   ├── json-to-confluence.mjs  # JSON → XHTML 변환
  │   ├── confluence-to-json.mjs  # XHTML → JSON 변환
  │   ├── conflict-resolver.mjs   # 충돌 해소
  │   ├── page-map.json           # 페이지 경로 ↔ pageId
  │   ├── sync-state.json         # 마지막 동기화 상태
  │   └── templates/
  │       ├── calendar.mjs        # 월간 캘린더 XHTML 템플릿
  │       ├── standing-orders.mjs  # Standing Orders XHTML 템플릿
  │       └── day-frames.mjs      # Day Frames XHTML 템플릿
  ├── logs/
  │   ├── confluence-sync.jsonl   # 동기화 로그
  │   └── conflict-log.jsonl      # 충돌 기록
  └── .claude/commands/
      └── confluence-sync.md      # /confluence-sync 커맨드
```

### CLAUDE.md 핵심 섹션 목록

- Confluence Sync: 동기화 데몬 관리 명령 및 설정 안내

### 에이전트 구조

**구조 선택**: 단일 에이전트 (데몬 스크립트)

**선택 근거**: 전체 워크플로우가 결정론적(JSON ↔ XHTML 변환 + API 호출)이므로 LLM 판단이 불필요. Node.js 스크립트 단독 실행으로 충분.

### 스킬/스크립트 목록

| 이름 | 유형 | 역할 | 트리거 조건 |
|------|------|------|-----------|
| `confluence-sync/daemon.mjs` | 스크립트 | 상시 동기화 데몬 | launchd로 자동 시작 |
| `confluence-sync/setup.mjs` | 스크립트 | 초기 설정 + 페이지 트리 생성 | 최초 1회 수동 실행 |
| `confluence-sync/json-to-confluence.mjs` | 스크립트 | Cortex → Confluence 변환 | daemon에서 호출 |
| `confluence-sync/confluence-to-json.mjs` | 스크립트 | Confluence → Cortex 변환 | daemon에서 호출 |
| `confluence-sync/conflict-resolver.mjs` | 스크립트 | 충돌 해소 | 동시 수정 감지 시 |
| `/confluence-sync` | 커맨드 | 수동 동기화 + 상태 확인 + 데몬 관리 | 사용자 호출 |

### A-Team 표준 커맨드 규칙

> 이 설계서에 정의된 모든 커맨드는 A-Team 표준 형식으로 작성할 것.

A-Team 표준 커맨드 규격:
1. 파일 위치: `.claude/commands/<name>.md` (슬래시 커맨드) 또는 `.claude/agents/<name>.md` (서브에이전트)
2. frontmatter: `description:` 1줄 — Claude Code `Skill` tool 자동 등록용
3. 배포: `bash scripts/install-commands.sh` 실행으로 `~/.claude/commands/`에 symlink
4. 대용량 참조는 `governance/skills/<name>/*.md`로 분리 → on-demand 로드
5. 자율 루프 포함 시 `governance/rules/autonomous-loop.md` 6 강제 조항 준수 명시

### 주요 산출물 파일

| 파일 | 형식 | 생성 단계 | 용도 |
|------|------|----------|------|
| `scripts/confluence-sync/page-map.json` | JSON | Step 1 | 페이지 경로 ↔ Confluence pageId 매핑 |
| `scripts/confluence-sync/sync-state.json` | JSON | Step 2,3 | 마지막 동기화 버전/타임스탬프 |
| `logs/confluence-sync.jsonl` | JSONL | Step 5 | 동기화 이벤트 로그 |
| `logs/conflict-log.jsonl` | JSONL | Step 4 | 충돌 발생 기록 (패배 측 데이터 보존) |

---

## 4. Confluence 페이지 구조

### 페이지 트리

```
Cortex Scheduler (루트)
  ├── 2026-05 Calendar
  ├── 2026-06 Calendar
  ├── Standing Orders
  └── Day Frames
```

### 캘린더 페이지 레이아웃 (월간)

```html
<h1>2026-06</h1>
<p><em>일정 관리가 아닌, 집중력 배분. 로봇이 되자...</em></p>

<table>
  <tr><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th><th>일</th></tr>
  <tr>
    <td data-date="1">
      <strong>1</strong><br/>
      <ac:task-list>
        <ac:task><ac:task-status>incomplete</ac:task-status>
          <ac:task-body><span style="color:#888">☀</span> Zone2 40min</ac:task-body>
        </ac:task>
        <ac:task><ac:task-status>complete</ac:task-status>
          <ac:task-body><span style="color:#4a9">⚡</span> AX/SCM</ac:task-body>
        </ac:task>
      </ac:task-list>
    </td>
    <!-- ... -->
  </tr>
</table>
```

**카테고리 구분**: 이모지 접두사로 시각 분리
- ☀ ritual (루틴)
- 📥 input (학습/인풋)
- ⚡ work (업무)
- 🎯 outcome (산출)
- 💪 EX (운동)

### Standing Orders 페이지 레이아웃

```html
<h2>Standing (상시)</h2>
<ac:task-list>
  <ac:task><ac:task-body>Swimming/ Golf / 테니스...</ac:task-body></ac:task>
  <!-- ... -->
</ac:task-list>

<h2>Weekly (주간)</h2>
<!-- 매주/격주 구분 -->

<h2>Monthly (월간)</h2>
<!-- recurring + 이번달 -->

<h2>Yearly (연간)</h2>
<!-- 월+일 -->
```

---

## 5. 환경 설정

### 필요한 환경변수

```bash
# .env 또는 환경변수
CONFLUENCE_BASE_URL=https://your-company.atlassian.net  # 또는 사내 서버 URL
CONFLUENCE_SPACE_KEY=~username                           # 개인 스페이스
CONFLUENCE_USERNAME=your-email@company.com
CONFLUENCE_API_TOKEN=xxxx                                # PAT 또는 API token
CONFLUENCE_PARENT_PAGE_ID=                               # 루트 페이지 ID (선택)
```

### launchd 등록

```xml
<!-- com.ateam.confluence-sync.plist -->
<plist version="1.0">
<dict>
  <key>Label</key><string>com.ateam.confluence-sync</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/Users/noir/Projects/a-team/scripts/confluence-sync/daemon.mjs</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/confluence-sync.log</string>
  <key>StandardErrorPath</key><string>/tmp/confluence-sync-err.log</string>
</dict>
</plist>
```

---

## 6. 구현 순서

| 단계 | 내용 | 의존성 |
|------|------|--------|
| 1 | `json-to-confluence.mjs` — JSON → XHTML 변환기 | 없음 |
| 2 | `setup.mjs` — 페이지 생성 + 초기 push | 1 |
| 3 | `confluence-to-json.mjs` — XHTML → JSON 역변환 | 없음 |
| 4 | `conflict-resolver.mjs` — 충돌 해소 | 없음 |
| 5 | `daemon.mjs` — fs.watch + polling + 통합 | 1,3,4 |
| 6 | launchd 등록 + `/confluence-sync` 커맨드 | 5 |
| 7 | VDI에서 편집 → 로컬 반영 E2E 테스트 | 전체 |

---

## 7. 리스크 및 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Confluence API 인증 만료 | 동기화 중단 | 헬스 체크에서 401 감지 → 알림 (Telegram) |
| XHTML 파싱 실패 (Confluence 포맷 변경) | 역변환 깨짐 | 30% 축소 차단 + .bak 자동 복원 |
| VDI에서 대량 편집 중 polling | 부분 데이터 동기화 | debounce + 버전 번호 안정 후 동기화 |
| 개인 일정 사내 노출 | 프라이버시 | 개인 Confluence 스페이스 사용 |
