---
name: Termux Remote Control
description: PC(ADB shell)에서 Termux 유저(u0_a533) 권한으로 Android 내부 파일을 R/W + 임의 bash 실행하는 IPC 브릿지. Android 14+ 데이터 격리 우회.
---

# Termux Remote Control Skill

## 언제 쓰나
Android 폰 프로젝트에서 **ADB로는 접근 불가한 Termux 내부 디렉토리** (`~/.termux/`, `~/.shortcuts/`, `$HOME/*`)를 Claude가 직접 R/W해야 할 때.

- 위젯 shortcut 파일 설치/수정
- `~/.termux/boot/`에 부팅 스크립트 배치
- `~/.termux/termux.properties` 수정
- Termux 앱으로 설치된 패키지 관리
- Termux 유저 컨텍스트에서 임의 명령 실행

**핵심 통찰**: Android 14+ SELinux가 ADB shell(uid 2000) ↔ Termux(u0_a533) 양방향 접근 모두 차단. 유일한 공유 저장소는 `/sdcard/`. 이걸 IPC 채널로 쓴다.

## 아키텍처

```
PC Claude (ADB shell, uid 2000)
      │
      │ 1. write /sdcard/Download/termux_ctrl.req
      ▼
/sdcard/Download/termux_ctrl.req ← ─ ─ ─ ─ ┐
      │                                    │ shared (both R/W)
      ▼                                    │
Termux Agent (u0_a533)                     │
  polls every 1s                           │
  executes bash -c                         │
  60s timeout                              │
  writes response                          │
      │                                    │
      ▼                                    │
/sdcard/Download/termux_ctrl.resp ← ─ ─ ─ ─ ┤
      │                                    │
      │ 3. read response                   │
      ▼                                    │
PC Claude reads result ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

## 부트스트랩 (프로젝트당 1회)

1. PC에서 agent 스크립트를 폰에 배포:
   ```bash
   adb push ~/tools/A-Team/scripts/termux-ctrl-agent.sh /data/local/tmp/termux-ctrl-agent.sh
   adb shell chmod +x /data/local/tmp/termux-ctrl-agent.sh
   ```

2. **사용자에게 Termux 앱에서 한 줄 실행 부탁** (이게 격리 우회의 본질적 최소 개입):
   ```bash
   bash /data/local/tmp/termux-ctrl-agent.sh install
   ```

3. 검증:
   ```bash
   adb shell cat /sdcard/Download/termux_ctrl.log
   # "ctrl: started (PID ..., uid=10533)" 보이면 OK
   ```

이후 agent는 `~/.termux/boot/termux-ctrl-agent.sh`로 자기복제 되어 재부팅 시 자동 시작됨.

## Claude 사용 패턴

### 단일 명령 실행 (bash 래퍼 권장)
```bash
termux_exec() {
  local ID="REQ_$(date +%s)_$$"
  local ADB="${ADB:-adb}"
  "$ADB" shell "cat > /sdcard/Download/termux_ctrl.req << 'EOF'
$ID
$*
EOF"
  # 응답 대기 — 간단한 명령은 2초면 충분, 복잡하면 더
  local tries=0
  while [ $tries -lt 30 ]; do
    sleep 1
    local RESP_ID=$("$ADB" shell "head -1 /sdcard/Download/termux_ctrl.resp 2>/dev/null" | tr -d '\r')
    [ "$RESP_ID" = "$ID" ] && break
    tries=$((tries+1))
  done
  "$ADB" shell cat /sdcard/Download/termux_ctrl.resp
}

# 사용
termux_exec "ls ~/.termux/boot/"
termux_exec "cp /data/local/tmp/x ~/.shortcuts/x && chmod +x ~/.shortcuts/x"
```

### 프로토콜 (낮은 레벨)
- 요청: `/sdcard/Download/termux_ctrl.req`
  - 1줄: 고유 request ID (시각/임의)
  - 2줄+: 실행할 bash 명령 (여러 줄 OK)
- 응답: `/sdcard/Download/termux_ctrl.resp`
  - 1줄: 같은 request ID (같은 ID 보일 때까지 폴링)
  - 2줄: `rc=<exit_code>`
  - 3줄: `duration=<seconds>s`
  - 4~: `--- output ---` (stdout+stderr 합쳐짐)
- 로그: `/sdcard/Download/termux_ctrl.log`
- PID: `/sdcard/Download/termux_ctrl.pid`

## 한계와 주의

- **명령당 60초 타임아웃** — 오래 걸리는 작업은 nohup로 백그라운드화하고 종료/상태 파일 따로 폴링
- **singleton** — 한 번에 한 agent만 실행 (PID guard)
- **Termux 유저 권한만** — shell 유저 권한이 필요한 작업(`/dev/input` 등)은 여전히 ADB shell로 별도 처리
- **Claude가 Termux 유저 권한으로 임의 코드 실행 가능** → 사용자가 PC를 제어할 신뢰 있을 때만 사용. 공용 기기 금지
- **첫 부트스트랩만 사용자 수동** — 이후 모든 작업은 자동

## 복구 시나리오

### Agent가 죽었을 때
1. 홈 화면 Termux:Widget에서 `termux_ctrl_restart` 탭
2. 또는 사용자에게 Termux에서 `bash /data/local/tmp/termux-ctrl-agent.sh install` 재실행 부탁

### 폰 재부팅 후 agent 자동 시작 안 됨
- Termux:Boot 배터리 최적화 해제 (설정 → 앱 → Termux:Boot → 배터리 → 제한 없음)
- `adb shell dumpsys deviceidle whitelist +com.termux.boot`
- Termux:Boot 앱을 한 번 수동으로 열기 (Samsung 앱 시작 권한 fresh)

## 🤖 Claude 자동 트리거링 규칙

**조건 — 아래 중 하나라도 해당되면 termux-ctrl-agent를 자동으로 사용**:
1. `~/.termux/`, `~/.shortcuts/`, `/data/data/com.termux/files/home/*` 하위 경로 R/W 필요
2. Termux 유저(u0_a533) 권한으로 명령 실행 필요 (예: `termux-wake-lock`, `pkg install`)
3. ADB shell로 시도 시 Permission denied 발생 후 Termux 내부 이유로 추정되는 경우

**행동**:
1. 먼저 agent 생존 확인:
   ```bash
   adb shell cat /sdcard/Download/termux_ctrl.log | tail -3
   # "ctrl: started" 마지막 줄이 최근이면 살아있음
   ```
2. 살아있으면 termux_exec 패턴으로 명령 전송
3. 죽어있거나 미설치면 사용자에게 **한 줄만** 부탁:
   ```
   bash /data/local/tmp/termux-ctrl-agent.sh install
   ```

**금지 패턴** (시간 낭비 방지):
- `adb shell ls ~/.termux/` — 항상 Permission denied. 시도 금지
- `adb shell cp X ~/.shortcuts/` — 같은 이유
- `input text` / `input keyevent` 로 Termux 터미널에 명령 입력 시도 — Termux 키보드 채널 막힘

## 관련 파일
- `scripts/termux-ctrl-agent.sh` — agent 본체
- 메모리: `feedback_termux_ctrl_auto_trigger.md` (자동 트리거 조건)
- 메모리: `feedback_termux_widget_adb_blocked.md` (격리 제약)
