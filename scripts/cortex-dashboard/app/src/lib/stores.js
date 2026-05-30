import { writable, derived } from 'svelte/store';

// --- Store factories ---

function createValueStore(initial) {
  const { subscribe, set } = writable(initial);
  return { subscribe, set };
}

function createToggleStore(initial = false) {
  const { subscribe, set, update } = writable(initial);
  return {
    subscribe,
    set,
    toggle() { update(v => !v); },
  };
}

function createDataStore(initial) {
  const { subscribe, update, set } = writable(initial);
  return {
    subscribe,
    load(data) { set(data); },
    mutate(fn) { update(s => { fn(s); return s; }); },
  };
}

// --- Calendar ---
export const currentYear = createValueStore(new Date().getFullYear());
export const currentMonth = createValueStore(new Date().getMonth() + 1);
export const monthData = createDataStore({ month: '', goals: {}, days: {} });
export const prevMonthData = createDataStore(null);
export const nextMonthData = createDataStore(null);
export const viewMode = createValueStore('week');

export const ym = derived([currentYear, currentMonth], ([$y, $m]) =>
  `${$y}-${String($m).padStart(2, '0')}`
);

// --- Sidebar ---
export const sidebarOpen = createToggleStore(false);
export const cortexPath = createValueStore('cortex');

// --- Note viewer ---
export const activeNote = createValueStore(null);
export const noteEditing = createToggleStore(false);

// --- Standing data (loaded once, mutated via panels) ---
export const standingData = createDataStore(null);
export const dayFrames = createDataStore(null);
export const visionData = createDataStore(null);
export const recurringData = createDataStore(null);

// --- Search ---
export const searchOpen = createToggleStore(false);

// --- Drag ---
export const dragSource = createValueStore(null);

// --- Constants ---
export const CATS = ['ritual', 'input', 'work', 'outcome'];
export const CAT_NAMES = { ritual: 'R&R', input: 'Input', work: 'Work', outcome: 'Out' };
export const CAT_COLORS = { ritual: '#f0c040', input: '#58a6ff', work: '#56d364', outcome: '#bc8cff' };
export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
export const TYPES = ['block', 'flow', 'hf', 'vacation'];
export const TYPE_LABELS = { block: 'BLOCK', flow: 'FLOW', hf: 'HF', vacation: '휴가' };
export const TYPE_COLORS = { block: '#58a6ff', flow: '#56d364', hf: '#f0c040', vacation: '#bc8cff' };
export const TYPE_BG = { block: 'badge-block', flow: 'badge-flow', hf: 'badge-hf', vacation: 'badge-vacation' };
