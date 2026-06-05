# VDI 데이터 동기화 설계 결정 (ADR) v2

**작성일**: 2026-05-24
**개정일**: 2026-05-24 (v2 - 제약 변경 반영)
**상태**: PROPOSED
**작성자**: Architect Agent
**대상 독자**: 구현 에이전트(coder), 시스템 관리자

---

## v1 → v2 변경 이유

v1에서는 "GitHub 직통"을 1순위로 권장했으나, 다음 제약이 확정되었다:

- **VDI에서 GitHub/외부 인터넷 접근 불가** (사내 격리 환경)
- **VDI가 호환하는 도구는 GitLab과 Confluence뿐** (사내 승인 목록)
- Syncthing, Obsidian Sync, rsync+SSH 등 외부/비표준 도구는 사용 불가

따라서 옵션 A(GitHub 직통), C(Syncthing), D(rsync), E(Obsidian Sync)는 **모두 제거**.
GitLab CE / Gitea / Confluence 세 가지만 비교하고, "Mac이 꺼져도 접근 가능"한 구조를 설계한다.

---

## 확정된 제약 조건

| 항목 | 상태 |
|------|------|
| VDI → GitHub/외부 인터넷 | **불가** (확정) |
| VDI → 사내 GitLab 인스턴스 | **가능** (사내 승인 도구) |
| VDI → 사내 Confluence | **가능** (사내 승인 도구) |
| VDI에 임의 앱 설치 | **불가** (관리자 권한 없음) |
| VDI에서 git CLI 사용 | 가능 (GitLab과 연동 전제) |
| Mac ↔ VDI 직접 네트워크 | **불가** (서로 다른 망) |
| 사내 서버(온프렘)에 GitLab 설치 가능 여부 | **미확인** (핵심 분기점) |

---

## 핵심 문제: "Mac이 꺼지면?"

Mac에 GitLab을 Docker로 올리면 Mac이 꺼질 때 VDI에서 접근이 끊긴다.
이 문제가 전체 설계의 분기점이다.

```
Mac Docker GitLab → Mac 꺼짐 → VDI 접근 불가
사내 서버 GitLab   → 상시 가동 → VDI 항상 접근 가능
```

---

## 옵션 비교 (3가지)

### 옵션 A: 사내 서버에 GitLab CE 설치 (권장)

```
┌──────────┐     git push      ┌─────────────────────┐     git pull     ┌──────────┐
│  Mac     │ ──────────────▶   │  사내 서버           │  ◀────────────── │  VDI     │
│  cortex/ │                   │  GitLab CE (Docker)  │                  │  cortex/ │
│          │  ◀────────────    │  상시 가동           │  ──────────────▶ │          │
│          │     git pull      │  IP: 사내망 접근가능  │     git push     │          │
└──────────┘                   └─────────────────────┘                  └──────────┘
                                        │
                                  GitHub mirror
                                   (백업, 선택)
                                        │
                                        ▼
                               ┌─────────────────┐
                               │ GitHub (백업)    │
                               │ ne0cean/A-Team   │
                               └─────────────────┘
```

**구조**:
- 사내에 상시 가동되는 서버(물리 또는 VM)에 GitLab CE Docker를 설치한다.
- Mac은 사내 GitLab에 push, VDI는 사내 GitLab에서 pull (양방향 가능).
- Mac이 꺼져도 GitLab은 사내 서버에서 계속 가동된다.
- GitHub에는 GitLab의 mirror push 기능으로 백업한다 (Mac이 외부 접근 가능하므로).

**GitLab CE Docker 사양**:

```
이미지: gitlab/gitlab-ce:latest
최소 RAM: 4GB (메모리 최적화 시 2.5GB까지 가능)
최적화 적용 시:
  - Puma clustered mode 비활성 → -100~400MB
  - Sidekiq concurrency 5로 축소
  - Prometheus/AlertManager 비활성 → -300MB
  - 결과: 약 2.5GB RAM에서 동작 가능
CPU: 2코어 이상
디스크: 10GB+ (cortex/ 규모 기준 넉넉)
포트: 80(HTTP), 22(SSH)
라이선스: MIT (완전 무료, 영구)
```

