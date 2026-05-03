# A-Team 정기 유지보수 스크립트

이 디렉토리는 a-team의 지속 성장 및 최적화를 위한 정기 작업 스크립트를 포함합니다.

## 설치

```bash
cd ~/Projects/a-team
bash scripts/install-maintenance-cron.sh
```

그 다음 수동으로 launchd 등록:

```bash
launchctl load ~/Library/LaunchAgents/com.ateam.daily-backup.plist
launchctl load ~/Library/LaunchAgents/com.ateam.weekly-security.plist
launchctl load ~/Library/LaunchAgents/com.ateam.weekly-dashboard.plist
```

## 등록 확인

```bash
launchctl list | grep com.ateam
```

## 스케줄

| 작업 | 주기 | 시간 |
|------|------|------|
| daily-backup | 매일 | 05:00 |
| weekly-security | 일요일 | 23:00 |
| weekly-dashboard | 월요일 | 09:30 |
| absorb-weekly | 일요일 | 11:07 (기존) |

## 로그

```bash
tail -f ~/Library/Logs/com.ateam.daily-backup.log
tail -f ~/Library/Logs/com.ateam.weekly-security.log
tail -f ~/Library/Logs/com.ateam.weekly-dashboard.log
```

## 상세 문서

[governance/rules/maintenance-schedule.md](../../governance/rules/maintenance-schedule.md)
