/**
 * Post-Edit Quality Gate — Auto-detect residual debug code after edits
 *
 * Checks: console.log, debugger, TODO/FIXME, large files, long lines.
 * Designed to run as a PostToolUse hook after Edit/Write.
 */

export type IssueType = 'console' | 'debugger' | 'todo' | 'large-file' | 'long-line';

export interface QualityIssue {
  type: IssueType;
  file: string;
  line?: number;
  message: string;
}

export function detectDebugCode(content: string, file: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // console.log / console.dir / console.debug (but not console.error/warn)
    if (/\bconsole\.(log|dir|debug|trace|table)\b/.test(line)) {
      issues.push({ type: 'console', file, line: lineNum, message: `console statement at line ${lineNum}` });
    }

    // debugger
    if (/\bdebugger\b/.test(line) && !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*')) {
      issues.push({ type: 'debugger', file, line: lineNum, message: `debugger statement at line ${lineNum}` });
    }

    // TODO / FIXME
    if (/\b(TODO|FIXME)\b/.test(line)) {
      issues.push({ type: 'todo', file, line: lineNum, message: `${line.includes('TODO') ? 'TODO' : 'FIXME'} at line ${lineNum}` });
    }
  }

  return issues;
}

export function checkFileQuality(content: string, file: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const lines = content.split('\n');

  if (lines.length > 500) {
    issues.push({ type: 'large-file', file, message: `${lines.length} lines (>500)` });
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 200) {
      issues.push({ type: 'long-line', file, line: i + 1, message: `line ${i + 1} is ${lines[i].length} chars (>200)` });
      break; // report only first occurrence
    }
  }

  return issues;
}
