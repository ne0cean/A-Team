# Auto-Pilot — 자율주행 모드 정의

> **사용자 승인 없이 결과까지 쭉 진행**하는 자율 실행 계약. `/ralph`보다 넓고 `/zzz`와 다른 차원.

---

## 정의

**Auto-Pilot**: 사용자가 한 번 "Go" 한 후 **모든 중간 결정/승인 없이** 최종 산출물(코드 머지 또는 보고서 또는 보류)까지 자동 진행하는 모드.

a-team 자율 모드 3종 비교:

| 모드 | 용도 | 트리거 | 종료 조건 | 사용자 개입 |
|------|------|--------|---------|----------|
| `/ralph` | **단일** 기계검증 태스크 | `--check` 명령 통과까지 반복 | check 통과 / max 도달 / budget 초과 | 시작 시 1회만 |
| `/zzz` | 수면 + 진행 작업 이어서 | 수면 의도 + 자율 의도 | 토큰 한계 / 사용자 깨움 | 시작 시 1회만 |
| **Auto-Pilot** | **다단계 워크플로우** (리서치→설계→구현→검증) | 명시 "auto-pilot" / "쭉 진행" / "승인 없이" | 최종 산출물 완성 / 명시 STOP 조건 | 시작 시 1회 + 명시 STOP만 |

---

## 진입 트리거

사용자 메시지에 다음 표현 → 즉시 Auto-Pilot 모드:
- "auto-pilot으로", "자율주행", "쭉 진행해", "승인 없이"
- "결과까지 쭉", "끝까지 알아서"
- "옵션 B로 가자" (현 컨텍스트 — 이전에 정의된 멀티스텝 워크플로우)

`/zzz`와 차이: 수면 의도 없음. 당장 진행 + 사용자가 깨어있을 수 있음.
`/ralph`와 차이: 단일 `--check`로 끝나지 않는 다단계. 결과 보고 단계 포함.

---

## 강제 조항

### 1. 사전 STOP 조건 명시 (의무)

Auto-Pilot 진입 시 **첫 turn에 STOP 조건 4가지 명시**:
1. **완료**: 최종 산출물(코드 머지/문서/보고서) 생성 완료
2. **차단**: 외부 의존(API 키/사용자 결정 필수)으로 진행 불가
3. **위험**: governance/rules/guardrails.md 위반 위험 (force push / 데이터 손실 / 비밀 노출)
4. **예산**: 토큰/비용 사전 한도 초과

위 4 외엔 사용자 confirm 요청 금지. 사용자 메시지 도착 시 즉시 인터럽트.

### 2. 체크포인트 의무 (commit + push)

매 단계 완료 시:
- 즉시 commit + push (관성 작업도 마찬가지)
- `.context/AUTO-PILOT-LOG.md`에 단계별 결과 append
- 다음 단계 자동 진행

### 3. 자가 평가 우선

각 단계 종료 시 다음 단계로 가기 전 자가평가:
- 산출물이 다음 단계 입력으로 충분한가?
- 부족하면 → 같은 단계 1회 재시도 (max 2회)
- 2회 후에도 부족 → STOP 조건 2(차단) 발동, 사용자 보고

### 4. 나레이션 최소

`autonomous-loop.md` 강제 조항 6 준수. 단계 전환 시 1줄 진행 표시만:
```
✓ Step 1 (리서치) 완료 → Step 2 (설계) 진행 중
```

### 5. 외부 자원 흡수 시 external-references.md 갱신

Auto-Pilot 중 새 외부 자원(GitHub repo/영상/표준) 흡수 시 즉시 `governance/external-references.md`에 row 추가. 누락 시 위반.

### 6. 모델 적정성 (model-allocation.md)

Auto-Pilot 중에도 단계별 모델 적정성 적용:
- 리서치/조사 → researcher (Haiku/Sonnet)
- 설계 → architect (Opus, 복잡할 때만)
- 구현 → coder (Sonnet)
- 검증 → reviewer/qa (Sonnet)
- 최종 보고 → 메인 세션

서브에이전트 위임으로 메인 세션 토큰 절감 우선.

---

## 종료 조건 (위 STOP 4가지)

### 정상 종료
- 모든 단계 완료
- 최종 산출물 + 보고서 작성
- 사용자에게 1턴 완료 보고

### 차단 종료
- 외부 의존 발생 시:
  1. 해당 단계까지 commit + push
  2. `.context/AUTO-PILOT-LOG.md`에 차단 사유 기록
  3. 사용자에게 차단 보고 + 필요 자원 명시
  4. 가능한 다음 단계로 우회 시도 (선택적)

### 위험 종료
- guardrails.md 위반 위험 감지 즉시 STOP
- 사용자에게 위험 사유 + 진행 옵션 보고

### 예산 종료
- 사전 정의한 토큰/비용 한도 도달
- 현재 단계까지 완료 후 STOP

---

## 사용 예시

### 옵션 B 시나리오 (이번 세션):
```
사용자: "에이전틱 플로우 트렌드 리서치 → 반영 계획 설계까지 쭉 진행해"

Auto-Pilot Step 1: researcher 에이전트에 리서치 위임 (Sonnet, 백그라운드)
Auto-Pilot Step 2: 결과 도착 → 우선순위 5건 추출
Auto-Pilot Step 3: 각 항목 반영 계획 작성 (.research/notes/)
Auto-Pilot Step 4: 사용자 검토용 요약 (저녁 검토 시점)
Auto-Pilot Step 5: 사용자 confirm 후 실 반영 (이번엔 Step 4까지만)

각 단계 완료 시 commit + push. 사용자 개입 없음.
```

### 일반 시나리오:
```
사용자: "X 기능 구현해서 머지까지 쭉 가자"

Step 1: 코드 분석 (researcher)
Step 2: 설계 (architect)
Step 3: 구현 (coder)
Step 4: 테스트 (qa)
Step 5: 리뷰 (reviewer)
Step 6: 머지 (사용자 승인 필요 → STOP 조건 2 발동)
```

---

## 차단 vs `/ralph` vs `/zzz` 결정 트리

```
사용자 자율 의도 표현
├── 수면 의도 동반 → /zzz
├── 단일 검증가능 태스크 + --check 가능 → /ralph
└── 다단계 워크플로우 (리서치→설계→구현→...) → Auto-Pilot
```

---

## TRIGGER-INDEX 등록

`governance/rules/TRIGGER-INDEX.md`에 다음 row 추가:
```
| `auto-pilot.md` | 130 | 사용자 "auto-pilot/자율주행/쭉 진행" 표현 / 다단계 워크플로우 자율 실행 | auto-pilot, 자율주행, 쭉 진행, STOP 조건 |
```

---

## 보강 사항 (향후)

- **AUTO-PILOT-LOG.md 템플릿**: 단계별 진행 기록 표준화 (현재 ad-hoc)
- **Auto-Pilot 진입 시 자동 STOP 조건 자동 출력**: 첫 응답에 4가지 자동 명시 강제
- **Ralph + Auto-Pilot 조합**: Auto-Pilot 단계 중 검증가능한 단일 태스크는 Ralph로 위임 가능
