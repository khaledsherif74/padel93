import { DateTime } from 'luxon';

const FORMAT = "yyyy-LL-dd'T'HH:mm";
const ZONE = 'Africa/Cairo';

export function toInputValue(iso) {
  if (!iso) return '';
  const dt = DateTime.fromISO(iso, { zone: ZONE });
  return dt.isValid ? dt.toFormat(FORMAT) : '';
}

export function fromInputValue(value) {
  if (!value) return null;
  const dt = DateTime.fromFormat(value, FORMAT, { zone: ZONE });
  return dt.isValid ? dt.toUTC().toISO() : null;
}
