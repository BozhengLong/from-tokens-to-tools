// Vitest setup: repair a broken `localStorage` under jsdom on Node >= 22.
//
// Node 22+ ships an experimental native Web Storage global. Under vitest's
// jsdom environment this native `localStorage` shadows jsdom's own, but it is
// non-functional without `--localstorage-file` (its `setItem`/`clear` are
// undefined). We detect that case and install a Map-backed Storage shim.
//
// This runs per test file AFTER the environment is set up. In the global `node`
// environment there is no `window`, so it is a no-op. In a real browser the
// native localStorage is fully functional, so the guard also skips it there.

const g = globalThis as unknown as {
  window?: unknown;
  localStorage?: { clear?: unknown };
};

function makeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); },
    clear: () => { m.clear(); },
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  } as Storage;
}

if (typeof g.window !== 'undefined' && typeof g.localStorage?.clear !== 'function') {
  const ls = makeStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true, writable: true });
  Object.defineProperty(g.window, 'localStorage', { value: ls, configurable: true, writable: true });
}
