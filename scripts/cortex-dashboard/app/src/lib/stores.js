import { writable, derived } from 'svelte/store';

// Calendar state
export const currentYear = writable(new Date().getFullYear());
export const currentMonth = writable(new Date().getMonth() + 1);
export const monthData = writable({ month: '', goals: {}, days: {} });
export const prevMonthData = writable(null);
export const nextMonthData = writable(null);
export const viewMode = writable('month');

// Computed ym
export const ym = derived([currentYear, currentMonth], ([$y, $m]) =>
  `${$y}-${String($m).padStart(2, '0')}`
);

// Sidebar
export const sidebarOpen = writable(false);
export const cortexPath = writable('cortex');

// Note viewer
export const activeNote = writable(null);
export const noteEditing = writable(false);

// Standing data (loaded once)
export const standingData = writable(null);
export const dayFrames = writable(null);
export const visionData = writable(null);
export const recurringData = writable(null);

// Search
export const searchOpen = writable(false);

// Drag state
export const dragSource = writable(null);

// Constants
export const CATS = ['ritual', 'input', 'work', 'outcome'];
export const CAT_NAMES = { ritual: 'R&R', input: 'Input', work: 'Work', outcome: 'Out' };
export const CAT_COLORS = { ritual: '#f0c040', input: '#58a6ff', work: '#56d364', outcome: '#bc8cff' };
export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
export const TYPES = ['block', 'flow', 'hf', 'vacation'];
export const TYPE_LABELS = { block: 'BLOCK', flow: 'FLOW', hf: 'HF', vacation: '휴가' };
export const TYPE_COLORS = { block: '#58a6ff', flow: '#56d364', hf: '#f0c040', vacation: '#bc8cff' };
export const TYPE_BG = { block: 'badge-block', flow: 'badge-flow', hf: 'badge-hf', vacation: 'badge-vacation' };
