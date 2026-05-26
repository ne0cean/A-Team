/**
 * Cortex Ritual Dashboard — Cloudflare Worker + D1
 * All data stored in D1 SQLite as key-value (key=string, data=JSON text)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };
    if (method === 'OPTIONS') return new Response(null, { headers });

    try {
      // --- Data helpers ---
      const getKey = async (key) => {
        const row = await env.DB.prepare('SELECT data FROM ritual_data WHERE key = ?').bind(key).first();
        return row ? JSON.parse(row.data) : null;
      };

      const setKey = async (key, data) => {
        const json = JSON.stringify(data);
        await env.DB.prepare(
          "INSERT OR REPLACE INTO ritual_data (key, data, updated_at) VALUES (?, ?, datetime('now'))"
        ).bind(key, json).run();
      };

      // --- Month API ---
      if (path === '/api/month' && method === 'GET') {
        const ym = url.searchParams.get('ym') || new Date().toISOString().slice(0, 7);
        let data = await getKey(ym);
        if (!data) data = { month: ym, goals: {}, days: {} };
        return new Response(JSON.stringify(data), { headers });
      }

      if (path === '/api/month' && method === 'POST') {
        const { ym, data } = await request.json();
        // Safety: don't save empty data over existing
        const existing = await getKey(ym);
        if (existing) {
          const existingItems = Object.values(existing.days || {}).reduce((n, dd) =>
            n + ['ritual','input','work','outcome'].reduce((m, c) => m + (dd[c]||[]).length, 0), 0);
          const newItems = Object.values(data.days || {}).reduce((n, dd) =>
            n + ['ritual','input','work','outcome'].reduce((m, c) => m + (dd[c]||[]).length, 0), 0);
          if (existingItems > 10 && newItems === 0) {
            return new Response(JSON.stringify({ error: 'blocked: would erase data' }), { status: 400, headers });
          }
        }
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Toggle ---
      if (path === '/api/toggle' && method === 'POST') {
        const { ym, day, category, index } = await request.json();
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (data.days[day]?.[category]?.[index] !== undefined) {
          data.days[day][category][index].done = !data.days[day][category][index].done;
          await setKey(ym, data);
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Add Item ---
      if (path === '/api/add-item' && method === 'POST') {
        const { ym, day, category, text, url: itemUrl } = await request.json();
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]) data.days[day] = {};
        if (!data.days[day][category]) data.days[day][category] = [];
        data.days[day][category].push({ text, url: itemUrl || '', done: false });
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- One Thing ---
      if (path === '/api/one-thing' && method === 'POST') {
        const { ym, day, text } = await request.json();
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]) data.days[day] = {};
        data.days[day].one_thing = text;
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Edit Item ---
      if (path === '/api/edit-item' && method === 'POST') {
        const { ym, day, category, index, text } = await request.json();
        const data = await getKey(ym);
        if (data?.days[day]?.[category]?.[index]) {
          data.days[day][category][index].text = text;
          await setKey(ym, data);
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Delete Item ---
      if (path === '/api/delete-item' && method === 'POST') {
        const { ym, day, category, index } = await request.json();
        const data = await getKey(ym);
        if (data?.days[day]?.[category]) {
          data.days[day][category].splice(index, 1);
          await setKey(ym, data);
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Day Type ---
      if (path === '/api/day-type' && method === 'POST') {
        const { ym, day, type } = await request.json();
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
        const data = await getKey(ym);
        const items = data?.days[day]?.[category];
        if (items && fromIdx >= 0 && fromIdx < items.length && toIdx >= 0 && toIdx < items.length) {
          const [moved] = items.splice(fromIdx, 1);
          items.splice(toIdx, 0, moved);
          await setKey(ym, data);
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // --- Move Item ---
      if (path === '/api/move-item' && method === 'POST') {
        const { ym, fromDay, fromCat, fromIdx, toDay, toCat } = await request.json();
        const data = await getKey(ym);
        const fromItems = data?.days[fromDay]?.[fromCat];
        if (fromItems && fromIdx < fromItems.length) {
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
          const ym = row.key;
          const data = JSON.parse(row.data);
          for (const [day, dd] of Object.entries(data.days || {})) {
            const matches = [];
            if (dd.one_thing?.toLowerCase().includes(q)) matches.push({ field: 'one_thing', text: dd.one_thing });
            if (dd.notes?.toLowerCase().includes(q)) matches.push({ field: 'notes', text: dd.notes });
            for (const cat of ['ritual','input','work','outcome']) {
              for (const item of (dd[cat] || [])) {
                if (item.text.toLowerCase().includes(q)) matches.push({ field: cat, text: item.text });
              }
            }
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
          return new Response(JSON.stringify(data || {}), { headers });
        }
        if (method === 'POST') {
          const data = await request.json();
          await setKey(key, data);
          return new Response(JSON.stringify({ ok: true }), { headers });
        }
      }

      // --- Undo ---
      if (path === '/api/undo' && method === 'POST') {
        // D1 doesn't have file backups; return not supported
        return new Response(JSON.stringify({ error: 'undo not available in cloud mode' }), { status: 400, headers });
      }

      // --- Inject Frames ---
      if (path === '/api/inject-frames' && method === 'POST') {
        const { ym, fromDay, toDay } = await request.json();
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        const frames = await getKey('day-frames') || {};
        const [year, month] = ym.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const start = fromDay || 1;
        const end = toDay || daysInMonth;

        let injected = 0;
        for (let d = start; d <= end; d++) {
          const dayKey = String(d);
          if (!data.days[dayKey]) data.days[dayKey] = {};
          const dd = data.days[dayKey];
          const dow = new Date(year, month - 1, d).getDay();
          const dayType = dd.day_type || (dow === 0 ? 'block' : dow === 6 ? 'flow' : 'weekday');
          const frame = frames[dayType];
          if (!frame?.categories) continue;

          for (const cat of ['ritual','input','work','outcome']) {
            const catFrame = frame.categories[cat];
            if (!catFrame || catFrame.type !== 'routine') continue;
            if (!dd[cat]) dd[cat] = [];

            const frameTexts = (catFrame.items || []).map(r => typeof r === 'object' ? r.text : r);
            dd[cat] = dd[cat].filter(i => !i._frame || frameTexts.includes(i.text));

            const manualItems = dd[cat].filter(i => !i._frame);
            const existingFrame = dd[cat].filter(i => i._frame);

            for (const rawItem of (catFrame.items || [])) {
              const isObj = typeof rawItem === 'object';
              const text = isObj ? rawItem.text : rawItem;
              const itemUrl = isObj ? (rawItem.url || '') : '';
              if (!existingFrame.some(i => i.text === text)) {
                existingFrame.push({ text, url: itemUrl, done: false, _frame: true });
                injected++;
              }
            }
            dd[cat] = [...existingFrame, ...manualItems];
          }
        }

        if (injected > 0) await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true, injected, range: `${start}-${end}` }), { headers });
      }

      // 404
      return new Response('Not found', { status: 404 });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
  }
};
