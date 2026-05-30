var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    if (method === "OPTIONS") return new Response(null, { headers });
    if (method !== "GET" && path.startsWith("/api/")) {
      const auth = request.headers.get("Authorization");
      if (auth !== `Bearer ${env.API_SECRET}`) {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });
      }
    }
    try {
      const validYm = /* @__PURE__ */ __name((s) => /^\d{4}-\d{2}$/.test(s), "validYm");
      const clamp = /* @__PURE__ */ __name((n, min, max) => Math.max(min, Math.min(max, Number(n) || 0)), "clamp");
      const getKey = /* @__PURE__ */ __name(async (key) => {
        const row = await env.DB.prepare("SELECT data FROM ritual_data WHERE key = ?").bind(key).first();
        return row ? JSON.parse(row.data) : null;
      }, "getKey");
      const setKey = /* @__PURE__ */ __name(async (key, data) => {
        const json = JSON.stringify(data);
        const prev = await env.DB.prepare("SELECT data FROM ritual_data WHERE key = ?").bind(key).first();
        if (prev) {
          const backupKey = `_backup:${key}:${Date.now()}`;
          await env.DB.prepare(
            "INSERT OR REPLACE INTO ritual_data (key, data, updated_at) VALUES (?, ?, datetime('now'))"
          ).bind(backupKey, prev.data).run();
          const oldBackups = await env.DB.prepare(
            "SELECT key FROM ritual_data WHERE key LIKE ? ORDER BY updated_at DESC LIMIT -1 OFFSET 5"
          ).bind(`_backup:${key}:%`).all();
          for (const row of oldBackups.results || []) {
            await env.DB.prepare("DELETE FROM ritual_data WHERE key = ?").bind(row.key).run();
          }
        }
        await env.DB.prepare(
          "INSERT OR REPLACE INTO ritual_data (key, data, updated_at) VALUES (?, ?, datetime('now'))"
        ).bind(key, json).run();
      }, "setKey");
      if (path === "/api/month" && method === "GET") {
        const ym = url.searchParams.get("ym") || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
        if (!validYm(ym)) return new Response(JSON.stringify({ error: "invalid ym" }), { status: 400, headers });
        let data = await getKey(ym);
        if (!data) data = { month: ym, goals: {}, days: {} };
        return new Response(JSON.stringify(data), { headers });
      }
      if (path === "/api/month" && method === "POST") {
        const { ym, data } = await request.json();
        const existing = await getKey(ym);
        if (existing) {
          const countAll = /* @__PURE__ */ __name((days) => Object.values(days || {}).reduce((n, dd) => {
            for (const k of Object.keys(dd)) {
              if (Array.isArray(dd[k])) n += dd[k].length;
            }
            return n;
          }, 0), "countAll");
          const existingCount = countAll(existing.days);
          const newCount = countAll(data.days);
          const newDayCount = Object.keys(data.days || {}).length;
          if (existingCount > 10 && newCount === 0 && newDayCount === 0) {
            return new Response(JSON.stringify({ error: "blocked: would erase data" }), { status: 400, headers });
          }
        }
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }
      if (path === "/api/toggle" && method === "POST") {
        const { ym, day, category, index } = await request.json();
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (data.days[day]?.[category]?.[index] !== void 0) {
          data.days[day][category][index].done = !data.days[day][category][index].done;
          await setKey(ym, data);
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }
      if (path === "/api/add-item" && method === "POST") {
        const { ym, day, category, text, url: itemUrl } = await request.json();
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]) data.days[day] = {};
        if (!data.days[day][category]) data.days[day][category] = [];
        data.days[day][category].push({ text, url: itemUrl || "", done: false });
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }
      if (path === "/api/insert-item" && method === "POST") {
        const { ym, day, category, index, text, url: itemUrl } = await request.json();
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]) data.days[day] = {};
        if (!data.days[day][category]) data.days[day][category] = [];
        data.days[day][category].splice(index, 0, { text, url: itemUrl || "", done: false });
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }
      if (path === "/api/split-item" && method === "POST") {
        const { ym, day, category, index, before, after } = await request.json();
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]?.[category]?.[index]) {
          return new Response(JSON.stringify({ ok: false, error: "not found" }), { headers });
        }
        data.days[day][category][index].text = before;
        data.days[day][category].splice(index + 1, 0, { text: after, url: "", done: false });
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }
      if (path === "/api/one-thing" && method === "POST") {
        const { ym, day, text } = await request.json();
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]) data.days[day] = {};
        data.days[day].one_thing = text;
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }
      if (path === "/api/edit-item" && method === "POST") {
        const { ym, day, category, index, text } = await request.json();
        const data = await getKey(ym);
        if (data?.days[day]?.[category]?.[index]) {
          data.days[day][category][index].text = text;
          await setKey(ym, data);
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }
      if (path === "/api/delete-item" && method === "POST") {
        const { ym, day, category, index } = await request.json();
        const data = await getKey(ym);
        const arr = data?.days[day]?.[category];
        if (arr && index >= 0 && index < arr.length) {
          arr.splice(index, 1);
          await setKey(ym, data);
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }
      if (path === "/api/day-type" && method === "POST") {
        const { ym, day, type } = await request.json();
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]) data.days[day] = {};
        if (type) data.days[day].day_type = type;
        else delete data.days[day].day_type;
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }
      if (path === "/api/notes" && method === "POST") {
        const { ym, day, notes } = await request.json();
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]) data.days[day] = {};
        if (notes) data.days[day].notes = notes;
        else delete data.days[day].notes;
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true }), { headers });
      }
      if (path === "/api/reorder" && method === "POST") {
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
      if (path === "/api/move-item" && method === "POST") {
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
      if (path === "/api/search" && method === "GET") {
        const q = (url.searchParams.get("q") || "").toLowerCase();
        if (!q) return new Response("[]", { headers });
        const rows = await env.DB.prepare("SELECT key, data FROM ritual_data WHERE key LIKE '20%'").all();
        const results = [];
        for (const row of rows.results) {
          let data;
          try {
            data = JSON.parse(row.data);
          } catch {
            continue;
          }
          const ym = row.key;
          for (const [day, dd] of Object.entries(data.days || {})) {
            const matches = [];
            try {
              if (dd.one_thing?.toLowerCase().includes(q)) matches.push({ field: "one_thing", text: dd.one_thing });
              if (dd.notes?.toLowerCase().includes(q)) matches.push({ field: "notes", text: dd.notes });
              for (const cat of ["ritual", "input", "work", "outcome"]) {
                for (const item of dd[cat] || []) {
                  if (item.text?.toLowerCase().includes(q)) matches.push({ field: cat, text: item.text });
                }
              }
            } catch {
              continue;
            }
            if (matches.length) results.push({ ym, day, matches });
          }
        }
        return new Response(JSON.stringify(results), { headers });
      }
      const kvMap = {
        "/api/standing-orders": "standing-orders",
        "/api/day-frames": "day-frames",
        "/api/vision": "vision-roadmap",
        "/api/recurring-templates": "recurring-templates"
      };
      if (kvMap[path]) {
        const key = kvMap[path];
        if (method === "GET") {
          const data = await getKey(key);
          return new Response(JSON.stringify(data || {}), { headers });
        }
        if (method === "POST") {
          const data = await request.json();
          const existing = await getKey(key);
          if (existing) {
            const existingSize = JSON.stringify(existing).length;
            const newSize = JSON.stringify(data).length;
            if (existingSize > 200 && newSize < existingSize * 0.3) {
              return new Response(JSON.stringify({
                error: `blocked: data shrunk from ${existingSize} to ${newSize} bytes (${Math.round(newSize / existingSize * 100)}%). Use /api/force-save to override.`,
                existingSize,
                newSize
              }), { status: 400, headers });
            }
          }
          await setKey(key, data);
          return new Response(JSON.stringify({ ok: true }), { headers });
        }
      }
      if (path === "/api/undo" && method === "POST") {
        const { key } = await request.json();
        const targetKey = key || "standing-orders";
        const backups = await env.DB.prepare(
          "SELECT key, updated_at FROM ritual_data WHERE key LIKE ? ORDER BY updated_at DESC LIMIT 5"
        ).bind(`_backup:${targetKey}:%`).all();
        if (!backups.results?.length) {
          return new Response(JSON.stringify({ error: "no backups found" }), { status: 404, headers });
        }
        const latest = backups.results[0];
        const backupData = await env.DB.prepare("SELECT data FROM ritual_data WHERE key = ?").bind(latest.key).first();
        if (backupData) {
          const restored = JSON.parse(backupData.data);
          await env.DB.prepare(
            "INSERT OR REPLACE INTO ritual_data (key, data, updated_at) VALUES (?, ?, datetime('now'))"
          ).bind(targetKey, backupData.data).run();
          return new Response(JSON.stringify({ ok: true, restored_from: latest.updated_at, backups_available: backups.results.length }), { headers });
        }
        return new Response(JSON.stringify({ error: "backup data corrupted" }), { status: 500, headers });
      }
      if (path === "/api/workout" && method === "POST") {
        const { ym, day, part } = await request.json();
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        if (!data.days[day]) data.days[day] = {};
        const dd = data.days[day];
        if (!dd.workout) dd.workout = [];
        const idx = dd.workout.indexOf(part);
        if (idx >= 0) dd.workout.splice(idx, 1);
        else dd.workout.push(part);
        await setKey(ym, data);
        return new Response(JSON.stringify({ ok: true, workout: dd.workout }), { headers });
      }
      if (path === "/api/inject-frames" && method === "POST") {
        const { ym, fromDay, toDay } = await request.json();
        const data = await getKey(ym) || { month: ym, goals: {}, days: {} };
        const frames = await getKey("day-frames") || {};
        const [year, month] = ym.split("-").map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const start = clamp(fromDay || 1, 1, daysInMonth);
        const end = clamp(toDay || daysInMonth, 1, daysInMonth);
        let injected = 0;
        for (let d = start; d <= end; d++) {
          const dayKey = String(d);
          if (!data.days[dayKey]) data.days[dayKey] = {};
          const dd = data.days[dayKey];
          const dow = new Date(year, month - 1, d).getDay();
          const dayType = dd.day_type || (dow === 0 ? "block" : dow === 6 ? "flow" : "weekday");
          const frame = frames[dayType];
          if (!frame?.categories) continue;
          for (const cat of ["ritual", "input", "work", "outcome"]) {
            const catFrame = frame.categories[cat];
            if (!catFrame || !catFrame.items?.length) continue;
            if (!dd[cat]) dd[cat] = [];
            const frameTexts = (catFrame.items || []).map((r) => typeof r === "object" ? r.text : r);
            dd[cat] = dd[cat].filter((i) => !i._frame || frameTexts.includes(i.text));
            const manualItems = dd[cat].filter((i) => !i._frame);
            const existingFrame = dd[cat].filter((i) => i._frame);
            for (const rawItem of catFrame.items || []) {
              const isObj = typeof rawItem === "object";
              const text = isObj ? rawItem.text : rawItem;
              const itemUrl = isObj ? rawItem.url || "" : "";
              if (!existingFrame.some((i) => i.text === text)) {
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
      const REPO = "ne0cean/A-Team";
      const ghHeaders = {
        "Authorization": `token ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "cortex-worker"
      };
      if (path === "/api/cortex/tree" && method === "GET") {
        const dirPath = url.searchParams.get("path") || "cortex";
        const ghUrl = `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(dirPath)}?ref=master`;
        const ghRes = await fetch(ghUrl, { headers: ghHeaders });
        if (!ghRes.ok) return new Response(JSON.stringify({ error: "github error", status: ghRes.status }), { status: ghRes.status, headers });
        const items = await ghRes.json();
        const simplified = (Array.isArray(items) ? items : [items]).map((i) => ({
          name: i.name,
          path: i.path,
          type: i.type,
          size: i.size
        }));
        return new Response(JSON.stringify(simplified), { headers });
      }
      if (path === "/api/cortex/file" && method === "GET") {
        const filePath = url.searchParams.get("path");
        if (!filePath) return new Response(JSON.stringify({ error: "path required" }), { status: 400, headers });
        const ghUrl = `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(filePath)}?ref=master`;
        const ghRes = await fetch(ghUrl, { headers: ghHeaders });
        if (!ghRes.ok) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers });
        const data = await ghRes.json();
        const raw = atob(data.content);
        const content = decodeURIComponent(escape(raw));
        return new Response(JSON.stringify({ path: data.path, name: data.name, content, sha: data.sha }), { headers });
      }
      if (path === "/api/cortex/file" && method === "POST") {
        const { filePath, content, sha, message } = await request.json();
        if (!filePath || content === void 0) return new Response(JSON.stringify({ error: "filePath, content required" }), { status: 400, headers });
        const ghUrl = `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(filePath)}`;
        const body = {
          message: message || `cortex: update ${filePath.split("/").pop()}`,
          content: btoa(unescape(encodeURIComponent(content))),
          branch: "master"
        };
        if (sha) body.sha = sha;
        const ghRes = await fetch(ghUrl, {
          method: "PUT",
          headers: { ...ghHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const result = await ghRes.json();
        if (!ghRes.ok) return new Response(JSON.stringify({ error: result.message || "save failed" }), { status: ghRes.status, headers });
        return new Response(JSON.stringify({ ok: true, sha: result.content?.sha }), { headers });
      }
      if (path === "/api/cortex/upload" && method === "POST") {
        const { fileName, base64, contentType } = await request.json();
        if (!fileName || !base64) return new Response(JSON.stringify({ error: "fileName, base64 required" }), { status: 400, headers });
        const ts = Date.now();
        const safeName = `${ts}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const filePath = `cortex/attachments/${safeName}`;
        const ghUrl = `https://api.github.com/repos/${REPO}/contents/${filePath}`;
        const ghRes = await fetch(ghUrl, {
          method: "PUT",
          headers: { ...ghHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `cortex: upload ${safeName}`,
            content: base64,
            branch: "master"
          })
        });
        const result = await ghRes.json();
        if (!ghRes.ok) return new Response(JSON.stringify({ error: result.message || "upload failed" }), { status: ghRes.status, headers });
        return new Response(JSON.stringify({ ok: true, path: filePath, markdown: `![${fileName}](${filePath})` }), { headers });
      }
      if (path === "/api/cortex/search" && method === "GET") {
        const q = url.searchParams.get("q")?.toLowerCase();
        if (!q) return new Response("[]", { headers });
        const treeUrl = `https://api.github.com/repos/${REPO}/git/trees/master?recursive=1`;
        const treeRes = await fetch(treeUrl, { headers: ghHeaders });
        if (!treeRes.ok) return new Response("[]", { headers });
        const treeData = await treeRes.json();
        const results = (treeData.tree || []).filter((i) => i.path.startsWith("cortex/") && i.path.toLowerCase().includes(q)).slice(0, 30).map((i) => ({
          name: i.path.split("/").pop(),
          path: i.path,
          type: i.type === "tree" ? "dir" : "file"
        }));
        return new Response(JSON.stringify(results), { headers });
      }
      if (path === "/api/search/unified" && method === "GET") {
        const q = (url.searchParams.get("q") || "").toLowerCase();
        if (!q) return new Response(JSON.stringify({ schedule: [], notes: [] }), { headers });
        const schedResults = [];
        const rows = await env.DB.prepare("SELECT key, data FROM ritual_data WHERE key LIKE '20%'").all();
        for (const row of rows.results) {
          let data;
          try {
            data = JSON.parse(row.data);
          } catch {
            continue;
          }
          for (const [day, dd] of Object.entries(data.days || {})) {
            const matches = [];
            try {
              if (dd.one_thing?.toLowerCase().includes(q)) matches.push({ field: "one_thing", text: dd.one_thing });
              for (const cat of ["ritual", "input", "work", "outcome"]) {
                for (const item of dd[cat] || []) {
                  if (item.text?.toLowerCase().includes(q)) matches.push({ field: cat, text: item.text });
                }
              }
            } catch {
              continue;
            }
            if (matches.length) schedResults.push({ ym: row.key, day, matches });
          }
        }
        let noteResults = [];
        try {
          const treeUrl = `https://api.github.com/repos/${REPO}/git/trees/master?recursive=1`;
          const treeRes = await fetch(treeUrl, { headers: ghHeaders });
          if (treeRes.ok) {
            const treeData = await treeRes.json();
            noteResults = (treeData.tree || []).filter((i) => i.path.startsWith("cortex/") && i.path.toLowerCase().includes(q)).slice(0, 20).map((i) => ({ name: i.path.split("/").pop(), path: i.path, type: i.type === "tree" ? "dir" : "file" }));
          }
        } catch {
        }
        return new Response(JSON.stringify({ schedule: schedResults.slice(0, 20), notes: noteResults }), { headers });
      }
      return new Response("Not found", { status: 404 });
    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ error: "internal error" }), { status: 500, headers });
    }
  }
};

// ../../../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// .wrangler/tmp/bundle-4zyOYG/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-4zyOYG/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