| 기준 | 평가 |
|------|------|
| 구현 복잡도 | 중간 (사내 서버 확보 + Docker 설치) |
| 유지보수 | 낮음 (Docker 자동 재시작, 업그레이드 주의) |
| 비용 | $0 (라이선스 무료, 서버 전기세만) |
| Mac 오프라인 | **정상** (사내 서버가 독립 가동) |
| 양방향 편집 | 가능 (git push/pull) |
| git 통합 | 완벽 (기존 auto-sync.sh remote 변경만) |
| VDI 호환 | 완벽 (사내 GitLab = 승인된 도구) |

**장점**:
- 유일하게 "Mac 꺼져도 VDI 접근 가능" + "VDI 승인 도구" 두 조건 모두 충족
- auto-sync.sh의 remote를 GitHub → 사내 GitLab으로 바꾸면 기존 워크플로우 그대로
- GitLab Web UI로 VDI 브라우저에서도 cortex/ 열람/편집 가능 (git CLI 없어도)
- GitHub mirror로 외부 백업까지 자동화

**단점**:
- 사내 서버를 확보해야 한다 (가장 큰 허들)
- GitLab CE RAM 2.5-4GB 상시 점유
- 업그레이드 시 메이저 버전 순차 적용 필요 (15→16→17, 스킵 불가)
- 초기 세팅 30분-1시간

**채택 조건**: 사내에 Docker를 올릴 수 있는 서버(물리/VM/NAS)가 존재할 것.

---

### 옵션 B: Mac에 Gitea Docker + VDI는 Mac 접근 가능 시만 사용

```
┌──────────┐     push/pull     ┌───────────────────┐
│  Mac     │ ◀──────────────▶  │  Gitea (Mac:3000)  │
│  cortex/ │                   │  Docker, ~150MB RAM │
│          │                   └────────┬────────────┘
└──────────┘                            │
                                  VDI에서 Mac:3000
                                  접근 가능한 경우만
                                        │
                                        ▼
                                 ┌──────────┐
                                 │  VDI     │
                                 │  git pull │
                                 └──────────┘
```

**구조**:
- Mac에 Gitea를 Docker로 기동한다 (RAM ~150MB, GitLab의 1/20).
- VDI가 Mac IP:3000에 접근 가능하면 git pull로 cortex/를 받는다.

**Gitea 사양**:

```
이미지: gitea/gitea:latest
RAM: ~150-300MB (GitLab 대비 1/15~1/20)
CPU: 1코어 충분
디스크: 1GB+
포트: 3000(HTTP), 22(SSH)
라이선스: MIT (무료)
기동 시간: 1초 미만 (GitLab은 2-3분)
```

| 기준 | 평가 |
|------|------|
| 구현 복잡도 | 낮음 (Docker 한 줄) |
| 유지보수 | 거의 없음 |
| 비용 | $0 |
| Mac 오프라인 | **불가** (Mac = 서버) |
| 양방향 편집 | 가능 |
| git 통합 | 완벽 |
| VDI 호환 | **문제**: Gitea는 사내 "승인 도구" 목록에 없을 수 있음 |

**핵심 문제 두 가지**:
1. Mac이 꺼지면 VDI 접근 완전 차단
2. VDI에서 "GitLab과 Confluence만 호환" 제약에 Gitea가 포함되는가?
   - Gitea는 git HTTP/SSH 프로토콜을 쓰므로 VDI에 git CLI만 있으면 기술적으로 동작
   - 하지만 사내 보안팀이 "비승인 git 서버" 접속을 차단할 수 있음

