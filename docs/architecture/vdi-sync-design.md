# VDI 데이터 동기화 설계 결정 (ADR)

**작성일**: 2026-05-24
**상태**: PROPOSED
**작성자**: Architect Agent
**대상 독자**: 구현 에이전트(coder), 시스템 관리자

---

## 배경

A-Team(1인 + AI)은 로컬 Mac에서 cortex/ 지식 베이스(770+ 마크다운 파일, 첨부 이미지 포함)를
git 기반 워크플로우로 관리한다. VDI(회사 지급 가상 데스크톱 인프라) 환경에서도 동일 데이터에
접근해야 하는 요구가 생겼다. VDI는 일반적으로 사내망에 격리되어 있고, 직접 외부 인터넷 접근이
제한되거나 감사 대상이다.

---

## 제약 조건 (설계 전 명확화 필요)

다음 사항은 VDI 환경에 따라 답이 달라진다. **가정을 명시하고 설계한다.**

| 항목 | 가정 (불확실) |
|------|-------------|
| VDI → 외부 인터넷 직접 접근 | 제한됨 (사내 프록시 경유) |
| VDI → Mac 직접 SSH | 불가 (방화벽) |
| Mac → VDI SSH | 가능 여부 미확인 |
| VDI에 Docker 설치 가능 | 일반적으로 불가 (권한 없음) |
| VDI에서 git 사용 가능 | 가능 (대부분 허용) |
| 동기화 데이터 보안 등급 | 개인 지식 베이스 (민감도 낮음) |

**이 가정이 틀리면 구조가 바뀐다.** 특히 "VDI에서 외부 GitHub 직접 접근 가능" 시
옵션 A(GitHub 직통)가 즉시 최적해가 된다.

---

## 요구사항 분석

### 기능적 요구사항
- Mac cortex/ 변경사항이 VDI에서 조회 가능해야 한다
- VDI에서 노트 수정 시 Mac에 반영되어야 한다
- 기존 git 워크플로우(auto-sync.sh, /end 커밋)를 깨지 않아야 한다
- 770+ 파일 + 이미지 첨부(cortex/attachments/)를 모두 처리해야 한다

### 비기능적 요구사항
- 1인 운영: 유지보수 비용 최소화
- 충돌 해소: 양방향 편집 시 git merge 전략으로 처리
- 가용성: Mac이 꺼져 있어도 VDI에서 최신 스냅샷 접근 가능
- 비용: 월 $0 ~ 낮은 수준 (개인 프로젝트)

---

## 조사 결과

### GitLab CE (Docker Self-Hosted)

**가능 여부**: 기술적으로 완전히 가능.

```
공식 이미지: gitlab/gitlab-ce:latest
최소 요구사양: RAM 4GB (실사용 6-8GB 권장), CPU 2코어
포트: 80(HTTP), 443(HTTPS), 22(SSH)
라이선스: MIT (무료, 영구)
```

**핵심 사실**:
- GitLab CE는 완전 무료. Data Center/Enterprise 라이선스 불필요.
- Docker 단일 컨테이너로 기동 가능 (gitlab-ce 이미지에 Postgres, Redis, Nginx 내장).
- Mac에서 `docker run` 한 번으로 로컬 git 서버 역할 가능.
- VDI가 Mac의 IP:PORT에 접근 가능하면 (같은 WiFi, 또는 VPN 경유) push/pull 가능.

**운영 현실**:
- Mac이 꺼지면 GitLab도 꺼진다 → VDI에서 push 불가.
- 초기 기동 시간 2-3분, 메모리 상시 점유 2-4GB.
- 업그레이드 순서 지켜야 함 (major 버전 스킵 불가).
- Mac 개인 장비에 git 서버를 올리는 것은 과도한 오버엔지니어링.

### Confluence (Docker Self-Hosted)

**가능 여부**: 기술적으로 가능하지만 **라이선스 비용 발생**.

```
이미지: atlassian/confluence (Data Center 평가판 또는 Server)
Server 라이선스: 2021년 판매 종료. 기존 보유자만 사용 가능.
Data Center: 연간 $10/user (최소 10명 = $100/년, 2026 기준)
Cloud: $5.75/user/월
```

