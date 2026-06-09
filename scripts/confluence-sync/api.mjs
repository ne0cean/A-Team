/**
 * confluence-sync/api.mjs
 * Confluence REST API + Cortex Worker API 래퍼
 */

import { CONFIG } from './config.mjs';

// ── Confluence API ────────────────────────────────────────────────────────────

function confHeaders() {
  return {
    'Authorization': `Bearer ${CONFIG.confluence.pat}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

export async function confGetPage() {
  const url = `${CONFIG.confluence.baseUrl}/rest/api/content/${CONFIG.confluence.pageId}?expand=body.storage,version`;
  const res = await fetch(url, { headers: confHeaders() });
  if (!res.ok) throw new Error(`Confluence GET failed: ${res.status}`);
  return res.json();
}

export async function confGetPageVersion() {
  const url = `${CONFIG.confluence.baseUrl}/rest/api/content/${CONFIG.confluence.pageId}?expand=version`;
  const res = await fetch(url, { headers: confHeaders() });
  if (!res.ok) throw new Error(`Confluence version check failed: ${res.status}`);
  const d = await res.json();
  return d.version?.number ?? 0;
}

export async function confUpdatePage(title, xhtml, currentVersion) {
  const url = `${CONFIG.confluence.baseUrl}/rest/api/content/${CONFIG.confluence.pageId}`;
  const body = JSON.stringify({
    type: 'page',
    title,
    version: { number: currentVersion + 1 },
    body: { storage: { value: xhtml, representation: 'storage' } },
  });
  const res = await fetch(url, { method: 'PUT', headers: confHeaders(), body });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Confluence PUT failed: ${res.status} ${err.slice(0, 200)}`);
  }
  return res.json();
}

// ── Cortex API ────────────────────────────────────────────────────────────────

export async function cortexGetMonth(ym) {
  const res = await fetch(`${CONFIG.cortex.baseUrl}/api/month?ym=${ym}`);
  if (!res.ok) throw new Error(`Cortex month failed: ${res.status}`);
  return res.json();
}

export async function cortexGetStandingOrders() {
  const res = await fetch(`${CONFIG.cortex.baseUrl}/api/standing-orders`);
  if (!res.ok) throw new Error(`Cortex SO failed: ${res.status}`);
  return res.json();
}

export async function cortexSaveDay(dateStr, dayData) {
  // dateStr: "2026-06-09"
  const [year, month, day] = dateStr.split('-');
  const ym = `${year}-${month}`;

  // GET current month first
  const monthData = await cortexGetMonth(ym);
  const dayNum = String(parseInt(day));
  monthData.days = monthData.days || {};
  monthData.days[dayNum] = dayData;

  const res = await fetch(`${CONFIG.cortex.baseUrl}/api/month`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ym, data: monthData }),
  });
  if (!res.ok) throw new Error(`Cortex save failed: ${res.status}`);
  return res.json();
}
