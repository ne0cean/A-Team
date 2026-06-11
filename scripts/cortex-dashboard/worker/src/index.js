/**
 * Cortex Ritual Dashboard — Cloudflare Worker + D1
 * All data stored in D1 SQLite as key-value (key=string, data=JSON text)
 */

import { mergeMonthData } from './merge.js';
import { cascadeFrameDone, cascadeFrameDelete } from './cascade.js';

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
          // Keep only last 5 backups per key (short-term undo buffer)
          const oldBackups = await env.DB.prepare(
            "SELECT key FROM ritual_data WHERE key LIKE ? ORDER BY updated_at DESC LIMIT -1 OFFSET 5"
          ).bind(`_backup:${key}:%`).all();
          for (const row of (oldBackups.results || [])) {
            await env.DB.prepare("DELETE FROM ritual_data WHERE key = ?").bind(row.key).run();
          }
          // Daily checkpoint: one snapshot per calendar day, kept 30 days
          // For month keys (YYYY-MM) AND workout-log (critical isolated data)
          if (/^\d{4}-\d{2}$/.test(key) || key === 'workout-log') {
            const today = new Date().toISOString().slice(0, 10);
            const cpKey = `_checkpoint:${key}:${today}`;
            const exists = await env.DB.prepare('SELECT key FROM ritual_data WHERE key = ?').bind(cpKey).first();
            if (!exists) {
              await env.DB.prepare(
                "INSERT OR REPLACE INTO ritual_data (key, data, updated_at) VALUES (?, ?, datetime('now'))"
              ).bind(cpKey, prev.data).run();
              // Keep only last 30 daily checkpoints per key
              const oldCps = await env.DB.prepare(
                "SELECT key FROM ritual_data WHERE key LIKE ? ORDER BY updated_at DESC LIMIT -1 OFFSET 30"
              ).bind(`_checkpoint:${key}:%`).all();
              for (const row of (oldCps.results || [])) {
                await env.DB.prepare("DELETE FROM ritual_data WHERE key = ?").bind(row.key).run();
              }
            }
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
          // Preserve per-day fields from stale full-month saves (multi-tab/device safety net).
          // Dynamic merge: no hardcoded ARRAY_FIELDS — all array-valued keys in existing
          // data are preserved automatically. Add new checklist categories freely.
          mergeMonthData(existing, data);
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
          const item = data.days[day][category][index];
          item.done = !item.done;
          // _frame 아이템이면 이후 날짜에도 done 상태 전파
          if (item._frame) {
            const [y, m] = ym.split('-').map(Number);
            const dim = new Date(y, m, 0).getDate();
            cascadeFrameDone(data, dim, parseInt(day), category, item.text, item.done, item.url || '');
          }
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
          // _frame 아이템이면 이후 날짜에서도 제거 + _dismissed 추가
          if (removed._frame) {
            const [y, m] = ym.split('-').map(Number);
            const dim = new Date(y, m, 0).getDate();
            cascadeFrameDelete(data, dim, parseInt(day), category, removed.text);
          }
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

      // --- Reset Day Types (잘못된 explicit day_type 일괄 정리) ---
      if (path === '/api/reset-day-types' && method === 'POST') {
        const { ym } = await request.json();
        if (!ym || !/^\d{4}-\d{2}$/.test(ym)) {
          return new Response(JSON.stringify({ error: 'invalid ym' }), { status: 400, headers });
        }
        const [year, month] = ym.split('-').map(Number);
        const data = await getKey(ym) || { days: {} };
        let cleared = 0;
        for (const [dayKey, dd] of Object.entries(data.days || {})) {
          const d = parseInt(dayKey);
          const dow = new Date(year, month - 1, d).getDay();
          if (
            (dow === 0 && dd.day_type === 'block') ||
            (dow === 6 && dd.day_type === 'flow') ||
            (dow >= 1 && dow <= 5 && (dd.day_type === 'block' || dd.day_type === 'flow'))
          ) {
            delete dd.day_type;
            cleared++;
          }
        }
        if (cleared > 0) await setKey(ym, data);
        return new Response(JSON.stringify({ cleared, ym }), { headers });
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

      // --- Events (day-level calendar events) ---
      if (path === '/api/events' && method === 'POST') {
        const { ym, day, events } = await request.json();
        if (!validYm(ym) || !validDay(day)) {
          return new Response(JSON.stringify({ error: 'invalid day payload' }), { status: 400, headers });
        }
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]) data.days[day] = {};
        if (Array.isArray(events) && events.length > 0) data.days[day].events = events;
        else delete data.days[day].events;
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
              for (const cat of ['ritual','input','work','hexagonal','outcome','source']) {
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
        if (!Array.isArray(arr) && action !== 'set') {
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

      // --- Backup list (GET /api/backups?key=2026-06) ---
      if (path === '/api/backups' && method === 'GET') {
        const targetKey = url.searchParams.get('key') || 'standing-orders';
        const recents = await env.DB.prepare(
          "SELECT key, updated_at FROM ritual_data WHERE key LIKE ? ORDER BY updated_at DESC LIMIT 5"
        ).bind(`_backup:${targetKey}:%`).all();
        const checkpoints = await env.DB.prepare(
          "SELECT key, updated_at FROM ritual_data WHERE key LIKE ? ORDER BY updated_at DESC LIMIT 30"
        ).bind(`_checkpoint:${targetKey}:%`).all();
        return new Response(JSON.stringify({
          recent_backups: (recents.results || []).map(r => ({ key: r.key, updated_at: r.updated_at })),
          daily_checkpoints: (checkpoints.results || []).map(r => ({ key: r.key, updated_at: r.updated_at })),
        }), { headers });
      }

      // --- Undo (restore from auto-backup or checkpoint) ---
      if (path === '/api/undo' && method === 'POST') {
        const { key, from } = await request.json();
        const undoableKeys = new Set([...Object.values(kvMap), ...(await env.DB.prepare("SELECT key FROM ritual_data WHERE key LIKE '20%'").all()).results.map(r => r.key)]);
        const targetKey = key || 'standing-orders';
        if (!undoableKeys.has(targetKey) && !/^\d{4}-\d{2}$/.test(targetKey)) {
          return new Response(JSON.stringify({ error: 'invalid undo key' }), { status: 400, headers });
        }
        // Allow restoring from a specific backup/checkpoint key
        let sourceKey;
        if (from) {
          const validPrefix = `_backup:${targetKey}:` ;
          const validCpPrefix = `_checkpoint:${targetKey}:`;
          if (!from.startsWith(validPrefix) && !from.startsWith(validCpPrefix)) {
            return new Response(JSON.stringify({ error: 'invalid from key' }), { status: 400, headers });
          }
          sourceKey = from;
        } else {
          // Default: most recent short-term backup
          const backups = await env.DB.prepare(
            "SELECT key, updated_at FROM ritual_data WHERE key LIKE ? ORDER BY updated_at DESC LIMIT 1"
          ).bind(`_backup:${targetKey}:%`).all();
          if (!backups.results?.length) {
            return new Response(JSON.stringify({ error: 'no backups found' }), { status: 404, headers });
          }
          sourceKey = backups.results[0].key;
        }
        const backupData = await env.DB.prepare('SELECT data, updated_at FROM ritual_data WHERE key = ?').bind(sourceKey).first();
        if (backupData) {
          await env.DB.prepare(
            "INSERT OR REPLACE INTO ritual_data (key, data, updated_at) VALUES (?, ?, datetime('now'))"
          ).bind(targetKey, backupData.data).run();
          return new Response(JSON.stringify({ ok: true, restored_from: backupData.updated_at, source: sourceKey }), { headers });
        }
        return new Response(JSON.stringify({ error: 'backup data corrupted' }), { status: 500, headers });
      }

      // --- Workout Log (isolated, date-keyed, independent of month data) ---
      if (path === '/api/workout-log' && method === 'GET') {
        const data = await getKey('workout-log') || {};
        // Auto-recovery: if completely empty, restore from latest checkpoint
        if (Object.keys(data).length === 0) {
          const latest = await env.DB.prepare(
            "SELECT data, updated_at FROM ritual_data WHERE key LIKE '_checkpoint:workout-log:%' ORDER BY updated_at DESC LIMIT 1"
          ).first();
          if (latest) {
            const recovered = JSON.parse(latest.data);
            if (Object.keys(recovered).length > 0) {
              await setKey('workout-log', recovered);
              return new Response(JSON.stringify({ ...recovered, _auto_recovered: true, _recovered_at: latest.updated_at }), { headers });
            }
          }
        }
        return new Response(JSON.stringify(data), { headers });
      }
      if (path === '/api/workout-log' && method === 'POST') {
        const body = await request.json();
        const { date, workout, part, force } = body;
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (part === undefined && !Array.isArray(workout))) {
          return new Response(JSON.stringify({ error: 'invalid payload' }), { status: 400, headers });
        }
        const prevData = await getKey('workout-log') || {};
        const data = { ...prevData };
        if (part !== undefined) {
          // XOR: 단일 part 토글 (SvelteKit 앱 호환)
          const wo = [...(data[date] || [])];
          const idx = wo.indexOf(part);
          if (idx >= 0) wo.splice(idx, 1); else wo.push(part);
          data[date] = wo;
        } else {
          data[date] = workout;  // 배열 직접 저장 (구형 app.js 호환)
        }
        // Shrink protection: refuse bulk clear unless force:true
        const prevTotal = Object.values(prevData).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);
        const newTotal = Object.values(data).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);
        if (prevTotal > 3 && newTotal === 0 && !force) {
          return new Response(JSON.stringify({ error: 'shrink-protected', prevTotal, hint: 'pass force:true to override' }), { status: 409, headers });
        }
        await setKey('workout-log', data);
        return new Response(JSON.stringify({ ok: true, workout: data[date] }), { headers });
      }

      // --- Workout (legacy, month-embedded) ---
      // Preserve workout: dd.workout must survive PATCH — see DECISIONS.md
      if (path === '/api/workout' && method === 'GET') {
        return new Response('Method Not Allowed', { status: 405, headers: { ...headers, 'Allow': 'POST' } });
      }
      if (path === '/api/workout' && method === 'POST') {
        const { ym, day, workout, part } = await request.json();
        if (!validYm(ym) || !validDay(day)) {
          return new Response(JSON.stringify({ error: 'invalid workout payload' }), { status: 400, headers });
        }
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]) data.days[day] = {};
        const dd = data.days[day];
        if (Array.isArray(workout)) {
          // Client sends full array — enforce XOR server-side (전면/측면/후면 XOR, 등/가슴 XOR)
          const BLUE = ['전면', '측면', '후면'];
          const GREEN = ['등', '가슴'];
          const xorResult = [];
          for (const p of workout) {
            const grp = BLUE.includes(p) ? BLUE : GREEN.includes(p) ? GREEN : null;
            if (grp) {
              for (let i = xorResult.length - 1; i >= 0; i--) {
                if (grp.includes(xorResult[i])) xorResult.splice(i, 1);
              }
            }
            if (!xorResult.includes(p)) xorResult.push(p);
          }
          dd.workout = xorResult;
        } else if (typeof part === 'string') {
          // Legacy toggle behavior
          if (!dd.workout) dd.workout = [];
          const idx = dd.workout.indexOf(part);
          if (idx >= 0) dd.workout.splice(idx, 1);
          else dd.workout.push(part);
        } else {
          return new Response(JSON.stringify({ error: 'invalid workout payload' }), { status: 400, headers });
        }
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true, workout: dd.workout }), { headers });
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
        const CATS = ['ritual','input','work','hexagonal','outcome','source'];

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
            const promotedTexts = new Set();
            const catFrame = frame?.categories?.[cat];
            const catType = catFrame?.type || 'routine'; // 'routine' | 'todo'

            // Routine categories render live from template in the frontend — skip injection
            // Clean up _frame/_carried AND manual items matching template text
            // (manual items may have lost _frame marker due to editing or old inject code)
            if (catType === 'routine') {
              const before = JSON.stringify(existing);
              const frameTexts = new Set((catFrame?.items || []).map(ti => typeof ti === 'object' ? ti.text : String(ti)));
              const cleaned = existing.filter(i => !i._frame && !i._carried && !frameTexts.has(i.text));
              if (JSON.stringify(cleaned) !== before) {
                dd[cat] = cleaned;
                changed = true;
              }
              continue;
            }

            // For todo categories: items completed in prevDay should NOT be re-injected
            const prevDoneTodos = new Set();
            if (catType === 'todo' && prevDay) {
              (prevDay[cat] || []).forEach(i => { if (i.done) prevDoneTodos.add(i.text); });
            }
            if (catFrame?.items?.length) {
              for (const rawItem of catFrame.items) {
                const text = typeof rawItem === 'object' ? rawItem.text : rawItem;
                const itemUrl = typeof rawItem === 'object' ? (rawItem.url || '') : '';
                const itemType = typeof rawItem === 'object' ? rawItem.type : undefined;
                if (dismissed.has(text) && itemType !== 'separator') continue;
                // todo category: skip items completed in previous day
                if (catType === 'todo' && itemType !== 'separator' && prevDoneTodos.has(text)) continue;
                const existingItem = oldFrame.find(i => i.text === text && i.type === itemType);
                if (existingItem) {
                  // Backfill URL from urlMap if existing lost it
                  if (!existingItem.url && urlMap.has(text)) existingItem.url = urlMap.get(text);
                  newFrame.push(existingItem);
                } else {
                  const resolvedUrl = itemUrl || urlMap.get(text) || '';
                  const manualMatch = !itemType && manual.find(i => i.text === text);
                  if (itemType === 'separator') {
                    newFrame.push({ text, url: resolvedUrl, done: false, _frame: true, type: itemType });
                    injected++;
                  } else if (manualMatch) {
                    // Promote: item was injected without _frame marker — fix it
                    newFrame.push({ ...manualMatch, _frame: true });
                    promotedTexts.add(text);
                  } else {
                    const newItem = { text, url: resolvedUrl, done: false, _frame: true };
                    if (itemType) newItem.type = itemType;
                    newFrame.push(newItem);
                    injected++;
                  }
                }
              }
            }
            // 3b. Carry: frontend handles lazy 1-day carry, worker must NOT cascade
            // Exclude promoted-to-frame items from manual; strip old _carried injections
            const assembled = [...newFrame, ...manual.filter(i => !promotedTexts.has(i.text))];

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
        ...(env.GITHUB_TOKEN ? { 'Authorization': `token ${env.GITHUB_TOKEN}` } : {}),
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
        if (!ghRes.ok) return new Response(JSON.stringify({ error: 'github error', status: ghRes.status }), { status: 502, headers });
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
        if (!ghRes.ok) return new Response(JSON.stringify({ error: result.message || 'save failed' }), { status: ghRes.status === 401 ? 502 : ghRes.status, headers });
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
        if (!ghRes.ok) return new Response(JSON.stringify({ error: result.message || 'upload failed' }), { status: ghRes.status === 401 ? 502 : ghRes.status, headers });
        return new Response(JSON.stringify({ ok: true, path: filePath, markdown: `![${fileName}](${filePath})` }), { headers });
      }

      // GET /api/cortex/search?q=keyword — search file/folder names + content
      if (path === '/api/cortex/search' && method === 'GET') {
        const q = url.searchParams.get('q')?.toLowerCase();
        if (!q) return new Response('[]', { headers });

        // GitHub Code Search (content search)
        try {
          const csRes = await fetch(
            `https://api.github.com/search/code?q=${encodeURIComponent(q)}+repo:${REPO}+in:file+path:cortex/`,
            { headers: { ...ghHeaders, Accept: 'application/vnd.github.v3.text-match+json' } }
          );
          if (csRes.ok) {
            const csData = await csRes.json();
            const results = (csData.items || []).slice(0, 30).map(i => ({
              name: i.name,
              path: i.path,
              type: 'file',
              snippet: i.text_matches?.[0]?.fragment || '',
            }));
            return new Response(JSON.stringify(results), { headers });
          }
        } catch (_) { /* fallthrough to path search */ }

        // Fallback: git tree API path filter
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
            type: i.type === 'tree' ? 'dir' : 'file',
            snippet: '',
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
              for (const cat of ['ritual','input','work','hexagonal','outcome','source']) {
                for (const item of (dd[cat] || [])) {
                  if (item.text?.toLowerCase().includes(q)) matches.push({ field:cat, text:item.text });
                }
              }
            } catch { continue; }
            if (matches.length) schedResults.push({ ym:row.key, day, matches });
          }
        }

        // Notes search (GitHub Code Search API — file contents)
        let noteResults = [];
        try {
          const codeSearchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(q)}+repo:${REPO}+in:file+path:cortex/`;
          const codeRes = await fetch(codeSearchUrl, {
            headers: { ...ghHeaders, 'Accept': 'application/vnd.github.v3.text-match+json' }
          });
          if (codeRes.ok) {
            const codeData = await codeRes.json();
            noteResults = (codeData.items || []).slice(0, 20).map(i => ({
              name: i.name,
              path: i.path,
              type: 'file',
              snippet: i.text_matches?.[0]?.fragment || ''
            }));
          } else {
            // fallback: path-only search
            const treeUrl = `https://api.github.com/repos/${REPO}/git/trees/master?recursive=1`;
            const treeRes = await fetch(treeUrl, { headers: ghHeaders });
            if (treeRes.ok) {
              const treeData = await treeRes.json();
              noteResults = (treeData.tree || [])
                .filter(i => i.path.startsWith('cortex/') && i.path.toLowerCase().includes(q))
                .slice(0, 20)
                .map(i => ({ name: i.path.split('/').pop(), path: i.path, type: i.type === 'tree' ? 'dir' : 'file' }));
            }
          }
        } catch {}

        return new Response(JSON.stringify({ schedule: schedResults.slice(0,20), notes: noteResults }), { headers });
      }

      // Pass through to assets (static files served by Cloudflare)
      try {
        return await env.ASSETS.fetch(request);
      } catch (e) {
        console.error('ASSETS.fetch failed:', e?.message);
        return new Response('Not Found', { status: 404, headers });
      }

    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ error: 'internal error', detail: e.message }), { status: 500, headers });
    }
  }
};
