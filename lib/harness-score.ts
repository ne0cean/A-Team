/**
 * Harness Maturity Score — 12-Principle Agent Friendliness Measurement
 *
 * Based on harness-diagnostics 12 principles:
 * P1 Entry Point, P2 Map, P3 Invariant, P4 Convention, P5 Progressive Disclosure,
 * P6 Layered, P7 GC, P8 Observability, P9 Knowledge, P10 Reproducibility,
 * P11 Modularity, P12 Self-Documentation.
 *
 * 4 Dimensions (weighted):
 * A (Accessibility 30%): P1+P2+P5+P12
 * B (Consistency 30%): P3+P4+P10
 * C (Structure 20%): P6+P9+P11
 * D (Operations 20%): P7+P8
 *
 * Grade: L1(0-19) L2(20-39) L3(40-59) L4(60-79) L5(80-100)
 */

export interface PrincipleScores {
  P1: number; P2: number; P3: number; P4: number; P5: number; P6: number;
  P7: number; P8: number; P9: number; P10: number; P11: number; P12: number;
}

export interface Dimensions {
  A: number; // Accessibility
  B: number; // Consistency
  C: number; // Structure
  D: number; // Operations
}

export type Grade = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export function calculateDimensions(scores: PrincipleScores): Dimensions {
  return {
    A: (scores.P1 + scores.P2 + scores.P5 + scores.P12) / 4,
    B: (scores.P3 + scores.P4 + scores.P10) / 3,
    C: (scores.P6 + scores.P9 + scores.P11) / 3,
    D: (scores.P7 + scores.P8) / 2,
  };
}

export function calculateTotal(dims: Dimensions): number {
  const raw = (dims.A * 0.3 + dims.B * 0.3 + dims.C * 0.2 + dims.D * 0.2) * 10;
  return Math.round(raw * 10) / 10;
}

export function getGrade(total: number): Grade {
  if (total >= 80) return 'L5';
  if (total >= 60) return 'L4';
  if (total >= 40) return 'L3';
  if (total >= 20) return 'L2';
  return 'L1';
}
