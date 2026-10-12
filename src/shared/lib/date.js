import { DateTime } from 'luxon';

export const CAIRO_ZONE = 'Africa/Cairo';

export function nowCairo() {
  return DateTime.now().setZone(CAIRO_ZONE);
}

export function businessDate(dateTime = nowCairo(), closeTime = '04:00') {
  const value = DateTime.isDateTime(dateTime)
    ? dateTime.setZone(CAIRO_ZONE)
    : DateTime.fromJSDate(dateTime, { zone: CAIRO_ZONE });

  const [hour, minute] = closeTime.split(':').map(Number);
  const boundary = value.startOf('day').set({
    hour,
    minute,
    second: 0,
    millisecond: 0,
  });

  return (value < boundary ? value.minus({ days: 1 }) : value).toFormat('yyyy-LL-dd');
}

export function currentMonth() {
  return nowCairo().toFormat('yyyy-LL');
}

export function formatDateTime(value, locale = 'ar-EG') {
  if (!value) return '—';

  const dt = DateTime.fromISO(value, { zone: CAIRO_ZONE });
  if (!dt.isValid) return String(value);

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: CAIRO_ZONE,
  }).format(dt.toJSDate());
}

export function formatTime(value, locale = 'ar-EG') {
  if (!value) return '—';

  const dt = DateTime.fromISO(value, { zone: CAIRO_ZONE });
  if (!dt.isValid) return String(value);

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: CAIRO_ZONE,
  }).format(dt.toJSDate());
}
