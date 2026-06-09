/**
 * confluence-sync/parse.mjs
 * Confluence Storage Format → Cortex 업데이트 파서
 *
 * 파싱 전략:
 *   1. ac:task 요소에서 status + body 추출
 *   2. body 끝의 [cx:day:cat:idx] 마커로 Cortex 아이템 매핑
 *   3. done 상태만 업데이트 (텍스트 신규 추가도 Cortex에 반영)
 */

export function parseConfluencePage(xhtml) {
  const updates = {}; // { "9:ritual:0": { done: true }, ... }

  // ac:task 파싱
  const taskRe = /<ac:task>([\s\S]*?)<\/ac:task>/g;
  let m;
  while ((m = taskRe.exec(xhtml)) !== null) {
    const taskXml = m[1];

    const statusMatch = taskXml.match(/<ac:task-status>(.*?)<\/ac:task-status>/);
    const bodyMatch = taskXml.match(/<ac:task-body>([\s\S]*?)<\/ac:task-body>/);

    if (!statusMatch || !bodyMatch) continue;

    const done = statusMatch[1].trim() === 'complete';
    const body = bodyMatch[1];

    // [cx:day:cat:idx] 마커 추출
    const markerMatch = body.match(/\[cx:(\d+):(\w+):(\d+)\]/);
    if (markerMatch) {
      const [, day, cat, idx] = markerMatch;
      updates[`${day}:${cat}:${idx}`] = { done };
      continue;
    }

    // [so:id] 마커 - standing orders (done은 무시, 상태 유지)
    // 신규 아이템: 마커 없으면 텍스트 기반으로 추가 대상 감지
    const newItemMatch = body.match(/\[cx-new:(\d+):(\w+)\]/);
    if (newItemMatch) {
      const [, day, cat] = newItemMatch;
      const text = body.replace(/<[^>]+>/g, '').replace(/\[cx-new:\d+:\w+\]/, '').trim();
      if (text) {
        updates[`new:${day}:${cat}`] = { text, done };
      }
    }
  }

  return updates;
}

/**
 * Cortex monthData에 Confluence 파싱 결과 적용
 * 반환: { modified: bool, updatedMonthData }
 */
export function applyUpdatesToMonthData(monthData, updates) {
  let modified = false;
  const data = JSON.parse(JSON.stringify(monthData)); // deep clone

  for (const [key, update] of Object.entries(updates)) {
    if (key.startsWith('new:')) {
      const [, day, cat] = key.split(':');
      if (!data.days) data.days = {};
      if (!data.days[day]) data.days[day] = {};
      if (!data.days[day][cat]) data.days[day][cat] = [];
      data.days[day][cat].push({ text: update.text, url: '', done: update.done });
      modified = true;
      continue;
    }

    const [day, cat, idx] = key.split(':');
    const item = data.days?.[day]?.[cat]?.[parseInt(idx)];
    if (item && item.done !== update.done) {
      item.done = update.done;
      modified = true;
    }
  }

  return { modified, updatedMonthData: data };
}

/**
 * Confluence 페이지 메타데이터 추출
 */
export function extractMeta(xhtml) {
  const m = xhtml.match(/<!-- CORTEX_META:(.*?) -->/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}
