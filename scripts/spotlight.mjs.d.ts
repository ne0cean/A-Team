// RFC-007 Spotlighting — TypeScript declarations

export function getSessionMarker(): string;

export function applyDelimiting(content: string, source?: string): string;

export function applyDatamarking(content: string, source?: string): string;

export function getSpotlightMode():
  | 'delimiting'
  | 'datamarking'
  | 'encoding'
  | null;

export function spotlight(
  content: string,
  options?: { source?: string; isUntrusted?: boolean }
): string;

export function isUntrustedTool(toolName: string): boolean;
