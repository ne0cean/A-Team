/**
 * Cortex Ritual Dashboard — Cloudflare Worker + D1
 * All data stored in D1 SQLite as key-value (key=string, data=JSON text)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Noop service worker to clear old caches
    if (path === '/sw.js') {
      return new Response(
        `self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.map(n=>caches.delete(n)))).then(()=>self.clients.claim()));});`,
        { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache' } }
      );
    }
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = (env.ALLOWED_ORIGINS || url.origin)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const originAllowed = !origin || allowedOrigins.includes(origin);
    const allowOrigin = originAllowed ? (origin || url.origin) : null;

    // CORS
    const headers = {
      ...(allowOrigin ? { 'Access-Control-Allow-Origin': allowOrigin } : {}),
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
      'Content-Type': 'application/json',
    };
    if (method === 'OPTIONS') return new Response(null, { headers });

    const authorized = () => {
      const auth = request.headers.get('Authorization');
      const accepted = [env.API_SECRET, env.SERVICE_TOKEN].filter(Boolean);
      return accepted.some(token => auth === `Bearer ${token}`);
    };

    // Auth: same-origin requests (from the app itself) skip auth.
    // Cross-origin or external requests require Bearer token.
    const isSameOrigin = !origin || origin === url.origin;
    if (path.startsWith('/api/') && !authorized() && !isSameOrigin) {
      if (!(method === 'GET' && env.ALLOW_PUBLIC_READS === '1')) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });
      }
    }

    try {
      // --- Input validation ---
      const validYm = (s) => /^\d{4}-\d{2}$/.test(s);
      const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
      const categories = new Set(['ritual', 'input', 'work', 'hexagonal', 'outcome']);
      const validDay = (s) => {
        const n = Number(s);
        return Number.isInteger(n) && n >= 1 && n <= 31;
      };
      const validIndex = (n, arr) => Number.isInteger(Number(n)) && Number(n) >= 0 && Number(n) < arr.length;
      const validCategory = (c) => categories.has(c);
      const validUrl = (u) => {
        if (!u || u === '') return true; // empty is fine
        try { const s = new URL(u).protocol; return s === 'https:' || s === 'http:'; } catch { return false; }
      };
      const validCortexPath = (p) => typeof p === 'string' && p.startsWith('cortex/') && !p.includes('..') && !p.startsWith('cortex/.');

      // --- Data helpers ---
      const getKey = async (key) => {
        const row = await env.DB.prepare('SELECT data FROM ritual_data WHERE key = ?').bind(key).first();
        return row ? JSON.parse(row.data) : null;
      };

      const setKey = async (key, data) => {
        // Sanitize: remove control characters that break JSON parsing
        const json = JSON.stringify(data).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
        // Auto-backup: save previous version before overwrite
        const prev = await env.DB.prepare('SELECT data FROM ritual_data WHERE key = ?').bind(key).first();
        if (prev) {
          const backupKey = `_backup:${key}:${Date.now()}`;
          await env.DB.prepare(
            "INSERT OR REPLACE INTO ritual_data (key, data, updated_at) VALUES (?, ?, datetime('now'))"
          ).bind(backupKey, prev.data).run();
          // Keep only last 5 backups per key
          const oldBackups = await env.DB.prepare(
            "SELECT key FROM ritual_data WHERE key LIKE ? ORDER BY updated_at DESC LIMIT -1 OFFSET 5"
          ).bind(`_backup:${key}:%`).all();
          for (const row of (oldBackups.results || [])) {
            await env.DB.prepare("DELETE FROM ritual_data WHERE key = ?").bind(row.key).run();
          }
        }
        await env.DB.prepare(
          "INSERT OR REPLACE INTO ritual_data (key, data, updated_at) VALUES (?, ?, datetime('now'))"
        ).bind(key, json).run();
      };

      // --- Month API ---
      if (path === '/api/month' && method === 'GET') {
        const ym = url.searchParams.get('ym') || new Date().toISOString().slice(0, 7);
        if (!validYm(ym)) return new Response(JSON.stringify({ error: 'invalid ym' }), { status: 400, headers });
        let data = await getKey(ym);
        if (!data) data = { month: ym, goals: {}, days: {} };
        return new Response(JSON.stringify(data), { headers });
      }

      if (path === '/api/month' && method === 'POST') {
        const { ym, data } = await request.json();
        if (!validYm(ym) || !data || typeof data !== 'object') {
          return new Response(JSON.stringify({ error: 'invalid month payload' }), { status: 400, headers });
        }
        // Safety: don't save empty data over existing
        const existing = await getKey(ym);
        if (existing) {
          const countAll = (days) => Object.values(days || {}).reduce((n, dd) => {
            for (const k of Object.keys(dd)) {
              if (Array.isArray(dd[k])) n += dd[k].length;
            }
            return n;
          }, 0);
          const existingCount = countAll(existing.days);
          const newCount = countAll(data.days);
          const newDayCount = Object.keys(data.days || {}).length;
          if (existingCount > 10 && newCount === 0 && newDayCount === 0) {
            return new Response(JSON.stringify({ error: 'blocked: would erase data' }), { status: 400, headers });
          }
        }
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Toggle ---
      if (path === '/api/toggle' && method === 'POST') {
        const { ym, day, category, index } = await request.json();
        if (!validYm(ym) || !validDay(day) || !validCategory(category)) {
          return new Response(JSON.stringify({ error: 'invalid item target' }), { status: 400, headers });
        }
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        const arr = data.days[day]?.[category];
        if (Array.isArray(arr) && validIndex(index, arr)) {
          data.days[day][category][index].done = !data.days[day][category][index].done;
          await setKey(ym, data);
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Add Item (append) ---
      if (path === '/api/add-item' && method === 'POST') {
        const { ym, day, category, text, url: itemUrl, type: itemType } = await request.json();
        if (!validYm(ym) || !validDay(day) || !validCategory(category) || typeof text !== 'string' || !validUrl(itemUrl)) {
          return new Response(JSON.stringify({ error: 'invalid item payload' }), { status: 400, headers });
        }
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]) data.days[day] = {};
        if (!data.days[day][category]) data.days[day][category] = [];
        const newItem = { text, url: itemUrl || '', done: false };
        if (itemType === 'separator') newItem.type = 'separator';
        data.days[day][category].push(newItem);
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Insert Item at index ---
      if (path === '/api/insert-item' && method === 'POST') {
        const { ym, day, category, index, text, url: itemUrl } = await request.json();
        if (!validYm(ym) || !validDay(day) || !validCategory(category) || typeof text !== 'string') {
          return new Response(JSON.stringify({ error: 'invalid item payload' }), { status: 400, headers });
        }
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]) data.days[day] = {};
        if (!data.days[day][category]) data.days[day][category] = [];
        const arr = data.days[day][category];
        const safeIndex = clamp(index, 0, arr.length);
        arr.splice(safeIndex, 0, { text, url: itemUrl || '', done: false });
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Split Item (Enter in middle of text) ---
      if (path === '/api/split-item' && method === 'POST') {
        const { ym, day, category, index, before, after } = await request.json();
        if (!validYm(ym) || !validDay(day) || !validCategory(category)) {
          return new Response(JSON.stringify({ error: 'invalid item target' }), { status: 400, headers });
        }
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        const arr = data.days[day]?.[category];
        if (!Array.isArray(arr) || !validIndex(index, arr)) {
          return new Response(JSON.stringify({ ok: false, error: 'not found' }), { headers });
        }
        data.days[day][category][index].text = before;
        data.days[day][category].splice(index + 1, 0, { text: after, url: '', done: false });
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- One Thing ---
      if (path === '/api/one-thing' && method === 'POST') {
        const { ym, day, text } = await request.json();
        if (!validYm(ym) || !validDay(day) || typeof text !== 'string') {
          return new Response(JSON.stringify({ error: 'invalid day payload' }), { status: 400, headers });
        }
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]) data.days[day] = {};
        data.days[day].one_thing = text;
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Edit Item ---
      if (path === '/api/edit-item' && method === 'POST') {
        const { ym, day, category, index, text, url } = await request.json();
        if (!validYm(ym) || !validDay(day) || !validCategory(category) || typeof text !== 'string' || !validUrl(url)) {
          return new Response(JSON.stringify({ error: 'invalid item payload' }), { status: 400, headers });
        }
        const data = await getKey(ym);
        const arr = data?.days[day]?.[category];
        if (Array.isArray(arr) && validIndex(index, arr)) {
          data.days[day][category][index].text = text;
          if (url !== undefined) data.days[day][category][index].url = url;
          await setKey(ym, data);
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Set URL only (no text change) ---
      if (path === '/api/set-url' && method === 'POST') {
        const { ym, day, category, index, url } = await request.json();
        if (!validYm(ym) || !validDay(day) || !validCategory(category)) {
          return new Response(JSON.stringify({ error: 'invalid payload' }), { status: 400, headers });
        }
        const data = await getKey(ym);
        const arr = data?.days[day]?.[category];
        if (Array.isArray(arr) && validIndex(index, arr)) {
          data.days[day][category][index].url = url || '';
          await setKey(ym, data);
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Delete Item ---
      if (path === '/api/delete-item' && method === 'POST') {
        const { ym, day, category, index } = await request.json();
        if (!validYm(ym) || !validDay(day) || !validCategory(category)) {
          return new Response(JSON.stringify({ error: 'invalid item target' }), { status: 400, headers });
        }
        const data = await getKey(ym);
        const arr = data?.days[day]?.[category];
        if (Array.isArray(arr) && validIndex(index, arr)) {
          const removed = arr[index];
          if (removed._carried || removed._frame) {
            if (!data.days[day]._dismissed) data.days[day]._dismissed = [];
            if (!data.days[day]._dismissed.includes(removed.text)) {
              data.days[day]._dismissed.push(removed.text);
            }
          }
          arr.splice(index, 1);
          await setKey(ym, data);
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Day Type ---
      if (path === '/api/day-type' && method === 'POST') {
        const { ym, day, type } = await request.json();
        if (!validYm(ym) || !validDay(day)) {
          return new Response(JSON.stringify({ error: 'invalid day payload' }), { status: 400, headers });
        }
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]) data.days[day] = {};
        if (type) data.days[day].day_type = type;
        else delete data.days[day].day_type;
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Notes ---
      if (path === '/api/notes' && method === 'POST') {
        const { ym, day, notes } = await request.json();
        if (!validYm(ym) || !validDay(day)) {
          return new Response(JSON.stringify({ error: 'invalid day payload' }), { status: 400, headers });
        }
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]) data.days[day] = {};
        if (notes) data.days[day].notes = notes;
        else delete data.days[day].notes;
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Reorder ---
      if (path === '/api/reorder' && method === 'POST') {
        const { ym, day, category, fromIdx, toIdx } = await request.json();
        if (!validYm(ym) || !validDay(day) || !validCategory(category)) {
          return new Response(JSON.stringify({ error: 'invalid item target' }), { status: 400, headers });
        }
        const data = await getKey(ym);
        const items = data?.days[day]?.[category];
        if (Array.isArray(items) && validIndex(fromIdx, items) && validIndex(toIdx, items)) {
          const [moved] = items.splice(fromIdx, 1);
          items.splice(toIdx, 0, moved);
          await setKey(ym, data);
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Move Item ---
      if (path === '/api/move-item' && method === 'POST') {
        const { ym, fromDay, fromCat, fromIdx, toDay, toCat } = await request.json();
        if (!validYm(ym) || !validDay(fromDay) || !validDay(toDay) || !validCategory(fromCat) || !validCategory(toCat)) {
          return new Response(JSON.stringify({ error: 'invalid move target' }), { status: 400, headers });
        }
        const data = await getKey(ym);
        const fromItems = data?.days[fromDay]?.[fromCat];
        if (Array.isArray(fromItems) && validIndex(fromIdx, fromItems)) {
          const [moved] = fromItems.splice(fromIdx, 1);
          if (!data.days[toDay]) data.days[toDay] = {};
          if (!data.days[toDay][toCat]) data.days[toDay][toCat] = [];
          data.days[toDay][toCat].push(moved);
          await setKey(ym, data);
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Search ---
      if (path === '/api/search' && method === 'GET') {
        const q = (url.searchParams.get('q') || '').toLowerCase();
        if (!q) return new Response('[]', { headers });
        const rows = await env.DB.prepare("SELECT key, data FROM ritual_data WHERE key LIKE '20%'").all();
        const results = [];
        for (const row of rows.results) {
          let data;
          try { data = JSON.parse(row.data); } catch { continue; }
          const ym = row.key;
          for (const [day, dd] of Object.entries(data.days || {})) {
            const matches = [];
            try {
              if (dd.one_thing?.toLowerCase().includes(q)) matches.push({ field: 'one_thing', text: dd.one_thing });
              if (dd.notes?.toLowerCase().includes(q)) matches.push({ field: 'notes', text: dd.notes });
              for (const cat of ['ritual','input','work','outcome']) {
                for (const item of (dd[cat] || [])) {
                  if (item.text?.toLowerCase().includes(q)) matches.push({ field: cat, text: item.text });
                }
              }
            } catch { continue; }
            if (matches.length) results.push({ ym, day, matches });
          }
        }
        return new Response(JSON.stringify(results), { headers });
      }

      // --- Generic key-value endpoints ---
      // standing-orders, day-frames, vision, recurring-templates
      const kvMap = {
        '/api/standing-orders': 'standing-orders',
        '/api/day-frames': 'day-frames',
        '/api/vision': 'vision-roadmap',
        '/api/recurring-templates': 'recurring-templates',
      };

      if (kvMap[path]) {
        const key = kvMap[path];
        if (method === 'GET') {
          const data = await getKey(key);
          // Stamp version on read so client can send it back
          if (data && typeof data === 'object') {
            const row = await env.DB.prepare('SELECT updated_at FROM ritual_data WHERE key = ?').bind(key).first();
            if (row) data._version = row.updated_at;
          }
          return new Response(JSON.stringify(data || {}), { headers });
        }
        if (method === 'POST') {
          const data = await request.json();
          // Optimistic locking: reject stale writes
          const existing = await getKey(key);
          if (existing) {
            const row = await env.DB.prepare('SELECT updated_at FROM ritual_data WHERE key = ?').bind(key).first();
            if (row) {
              if (!data._version) {
                // Client without _version = stale client, reject
                return new Response(JSON.stringify({
                  error: 'conflict: client has no version. Reload required.',
                  serverVersion: row.updated_at
                }), { status: 409, headers });
              }
              if (row.updated_at !== data._version) {
                return new Response(JSON.stringify({
                  error: 'conflict: data was modified externally. Reload and retry.',
                  serverVersion: row.updated_at,
                  clientVersion: data._version
                }), { status: 409, headers });
              }
            }
          }
          // Remove _version before saving
          delete data._version;
          // Safety: block saving empty/shrunken data over existing
          if (existing) {
            const existingSize = JSON.stringify(existing).length;
            const newSize = JSON.stringify(data).length;
            if (existingSize > 200 && newSize < existingSize * 0.3) {
              return new Response(JSON.stringify({
                error: `blocked: data shrunk from ${existingSize} to ${newSize} bytes (${Math.round(newSize/existingSize*100)}%). Use /api/force-save to override.`,
                existingSize, newSize
              }), { status: 400, headers });
            }
          }
          await setKey(key, data);
          // Return new version so client can update its _version
          const newRow = await env.DB.prepare('SELECT updated_at FROM ritual_data WHERE key = ?').bind(key).first();
          return new Response(JSON.stringify({ ok: true, _version: newRow?.updated_at }), { headers });
        }
      }

      // --- PATCH: partial update for standing-orders ---
      if (path === '/api/standing-orders/patch' && method === 'POST') {
        const { section, action, item, index } = await request.json();
        if (!section || !action) {
          return new Response(JSON.stringify({ error: 'section and action required' }), { status: 400, headers });
        }
        const data = await getKey('standing-orders');
        if (!data) {
          return new Response(JSON.stringify({ error: 'no standing-orders data' }), { status: 404, headers });
        }
        const arr = data[section];
        if (!Array.isArray(arr) && action !== 'set' && action !== 'replace') {
          return new Response(JSON.stringify({ error: `section "${section}" is not an array` }), { status: 400, headers });
        }
        if (action === 'add') {
          arr.push(item);
        } else if (action === 'edit' && typeof index === 'number' && index >= 0 && index < arr.length) {
          Object.assign(arr[index], item);
        } else if (action === 'delete' && typeof index === 'number' && index >= 0 && index < arr.length) {
          arr.splice(index, 1);
        } else if (action === 'replace') {
          data[section] = item;
        } else {
          return new Response(JSON.stringify({ error: `invalid action: ${action}` }), { status: 400, headers });
        }
        await setKey('standing-orders', data);
        return new Response(JSON.stringify({ ok: true, count: Array.isArray(data[section]) ? data[section].length : null }), { headers });
      }

      // --- Undo (restore from auto-backup) ---
      if (path === '/api/undo' && method === 'POST') {
        const { key } = await request.json();
        const undoableKeys = new Set([...Object.values(kvMap), ...(await env.DB.prepare("SELECT key FROM ritual_data WHERE key LIKE '20%'").all()).results.map(r => r.key)]);
        const targetKey = key || 'standing-orders';
        if (!undoableKeys.has(targetKey) && !/^\d{4}-\d{2}$/.test(targetKey)) {
          return new Response(JSON.stringify({ error: 'invalid undo key' }), { status: 400, headers });
        }
        const backups = await env.DB.prepare(
          "SELECT key, updated_at FROM ritual_data WHERE key LIKE ? ORDER BY updated_at DESC LIMIT 5"
        ).bind(`_backup:${targetKey}:%`).all();
        if (!backups.results?.length) {
          return new Response(JSON.stringify({ error: 'no backups found' }), { status: 404, headers });
        }
        const latest = backups.results[0];
        const backupData = await env.DB.prepare('SELECT data FROM ritual_data WHERE key = ?').bind(latest.key).first();
        if (backupData) {
          const restored = JSON.parse(backupData.data);
          await env.DB.prepare(
            "INSERT OR REPLACE INTO ritual_data (key, data, updated_at) VALUES (?, ?, datetime('now'))"
          ).bind(targetKey, backupData.data).run();
          return new Response(JSON.stringify({ ok: true, restored_from: latest.updated_at, backups_available: backups.results.length }), { headers });
        }
        return new Response(JSON.stringify({ error: 'backup data corrupted' }), { status: 500, headers });
      }

      // --- Workout Log (independent of monthly data) ---
      if (path === '/api/workout-log' && method === 'GET') {
        const log = await getKey('workout-log') || {};
        return new Response(JSON.stringify(log), { headers });
      }
      if (path === '/api/workout' && method === 'POST') {
        const { ym, day, part } = await request.json();
        if (!validYm(ym) || !validDay(day) || typeof part !== 'string') {
          return new Response(JSON.stringify({ error: 'invalid workout payload' }), { status: 400, headers });
        }
        // Store in independent workout-log key: { "YYYY-MM-DD": ["part1", ...] }
        const [y, m] = ym.split('-');
        const dateKey = `${y}-${m}-${String(day).padStart(2, '0')}`;
        const log = await getKey('workout-log') || {};
        if (!log[dateKey]) log[dateKey] = [];
        const idx = log[dateKey].indexOf(part);
        if (idx >= 0) log[dateKey].splice(idx, 1);
        else log[dateKey].push(part);
        await setKey('workout-log', log);
        return new Response(JSON.stringify({ ok: true, date: dateKey, workout: log[dateKey] }), { headers });
      }

      // --- Inject Frames ---
      if (path === '/api/inject-frames' && method === 'POST') {
        const { ym, fromDay, toDay } = await request.json();
        if (!validYm(ym)) {
          return new Response(JSON.stringify({ error: 'invalid ym' }), { status: 400, headers });
        }
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        const frames = await getKey('day-frames') || {};
        const [year, month] = ym.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const start = clamp(fromDay || 1, 1, daysInMonth);
        const end = clamp(toDay || daysInMonth, 1, daysInMonth);

        // Load previous month for cross-month carry (day 1)
        let prevMonthData = null;
        if (start === 1) {
          const pm = month === 1 ? 12 : month - 1;
          const py = month === 1 ? year - 1 : year;
          const prevYm = `${py}-${String(pm).padStart(2, '0')}`;
          prevMonthData = await getKey(prevYm);
        }

        let carried = 0, injected = 0, changed = false;
        const CATS = ['ritual','input','work','hexagonal','outcome'];

        for (let d = start; d <= end; d++) {
          const dayKey = String(d);
          if (!data.days[dayKey]) data.days[dayKey] = {};
          const dd = data.days[dayKey];

          // --- Step 1: Resolve previous day's undone items ---
          let prevDay = null;
          if (d > 1) {
            prevDay = data.days[String(d - 1)] || null;
          } else if (prevMonthData) {
            const prevDim = new Date(year, month - 1, 0).getDate();
            prevDay = prevMonthData.days?.[String(prevDim)] || null;
          }

          // --- Step 2: Resolve frame template for this day ---
          const dow = new Date(year, month - 1, d).getDay();
          const dayType = dd.day_type || (dow === 0 ? 'block' : dow === 6 ? 'flow' : 'weekday');
          const frame = frames[dayType];

          // --- Step 3: Merge per category ---
          for (const cat of CATS) {
            if (!dd[cat]) dd[cat] = [];
            const existing = dd[cat];
            const before = JSON.stringify(existing);

            // Classify existing items by source
            const manual = existing.filter(i => !i._frame && !i._carried);
            const oldFrame = existing.filter(i => i._frame);
            const oldCarry = existing.filter(i => i._carried);

            // Index for URL merge: text → url (preserve richest data)
            const urlMap = new Map();
            for (const i of existing) { if (i.url) urlMap.set(i.text, i.url); }

            // Dismissed items (user deleted carried/frame items)
            const dismissed = new Set(dd._dismissed || []);

            // 3a. Frame sync
            const newFrame = [];
            const catFrame = frame?.categories?.[cat];
            if (catFrame?.items?.length) {
              for (const rawItem of catFrame.items) {
                const text = typeof rawItem === 'object' ? rawItem.text : rawItem;
                const itemUrl = typeof rawItem === 'object' ? (rawItem.url || '') : '';
                const itemType = typeof rawItem === 'object' ? rawItem.type : undefined;
                if (dismissed.has(text) && itemType !== 'separator') continue;
                const existingItem = oldFrame.find(i => i.text === text && i.type === itemType);
                if (existingItem) {
                  // Backfill URL from urlMap if existing lost it
                  if (!existingItem.url && urlMap.has(text)) existingItem.url = urlMap.get(text);
                  newFrame.push(existingItem);
                } else {
                  // Skip if manual already has same text (don't create duplicate)
                  if (itemType === 'separator' || !manual.some(i => i.text === text)) {
                    const resolvedUrl = itemUrl || urlMap.get(text) || '';
                    const newItem = { text, url: resolvedUrl, done: false, _frame: true };
                    if (itemType) newItem.type = itemType;
                    newFrame.push(newItem);
                    injected++;
                  }
                }
              }
            }
            // Preserve done frame items removed from template (demote to manual)
            for (const item of oldFrame) {
              if (item.done && !newFrame.some(f => f.text === item.text)) {
                delete item._frame;
                manual.push(item);
              }
            }

            // 3b. Carry: undone items from previous day
            const assembled = [...newFrame, ...oldCarry, ...manual];
            const assembledTexts = new Set(assembled.map(i => i.text));

            if (prevDay) {
              const prevItems = prevDay[cat] || [];
              const undone = prevItems.filter(i => !i.done);
              for (const item of undone) {
                if (dismissed.has(item.text)) continue;
                if (!assembledTexts.has(item.text)) {
                  assembled.push({ text: item.text, url: item.url || '', done: false, _carried: true });
                  assembledTexts.add(item.text);
                  carried++;
                } else {
                  // URL merge: if existing item lacks URL but source has it, backfill
                  if (item.url) {
                    const target = assembled.find(a => a.text === item.text && !a.url);
                    if (target) target.url = item.url;
                  }
                }
              }
            }

            dd[cat] = assembled;
            if (JSON.stringify(dd[cat]) !== before) changed = true;
          }
        }

        if (changed) await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true, injected, carried, range: `${start}-${end}` }), { headers });
      }

      // --- Cortex File Browser (GitHub API proxy) ---
      const REPO = 'ne0cean/A-Team';
      const ghHeaders = {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'cortex-worker'
      };

      // GET /api/cortex/tree?path=cortex/ — list directory
      if (path === '/api/cortex/tree' && method === 'GET') {
        const dirPath = url.searchParams.get('path') || 'cortex';
        if (!validCortexPath(dirPath) && dirPath !== 'cortex') {
          return new Response(JSON.stringify({ error: 'invalid path' }), { status: 400, headers });
        }
        const ghUrl = `https://api.github.com/repos/${REPO}/contents/${dirPath.split('/').map(s => encodeURIComponent(s)).join('/')}?ref=master`;
        const ghRes = await fetch(ghUrl, { headers: ghHeaders });
        if (!ghRes.ok) return new Response(JSON.stringify({ error: 'github error', status: ghRes.status }), { status: ghRes.status, headers });
        const items = await ghRes.json();
        // Simplify response
        const simplified = (Array.isArray(items) ? items : [items]).map(i => ({
          name: i.name, path: i.path, type: i.type, size: i.size
        }));
        return new Response(JSON.stringify(simplified), { headers });
      }

      // GET /api/cortex/file?path=cortex/CORTEX.md — read file content
      if (path === '/api/cortex/file' && method === 'GET') {
        const filePath = url.searchParams.get('path');
        if (!filePath) return new Response(JSON.stringify({ error: 'path required' }), { status: 400, headers });
        if (!validCortexPath(filePath)) return new Response(JSON.stringify({ error: 'invalid path' }), { status: 400, headers });
        const encodedPath = filePath.split('/').map(s => encodeURIComponent(s)).join('/');
        const ghUrl = `https://api.github.com/repos/${REPO}/contents/${encodedPath}?ref=master`;
        const ghRes = await fetch(ghUrl, { headers: ghHeaders });
        if (!ghRes.ok) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers });
        const data = await ghRes.json();
        const raw = atob(data.content);
        const content = decodeURIComponent(escape(raw));
        return new Response(JSON.stringify({ path: data.path, name: data.name, content, sha: data.sha }), { headers });
      }

      // POST /api/cortex/file — save file (commit to GitHub)
      if (path === '/api/cortex/file' && method === 'POST') {
        const { filePath, content, sha, message } = await request.json();
        if (!filePath || content === undefined) return new Response(JSON.stringify({ error: 'filePath, content required' }), { status: 400, headers });
        if (!validCortexPath(filePath)) return new Response(JSON.stringify({ error: 'invalid path' }), { status: 400, headers });
        const ghUrl = `https://api.github.com/repos/${REPO}/contents/${filePath.split('/').map(s => encodeURIComponent(s)).join('/')}`;
        const body = {
          message: message || `cortex: update ${filePath.split('/').pop()}`,
          content: btoa(unescape(encodeURIComponent(content))),
          branch: 'master'
        };
        if (sha) body.sha = sha;
        const ghRes = await fetch(ghUrl, {
          method: 'PUT', headers: { ...ghHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const result = await ghRes.json();
        if (!ghRes.ok) return new Response(JSON.stringify({ error: result.message || 'save failed' }), { status: ghRes.status, headers });
        return new Response(JSON.stringify({ ok: true, sha: result.content?.sha }), { headers });
      }

      // POST /api/cortex/upload — upload image/file to cortex/attachments/
      if (path === '/api/cortex/upload' && method === 'POST') {
        const { fileName, base64, contentType } = await request.json();
        if (!fileName || !base64) return new Response(JSON.stringify({ error: 'fileName, base64 required' }), { status: 400, headers });
        const ts = Date.now();
        const safeName = `${ts}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const filePath = `cortex/attachments/${safeName}`;
        const ghUrl = `https://api.github.com/repos/${REPO}/contents/${filePath}`;
        const ghRes = await fetch(ghUrl, {
          method: 'PUT',
          headers: { ...ghHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `cortex: upload ${safeName}`,
            content: base64,
            branch: 'master'
          })
        });
        const result = await ghRes.json();
        if (!ghRes.ok) return new Response(JSON.stringify({ error: result.message || 'upload failed' }), { status: ghRes.status, headers });
        return new Response(JSON.stringify({ ok: true, path: filePath, markdown: `![${fileName}](${filePath})` }), { headers });
      }

      // GET /api/cortex/search?q=keyword — search file/folder names + content
      if (path === '/api/cortex/search' && method === 'GET') {
        const q = url.searchParams.get('q')?.toLowerCase();
        if (!q) return new Response('[]', { headers });

        // Use git tree API to get ALL file paths, then filter by name
        const treeUrl = `https://api.github.com/repos/${REPO}/git/trees/master?recursive=1`;
        const treeRes = await fetch(treeUrl, { headers: ghHeaders });
        if (!treeRes.ok) return new Response('[]', { headers });
        const treeData = await treeRes.json();

        const results = (treeData.tree || [])
          .filter(i => i.path.startsWith('cortex/') && i.path.toLowerCase().includes(q))
          .slice(0, 30)
          .map(i => ({
            name: i.path.split('/').pop(),
            path: i.path,
            type: i.type === 'tree' ? 'dir' : 'file'
          }));

        return new Response(JSON.stringify(results), { headers });
      }

      // GET /api/search/unified?q=keyword — search schedule + notes
      if (path === '/api/search/unified' && method === 'GET') {
        const q = (url.searchParams.get('q') || '').toLowerCase();
        if (!q) return new Response(JSON.stringify({schedule:[],notes:[]}), { headers });

        // Schedule search (D1)
        const schedResults = [];
        const rows = await env.DB.prepare("SELECT key, data FROM ritual_data WHERE key LIKE '20%'").all();
        for (const row of rows.results) {
          let data;
          try { data = JSON.parse(row.data); } catch { continue; }
          for (const [day, dd] of Object.entries(data.days || {})) {
            const matches = [];
            try {
              if (dd.one_thing?.toLowerCase().includes(q)) matches.push({ field:'one_thing', text:dd.one_thing });
              for (const cat of ['ritual','input','work','outcome']) {
                for (const item of (dd[cat] || [])) {
                  if (item.text?.toLowerCase().includes(q)) matches.push({ field:cat, text:item.text });
                }
              }
            } catch { continue; }
            if (matches.length) schedResults.push({ ym:row.key, day, matches });
          }
        }

        // Notes search (GitHub tree)
        let noteResults = [];
        try {
          const treeUrl = `https://api.github.com/repos/${REPO}/git/trees/master?recursive=1`;
          const treeRes = await fetch(treeUrl, { headers: ghHeaders });
          if (treeRes.ok) {
            const treeData = await treeRes.json();
            noteResults = (treeData.tree || [])
              .filter(i => i.path.startsWith('cortex/') && i.path.toLowerCase().includes(q))
              .slice(0, 20)
              .map(i => ({ name: i.path.split('/').pop(), path: i.path, type: i.type === 'tree' ? 'dir' : 'file' }));
          }
        } catch {}

        return new Response(JSON.stringify({ schedule: schedResults.slice(0,20), notes: noteResults }), { headers });
      }

      // Pass through to assets (static files served by Cloudflare)
      return env.ASSETS.fetch(request);

    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ error: 'internal error', detail: e.message }), { status: 500, headers });
    }
  }
};
