import { describe, expect, it } from 'vitest';
import { buildEditBody, canEditIncome, canEditIncomeLine, validateEdit } from './paymentEdit';

const income = { id: 'i1', method: 'CASH', amount: 30000, note: '', receiptId: null, status: 'ACTIVE', verification: 'NOT_REQUIRED' };
const draft = (over = {}) => ({ method: 'CASH', amountText: '300.00', note: '', receiptId: '', reason: 'Typed wrong amount', ...over });

describe('canEditIncome', () => {
  it('allows own active unverified payments on the live day', () => {
    expect(canEditIncome(income, { isToday: true })).toBe(true);
    expect(canEditIncome({ ...income, method: 'VISA', verification: 'PENDING' }, { isToday: true })).toBe(true);
  });
  it('blocks past days, void and already-checked payments', () => {
    expect(canEditIncome(income, { isToday: false })).toBe(false);
    expect(canEditIncome({ ...income, status: 'VOIDED' }, { isToday: true })).toBe(false);
    expect(canEditIncome({ ...income, verification: 'VERIFIED' }, { isToday: true })).toBe(false);
    expect(canEditIncome({ ...income, verification: 'REJECTED' }, { isToday: true })).toBe(false);
  });
});

describe('buildEditBody', () => {
  it('sends only what changed plus the reason', () => {
    expect(buildEditBody(income, draft({ amountText: '250.00' }))).toEqual({ amount: 25000, reason: 'Typed wrong amount' });
    expect(buildEditBody(income, draft({ note: ' Discount ' }))).toEqual({ note: 'Discount', reason: 'Typed wrong amount' });
  });
  it('includes receipt when switching to a card method', () => {
    expect(buildEditBody(income, draft({ method: 'VISA', receiptId: 'r9' }))).toEqual({
      method: 'VISA',
      receiptId: 'r9',
      reason: 'Typed wrong amount',
    });
  });
  it('returns null when nothing changed', () => {
    expect(buildEditBody(income, draft())).toBeNull();
  });
});

describe('validateEdit', () => {
  it('needs a reason of 5+ chars, a positive amount, and a receipt for card', () => {
    expect(validateEdit(income, draft({ reason: 'abcd', amountText: '250' })).ok).toBe(false);
    expect(validateEdit(income, draft({ amountText: '0' })).ok).toBe(false);
    expect(validateEdit(income, draft({ amountText: 'x' })).ok).toBe(false);
    expect(validateEdit(income, draft({ method: 'VISA', amountText: '250' })).ok).toBe(false);
    expect(validateEdit(income, draft({ method: 'VISA', amountText: '250', receiptId: 'r1' })).ok).toBe(true);
    expect(validateEdit(income, draft({ amountText: '250' })).ok).toBe(true);
  });
  it('rejects an unchanged draft', () => {
    expect(validateEdit(income, draft()).ok).toBe(false);
  });
});

describe('canEditIncomeLine (booking card)', () => {
  const line = { id: 'l1', method: 'CASH', amount: 10000, status: 'ACTIVE', verification: 'NOT_REQUIRED', recordedById: 'me' };
  it('only my own lines, only on an editable day', () => {
    expect(canEditIncomeLine(line, { userId: 'me', canEditDay: true })).toBe(true);
    expect(canEditIncomeLine({ ...line, recordedById: 'other' }, { userId: 'me', canEditDay: true })).toBe(false);
    expect(canEditIncomeLine(line, { userId: 'me', canEditDay: false })).toBe(false);
  });
  it('still blocked once finance checked the card payment', () => {
    expect(canEditIncomeLine({ ...line, method: 'VISA', verification: 'VERIFIED' }, { userId: 'me', canEditDay: true })).toBe(false);
    expect(canEditIncomeLine({ ...line, method: 'VISA', verification: 'PENDING' }, { userId: 'me', canEditDay: true })).toBe(true);
  });
  it('an unknown viewer can edit nothing', () => {
    expect(canEditIncomeLine(line, { userId: undefined, canEditDay: true })).toBe(false);
  });
});
