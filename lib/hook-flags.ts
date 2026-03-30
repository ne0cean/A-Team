/**
 * Hook Flag System — 3-tier hook intensity control
 *
 * minimal: safety-critical only (session persistence, destructive command blocking)
 * standard: + quality checks (format, lint, console.log detection)
 * strict: + full enforcement (typecheck, config protection, security scan)
 *
 * Each hook declares which tiers it runs in.
 * Projects choose their tier based on risk tolerance.
 */

export type HookTier = 'minimal' | 'standard' | 'strict';

export interface HookDefinition {
  id: string;
  tiers: HookTier[];
}

export function parseFlags(flagStr: string): HookTier[] {
  if (!flagStr) return [];
  return flagStr.split(',').map(s => s.trim()).filter(Boolean) as HookTier[];
}

export function shouldRunHook(hook: HookDefinition, currentTier: HookTier): boolean {
  // Hooks with no tiers always run (safety baseline)
  if (hook.tiers.length === 0) return true;
  return hook.tiers.includes(currentTier);
}
