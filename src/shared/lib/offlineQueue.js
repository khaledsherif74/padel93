export const MAX_QUEUE = 50;

export function classifyStatus(status) {
  if (typeof status === 'number' && status >= 200 && status < 300) return 'ok';
  if (status === 401) return 'auth';
  if (
    typeof status === 'number' &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429
  )
    return 'reject';
  return 'retry';
}

export function makeEntry({ userId, kind, payload, photo = null, now = new Date(), id }) {
  return { id, userId, kind, payload, photo, createdAt: now.toISOString(), state: 'pending' };
}

export const canEnqueue = (entries, userId) =>
  entries.filter((e) => e.userId === userId).length < MAX_QUEUE;

export function planReplay(entries, userId) {
  return entries
    .filter((e) => e.userId === userId && e.state === 'pending')
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

export async function replayQueue({ store, userId, send }) {
  const out = { sent: 0, failed: 0, stopped: null };
  for (const entry of planReplay(await store.list(), userId)) {
    let res;
    try {
      res = await send(entry);
    } catch {
      out.stopped = 'network';
      return out;
    }
    const kind = classifyStatus(res?.status);
    if (kind === 'ok') {
      await store.remove(entry.id);
      out.sent += 1;
    } else if (kind === 'reject') {
      await store.update(entry.id, {
        state: 'failed',
        error: res.error ?? { code: 'REJECTED', message: `HTTP ${res.status}` },
      });
      out.failed += 1;
    } else {
      out.stopped = kind === 'auth' ? 'auth' : 'network';
      return out;
    }
  }
  return out;
}
