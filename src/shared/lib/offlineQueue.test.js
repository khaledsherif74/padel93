import { describe, expect, it } from 'vitest';
import {
  canEnqueue,
  classifyStatus,
  makeEntry,
  MAX_QUEUE,
  planReplay,
  replayQueue,
} from './offlineQueue';

function memoryStore(initial = []) {
  const rows = new Map(initial.map((e) => [e.id, { ...e }]));
  return {
    rows,
    list: async () => [...rows.values()],
    remove: async (id) => void rows.delete(id),
    update: async (id, patch) => void rows.set(id, { ...rows.get(id), ...patch }),
  };
}
const e = (id, userId, createdAt, over = {}) => ({
  id,
  userId,
  kind: 'clock-in',
  createdAt,
  state: 'pending',
  payload: {},
  ...over,
});

describe('classifyStatus', () => {
  it('2xx is ok, network and server trouble retry, 401 needs login, other 4xx is final', () => {
    expect(classifyStatus(200)).toBe('ok');
    expect(classifyStatus(201)).toBe('ok');
    for (const s of [0, undefined, 'FETCH_ERROR', 408, 429, 500, 502, 503])
      expect(classifyStatus(s)).toBe('retry');
    expect(classifyStatus(401)).toBe('auth');
    for (const s of [400, 403, 404, 409, 413, 415, 422]) expect(classifyStatus(s)).toBe('reject');
  });
});

describe('planReplay', () => {
  it('keeps only this user, only pending, oldest tap first', () => {
    const rows = [
      e('c', 'u1', '2026-11-12T20:00:00Z'),
      e('a', 'u1', '2026-11-12T16:00:00Z'),
      e('x', 'u2', '2026-11-12T15:00:00Z'),
      e('f', 'u1', '2026-11-12T10:00:00Z', { state: 'failed' }),
    ];
    expect(planReplay(rows, 'u1').map((r) => r.id)).toEqual(['a', 'c']);
    expect(planReplay(rows, 'nobody')).toEqual([]);
  });
});

describe('replayQueue', () => {
  const ok = async () => ({ status: 200 });

  it('sends in order, removes what succeeded, and never touches another user', async () => {
    const store = memoryStore([
      e('b', 'u1', '2026-11-12T18:00:00Z'),
      e('a', 'u1', '2026-11-12T16:00:00Z'),
      e('z', 'u2', '2026-11-12T15:00:00Z'),
    ]);
    const order = [];
    const res = await replayQueue({
      store,
      userId: 'u1',
      send: async (x) => (order.push(x.id), { status: 201 }),
    });
    expect(order).toEqual(['a', 'b']);
    expect(res).toEqual({ sent: 2, failed: 0, stopped: null });
    expect([...store.rows.keys()]).toEqual(['z']);
  });

  it('stops at the first network problem and keeps the rest for later', async () => {
    const store = memoryStore([
      e('a', 'u1', '2026-11-12T16:00:00Z'),
      e('b', 'u1', '2026-11-12T17:00:00Z'),
      e('c', 'u1', '2026-11-12T18:00:00Z'),
    ]);
    let n = 0;
    const res = await replayQueue({
      store,
      userId: 'u1',
      send: async () => (++n === 2 ? { status: 0 } : { status: 200 }),
    });
    expect(res).toEqual({ sent: 1, failed: 0, stopped: 'network' });
    expect([...store.rows.keys()]).toEqual(['b', 'c']);
    expect(store.rows.get('b').state).toBe('pending');
  });

  it('stops on 401 and keeps everything, so the person can log in again and continue', async () => {
    const store = memoryStore([
      e('a', 'u1', '2026-11-12T16:00:00Z'),
      e('b', 'u1', '2026-11-12T17:00:00Z'),
    ]);
    const res = await replayQueue({ store, userId: 'u1', send: async () => ({ status: 401 }) });
    expect(res).toEqual({ sent: 0, failed: 0, stopped: 'auth' });
    expect(store.rows.size).toBe(2);
  });

  it('a final rejection is marked failed with the server reason, kept, and the rest continues', async () => {
    const store = memoryStore([
      e('a', 'u1', '2026-11-12T16:00:00Z'),
      e('b', 'u1', '2026-11-12T17:00:00Z'),
    ]);
    const res = await replayQueue({
      store,
      userId: 'u1',
      send: async (x) =>
        x.id === 'a'
          ? { status: 422, error: { code: 'OUT_OF_RANGE', message: 'You are not at the court.' } }
          : { status: 200 },
    });
    expect(res).toEqual({ sent: 1, failed: 1, stopped: null });
    expect(store.rows.get('a')).toMatchObject({ state: 'failed', error: { code: 'OUT_OF_RANGE' } });
    expect(store.rows.has('b')).toBe(false);
    const again = await replayQueue({ store, userId: 'u1', send: ok });
    expect(again).toEqual({ sent: 0, failed: 0, stopped: null });
  });

  it('a thrown error from send counts as a network problem, not a lost tap', async () => {
    const store = memoryStore([e('a', 'u1', '2026-11-12T16:00:00Z')]);
    const res = await replayQueue({
      store,
      userId: 'u1',
      send: async () => {
        throw new Error('boom');
      },
    });
    expect(res.stopped).toBe('network');
    expect(store.rows.size).toBe(1);
  });
});

describe('makeEntry / canEnqueue', () => {
  it('binds the tap to the person and the tap time', () => {
    const entry = makeEntry({
      userId: 'u1',
      kind: 'clock-out',
      payload: { lat: 1, lng: 2, accuracyM: 3 },
      photo: 'blob',
      now: new Date('2026-11-12T20:00:00Z'),
      id: 'req-1',
    });
    expect(entry).toMatchObject({
      id: 'req-1',
      userId: 'u1',
      kind: 'clock-out',
      createdAt: '2026-11-12T20:00:00.000Z',
      state: 'pending',
      photo: 'blob',
    });
  });
  it('caps how much one person can queue', () => {
    const many = Array.from({ length: MAX_QUEUE }, (_, i) =>
      e(`i${i}`, 'u1', '2026-11-12T16:00:00Z'),
    );
    expect(canEnqueue(many, 'u1')).toBe(false);
    expect(canEnqueue(many, 'u2')).toBe(true);
    expect(canEnqueue(many.slice(1), 'u1')).toBe(true);
  });
});