**핵심 사실**:
- Confluence Server(영구 라이선스) 신규 구매 불가 (2021년 종료).
- Data Center를 Docker로 돌리려면 라이선스 키 필요 + 연간 비용.
- 평가판은 30일 제한.
- 770개 마크다운을 Confluence로 마이그레이션하는 변환 비용도 크다.
- **결론: Confluence는 이 케이스에 부적합. 비용 대비 가치 없음.**

---

## 옵션 비교

### 옵션 A: GitHub 직통 (현재 구조 유지)

```
Mac ──git push──▶ GitHub (ne0cean/A-Team) ◀──git pull── VDI
```

- VDI에서 GitHub에 직접 접근 가능하면 추가 인프라 제로.
- VDI에 git + SSH 키만 있으면 된다.
- auto-sync.sh가 Mac → GitHub push를 이미 처리한다.

| 항목 | 평가 |
|------|------|
| 구현 복잡도 | 낮음 |
| 유지보수 | 없음 |
| 비용 | $0 |
| VDI 제약 | GitHub 접근 가능해야 함 |
| 오프라인 | Mac 꺼져도 GitHub에서 pull 가능 |

**채택 조건**: VDI에서 github.com:443 접근이 열려있을 것.

---

### 옵션 B: Gitea (경량 로컬 git 서버, Mac Docker)

```
Mac ──push──▶ Gitea (Mac:3000) ◀──pull── VDI (같은 네트워크)
  └──mirror──▶ GitHub (백업)
```

GitLab CE 대신 Gitea를 사용. 이유:

```
Gitea 메모리: ~150MB
GitLab CE 메모리: 2,000-4,000MB
```

- Gitea는 단일 Go 바이너리 또는 Docker 컨테이너 (~150MB RAM).
- GitLab의 1/20 리소스로 동일한 git 서버 기능 제공.
- GitHub mirror 기능 내장 → Mac Gitea → GitHub 자동 미러링.

| 항목 | 평가 |
|------|------|
| 구현 복잡도 | 중간 (Docker + 포트 설정) |
| 유지보수 | 낮음 (거의 방치 가능) |
| 비용 | $0 |
| VDI 제약 | Mac IP:3000 접근 가능해야 함 |
| 오프라인 | Mac 꺼지면 push 불가 |

**채택 조건**: VDI와 Mac이 같은 네트워크이거나 VPN으로 연결될 것.

---

### 옵션 C: Syncthing (파일 레벨 P2P 동기화)

```
Mac cortex/ ◀──P2P──▶ Syncthing ◀──P2P──▶ VDI cortex-mirror/
```

- git을 우회하여 파일 자체를 직접 동기화.
- 오픈소스, 무료, 암호화 P2P.
- 변경 감지 즉시 동기화 (수초 이내).
- 양방향 충돌은 `.sync-conflict` 파일로 보존.

| 항목 | 평가 |
|------|------|
| 구현 복잡도 | 낮음 (GUI 앱 설치 후 폴더 지정) |
| 유지보수 | 없음 |
| 비용 | $0 |
| VDI 제약 | VDI에 Syncthing 설치 권한 필요 |
| git 통합 | 별도 작업 (git은 Mac에서만 관리) |
| 오프라인 | 온라인 복귀 시 자동 재동기화 |

**주의**: Syncthing은 git 충돌이 아닌 파일 충돌 방식. `.git/` 디렉토리도 동기화하면
git 상태 오염 가능 → cortex/만 동기화, .git은 제외해야 함.

---

### 옵션 D: rsync + SSH (단방향 스냅샷)

```
Mac ──rsync over SSH──▶ VDI (읽기 전용 미러)
     (cron 5분마다)
```

- Mac에서 VDI로 5분 단위 rsync.
- VDI는 읽기 전용으로 조회만 함.
- SSH 접근 방향이 Mac → VDI여야 한다.

| 항목 | 평가 |
|------|------|
| 구현 복잡도 | 낮음 |
| 양방향 | 불가 (단방향) |
| VDI 편집 | 불가 |
| 비용 | $0 |

VDI에서 편집 불필요하다면 단순하고 안정적인 선택.

---

### 옵션 E: Obsidian Sync ($96/년)

```
Mac Obsidian ──cloud──▶ Obsidian Sync 서버 ◀──cloud── VDI Obsidian
```

