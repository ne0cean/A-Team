/**
 * Config Protection — Block modifications to linter/formatter configs
 *
 * Steers agent to fix code instead of weakening configs.
 * Designed as a PreToolUse hook for Write/Edit.
 */

import * as path from 'path';

const PROTECTED_PATTERNS = [
  // ESLint
  /^\.eslintrc(\.(js|cjs|mjs|json|yml|yaml))?$/,
  /^eslint\.config\.(js|cjs|mjs|ts)$/,
  // Prettier
  /^\.prettierrc(\.(js|cjs|mjs|json|yml|yaml))?$/,
  /^prettier\.config\.(js|cjs|mjs)$/,
  // TypeScript
  /^tsconfig(\.[a-z]+)?\.json$/,
  // Biome
  /^biome\.jsonc?$/,
  // Stylelint
  /^\.stylelintrc(\.(js|cjs|mjs|json|yml|yaml))?$/,
  // EditorConfig
  /^\.editorconfig$/,
];

export function isProtectedConfig(filePath: string): boolean {
  const basename = path.basename(filePath);
  return PROTECTED_PATTERNS.some(p => p.test(basename));
}

export interface ProtectionResult {
  blocked: boolean;
  file: string;
  message: string;
}

export function getProtectionMessage(filePath: string): string {
  const basename = path.basename(filePath);

  if (/eslint/i.test(basename)) {
    return `Blocked: ${basename} is a linter config. Fix the code to pass eslint rules instead of weakening the config.`;
  }
  if (/prettier/i.test(basename)) {
    return `Blocked: ${basename} is a formatter config. Fix the code formatting instead of changing prettier rules.`;
  }
  if (/tsconfig/i.test(basename)) {
    return `Blocked: ${basename} is a TypeScript config. Fix type errors in the code instead of loosening tsconfig.`;
  }
  if (/biome/i.test(basename)) {
    return `Blocked: ${basename} is a Biome config. Fix the code to pass Biome rules instead of weakening the config.`;
  }
  return `Blocked: ${basename} is a protected config file. Fix the code instead of modifying the config.`;
}
