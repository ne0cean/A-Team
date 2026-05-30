import { derived } from 'svelte/store';
import { createValueStore, createDataStore } from './factories.js';

export const currentYear = createValueStore(new Date().getFullYear());
export const currentMonth = createValueStore(new Date().getMonth() + 1);
export const monthData = createDataStore({ month: '', goals: {}, days: {} });
export const prevMonthData = createDataStore(null);
export const nextMonthData = createDataStore(null);
export const viewMode = createValueStore('week');

export const ym = derived([currentYear, currentMonth], ([$y, $m]) =>
  `${$y}-${String($m).padStart(2, '0')}`
);

// Drag state (calendar-scoped)
export const dragSource = createValueStore(null);
