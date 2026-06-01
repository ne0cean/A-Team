export const CATS = ['ritual', 'input', 'work', 'hexagonal', 'outcome'];
export const DEFAULT_CAT_NAMES = { ritual: 'R&R', input: 'Input', work: 'Work', hexagonal: '6 Pillars', outcome: 'Outcome' };
export let CAT_NAMES = { ...DEFAULT_CAT_NAMES };
export function setCatNames(names) { Object.assign(CAT_NAMES, names); }
export const CAT_COLORS = { ritual: '#f0c040', input: '#58a6ff', work: '#56d364', hexagonal: '#f85149', outcome: '#bc8cff' };
export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
export const TYPES = ['block', 'flow', 'hf', 'vacation'];
export const TYPE_LABELS = { block: 'BLOCK', flow: 'FLOW', hf: 'HF', vacation: '휴가' };
export const TYPE_COLORS = { block: '#58a6ff', flow: '#56d364', hf: '#f0c040', vacation: '#bc8cff' };
export const TYPE_BG = { block: 'badge-block', flow: 'badge-flow', hf: 'badge-hf', vacation: 'badge-vacation' };
