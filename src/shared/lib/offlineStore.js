const DB_NAME = 'padel93-attendance';
const STORE = 'queue';

const memory = new Map();
let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') return resolve(null);
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
      return undefined;
    });
  }
  return dbPromise;
}

async function run(mode, fn) {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const offlineStore = {
  async list() {
    const rows = await run('readonly', (s) => s.getAll());
    return rows ?? [...memory.values()];
  },
  async add(entry) {
    const done = await run('readwrite', (s) => s.put(entry));
    if (done === null) memory.set(entry.id, entry);
  },
  async update(id, patch) {
    const db = await openDb();
    if (!db) {
      memory.set(id, { ...memory.get(id), ...patch });
      return;
    }
    await run('readwrite', (s) => {
      const get = s.get(id);
      get.onsuccess = () => {
        if (get.result) s.put({ ...get.result, ...patch });
      };
      return get;
    });
  },
  async remove(id) {
    const done = await run('readwrite', (s) => s.delete(id));
    if (done === null) memory.delete(id);
  },
};
