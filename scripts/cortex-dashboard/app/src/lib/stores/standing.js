import { writable } from 'svelte/store';
import { createDataStore } from './factories.js';

export const standingData = createDataStore(null);
export const dayFrames = createDataStore(null);
export const visionData = createDataStore(null);
export const recurringData = createDataStore(null);
// workout-log: { "2026-06-01": ["전면","가슴"], ... } — independent of monthly data
export const workoutLog = writable({});
