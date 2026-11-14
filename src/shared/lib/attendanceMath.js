export function clockState(me) {
  if (!me?.open) return 'OUT';
  return me.openBreak ? 'ON_BREAK' : 'IN';
}

export const nextAction = (state) => (state === 'OUT' ? 'clock-in' : 'clock-out');

export function breakAction(state) {
  if (state === 'IN') return 'break/start';
  if (state === 'ON_BREAK') return 'break/end';
  return null;
}

export function liveWorkedMinutes(me, receivedAtMs, nowMs) {
  if (!me?.open) return 0;
  const base = me.open.workedMinutes ?? 0;
  if (me.openBreak) return base;
  return base + Math.max(0, Math.floor((nowMs - receivedAtMs) / 60_000));
}

export function splitMinutes(total) {
  const t = Math.max(0, Math.floor(Number(total) || 0));
  return { hours: Math.floor(t / 60), minutes: t % 60 };
}

const MIN_BAR_SCALE = 8 * 60;

export function weekBars(days) {
  const max = Math.max(MIN_BAR_SCALE, ...days.map((d) => d.workedMinutes));
  return days.map((d) => ({
    date: d.date,
    minutes: d.workedMinutes,
    ratio: d.workedMinutes / max,
  }));
}

export function effectiveState(serverState, pendingKinds) {
  let state = serverState;
  for (const kind of pendingKinds) {
    if (kind === 'clock-in') state = 'IN';
    else if (kind === 'clock-out') state = 'OUT';
    else if (kind === 'break/start' && state !== 'OUT') state = 'ON_BREAK';
    else if (kind === 'break/end' && state === 'ON_BREAK') state = 'IN';
  }
  return state;
}