**결론**: Mac 상시 가동 + VDI 네트워크 정책이 비승인 서버도 허용하는 경우에만 성립.
두 조건 모두 불확실하므로 **보조 옵션으로만 권장**.

---

### 옵션 C: Confluence를 중계로 사용 (마크다운 동기화)

```
┌──────────┐    API push     ┌────────────────────────┐    브라우저 조회   ┌──────────┐
│  Mac     │ ──────────────▶ │  사내 Confluence       │  ◀──────────────── │  VDI     │
│  cortex/ │                 │  (이미 설치됨, Cloud)   │                   │  브라우저 │
│  770+ md │  스크립트로      │                        │                   │          │
│          │  자동 업로드     │  770+ 페이지            │                   │          │
└──────────┘                 └────────────────────────┘                   └──────────┘
```

**구조**:
- 사내에 이미 Confluence가 설치되어 있다면 (회사 인프라), 별도 서버 불필요.
- Mac에서 cortex/ 마크다운 파일을 Confluence API로 자동 업로드하는 스크립트를 만든다.
- VDI에서는 Confluence 웹 UI로 열람/편집한다.

**Confluence 마크다운 동기화 현실**:

```
문제 1: Confluence는 마크다운을 네이티브 저장하지 않음
         → XHTML(Storage Format)으로 변환 필수
         → md → Confluence 변환 시 서식 손실 발생 (특히 복잡한 테이블, 코드블록)

문제 2: 770+ 파일 초기 업로드
         → Confluence REST API로 페이지 일괄 생성 가능
         → 하지만 폴더 구조(cortex/areas/dev/, cortex/projects/)를
           Confluence Space > Page Hierarchy로 매핑해야 함

문제 3: 양방향 동기화
         → Confluence 편집 → md 역변환 → git commit 파이프라인 필요
         → 이 역변환은 완벽하지 않음 (Confluence 고유 매크로, 이미지 처리 등)

문제 4: 비용
         → 사내 Confluence가 이미 있으면 추가 비용 $0
         → 없으면: Cloud Free(10명, 2GB) 또는 Standard($5.42/user/월)
         → Data Center(온프렘): 최소 $280/년~
```

**사용 가능한 도구**:
- `confluence-markdown-exporter` (PyPI) — Confluence → md 내보내기
- Atlassian Marketplace `Markdown Importer` — md → Confluence 가져오기 (Cloud 전용)
- 자체 스크립트: Confluence REST API + md→XHTML 변환 (pandoc 활용)

| 기준 | 평가 |
|------|------|
| 구현 복잡도 | **높음** (변환 스크립트, API 연동, 구조 매핑) |
| 유지보수 | **높음** (양방향 변환 파이프라인 관리) |
| 비용 | $0 (사내 Confluence 존재 시) ~ $280+/년 |
| Mac 오프라인 | **정상** (Confluence가 사내 서버) |
| 양방향 편집 | 가능하지만 변환 손실 위험 |
| git 통합 | **나쁨** (md↔Confluence 변환 레이어 필요) |
| VDI 호환 | 완벽 (사내 Confluence = 승인된 도구) |
| 데이터 충실도 | **나쁨** (md→XHTML 변환 시 서식 손실) |

**장점**:
- 사내 Confluence가 이미 있으면 인프라 추가 없음
- VDI 브라우저에서 검색/열람이 편리 (위키 UI)
- 비개발자도 접근 가능

**단점**:
- 770개 마크다운의 서식이 Confluence XHTML 변환 과정에서 깨질 수 있음
- 양방향 동기화(Confluence 편집 → md 역변환) 파이프라인이 복잡하고 손실이 생김
- cortex/attachments/ 이미지를 Confluence 첨부파일로 변환하는 추가 작업
- git 이력이 Confluence에서는 유지되지 않음 (별도 버전 관리)
- 자동화 스크립트 자체의 유지보수 부담

