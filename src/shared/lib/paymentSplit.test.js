import { describe, expect, it } from 'vitest';
import { buildBatchBody, computeSplit } from './paymentSplit';

const base = { outstanding: 30000, expected: 30000, alreadyCollected: 0, note: '' };
const cash = (amountText) => ({ method: 'CASH', amountText, receiptId: '' });
const visa = (amountText, receiptId = '') => ({ method: 'VISA', amountText, receiptId });

describe('computeSplit', () => {
  it('a single full cash line is submittable', () => {
    const s = computeSplit({ ...base, lines: [cash('300.00')] });
    expect(s.total).toBe(30000);
    expect(s.remaining).toBe(0);
    expect(s.canSubmit).toBe(true);
    expect(s.willBeUnderpaid).toBe(false);
  });

  it('cash + visa split adds up and needs the receipt for the card line', () => {
    const withoutReceipt = computeSplit({ ...base, lines: [cash('200.00'), visa('100.00')] });
    expect(withoutReceipt.total).toBe(30000);
    expect(withoutReceipt.canSubmit).toBe(false);
    const withReceipt = computeSplit({ ...base, lines: [cash('200.00'), visa('100.00', 'r1')] });
    expect(withReceipt.canSubmit).toBe(true);
  });

  it('blocks paying more than what is due', () => {
    const s = computeSplit({ ...base, lines: [cash('200.00'), cash('150.00')] });
    expect(s.overpaid).toBe(true);
    expect(s.canSubmit).toBe(false);
  });

  it('a short total needs a note, and a note unlocks it', () => {
    const lines = [cash('100.00'), cash('50.00')];
    const short = computeSplit({ ...base, lines });
    expect(short.willBeUnderpaid).toBe(true);
    expect(short.noteRequired).toBe(true);
    expect(short.canSubmit).toBe(false);
    expect(computeSplit({ ...base, lines, note: 'Left early' }).canSubmit).toBe(true);
  });

  it('counts money already collected so a final top-up is not "short"', () => {
    const s = computeSplit({ ...base, outstanding: 10000, alreadyCollected: 20000, lines: [cash('100.00')] });
    expect(s.willBeUnderpaid).toBe(false);
    expect(s.canSubmit).toBe(true);
  });

  it('rejects empty, zero and malformed amounts', () => {
    expect(computeSplit({ ...base, lines: [cash('')] }).canSubmit).toBe(false);
    expect(computeSplit({ ...base, lines: [cash('0')] }).canSubmit).toBe(false);
    expect(computeSplit({ ...base, lines: [cash('abc')] }).canSubmit).toBe(false);
  });
});

describe('buildBatchBody', () => {
  it('sends piasters, receipts only for card lines, and the note when present', () => {
    const body = buildBatchBody({
      clientRequestId: 'req-12345678',
      appointmentId: 'a1',
      note: ' Left early ',
      lines: [cash('100.00'), visa('50.50', 'r1')],
    });
    expect(body).toEqual({
      clientRequestId: 'req-12345678',
      appointmentId: 'a1',
      note: 'Left early',
      lines: [
        { method: 'CASH', amount: 10000 },
        { method: 'VISA', amount: 5050, receiptId: 'r1' },
      ],
    });
  });

  it('omits the note when blank', () => {
    const body = buildBatchBody({ clientRequestId: 'req-12345678', appointmentId: 'a1', note: '  ', lines: [cash('1')] });
    expect('note' in body).toBe(false);
  });
});
