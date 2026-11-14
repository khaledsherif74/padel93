import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
const manifest = JSON.parse(
  readFileSync(new URL('../../public/manifest.webmanifest', import.meta.url), 'utf8'),
);

function fakeCache() {
  const map = new Map();
  return {
    match: async (req) => map.get(typeof req === 'string' ? req : req.url),
    put: async (req, res) => {
      map.set(typeof req === 'string' ? req : req.url, res);
    },
    add: async (req) => {
      map.set(typeof req === 'string' ? req : req.url, { ok: true });
    },
    addAll: async () => {},
    keys: async () => [...map.keys()],
    delete: async (req) => map.delete(typeof req === 'string' ? req : req.url),
  };
}

function fakeCaches() {
  const store = new Map();
  return {
    open: async (name) => {
      if (!store.has(name)) store.set(name, fakeCache());
      return store.get(name);
    },
    match: async (req) => {
      for (const cache of store.values()) {
        const hit = await cache.match(req);
        if (hit) return hit;
      }
      return undefined;
    },
    keys: async () => [...store.keys()],
    delete: async (name) => store.delete(name),
  };
}

function loadWorker() {
  const handlers = {};
  const self = {
    location: { origin: 'https://app.padel93.test' },
    addEventListener: (type, fn) => {
      handlers[type] = fn;
    },
    skipWaiting: () => {},
    clients: { claim: async () => {} },
  };
  vm.runInNewContext(source, {
    self,
    URL,
    caches: fakeCaches(),
    fetch: async () => ({
      ok: true,
      json: async () => ({}),
      clone() {
        return this;
      },
    }),
  });
  return handlers;
}

function fire(handlers, request) {
  let intercepted = false;
  handlers.fetch({ request, respondWith: () => (intercepted = true) });
  return intercepted;
}

describe('service worker safety rules', () => {
  const h = loadWorker();
  const get = (url, mode = 'no-cors') => ({ method: 'GET', url, mode });

  it('never intercepts the API, whatever the origin or method', () => {
    expect(fire(h, get('https://app.padel93.test/api/v1/attendance/me'))).toBe(false);
    expect(fire(h, get('https://api.other-host.test/api/v1/attendance/me'))).toBe(false);
    expect(
      fire(h, {
        method: 'POST',
        url: 'https://app.padel93.test/api/v1/attendance/clock-in',
        mode: 'cors',
      }),
    ).toBe(false);
    expect(
      fire(h, {
        method: 'POST',
        url: 'https://app.padel93.test/app/attendance',
        mode: 'navigate',
      }),
    ).toBe(false);
  });
  it('never intercepts other sites', () => {
    expect(fire(h, get('https://fonts.example.com/font.woff2'))).toBe(false);
  });
  it('handles page loads and built assets only', () => {
    expect(fire(h, get('https://app.padel93.test/app/attendance', 'navigate'))).toBe(true);
    expect(fire(h, get('https://app.padel93.test/assets/index-abc123.js'))).toBe(true);
    expect(fire(h, get('https://app.padel93.test/manifest.webmanifest'))).toBe(false);
  });
});

describe('web app manifest', () => {
  it('is installable: name, start url, standalone, and 192 / 512 / maskable icons', () => {
    expect(manifest.start_url).toBe('/app');
    expect(manifest.display).toBe('standalone');
    const sizes = manifest.icons.map((i) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toEqual(
      expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']),
    );
  });
});
