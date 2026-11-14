import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { offlineStore } from '../../shared/lib/offlineStore';
import { replayQueue } from '../../shared/lib/offlineQueue';
import { sendEntry } from './sendEntry';

export function useAttendanceSync(userId) {
  const dispatch = useDispatch();
  const [entries, setEntries] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [stopped, setStopped] = useState(null);
  const running = useRef(false);

  const refresh = useCallback(async () => setEntries(await offlineStore.list()), []);

  const sync = useCallback(async () => {
    if (!userId || running.current) return null;
    running.current = true;
    setSyncing(true);
    try {
      const res = await replayQueue({
        store: offlineStore,
        userId,
        send: (entry) => sendEntry(entry, dispatch),
      });
      setStopped(res.stopped);
      return res;
    } finally {
      running.current = false;
      setSyncing(false);
      await refresh();
    }
  }, [userId, dispatch, refresh]);

  useEffect(() => {
    refresh();
    sync();
    const onOnline = () => sync();
    const onVisible = () => document.visibilityState === 'visible' && sync();
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, sync]);

  const enqueue = useCallback(
    async (entry) => {
      await offlineStore.add(entry);
      await refresh();
      await sync();
      return (await offlineStore.list()).find((e) => e.id === entry.id) ?? null;
    },
    [refresh, sync],
  );

  const dismiss = useCallback(
    async (id) => {
      await offlineStore.remove(id);
      await refresh();
    },
    [refresh],
  );

  const mine = entries.filter((e) => e.userId === userId);
  return {
    pending: mine
      .filter((e) => e.state === 'pending')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    failed: mine.filter((e) => e.state === 'failed'),
    syncing,
    stopped,
    sync,
    enqueue,
    dismiss,
  };
}
