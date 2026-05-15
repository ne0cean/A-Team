# Brain Memory System — 연상 발화 메모리 아키텍처

## 배경
장기 아이데이션 프로젝트에서 세션 간 컨텍스트 리셋이 반복됨.
파일을 읽는 것 ≠ 내재화. 구조적으로 "뇌처럼" 발화하는 시스템 필요.

발견 맥락: connectome 프로젝트 1달+ 아이데이션 세션에서 패턴 확인.

---

## 아키텍처

### Cortex (항상 활성) — CLAUDE.md
- 판단 기준, 핵심 신념, 금지 규칙
- 매 세션 자동 로드
- Founder Approval Gate 같은 구조적 규칙 포함

### Hippocampus (세션 시작 시 로드) — memory/MEMORY.md
- 핵심 사실과 연결 인덱스 (200줄 제한)
- 각 전문 영역 파일로 링크
- Tags 섹션: 미해결 아이데이션 추적

### Specialized Regions (키워드 발화) — memory/*.md
- `founder-mind.md`: 창업자 사고 패턴 (판단 필요 시 참조)
- `[product]-core.md`: 제품별 핵심 지식
- `market-intel.md`: 경쟁사/시장 정보
- 주제별 분리 → 필요할 때만 로드

---

## 연상 발화 규칙

대화 중 관련 토픽 감지 시 해당 memory/ 파일 자동 참조:

| 토픽 감지 | 발화할 파일 |
|---|---|
| 제품 방향 판단, 킬 기준, "이게 맞나?" | founder-mind.md |
| flair 기능, sparkle, OOTD, 크루 | flair-core.md |
| connectome 비전, 좌표, 셀레브로 | connectome-core.md |
| 경쟁사, 시장 규모, 중독 메커닉 | market-intel.md |

교차 관점 체크: flair 논의 중에도 connectome 관점 자동 대조.
founder-mind.md의 판단 기준을 모든 제안에 적용.

---

## Founder Approval Gate

빌드/실행 전 창업자 명시적 확인 필수:
1. 카피/스펙 확정 (창업자 OK)
2. 화면/UX 검토 (창업자 확인)
3. 빌드 지시 (1+2 통과 후에만)

검토 안 된 항목을 통과된 것처럼 취급 금지.
Claude가 "검토 안 된 걸 통과된 것처럼 넘기는 패턴"은 반복 발각됨 — 구조적으로 차단.

---

## 적용 방법

1. `CLAUDE.md`에 "연상 발화 규칙" 섹션 추가
2. `memory/` 에 영역별 파일 생성
3. `MEMORY.md`를 인덱스로 유지 (200줄 이내)
4. 세션 시작: `MEMORY.md` 로드 → 필요한 영역 파일 순차 로드
5. 대화 중 키워드 감지 → 해당 영역 파일 참조

---

## 파일 구조 예시

```
memory/
  MEMORY.md          # Hippocampus — 인덱스 (200줄 이내)
  founder-mind.md    # 창업자 사고 패턴
  [product]-core.md  # 제품별 핵심 지식
  market-intel.md    # 시장/경쟁 인텔
```

---

## 적용 대상
- 1달+ 장기 아이데이션 프로젝트에서 특히 유효
- 단기 구현 태스크에는 과잉 (CURRENT.md로 충분)
- 창업자 + AI 페어 작업에서 효과 검증됨

## 출처
connectome 프로젝트 (2026-05-15). 대화 파일: `17-conversation-2026-05-15-pretotype-and-systems.md`
