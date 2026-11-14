import { DateTime } from 'luxon';

export function weekStart(date) {
  const d = DateTime.fromISO(date, { zone: 'utc' });
  return d.minus({ days: (d.weekday - 6 + 7) % 7 }).toISODate();
}

export const weekDates = (start) =>
  Array.from({ length: 7 }, (_, i) =>
    DateTime.fromISO(start, { zone: 'utc' }).plus({ days: i }).toISODate(),
  );

const mins = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const isOvernight = (start, end) => mins(end) <= mins(start);

export function shiftHours(start, end) {
  const diff = mins(end) - mins(start);
  return (diff > 0 ? diff : diff + 24 * 60) / 60;
}

export function groupByUserAndDate(items) {
  const out = {};
  for (const s of items) ((out[s.userId] ??= {})[s.date] ??= []).push(s);
  for (const days of Object.values(out))
    for (const list of Object.values(days))
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return out;
}
