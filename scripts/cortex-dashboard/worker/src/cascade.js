/**
 * cascade.js
 * _frame 아이템의 done 상태 변경 / 삭제를 이후 날짜에 전파하는 순수 함수
 */

/**
 * day N에서 _frame 아이템이 done 상태로 변경될 때 N+1..daysInMonth 동일 아이템에 done 전파
 * @param {object} data - month 전체 데이터 (days 포함), in-place 수정
 * @param {number} daysInMonth - 해당 월의 총 일수
 * @param {number} fromDayNum - 변경이 발생한 날짜 (숫자)
 * @param {string} category - 카테고리 (outcome, input 등)
 * @param {string} itemText - 아이템 text
 * @param {boolean} done - 전파할 done 값
 * @param {string} [itemUrl=''] - done=false 시 아이템 복원에 사용할 url
 */
export function cascadeFrameDone(data, daysInMonth, fromDayNum, category, itemText, done, itemUrl = '') {
  for (let d = fromDayNum + 1; d <= daysInMonth; d++) {
    const dk = String(d);
    if (!data.days[dk]) data.days[dk] = {};
    const dayD = data.days[dk];
    if (!dayD[category]) dayD[category] = [];
    const arr = dayD[category];
    const item = arr.find(i => i._frame && i.text === itemText);
    if (item) {
      item.done = done;
    } else if (!done) {
      // uncheck: 아이템이 inject-frames에 의해 제거된 경우 복원 (dismissed 아닌 경우만)
      const dismissed = new Set(dayD._dismissed || []);
      if (!dismissed.has(itemText)) {
        arr.push({ text: itemText, url: itemUrl, done: false, _frame: true });
      }
    }
  }
}

/**
 * day N에서 _frame 아이템이 삭제될 때 N+1..daysInMonth에서도 제거 + _dismissed 추가
 * @param {object} data - month 전체 데이터, in-place 수정
 * @param {number} daysInMonth - 해당 월의 총 일수
 * @param {number} fromDayNum - 삭제가 발생한 날짜 (숫자)
 * @param {string} category - 카테고리
 * @param {string} itemText - 아이템 text
 */
export function cascadeFrameDelete(data, daysInMonth, fromDayNum, category, itemText) {
  for (let d = fromDayNum + 1; d <= daysInMonth; d++) {
    const dk = String(d);
    if (!data.days[dk]) data.days[dk] = {};
    const dayD = data.days[dk];

    // _dismissed에 추가 (inject-frames가 나중에 실행될 때 주입 차단)
    if (!dayD._dismissed) dayD._dismissed = [];
    if (!dayD._dismissed.includes(itemText)) dayD._dismissed.push(itemText);

    // 이미 inject된 _frame 아이템 제거
    const arr = dayD[category];
    if (Array.isArray(arr)) {
      const idx = arr.findIndex(i => i._frame && i.text === itemText);
      if (idx !== -1) arr.splice(idx, 1);
    }
  }
}
