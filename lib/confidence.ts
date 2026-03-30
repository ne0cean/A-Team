/**
 * Confidence Calibration — Review finding quality gate
 *
 * Every review finding gets a 1-10 confidence score that gates display:
 *   7+: show normally
 *   5-6: show with caveat
 *   <5: suppress (except P0)
 *
 * Calibration learning: when user confirms/rejects a finding,
 * the confidence adjustment is logged for future sessions.
 */

export type DisplayRule = 'show' | 'caveat' | 'suppress';
export type Severity = 'P0' | 'P1' | 'P2' | 'P3';

export interface Finding {
  severity: Severity;
  confidence: number;
  file: string;
  line: number;
  description: string;
}

export interface ClassifiedFinding extends Finding {
  displayRule: DisplayRule;
  caveatText?: string;
}

export interface CalibrationInput {
  key: string;
  originalConfidence: number;
  userConfirmed: boolean;
}

export interface CalibrationResult {
  key: string;
  adjustedConfidence: number;
  learningType: 'calibration';
  direction: 'up' | 'down' | 'unchanged';
}

// --- Classification ---

export function classifyFinding(confidence: number): DisplayRule {
  const clamped = Math.max(1, Math.min(10, confidence));
  if (clamped >= 7) return 'show';
  if (clamped >= 5) return 'caveat';
  return 'suppress';
}

// --- Filtering ---

export function filterFindings(findings: Finding[]): ClassifiedFinding[] {
  return findings.map(f => {
    const rule = classifyFinding(f.confidence);

    // P0 findings always show regardless of confidence
    const effectiveRule = f.severity === 'P0' ? 'show' : rule;

    const result: ClassifiedFinding = {
      ...f,
      displayRule: effectiveRule,
    };

    if (effectiveRule === 'caveat') {
      result.caveatText = 'Medium confidence, verify this is actually an issue';
    }

    return result;
  });
}

// --- Calibration ---

const CALIBRATION_STEP = 2;

export function calibrate(input: CalibrationInput): CalibrationResult {
  let adjusted = input.originalConfidence;

  if (input.userConfirmed) {
    adjusted = Math.min(10, adjusted + CALIBRATION_STEP);
  } else {
    adjusted = Math.max(1, adjusted - CALIBRATION_STEP);
  }

  return {
    key: input.key,
    adjustedConfidence: adjusted,
    learningType: 'calibration',
    direction: adjusted > input.originalConfidence ? 'up'
      : adjusted < input.originalConfidence ? 'down'
      : 'unchanged',
  };
}
