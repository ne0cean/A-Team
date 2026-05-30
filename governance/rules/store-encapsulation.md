# Store Encapsulation Rule

## 원칙

Svelte store를 직접 writable로 export하지 않는다. 커스텀 스토어 팩토리로 캡슐화한다.

## 3종 팩토리

| 팩토리 | 용도 | 노출 API | set 노출 |
|--------|------|---------|---------|
| `createDataStore(initial)` | 복잡한 데이터 (월별 일정, standing orders 등) | subscribe, load, mutate | X |
| `createValueStore(initial)` | 단순 값 (현재 연/월, 경로 등) | subscribe, set | O |
| `createToggleStore(initial)` | boolean 토글 (사이드바, 검색 등) | subscribe, set, toggle | O |

## 금지 패턴

```javascript
// BAD: writable 직접 export
export const monthData = writable({ days: {} });

// BAD: deep mutation 후 재할당으로 반응성 트리거
$monthData.days[day].items.splice(idx, 1);
$monthData = $monthData;
```

## 필수 패턴

```javascript
// GOOD: DataStore로 캡슐화
export const monthData = createDataStore({ days: {} });

// GOOD: mutate 콜백 안에서 수정
monthData.mutate(s => {
  s.days[day].items.splice(idx, 1);
});
```

## 도메인 파일 분리

store 6개 이상이면 도메인별 파일로 분리한다.

```
stores/
  factories.js    — 팩토리 함수
  calendar.js     — 캘린더 도메인
  standing.js     — Standing/Frames/Vision
  ui.js           — UI 상태 (sidebar, search, note)
  constants.js    — 상수 (변경 없는 값)
stores.js         — barrel re-export (기존 import 호환)
```

## mutate 규칙

- mutate 콜백 안에서는 동기 mutation만. 비동기 금지.
- mutate 콜백의 s 참조를 외부 변수에 저장하지 않는다.
- save()는 반드시 mutate() 이후에 호출한다.

## 적용 범위

모든 Svelte 프로젝트의 전역 상태 관리에 적용.
패널/위젯 내부 상태는 Context API 또는 컴포넌트 로컬 상태 사용 가능.
