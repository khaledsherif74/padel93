import { describe, expect, it } from 'vitest';
import { groupBookings, isCancelledBooking, isPaidBooking } from './bookingGroups';

const NOW = new Date('2026-11-11T12:00:00Z').getTime();
const at = (hours) => new Date(NOW + hours * 3600_000).toISOString();
const b = (id, startH, endH, extra = {}) => ({
  id,
  startsAt: at(startH),
  endsAt: at(endH),
  bookingStatus: 'APPROVED',
  removedFromBookly: false,
  payment: { state: 'UNPAID', expected: 30000, collected: 0, due: 30000 },
  ...extra,
});
const paid = { payment: { state: 'PAID', expected: 30000, collected: 30000, due: 0 } };
const partial = { payment: { state: 'PARTIAL', expected: 30000, collected: 10000, due: 20000 } };

describe('booking state helpers', () => {
  it('detects paid, free-with-no-collection and cancelled', () => {
    expect(isPaidBooking(b('a', 1, 2, paid))).toBe(true);
    expect(isPaidBooking(b('a', 1, 2, partial))).toBe(false);
    expect(isPaidBooking(b('a', 1, 2, { payment: { state: 'UNPAID', expected: 0, collected: 0, due: 0 } }))).toBe(true);
    expect(isCancelledBooking(b('a', 1, 2, { bookingStatus: 'CANCELLED' }))).toBe(true);
    expect(isCancelledBooking(b('a', 1, 2, { bookingStatus: 'REJECTED' }))).toBe(true);
    expect(isCancelledBooking(b('a', 1, 2, { removedFromBookly: true }))).toBe(true);
    expect(isCancelledBooking(b('a', 1, 2))).toBe(false);
  });
});

describe('groupBookings', () => {
  it('unpaid and partial first by start time, paid and cancelled in their own sections', () => {
    const rows = [
      b('late-unpaid', 5, 6),
      b('paid-early', 1, 2, paid),
      b('cancelled', 2, 3, { bookingStatus: 'CANCELLED' }),
      b('partial-soon', 3, 4, partial),
    ];
    const g = groupBookings(rows, { now: NOW, isToday: true });
    expect(g.active.map((x) => x.id)).toEqual(['partial-soon', 'late-unpaid']);
    expect(g.paid.map((x) => x.id)).toEqual(['paid-early']);
    expect(g.cancelled.map((x) => x.id)).toEqual(['cancelled']);
  });

  it('on the live day an ended unpaid booking leaves the active list, but paid and cancelled stay for the day', () => {
    const rows = [b('ended-unpaid', -3, -2), b('ended-paid', -4, -3, paid), b('ended-cancelled', -5, -4, { bookingStatus: 'REJECTED' })];
    const g = groupBookings(rows, { now: NOW, isToday: true });
    expect(g.active).toEqual([]);
    expect(g.paid.map((x) => x.id)).toEqual(['ended-paid']);
    expect(g.cancelled.map((x) => x.id)).toEqual(['ended-cancelled']);
  });

  it('on a past day nothing is hidden by the clock', () => {
    const g = groupBookings([b('old', -30, -29)], { now: NOW, isToday: false });
    expect(g.active.map((x) => x.id)).toEqual(['old']);
  });
});
