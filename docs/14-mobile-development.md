# 모바일 개발 가이드 — 폰에서 Claude & Antigravity 사용하기

> PC를 떠나 있어도 개발을 멈추지 않는 법.

---

## 방식 비교

| 방식 | 난이도 | 비용 | 장점 | 단점 |
|------|--------|------|------|------|
| **Claude Remote Control** | ⭐ | Max 구독 | QR 스캔만으로 연결, 실시간 승인/거절 | Max 구독 필요 |
| **SSH + Termux/Termius** | ⭐⭐ | 무료 | 풀 터미널 접근, 직접 코드 편집 가능 | 같은 네트워크 또는 포트포워딩 필요 |
| **Tailscale + Mosh** | ⭐⭐⭐ | 무료 | 어디서든 접속, 끊김 자동 복구 | Tailscale 설치 필요 (PC + 폰) |

---

## 방식 1: Claude Remote Control (권장 — 가장 간단)

Claude Code v2.1.52+ 의 공식 기능입니다.

### 설정 (PC에서)
```bash
# Claude Code 최신 버전 확인
claude --version      # 2.1.52 이상 필요

# Remote Control 세션 시작
claude remote-control
# 또는 이미 세션 중이라면:
# /rc
```

### 사용 (폰에서)
1. QR 코드가 터미널에 표시됨 → 폰 카메라로 스캔
2. Claude 모바일 앱 또는 브라우저에서 열림
3. **실시간으로 할 수 있는 것:**
   - 파일 변경 승인/거절
   - 후속 지시 전송
   - 빌드 상태 모니터링
   - 에이전트 작업 진행 확인

### 요구사항
- Claude Max 구독 (Pro는 추후 지원 예정)
- PC가 켜져 있고 Claude Code가 실행 중이어야 함

---

## 방식 2: SSH + 모바일 터미널

### PC 설정 (Windows — 일회성)
```powershell
# OpenSSH 서버 활성화
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic

# 방화벽 허용
New-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -DisplayName "OpenSSH Server (sshd)" -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

### PC IP 확인
```powershell
ipconfig | findstr "IPv4"
# → 예: 192.168.0.10
```

### 폰 앱 추천
| 앱 | OS | 특징 |
|----|-----|------|
| **Termius** | iOS/Android | 가장 편리, AI 명령어 변환 내장 |
| **Termux** | Android | 완전한 Linux 환경, 무료 |
| **Moshi** | iOS | Mosh 지원, Push 알림, 음성 입력 |

### 폰에서 접속
```bash
# Termux 또는 Termius에서:
ssh SKTelecom@192.168.0.10

# 프로젝트 디렉토리 이동
cd "Desktop/Dev Projects/connectome"

# Claude Code 실행
claude

# 또는 tmux 세션에 붙기 (끊김 방지)
tmux attach -t dev || tmux new -s dev
claude
```

### 끊김 방지: tmux
```bash
# PC에서 미리 tmux 세션을 만들어두면
tmux new -s dev -d "claude"

# 폰에서는 접속만 하면 됨
ssh SKTelecom@192.168.0.10 -t "tmux attach -t dev"
```

---

## 방식 3: Tailscale + Mosh (어디서든 접속)

외부 네트워크(카페, 이동 중)에서도 접속 가능한 방법입니다.

### 설치 (일회성)
1. **PC**: [tailscale.com](https://tailscale.com) 에서 설치 → 로그인
2. **폰**: App Store / Play Store에서 Tailscale 설치 → 같은 계정 로그인
3. 이제 PC와 폰이 가상 사설 네트워크로 연결됨

### 접속
```bash
# Tailscale이 PC에 부여한 IP 확인 (예: 100.x.y.z)
tailscale ip

# 폰에서 (Termux/Termius)
ssh SKTelecom@100.x.y.z

# 또는 Mosh로 (끊김 자동 복구)
mosh SKTelecom@100.x.y.z
```

### Mosh 장점
- WiFi → LTE 전환 시에도 연결 유지
- 높은 레이턴시에서도 즉각적 에코
- PC에 `mosh-server` 설치 필요: `choco install mosh` 또는 WSL에서 `apt install mosh`

---

## A-Team 맥락 보존과의 연동

모바일에서 작업할 때도 **Context Continuity Protocol (CC Mirror)** 이 작동합니다:

1. **작업 시작 전**: `git pull` → `CURRENT.md` 확인
2. **작업 중**: `auto-sync.sh`가 백그라운드에서 자동 커밋
3. **작업 종료 시**: `bash A-Team/scripts/model-exit.sh` → 핸드오프 프롬프트 생성

```bash
# 모바일 세션 시작 원클릭
ssh SKTelecom@100.x.y.z -t '
  cd "Desktop/Dev Projects/connectome"
  git pull
  bash A-Team/scripts/auto-sync.sh &
  tmux attach -t dev || tmux new -s dev "claude"
'
```

---

## 빠른 시작 요약

```
📱 가장 쉬운 방법:
   PC에서 `claude` 실행 후 `/rc` 입력 → 폰으로 QR 스캔 → 끝

🔧 풀 액세스:
   PC에서 SSH 서버 켜기 → 폰에서 Termius/Termux로 접속 → claude 실행

🌍 어디서든:
   PC + 폰에 Tailscale 설치 → Mosh로 접속 → tmux + claude
```

---

## 레퍼런스

| 소스 | 설명 |
|------|------|
| Claude Remote Control 공식 문서 | `claude remote-control` 기능 상세 |
| Termius | iOS/Android SSH 클라이언트 |
| Moshi App | iOS용 AI 코딩 에이전트 터미널 |
| Tailscale | 제로 설정 VPN |
| docs/13-context-continuity-protocol.md | 맥락 보존 프로토콜 |

---
*A-Team docs/14 — Mobile Development Guide. Created 2026-03-20.*
