/**
 * Instinct Evolution Model — Atomic learned behaviors with confidence scoring
 *
 * Extends learnings.ts with:
 * - Confidence-weighted instincts (0.3-0.9)
 * - Domain tagging (code-style, testing, git, security, workflow)
 * - Project-scope isolation (project vs global)
 * - Auto-promotion: project → global when seen in 2+ projects
 * - Application threshold: only apply instincts with confidence >= 0.5
 */

import * as crypto from 'crypto';

export type InstinctScope = 'project' | 'global';
export type InstinctDomain = 'code-style' | 'testing' | 'git' | 'security' | 'workflow' | 'debugging' | 'performance';

export interface Instinct {
  id: string;
  trigger: string;
  action: string;
  domain: string;
  confidence: number;
  scope: InstinctScope;
  projectId?: string;
  observations: number;
  seenInProjects: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateInstinctInput {
  trigger: string;
  action: string;
  domain: string;
  confidence: number;
  scope: InstinctScope;
  projectId?: string;
}

function clampConfidence(c: number): number {
  return Math.max(0.3, Math.min(0.9, c));
}

export function createInstinct(input: CreateInstinctInput): Instinct {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    trigger: input.trigger,
    action: input.action,
    domain: input.domain,
    confidence: clampConfidence(input.confidence),
    scope: input.scope,
    projectId: input.projectId,
    observations: 1,
    seenInProjects: input.projectId ? [input.projectId] : [],
    createdAt: now,
    updatedAt: now,
  };
}

export function promoteInstinct(instinct: Instinct): Instinct {
  if (instinct.seenInProjects.length >= 2 && instinct.scope === 'project') {
    return {
      ...instinct,
      scope: 'global',
      confidence: clampConfidence(instinct.confidence + 0.1),
      updatedAt: new Date().toISOString(),
    };
  }
  return instinct;
}

export function shouldApply(instinct: Instinct, currentProjectId: string): boolean {
  if (instinct.confidence < 0.5) return false;
  if (instinct.scope === 'global') return true;
  return instinct.projectId === currentProjectId;
}
