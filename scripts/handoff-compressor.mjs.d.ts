// RFC-002 Handoff Compression — TypeScript declarations

export interface Handoff5Layer {
  facts: string;
  story: string;
  reasoning: string;
  action: string;
  caution: string;
}

export interface CompressResult {
  mode: 'passthrough' | '5layer';
  output: string;
  layers?: Handoff5Layer;
}

export function parseCurrentMd(md: string): Record<string, string>;

export function compress5Layer(currentMd: string): CompressResult;

export function formatHandoff(layers: Handoff5Layer): string;