**결론**: 기존 마크다운 워크플로우를 유지하면서 Confluence를 "중계"로 쓰는 것은
**변환 비용이 실익을 초과한다**. Confluence는 "뷰어"로만 쓰고 편집은 Mac에서 하는
단방향 구조라면 검토 가능하지만, 양방향은 비추천.

---

## 최종 의사결정

### 결정 트리

```
사내에 Docker를 올릴 수 있는 서버(VM/물리/NAS)가 있는가?
  │
  ├── YES ──▶ [옵션 A] 사내 서버에 GitLab CE Docker
  │           (최적해. 상시 가동, VDI 승인, git 완벽 호환)
  │
  └── NO
       │
       ├── 사내 Confluence가 이미 운영 중인가?
       │     │
       │     ├── YES ──▶ [옵션 C-lite] Confluence를 "읽기 전용 뷰어"로만 사용
       │     │           Mac → Confluence 단방향 push 스크립트
       │     │           편집은 Mac에서만, Confluence는 열람 전용
       │     │
       │     └── NO ──▶ [옵션 B] Mac Gitea + VPN 또는 사내 네트워크 경유
       │                 (Mac 꺼지면 불가, 임시 방편)
       │
       └── 최후 수단: Mac을 VPN으로 사내망에 연결하고 상시 가동
```

### 1순위 권장: 옵션 A (사내 서버 GitLab CE)

**이유**:
유일하게 세 가지 핵심 요건을 동시에 충족하는 옵션이다.
(1) Mac 꺼져도 VDI 접근 가능,
(2) VDI 승인 도구(GitLab),
(3) 기존 git 워크플로우 100% 호환.

**수용한 트레이드오프**:
- 사내 서버 확보가 필요하다 (IT팀 협의 or 개인 VM)
- GitLab CE가 RAM 2.5-4GB 상시 점유한다 (하지만 메모리 최적화로 2.5GB까지 줄일 수 있다)
- 메이저 업그레이드 시 순차 적용이 필요하다 (15→16→17, 연 1-2회)

### 2순위 권장: 옵션 C-lite (Confluence 읽기 전용 뷰어)

사내 서버 확보가 불가능하고 Confluence가 이미 있다면, **단방향 push만** 사용한다.
Mac cortex/ → Confluence API로 페이지 업로드 (cron, 1시간 간격).
VDI에서는 Confluence 웹 UI로 열람만. 편집은 Mac에서만.
양방향 동기화는 시도하지 않는다 (변환 손실 때문에).

---

## 권장 아키텍처 상세 (옵션 A)

