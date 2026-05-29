const API = '';
const AUTH = { 'Content-Type': 'application/json', 'Authorization': 'Bearer cortex-ritual-2026-fb' };

let toastFn = null;
export function setToast(fn) { toastFn = fn; }

async function request(path, opts = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: opts.body ? AUTH : { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.status }));
      if (toastFn) toastFn(err.error || `Error ${res.status}`, true);
      return null;
    }
    return res.json();
  } catch (e) {
    if (toastFn) toastFn('Network error', true);
    return null;
  }
}

// Month data
export async function loadMonth(ym) {
  return request(`/api/month?ym=${ym}`);
}

export async function saveMonth(ym, data) {
  // Safety: don't save empty
  const items = Object.values(data.days || {}).reduce((n, dd) => {
    for (const k of Object.keys(dd)) { if (Array.isArray(dd[k])) n += dd[k].length; }
    return n;
  }, 0);
  if (Object.keys(data.days || {}).length === 0 && items === 0) {
    console.warn('saveMonth blocked: empty');
    return null;
  }
  return request('/api/month', { method: 'POST', body: JSON.stringify({ ym, data }) });
}

export async function toggleItem(ym, day, category, index) {
  return request('/api/toggle', { method: 'POST', body: JSON.stringify({ ym, day, category, index }) });
}

export async function addItem(ym, day, category, text, url = '') {
  return request('/api/add-item', { method: 'POST', body: JSON.stringify({ ym, day, category, text, url }) });
}

export async function editItem(ym, day, category, index, text) {
  return request('/api/edit-item', { method: 'POST', body: JSON.stringify({ ym, day, category, index, text }) });
}

export async function deleteItem(ym, day, category, index) {
  return request('/api/delete-item', { method: 'POST', body: JSON.stringify({ ym, day, category, index }) });
}

export async function reorderItem(ym, day, category, fromIdx, toIdx) {
  return request('/api/reorder', { method: 'POST', body: JSON.stringify({ ym, day, category, fromIdx, toIdx }) });
}

export async function moveItem(ym, fromDay, fromCat, fromIdx, toDay, toCat) {
  return request('/api/move-item', { method: 'POST', body: JSON.stringify({ ym, fromDay, fromCat, fromIdx, toDay, toCat }) });
}

export async function setDayType(ym, day, type) {
  return request('/api/day-type', { method: 'POST', body: JSON.stringify({ ym, day, type }) });
}

export async function saveNotes(ym, day, notes) {
  return request('/api/notes', { method: 'POST', body: JSON.stringify({ ym, day, notes }) });
}

export async function saveOneThing(ym, day, text) {
  return request('/api/one-thing', { method: 'POST', body: JSON.stringify({ ym, day, text }) });
}

export async function injectFrames(ym, fromDay, toDay) {
  return request('/api/inject-frames', { method: 'POST', body: JSON.stringify({ ym, fromDay, toDay }) });
}

// Standing orders + day frames + vision
export async function loadStandingOrders() { return request('/api/standing-orders'); }
export async function saveStandingOrders(data) { return request('/api/standing-orders', { method: 'POST', body: JSON.stringify(data) }); }
export async function loadDayFrames() { return request('/api/day-frames'); }
export async function saveDayFrames(data) { return request('/api/day-frames', { method: 'POST', body: JSON.stringify(data) }); }
export async function loadVision() { return request('/api/vision'); }
export async function saveVision(data) { return request('/api/vision', { method: 'POST', body: JSON.stringify(data) }); }
export async function loadRecurring() { return request('/api/recurring-templates'); }

// Cortex files (GitHub proxy)
export async function loadTree(path) { return request(`/api/cortex/tree?path=${encodeURIComponent(path)}`); }
export async function loadFile(path) { return request(`/api/cortex/file?path=${encodeURIComponent(path)}`); }
export async function saveFile(filePath, content, sha) {
  return request('/api/cortex/file', { method: 'POST', body: JSON.stringify({ filePath, content, sha }) });
}
export async function uploadFile(fileName, base64) {
  return request('/api/cortex/upload', { method: 'POST', body: JSON.stringify({ fileName, base64 }) });
}
export async function searchCortex(q) { return request(`/api/cortex/search?q=${encodeURIComponent(q)}`); }

// Unified search
export async function searchUnified(q) { return request(`/api/search/unified?q=${encodeURIComponent(q)}`); }
