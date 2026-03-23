# /retro — 엔지니어링 회고

git 히스토리와 세션 로그를 분석해 주기적 회고 보고서를 생성한다.
역사 스냅샷을 `.context/retros/`에 저장해 트렌드 비교가 가능하다.

## 호출 방법
- `/retro` — 기본 7일
- `/retro 14d` — 14일
- `/retro 30d` — 30일
- `/retro compare` — 현재 기간 vs 직전 동일 기간 비교

---

## 분석 항목

### 1. 커밋 통계
```bash
git log --since="7 days ago" --oneline --format="%H %ae %s" | head -100
git log --since="7 days ago" --shortstat
```

### 2. 기여자별 분석 (solo/collaborative 모드 감지)
- 커밋 수, 변경 라인 수
- 주요 작업 영역
- 잘한 점 (구체적 커밋 기반)
- 성장 기회 (비판이 아닌 레벨업 관점으로)

### 3. 세션 패턴 (SESSIONS.md 기반)
- 45분 이상 공백 → 세션 구분
- 세션 유형: 깊은 집중(2h+) / 일반(30m~2h) / 마이크로(30m 미만)
- 생산성 피크 시간대

### 4. 핫스팟 분석
```bash
git log --since="7 days ago" --name-only --format="" | sort | uniq -c | sort -rn | head -10
```
자주 변경되는 파일 = 주의 필요 영역

### 5. 커밋 유형 분포
feat / fix / refactor / docs / test / sync 비율

### 6. AI 모델 태스크 분류 (GEMINI_TASKS.md가 있는 경우)
Opus 태스크 vs 위임 가능 태스크 비율

---

## 출력 형식

```
## 📊 [N]일 회고 — [시작일] ~ [종료일]

### 한 줄 요약
[트윗 가능한 핵심 성과]

### 주요 성과
- [구체적 완료 항목, 커밋 해시 포함]

### 활동 지표
- 커밋: [N]개 | 변경: +[N]/-[N] 라인
- 세션: [N]개 (깊은 집중 [N] / 일반 [N] / 마이크로 [N])
- 핫스팟: [자주 변경된 파일 Top 3]

### 기여자 분석
[solo 모드: 자기 분석 / collaborative 모드: 팀원별 분석]

### 개선 기회
- [관찰 기반 구체적 제안]

### 다음 주 포커스
- [CURRENT.md의 Next Tasks와 연계]
```

---

## 스냅샷 저장
```bash
# 트렌드 비교를 위해 현재 회고를 저장
mkdir -p .context/retros/
# 저장 경로: .context/retros/YYYY-MM-DD.md
```

## 원칙
- 모든 관찰은 실제 커밋/데이터에 기반 (추측 금지)
- 비판이 아닌 성장 관점으로 작성
- SESSIONS.md와 CURRENT.md를 보조 데이터로 활용
- solo 모드: 자기 성찰 / collaborative 모드: 팀 논의용 플래그
