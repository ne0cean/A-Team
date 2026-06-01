import { writable } from 'svelte/store';

export function createValueStore(initial) {
  const { subscribe, set } = writable(initial);
  return { subscribe, set };
}

export function createToggleStore(initial = false) {
  const { subscribe, set, update } = writable(initial);
  return {
    subscribe,
    set,
    toggle() { update(v => !v); },
  };
}

export function createDataStore(initial) {
  const { subscribe, update, set } = writable(initial);
  return {
    subscribe,
    load(data) { set(data); },
    mutate(fn) { update(s => { fn(s); return s; }); },
  };
}