- 공식 E2E 암호화 동기화.
- Obsidian이 이미 cortex/ 뷰어로 사용 중이라면 추가 설정 없음.
- 연간 $96 비용.
- 저장소 크기 제한: 10GB (이미지 포함).

| 항목 | 평가 |
|------|------|
| 구현 복잡도 | 없음 (설정 1분) |
| 유지보수 | 없음 |
| 비용 | $96/년 ($8/월) |
| VDI 제약 | Obsidian 앱 설치, 외부 클라우드 접근 필요 |
| git 통합 | 별도 (Obsidian Sync와 git은 독립) |

---

## 권장안 결정

### 의사결정 트리

```
VDI에서 github.com 접근 가능?
  YES ──▶ [옵션 A] GitHub 직통. 추가 작업 없음.
  NO
   │
   ├── VDI에서 Syncthing 설치 가능?
   │     YES ──▶ [옵션 C] Syncthing. 가장 단순.
   │     NO
   │      │
   │      ├── Mac → VDI SSH 가능?
   │      │     YES ──▶ [옵션 D] rsync (읽기 전용이면 충분할 때)
   │      │
   │      └── VDI에서 Obsidian 설치 + 외부 클라우드 허용?
   │            YES ──▶ [옵션 E] Obsidian Sync ($96/년)
   │
   └── VDI와 Mac 동일 네트워크 + Syncthing 불가?
         ──▶ [옵션 B] Gitea (마지막 수단)
```

### 1순위 권장: 옵션 A (GitHub 직통)

**이유**: 이미 ne0cean/A-Team GitHub 레포가 있고, auto-sync.sh가 자동 커밋/push를 한다.
VDI에 git + SSH 키만 설정하면 `git pull`로 즉시 cortex/를 받을 수 있다.
인프라 추가가 전혀 없다. YAGNI 원칙에 가장 충실하다.

**수용한 트레이드오프**:
- VDI에서 편집한 내용을 GitHub push 권한으로 올려야 한다 (보안 키 관리).
- GitHub 저장소가 public이라면 cortex/ 민감 파일 노출 위험 → private repo 필수.
- VDI 사내망이 github.com:443을 막으면 즉시 차단.

### 2순위 권장: 옵션 C (Syncthing)

GitHub 직통이 막힌 경우 Syncthing이 차선. 이유:

- 설치/설정 15분. 이후 완전 자동.
- cortex/ 폴더만 동기화 대상으로 지정, .git 제외.
- Mac auto-sync.sh는 그대로 유지 (Mac → GitHub push 경로 보존).
- VDI는 Syncthing으로 받은 파일을 읽기 전용으로 조회, 편집 시에는 Mac에 반영됨.

**GitLab CE는 이 케이스에 권장하지 않는다.** 자원(RAM 4GB+)과 관리 비용이
1인 팀의 지식 베이스 동기화 문제에 비해 과도하다. Gitea로도 충분하지만,
Gitea조차 Mac이 꺼지면 작동하지 않는 문제가 있다.

---

## 최종 권장 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        로컬 Mac                              │
│                                                             │
│  cortex/ (770+ md)                                          │
│      │                                                      │
│  auto-sync.sh                                               │
│  (5분마다 git commit + push)                                 │
│      │                                                      │
│      ▼                                                      │
│  GitHub (ne0cean/A-Team) [Private]  ◀── 1순위 경로          │
│                                                             │
│  Syncthing daemon (cortex/ 폴더)    ◀── 2순위 경로 (폴백)   │
└───────────────────────────────────────┬─────────────────────┘
                                        │
                              인터넷 or 사내망
                                        │
┌───────────────────────────────────────▼─────────────────────┐
│                           VDI                               │
│                                                             │
│  경로 1: git pull (GitHub)                                   │
│    → git clone git@github.com:ne0cean/A-Team cortex/        │
│    → git pull (조회 전 실행)                                  │
│                                                             │
│  경로 2: Syncthing 수신 폴더                                  │
│    → ~/cortex-mirror/ (읽기 전용 권장)                        │
│    → Obsidian vault로 마운트하여 탐색                         │
│                                                             │
│  편집 흐름:                                                   │
│    VDI 편집 → git commit → git push → Mac git pull          │
│    (또는 Syncthing 자동 역방향 동기화)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 구현 단계 (옵션 A 기준)

