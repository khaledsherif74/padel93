import { describe, expect, it } from 'vitest';
import {
  getAppointmentPaymentStatus,
  getClosingRowPaymentStatus,
  getPaymentStatus,
  isBookingStarted,
  paymentStatusStyle,
  summarizeUnpaid,
} from './paymentStatus';

describe('getPaymentStatus', () => {
  it('paid and overpaid are PAID', () => {
    expect(getPaymentStatus({ state: 'PAID', due: 0 })).toBe('PAID');
    expect(getPaymentStatus({ state: 'OVERPAID', due: -500 })).toBe('PAID');
  });
  it('partial = something collected, something due', () => {
    expect(getPaymentStatus({ state: 'PARTIAL', collected: 100, due: 200 })).toBe('PARTIAL');
  });
  it('nothing collected is UNPAID', () => {
    expect(getPaymentStatus({ state: 'UNPAID', collected: 0, due: 300 })).toBe('UNPAID');
  });
  it('on-account wins over unpaid', () => {
    expect(getPaymentStatus({ state: 'ON_ACCOUNT', collected: 0, due: 300 })).toBe('ON_ACCOUNT');
  });
  it('a free booking with nothing to collect counts as PAID', () => {
    expect(getPaymentStatus({ state: 'UNPAID', due: 0, free: true })).toBe('PAID');
  });
});

describe('adapters', () => {
  it('appointment (staff card shape)', () => {
    expect(getAppointmentPaymentStatus({ payment: { state: 'UNPAID', expected: 0, collected: 0, due: 0 } })).toBe('PAID');
    expect(
      getAppointmentPaymentStatus({
        payment: { state: 'UNPAID', expected: 30000, collected: 0, due: 0 },
        reward: { hoursUsed: 2, courtCollectAmount: 0 },
      }),
    ).toBe('PAID');
    expect(getAppointmentPaymentStatus({ payment: { state: 'PARTIAL', expected: 30000, collected: 1000, due: 29000 } })).toBe('PARTIAL');
    expect(getAppointmentPaymentStatus({ payment: { state: 'ON_ACCOUNT', expected: 30000, collected: 0, due: 30000 } })).toBe('ON_ACCOUNT');
  });
  it('closing summary row shape', () => {
    expect(getClosingRowPaymentStatus({ paymentState: 'UNPAID', expected: 30000, collected: 0, due: 30000 })).toBe('UNPAID');
    expect(getClosingRowPaymentStatus({ paymentState: 'PAID', expected: 30000, collected: 30000, due: 0 })).toBe('PAID');
    expect(
      getClosingRowPaymentStatus({ paymentState: 'UNPAID', expected: 30000, collected: 0, due: 0, rewardMinutesUsed: 120, courtCollectAmount: 0 }),
    ).toBe('PAID');
  });
});

describe('paymentStatusStyle', () => {
  it('uses the dashboard colors: green paid, amber partial, blue on-account', () => {
    expect(paymentStatusStyle('PAID').background).toBe('#dcfce7');
    expect(paymentStatusStyle('PARTIAL').background).toBe('#fef3c7');
    expect(paymentStatusStyle('ON_ACCOUNT').background).toBe('#dbeafe');
  });
  it('unpaid is white on the dashboard card and light red only in the closing popup', () => {
    expect(paymentStatusStyle('UNPAID', { context: 'card' }).background).toBe('#ffffff');
    expect(paymentStatusStyle('UNPAID').background).toBe('#ffffff');
    expect(paymentStatusStyle('UNPAID', { context: 'closing' }).background).toBe('#fee2e2');
  });
  it('every status has a border class and a badge tone', () => {
    for (const status of ['PAID', 'PARTIAL', 'UNPAID', 'ON_ACCOUNT']) {
      const s = paymentStatusStyle(status, { context: 'closing' });
      expect(typeof s.border).toBe('string');
      expect(['success', 'warning', 'danger', 'info']).toContain(s.badgeTone);
    }
  });
});

describe('summarizeUnpaid (closing popup headline, mirrors the backend close rule)', () => {
  const NOW = new Date('2026-11-11T12:00:00Z').getTime();
  const row = (id, startH, over = {}) => ({
    appointmentId: id,
    startsAt: new Date(NOW + startH * 3600_000).toISOString(),
    paymentState: 'UNPAID',
    expected: 30000,
    collected: 0,
    due: 30000,
    ...over,
  });
  it('counts started unpaid and partial bookings with their due, upcoming ones apart', () => {
    const s = summarizeUnpaid(
      [
        row('paid', -3, { paymentState: 'PAID', collected: 30000, due: 0 }),
        row('past', -2),
        row('partial', -1, { paymentState: 'PARTIAL', collected: 10000, due: 20000 }),
        row('oa', -1, { paymentState: 'ON_ACCOUNT' }),
        row('later', 3),
      ],
      NOW,
    );
    expect(s).toEqual({ total: 4, unpaid: 2, unpaidDue: 50000, upcoming: 1 });
  });
  it('all paid has zero unpaid', () => {
    expect(summarizeUnpaid([row('a', -2, { paymentState: 'PAID', due: 0, collected: 30000 })], NOW).unpaid).toBe(0);
  });
  it('isStarted tells the popup which unpaid rows may turn red', () => {
    expect(isBookingStarted(row('a', -1), NOW)).toBe(true);
    expect(isBookingStarted(row('b', 2), NOW)).toBe(false);
  });
});
