import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { CAIRO_ZONE, businessDate, currentMonth } from './date';

describe('Cairo business dates', () => {
  it('assigns the 03:59 slot to the previous business day', () => {
    const value = DateTime.fromISO('2026-10-08T03:59:00', { zone: CAIRO_ZONE });
    expect(businessDate(value)).toBe('2026-10-07');
  });

  it('starts the new business day at 04:00 Cairo time', () => {
    const value = DateTime.fromISO('2026-10-08T04:00:00', { zone: CAIRO_ZONE });
    expect(businessDate(value)).toBe('2026-10-08');
  });

  it('returns the Cairo calendar month format', () => {
    const month = currentMonth();
    expect(month).toMatch(/^\d{4}-\d{2}$/);
  });
});
