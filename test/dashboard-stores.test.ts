import { describe, it, expect } from 'vitest';

// Inline get() — svelte/store is only in dashboard app's node_modules
function get(store: { subscribe: (fn: (v: any) => void) => any }) {
  let value: any;
  store.subscribe((v: any) => { value = v; })();
  return value;
}

// Test factories directly
import { createValueStore, createToggleStore, createDataStore } from '../scripts/cortex-dashboard/app/src/lib/stores/factories.js';

describe('Store factories', () => {
  describe('createValueStore', () => {
    it('has subscribe and set', () => {
      const store = createValueStore(42);
      expect(store.subscribe).toBeTypeOf('function');
      expect(store.set).toBeTypeOf('function');
      expect(get(store)).toBe(42);
    });

    it('set updates value', () => {
      const store = createValueStore('a');
      store.set('b');
      expect(get(store)).toBe('b');
    });

    it('does not expose update', () => {
      const store = createValueStore(0);
      expect((store as any).update).toBeUndefined();
    });
  });

  describe('createToggleStore', () => {
    it('has subscribe, set, toggle', () => {
      const store = createToggleStore(false);
      expect(store.subscribe).toBeTypeOf('function');
      expect(store.set).toBeTypeOf('function');
      expect(store.toggle).toBeTypeOf('function');
    });

    it('toggle flips value', () => {
      const store = createToggleStore(false);
      store.toggle();
      expect(get(store)).toBe(true);
      store.toggle();
      expect(get(store)).toBe(false);
    });
  });

  describe('createDataStore', () => {
    it('has subscribe, load, mutate — no set', () => {
      const store = createDataStore({ items: [] });
      expect(store.subscribe).toBeTypeOf('function');
      expect(store.load).toBeTypeOf('function');
      expect(store.mutate).toBeTypeOf('function');
      expect((store as any).set).toBeUndefined();
    });

    it('load replaces data', () => {
      const store = createDataStore(null);
      store.load({ name: 'test' });
      expect(get(store)).toEqual({ name: 'test' });
    });

    it('mutate modifies in place', () => {
      const store = createDataStore({ items: [1, 2, 3] });
      store.mutate(s => { s.items.push(4); });
      expect(get(store).items).toEqual([1, 2, 3, 4]);
    });

    it('mutate triggers subscribers', () => {
      const store = createDataStore({ count: 0 });
      let calls = 0;
      store.subscribe(() => { calls++; });
      const before = calls;
      store.mutate(s => { s.count++; });
      expect(calls).toBe(before + 1);
    });

    it('deep mutation is contained within mutate', () => {
      const store = createDataStore({ days: { '1': { ritual: [{ text: 'a', done: false }] } } });
      store.mutate(s => {
        s.days['1'].ritual[0].done = true;
      });
      expect(get(store).days['1'].ritual[0].done).toBe(true);
    });
  });
});

describe('Barrel export', () => {
  // Dynamic import to resolve svelte from dashboard's node_modules
  let stores: any;

  it('loads barrel export', async () => {
    stores = await import('../scripts/cortex-dashboard/app/src/lib/stores.js');
  });

  it('exports calendar stores with correct API', async () => {
    if (!stores) stores = await import('../scripts/cortex-dashboard/app/src/lib/stores.js');
    expect(stores.currentYear.set).toBeTypeOf('function');
    expect(stores.monthData.load).toBeTypeOf('function');
    expect(stores.monthData.mutate).toBeTypeOf('function');
    expect((stores.monthData as any).set).toBeUndefined();
    expect(stores.viewMode.set).toBeTypeOf('function');
    expect(stores.dragSource.set).toBeTypeOf('function');
  });

  it('exports standing stores as DataStore (no set)', async () => {
    if (!stores) stores = await import('../scripts/cortex-dashboard/app/src/lib/stores.js');
    for (const name of ['standingData', 'dayFrames', 'visionData', 'recurringData']) {
      expect(stores[name].load).toBeTypeOf('function');
      expect(stores[name].mutate).toBeTypeOf('function');
      expect((stores[name] as any).set).toBeUndefined();
    }
  });

  it('exports UI stores with toggle', async () => {
    if (!stores) stores = await import('../scripts/cortex-dashboard/app/src/lib/stores.js');
    expect(stores.sidebarOpen.toggle).toBeTypeOf('function');
    expect(stores.searchOpen.toggle).toBeTypeOf('function');
    expect(stores.noteEditing.toggle).toBeTypeOf('function');
    expect(stores.activeNote.set).toBeTypeOf('function');
  });

  it('exports constants', async () => {
    if (!stores) stores = await import('../scripts/cortex-dashboard/app/src/lib/stores.js');
    expect(stores.CATS).toEqual(['ritual', 'input', 'work', 'outcome']);
    expect(stores.DAY_NAMES).toHaveLength(7);
    expect(stores.TYPES).toHaveLength(4);
  });
});

describe('Encapsulation enforcement', () => {
  it('DataStore prevents $store = value pattern', () => {
    const store = createDataStore({ x: 1 });
    // set is not exposed — $store = value would fail at runtime
    expect((store as any).set).toBeUndefined();
    // Only load() and mutate() can change state
    store.load({ x: 2 });
    expect(get(store)).toEqual({ x: 2 });
    store.mutate(s => { s.x = 3; });
    expect(get(store)).toEqual({ x: 3 });
  });

  it('ValueStore allows $store = value pattern', () => {
    const store = createValueStore(0);
    expect(store.set).toBeTypeOf('function');
    store.set(99);
    expect(get(store)).toBe(99);
  });
});
