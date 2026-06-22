// Global test setup: jest-dom matchers + a defensive teardown so no test leaks a
// matchMedia mock, a spy, or a fake-timer install into the next one.
//
// @testing-library/react auto-registers its own afterEach cleanup when a global
// afterEach exists (vitest `globals: true`), so we don't import it here — keeping
// this file safe to load in the node-environment SSR test too.
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

// jsdom ships no `AnimationEvent`, so react-dom's startup feature-detection falls
// back to the vendor-prefixed `webkitAnimationEnd` and `onAnimationEnd` never
// fires for a standard `animationend`. Presets are CSS-animation-driven, so we
// polyfill it BEFORE react-dom initializes (setup runs before the test imports).
if (typeof globalThis.AnimationEvent === 'undefined') {
  class PolyfilledAnimationEvent extends Event {
    animationName: string;
    elapsedTime: number;
    pseudoElement: string;
    constructor(type: string, init: AnimationEventInit = {}) {
      super(type, init);
      this.animationName = init.animationName ?? '';
      this.elapsedTime = init.elapsedTime ?? 0;
      this.pseudoElement = init.pseudoElement ?? '';
    }
  }
  globalThis.AnimationEvent =
    PolyfilledAnimationEvent as unknown as typeof AnimationEvent;
}

// Install a deterministic, spyable in-memory Web Storage — UNCONDITIONALLY.
// jsdom's storage varies by environment: absent (local, opaque origin) OR a real
// host Proxy (CI, when an origin is configured) whose methods can't be shadowed by
// `vi.spyOn(instance, ...)`. Overriding it with a plain object (own-property
// methods) makes both spies and outcomes behave identically everywhere, so the
// /policy tests don't pass-local/fail-CI.
function makeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      m.set(k, String(v));
    },
    removeItem: (k: string) => {
      m.delete(k);
    },
    key: (i: number) => Array.from(m.keys())[i] ?? null,
  } as Storage;
}
if (typeof window !== 'undefined') {
  for (const kind of ['localStorage', 'sessionStorage'] as const) {
    try {
      Object.defineProperty(window, kind, {
        value: makeStorage(),
        configurable: true,
        writable: true,
      });
    } catch {
      /* non-configurable in this engine — tests are outcome-based, so this is OK */
    }
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  if (typeof window !== 'undefined') {
    delete (window as { matchMedia?: unknown }).matchMedia;
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  }
});