### 시스템 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                         사내망 (Intranet)                           │
│                                                                     │
│  ┌───────────────────────────────────┐                              │
│  │      사내 서버 (VM 또는 물리)       │                              │
│  │                                   │                              │
│  │  ┌─────────────────────────────┐  │                              │
│  │  │  GitLab CE (Docker)         │  │                              │
│  │  │  Port 80 (HTTP)             │  │                              │
│  │  │  Port 22 (SSH)              │  │                              │
│  │  │  RAM: 2.5-4GB (최적화 적용)  │  │                              │
│  │  │                             │  │                              │
│  │  │  Repo: cortex/              │  │                              │
│  │  │  770+ md + attachments/     │  │                              │
│  │  └─────────────────────────────┘  │                              │
│  │                                   │                              │
│  │  Docker restart policy: always    │                              │
│  │  Backup: 매일 gitlab-backup 생성   │                              │
│  └────────────┬──────────────────────┘                              │
│               │                                                     │
│       ┌───────┴───────┐                                             │
│       │               │                                             │
│       ▼               ▼                                             │
│  ┌─────────┐    ┌─────────┐                                         │
│  │  Mac    │    │  VDI    │                                         │
│  │         │    │         │                                         │
│  │ git     │    │ git     │                                         │
│  │ push    │    │ pull    │                                         │
│  │ (auto-  │    │ (수동   │                                         │
│  │ sync.sh)│    │ 또는    │                                         │
│  │         │    │ 브라우저 │                                         │
│  └────┬────┘    └─────────┘                                         │
│       │                                                             │
└───────┼─────────────────────────────────────────────────────────────┘
        │
        │  mirror push (외부 네트워크)
        ▼
┌─────────────────┐
│ GitHub (백업)    │
│ ne0cean/A-Team   │
│ Private repo     │
└─────────────────┘
```

### 데이터 흐름

```
[Mac에서 노트 편집]
     │
     ▼
auto-sync.sh (기존 스크립트)
     │  git add + commit + push
     │  remote: origin → 사내 GitLab (변경점)
     ▼
사내 GitLab CE
     │  저장 완료
     │
     ├──▶ VDI: git pull (CLI) 또는 브라우저에서 직접 열람
     │
     └──▶ GitHub mirror push (GitLab 설정에서 자동)
          (Mac이 사내망 + 외부 인터넷 모두 접근 가능한 경우)


[VDI에서 노트 편집 시] (선택적)
     │
     ▼
VDI에서 git commit + push → 사내 GitLab
     │
     ▼
Mac에서 git pull (수동 또는 auto-sync.sh에 pull 추가)
```

### auto-sync.sh 수정 사항

현재 auto-sync.sh가 GitHub에 push하는 부분을 변경한다.

```
변경 전:
  git remote = origin → github.com:ne0cean/A-Team

변경 후:
  git remote = origin   → 사내 GitLab (http://gitlab.internal/noir/cortex)
  git remote = github   → github.com:ne0cean/A-Team (백업)

push 순서:
  1. git push origin main    (사내 GitLab, 필수)
  2. git push github main    (GitHub 백업, 실패해도 무시)
```

### GitLab CE Docker 최적화 설정

사내 서버가 RAM 4GB 정도의 소형 VM이라도 동작하도록 최적화한다.

```
메모리 최적화 항목:
  1. Puma clustered mode 비활성       → -100~400MB
  2. Sidekiq concurrency: 5 (기본 20) → 메모리 절감
  3. Prometheus 비활성                → -300MB
  4. AlertManager 비활성              → 추가 절감
  5. Container Registry 비활성        → 불필요
  6. GitLab Pages 비활성              → 불필요

결과: 최적화 후 약 2.5GB RAM에서 안정 동작
     (1인 사용, cortex/ 레포 1개만 운영)
```

### GitLab 레포 구조

```
사내 GitLab 프로젝트 구조:

Group: noir (또는 a-team)
  └── Project: cortex
        ├── areas/
        │   ├── dev/      (개발 노트)
        │   ├── life/     (생활)
        │   ├── strategy/ (전략)
        │   └── wellness/ (건강)
        ├── projects/
        │   └── hfk/      (프로젝트별)
        ├── attachments/   (이미지 PNG)
        └── ...

Visibility: Private (민감 파일 포함)
Branch: main (단일 브랜치, 1인 사용)
```

---

## 구현 단계

### Phase 0: 사전 확인 (user, 코딩 없음)

1. 사내에 Docker를 올릴 수 있는 서버가 있는지 확인
   - 개인 VM 할당 가능? (IT팀 요청)
   - NAS(Synology 등)에 Docker 패키지 설치 가능?
   - 팀 공용 서버에 컨테이너 하나 올릴 수 있는지?
2. 사내 서버 → 사내 GitLab 포트(80, 22) 방화벽 오픈 확인
3. VDI에서 해당 서버 IP 접근 가능한지 확인
4. `cortex/areas/life/API Key.md` 민감 정보 점검

### Phase 1: 사내 서버에 GitLab CE Docker 설치

- **담당**: coder
- **파일 생성**:
  - `/Users/noir/Projects/a-team/infra/gitlab/docker-compose.yml`
  - `/Users/noir/Projects/a-team/infra/gitlab/gitlab.rb` (최적화 설정)
- **작업**:
  1. docker-compose.yml 작성 (gitlab-ce, volumes, ports, restart: always)
  2. gitlab.rb에 메모리 최적화 설정 주입
  3. 사내 서버에 배포
  4. GitLab 초기 설정 (root 비밀번호, 프로젝트 생성)
  5. 사용자 계정 생성 + SSH 키 등록

### Phase 2: Mac auto-sync.sh remote 변경

- **담당**: coder
- **파일 수정**:
  - `/Users/noir/Projects/a-team/scripts/auto-sync.sh`
- **작업**:
  1. git remote origin을 사내 GitLab URL로 변경
  2. git remote github (또는 backup)를 GitHub URL로 추가
  3. push 시 origin(GitLab) 먼저, github(백업) 후순위
  4. GitHub push 실패 시 무시 (사내망에서 외부 접근 불가 시)

### Phase 3: VDI git 설정

- **담당**: coder (또는 user 직접)
- **작업**:
  1. VDI에서 SSH 키 생성
  2. 사내 GitLab에 VDI 공개키 등록
  3. `git clone git@gitlab.internal:noir/cortex.git`
  4. 조회 alias 설정: `alias cpull='cd ~/cortex && git pull'`
  5. (선택) VDI에서 편집 → push 권한 설정

### Phase 4: GitHub 미러링 설정 (선택)

- **담당**: coder
- **작업**:
  1. 사내 GitLab 프로젝트 설정 → Mirror Repository → Push mirror
  2. 대상: github.com:ne0cean/A-Team
  3. 인증: Personal Access Token 또는 SSH 키
  4. 주기: 자동 (GitLab이 push 감지 시 mirror)
  - 또는: Mac auto-sync.sh에서 GitHub에도 직접 push (Mac이 외부 접근 가능하므로)

### Phase 5: 백업 및 모니터링

- **담당**: coder
- **파일 생성**:
  - `/Users/noir/Projects/a-team/infra/gitlab/backup.sh`
- **작업**:
  1. `gitlab-backup create` cron 설정 (매일 새벽 3시)
  2. 백업 파일을 별도 디스크/NAS에 복사
  3. Docker health check 설정 (restart: always로 자동 복구)

---

## 에러 처리 전략

| 상황 | 처리 |
|------|------|
| 사내 GitLab 서버 다운 | Docker restart: always로 자동 복구. Mac은 로컬 git에 커밋 유지, 서버 복구 후 push. |
| Mac ↔ GitLab 네트워크 단절 | auto-sync.sh가 push 실패 시 로그만 남기고 다음 주기에 재시도. |
| VDI ↔ GitLab 네트워크 단절 | VDI 로컬 clone에 마지막 pull 데이터 유지. 네트워크 복구 후 pull. |
| 양방향 편집 충돌 (Mac + VDI 동시 편집) | git merge conflict 발생. 1인 사용이므로 빈도 극히 낮음. 발생 시 Mac에서 수동 resolve. |
| GitLab 업그레이드 필요 | 분기 1회, 순차 업그레이드 (메이저 스킵 불가). 백업 후 진행. |
| cortex/attachments/ 이미지 비대화 | 현재 규모 문제 없음. 500MB 초과 시 git LFS 전환 검토. |

---

## 비교 최종표

| 기준 | A: 사내 GitLab CE | B: Mac Gitea | C: Confluence 중계 |
|------|-------------------|-------------|-------------------|
| 구현 복잡도 | 중간 | 낮음 | 높음 |
| 유지보수 | 낮음 | 낮음 | 높음 |
| 비용 | $0 | $0 | $0~$280+/년 |
| Mac 오프라인 | **정상** | **불가** | **정상** |
| 양방향 편집 | 가능 | 가능 | 손실 위험 |
| git 통합 | 완벽 | 완벽 | 나쁨 |
| VDI 승인 도구 | **합격** | **불확실** | **합격** |
| 데이터 충실도 | 완벽 | 완벽 | 손실 발생 |
| 1인 운영 적합성 | 좋음 | 보통 | 나쁨 |
| Web UI 열람 | GitLab UI | Gitea UI | Confluence UI |

---

## Confluence를 권장하지 않는 이유 (상세)

"Confluence가 사내에 이미 있으니까 쓰면 되지 않나?" 에 대한 답:

1. **포맷 불일치**: cortex/는 마크다운(md), Confluence는 XHTML Storage Format.
   770개 파일을 변환하면 코드블록 서식, 테이블 정렬, 내부 링크([[wikilink]])가 깨진다.

2. **양방향 동기화 지옥**: md→Confluence는 어렵지만 가능. 하지만 Confluence→md 역변환은
   Confluence 고유 매크로(status, expand, jira-link 등)가 md에 표현 불가.
   편집을 양쪽에서 하는 순간 데이터 드리프트가 발생한다.

3. **git 이력 단절**: Confluence에는 자체 버전 관리가 있지만 git이 아니다.
   기존 auto-sync.sh, /end 커밋, CURRENT.md 기반 워크플로우와 완전히 분리된다.

4. **자동화 스크립트 유지보수**: md→Confluence API push 스크립트 자체가 하나의 프로젝트가 된다.
   770개 파일 구조 매핑, 이미지 첨부 업로드, 변경 감지, 충돌 해소...
   본업(지식 베이스 관리)보다 인프라 관리에 시간이 더 든다.

**예외**: Confluence를 "읽기 전용 뷰어"로만 쓰되, 편집은 절대 Confluence에서 하지 않는다면
단방향 push 스크립트(md→Confluence API, cron 1시간)로 운영 가능. 하지만 이 경우에도
GitLab CE Web UI가 마크다운을 네이티브로 렌더링하므로 GitLab이 더 적합하다.

---

## 리스크

1. **사내 서버 확보 불확실**: 옵션 A의 최대 허들. IT팀 승인 또는 개인 VM 비용 발생 가능.
2. **GitLab CE RAM 점유**: 최적화해도 2.5GB. 소형 VM에서는 다른 서비스와 공존 어려움.
3. **GitLab 업그레이드 부담**: 연 1-2회이지만, 메이저 순차 적용 규칙을 모르면 실수 가능.
4. **사내 보안 정책**: 개인이 사내 서버에 GitLab을 올리는 것이 허용되는지 보안팀 확인 필요.
5. **VDI에서 SSH/git 포트 차단**: VDI 방화벽이 사내 GitLab SSH(22) 포트를 막을 수 있음.
   이 경우 HTTPS(443) 또는 HTTP(80)로 git 접속 설정 필요.

---

## 성공 기준

- Mac auto-sync.sh가 사내 GitLab에 자동 push 성공
- VDI에서 `git pull` 또는 GitLab Web UI로 cortex/ 최신 파일 조회 가능
- Mac이 꺼져 있어도 VDI에서 사내 GitLab 접근 정상
- 기존 /end 커밋, CURRENT.md 워크플로우 변경 없음
- GitHub에 미러 백업 자동 동작 (선택)

---

## 즉시 해야 할 것 (Phase 0)

1. **사내에 Docker 올릴 서버가 있는지 확인** — 이것이 유일한 블로커
   - 개인 VM 신청 가능?
   - NAS(Synology/QNAP)에 Docker 가능?
   - 팀 공용 서버에 컨테이너 요청 가능?
2. VDI에서 해당 서버 IP:80 접근 가능한지 테스트
3. `cortex/areas/life/API Key.md` 민감 정보 점검

이 세 가지가 확인되면 Phase 1(GitLab 설치)은 1시간 내 완료 가능하다.
