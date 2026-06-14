// AUTO-GENERATED from worker/src/workout.js — do not edit directly. Regenerate via deploy.sh.
/**
 * workout.js — EX 바(운동 부위) 선택의 sticky carry-forward 로직 (순수 함수).
 *
 * 버그 이력: workoutLog[오늘날짜]로 날짜별 저장 → 자정 넘어 새 날이 되면
 * 그 날짜 키가 없어 바가 통째로 빈 칸이 됨 → 사용자는 "체크가 사라졌다"고 인식.
 * 요구사항: 한 번 체크한 선택은 사용자가 바꿀 때까지 영원히 유지(carry-forward).
 *
 * 해법: 바는 "오늘 키가 있으면 그것, 없으면 가장 최근 비어있지 않은 날의 선택"을 표시.
 * 토글은 그 현재 선택에서 출발해 오늘 키에 기록 → 오늘이 새 기준이 됨.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 현재 유효한 운동 선택을 해석한다.
 * @param {Record<string, string[]>} log - workoutLog (날짜 → 부위 배열)
 * @param {string} todayStr - 오늘 로컬 날짜 (YYYY-MM-DD)
 * @returns {{ date: string, parts: string[], carried: boolean }}
 *   - 오늘 키가 존재하면(빈 배열 포함 = 오늘 명시적으로 비움) 그것을 사용 (carried=false)
 *   - 없으면 today 이하에서 가장 최근 비어있지 않은 날의 선택을 이어받음 (carried=true)
 *   - 아무 이력도 없으면 빈 선택
 */
function resolveCurrentWorkout(log, todayStr) {
  if (log && Object.prototype.hasOwnProperty.call(log, todayStr)) {
    return { date: todayStr, parts: Array.isArray(log[todayStr]) ? log[todayStr] : [], carried: false };
  }
  const dates = Object.keys(log || {})
    .filter(k => DATE_RE.test(k) && k <= todayStr)
    .sort();
  for (let i = dates.length - 1; i >= 0; i--) {
    const arr = log[dates[i]];
    if (Array.isArray(arr) && arr.length > 0) {
      return { date: dates[i], parts: arr, carried: true };
    }
  }
  return { date: todayStr, parts: [], carried: false };
}

const BLUE_GROUP = ['전면', '측면', '후면'];
const GREEN_GROUP = ['등', '가슴'];

/**
 * 현재 선택(parts)에서 part를 토글한 새 배열을 반환 (순수, 입력 불변).
 * 기존 app.js 동작을 그대로 보존: 같은 색 그룹은 상호배타(라디오).
 * 사용자가 라디오는 문제 아니라고 명시 → 동작 변경 없이 persistence만 고침.
 * @param {string[]} parts - 현재 유효 선택 (carry-forward 결과)
 * @param {string} part - 토글할 부위
 * @returns {string[]} 새 선택 배열
 */
function toggleWorkoutPart(parts, part) {
  const next = Array.isArray(parts) ? [...parts] : [];
  const idx = next.indexOf(part);
  if (idx >= 0) {
    next.splice(idx, 1);
    return next;
  }
  const group = BLUE_GROUP.includes(part) ? BLUE_GROUP
    : GREEN_GROUP.includes(part) ? GREEN_GROUP : null;
  if (group) {
    for (let gi = next.length - 1; gi >= 0; gi--) {
      if (group.includes(next[gi])) next.splice(gi, 1);
    }
  }
  next.push(part);
  return next;
}

// export { BLUE_GROUP, GREEN_GROUP };