### Phase 1: GitHub Private 레포 확인 및 VDI git 설정
- 대상 에이전트: coder
- 파일: 없음 (설정 작업)
- 작업:
  1. ne0cean/A-Team 레포를 Private으로 설정 확인
  2. VDI에 SSH 키 생성 (`ssh-keygen -t ed25519`)
  3. GitHub에 VDI 공개키 등록 (Deploy Key 또는 Personal Access Token)
  4. VDI에서 `git clone --depth=1` 으로 cortex/ 체크아웃
  5. 조회 전 `git pull` alias 설정 (`alias cpull='cd ~/cortex && git pull'`)

### Phase 2: auto-sync.sh push 주기 조정
- 대상 에이전트: coder
- 파일: `/Users/noir/Projects/a-team/scripts/auto-sync.sh`
- 작업: push 간격을 5분에서 2분으로 줄여 VDI 지연 최소화 (선택)

### Phase 3: Syncthing 설치 (폴백, 필요 시)
- 대상 에이전트: coder
- Mac: `brew install syncthing` + launchd 서비스 등록
- VDI: Syncthing 바이너리 다운로드 (관리자 권한 없이 ~/bin에 설치 가능)
- 동기화 폴더: cortex/ 만 지정, `.gitignore`에 `.stversions/` 추가

---

## 각 옵션 최종 비교표

| 기준 | A: GitHub | B: Gitea | C: Syncthing | D: rsync | E: Obsidian |
|------|-----------|----------|--------------|----------|-------------|
| 구현 복잡도 | 낮음 | 중간 | 낮음 | 낮음 | 없음 |
| 유지보수 | 없음 | 낮음 | 없음 | 낮음 | 없음 |
| 비용 | $0 | $0 | $0 | $0 | $96/년 |
| Mac 오프라인 | 정상 | 불가 | 정상 | 불가 | 정상 |
| 양방향 편집 | 가능 | 가능 | 가능 | 불가 | 가능 |
| git 통합 | 완벽 | 완벽 | 별도 관리 | 별도 관리 | 별도 관리 |
| VDI 제약 | 외부 접근 | 동일망 | 앱 설치 | SSH 가능 | 앱+클라우드 |
| 1인 운영 적합성 | 최상 | 보통 | 최상 | 보통 | 최상 |

---

## 리스크

1. **GitHub 레포 공개 상태**: cortex/에 API 키, 개인 정보가 있을 경우 Private 필수. 현재 `cortex/areas/life/API Key.md` 파일이 존재 — 즉시 확인 필요.
2. **VDI git push 권한**: VDI에서 GitHub push 시 SSH 키 또는 PAT 관리. 키가 VDI에 남으면 퇴직/반납 시 보안 문제 → Deploy Key(read-only)로 VDI를 read-only로 유지하고 편집은 Mac에서만 하는 것이 안전.
3. **대용량 첨부 이미지**: cortex/attachments/ 에 PNG 100+ 개. git LFS 미설정 시 레포 크기 비대화 가능. 현재 규모에서는 문제 없지만 이미지가 계속 쌓이면 git clone 속도 저하.
4. **Syncthing + git 충돌**: Syncthing이 .git/ 내부 파일을 동기화하면 git index 오염. 반드시 .git 디렉토리를 ignore 대상에 추가해야 함.
5. **VDI 환경 이질성**: VDI가 Windows 기반이면 줄 끝 문자(CRLF) 충돌 가능 → `.gitattributes`에 `* text=auto` 설정 필요.

---

## 성공 기준

- VDI에서 `git pull` (또는 Syncthing 자동) 후 Mac 최신 cortex/ 파일 조회 가능
- Mac auto-sync.sh 워크플로우 변경 없이 동작
- VDI에서 편집한 노트가 Mac에 반영됨 (편집 필요 시)
- 추가 서버 인프라 없음 (옵션 A 선택 시)

---

## 즉시 해야 할 것 (Phase 0, coder 없이 직접)

1. VDI가 github.com:443 접근 가능한지 확인 → `curl https://github.com`
2. cortex/areas/life/API Key.md 내용 확인 → GitHub 올리기 전 민감 정보 점검
3. ne0cean/A-Team 레포 Public/Private 상태 확인

이 세 가지 사실만 확인되면 옵션 A vs C 결정이 5분 내 완료된다.
