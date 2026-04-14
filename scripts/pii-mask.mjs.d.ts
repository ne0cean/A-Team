export function isObsMaskEnabled(): boolean;

export function maskPII(text: string): string;

export function pipelineForTrace(
  content: string,
  options?: {
    source?: string;
    isUntrusted?: boolean;
    spotlight?: (text: string, opts: { source: string; isUntrusted: boolean }) => string;
  }
): string;
