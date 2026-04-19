---
description: 리모트 컨트롤 핸드오버 — 디바이스 간 작업 컨텍스트를 심리스하게 이어줍니다
---

# /rc — Remote Control 핸드오버

디바이스를 오가며 작업을 이어받습니다. **릴레이 서버 상태에 따라 자동으로 Send/Receive 모드를 판단**합니다.
멀티 프로젝트 큐를 지원합니다 — 여러 프로젝트에서 `/rc`를 치면 모두 큐에 쌓이고, Receive 측에서 한번에 받습니다.

## Step 1 — 릴레이 서버 핸드오버 상태 확인

```bash
# 멀티 프로젝트 큐 확인 (우선), 실패 시 단일 엔드포인트 폴백
curl -s http://localhost:3001/api/handovers 2>/dev/null || curl -s http://localhost:3001/api/handover 2>/dev/null
```

- 응답이 `[]`, `null`, 또는 빈 값 → **Send 모드** (현재 디바이스에서 내보내기)
- 응답에 항목이 있음 → **Receive 모드** (다른 디바이스에서 받아오기)
  - 모든 항목의 `timestamp`가 10분 이상 지났으면 → Send 모드로 전환

---

## Send 모드 — 현재 컨텍스트를 릴레이로 전송

**언제**: Mac/Windows에서 작업 중 다른 디바이스로 넘길 때

1. 현재 작업 상태 파악:
   ```bash
   pwd
   git status --short 2>/dev/null | head -10
   git log --oneline -3 2>/dev/null
   ```

2. `.context/CURRENT.md` 읽기 (있으면) — NOW/NEXT/BLOCK 파악

3. 핸드오버 요약 구성 (아래 형식):
   ```
   NOW: <지금 하던 작업 한 줄>
   NEXT: <다음에 할 일>
   BLOCK: <막힌 것 있으면>
   ```

4. 릴레이 서버에 전송 (큐에 추가됨 — 같은 path면 덮어쓰기):
   ```bash
   curl -s -X POST http://localhost:3001/api/handover \
     -H "Content-Type: application/json" \
     -d "{\"path\": \"$(pwd)\", \"label\": \"$(basename $(pwd))\", \"context\": \"<위 요약>\"}"
   ```

5. 출력:
   ```
   ✅ 핸드오버 큐 등록 — [프로젝트명] (총 N개 대기)
   다른 디바이스에서 /rc를 실행하면 이어서 작업할 수 있습니다.
   ```

---

## Receive 모드 — 다른 디바이스의 컨텍스트 로드

**언제**: 폰 또는 다른 PC에서 RC Mode로 접속했을 때 자동 실행

1. 큐의 **모든 항목**을 순회하며 요약 출력:
   ```
   📲 핸드오버 수신 — N개 프로젝트

   1. [label1] — path1
      NOW: ...  NEXT: ...  BLOCK: ...

   2. [label2] — path2
      NOW: ...  NEXT: ...  BLOCK: ...
   ```

2. 사용자에게 어떤 프로젝트부터 시작할지 물어보거나, 현재 디렉토리와 매치되는 프로젝트가 있으면 자동 선택

3. 선택된 프로젝트의 `.context/CURRENT.md` 읽기

4. 핸드오버 클리어 (받은 프로젝트만 큐에서 제거):
   ```bash
   curl -s -X POST http://localhost:3001/api/handover-back \
     -H "Content-Type: application/json" \
     -d "{\"path\": \"<path>\"}"
   ```

5. 이어서 작업 시작 — NEXT 태스크 기준으로 즉시 진행

---

## 주의사항
- 릴레이 서버(`localhost:3001`)가 꺼져 있으면 오류 안내 후 종료
- Windows ↔ Mac 경로 불일치 시: 경고 출력 + CURRENT.md만 로드해서 컨텍스트 파악
- 큐는 10분 후 자동 만료 — 오래된 핸드오버는 자동 정리됨
- 같은 프로젝트(path)를 다시 `/rc` 하면 기존 항목을 덮어씀 (중복 방지)
