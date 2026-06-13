/**
 * lib/telegram.ts — Telegram surface 순수 로직 (Cortex Research Gateway)
 *
 * 폴링 루프·네트워크는 scripts/research/telegram-bot.mjs. 여기는 테스트 가능한 순수 함수만.
 */

export interface TgMessage {
  chatId: number;
  text: string;
  updateId: number;
}

/** getUpdates 응답 → 메시지 목록 + 다음 offset */
export function parseUpdates(
  data: unknown,
  prevOffset: number
): { messages: TgMessage[]; nextOffset: number } {
  const d = data as { result?: unknown };
  const result = Array.isArray(d?.result) ? d.result : [];
  const messages: TgMessage[] = [];
  let maxId = prevOffset - 1;
  for (const u of result) {
    const upd = u as { update_id?: number; message?: { chat?: { id?: number }; text?: string } };
    const id = typeof upd.update_id === 'number' ? upd.update_id : -1;
    if (id > maxId) maxId = id;
    const text = upd.message?.text;
    const chatId = upd.message?.chat?.id;
    if (typeof text === 'string' && typeof chatId === 'number' && text.trim()) {
      messages.push({ chatId, text: text.trim(), updateId: id });
    }
  }
  return { messages, nextOffset: maxId + 1 };
}

/** 허용된 chat인지(소유자만; allowlist 비어있으면 전체 허용) */
export function isAllowed(chatId: number, allowlist: number[]): boolean {
  if (allowlist.length === 0) return true;
  return allowlist.includes(chatId);
}

/** 명령어 처리: /start, /help 등은 안내, 그 외는 검색 질의로 */
export function classifyMessage(text: string): { kind: 'help' | 'query'; query: string } {
  const t = text.trim();
  if (t === '/start' || t === '/help') return { kind: 'help', query: '' };
  // "/search foo" 또는 그냥 "foo"
  const q = t.startsWith('/search') ? t.slice('/search'.length).trim() : t;
  if (!q || q.startsWith('/')) return { kind: 'help', query: '' };
  return { kind: 'query', query: q };
}

export const HELP_TEXT =
  '🔎 Cortex Research — 개인화+복리 검색\n\n' +
  '그냥 검색어를 보내면 답을 드립니다. 매 검색은 당신 맥락에 축적되어 다음 검색이 더 좋아집니다.\n' +
  '예) "Cloudflare Vectorize 가격"';

/** research 결과 → 텔레그램 메시지(4096자 제한 준수) */
export function formatReply(result: {
  answer?: string;
  sources?: Array<{ url: string; title: string }>;
  reformulated?: string;
  query?: string;
  contextUsed?: { priorFindings: number; cortexDocs: number; profile: number };
  error?: string;
}): string {
  if (result.error) return `⚠️ 검색 실패: ${result.error}`;
  const parts: string[] = [];
  if (result.answer) parts.push(result.answer.trim());
  const srcs = (result.sources || []).slice(0, 5);
  if (srcs.length) {
    parts.push('\n📎 출처');
    srcs.forEach((s, i) => parts.push(`${i + 1}. ${s.title}\n${s.url}`));
  }
  const c = result.contextUsed;
  if (c) parts.push(`\n🧠 맥락: 과거 ${c.priorFindings} · Cortex ${c.cortexDocs} · 프로필 ${c.profile}`);
  let msg = parts.join('\n');
  if (msg.length > 4000) msg = msg.slice(0, 3990) + '\n…(생략)';
  return msg || '(결과 없음)';
}
