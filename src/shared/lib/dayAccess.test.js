import { describe, expect, it } from 'vitest';
import { addDays, canEditDay, canViewDay } from './dayAccess';

const base = { today: '2026-11-11', viewDays: 3, shiftBusinessDate: null, request: null };
const grant = (kind) => ({ status: 'APPROVED', isActive: true, kind });

describe('addDays', () => {
  it('moves across month boundaries', () => {
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });
});

describe('canViewDay', () => {
  it('today, the open shift day and the last N days are viewable without a grant', () => {
    expect(canViewDay({ ...base, date: '2026-11-11' })).toBe(true);
    expect(canViewDay({ ...base, date: '2026-11-08' })).toBe(true);
    expect(canViewDay({ ...base, date: '2026-11-07' })).toBe(false);
    expect(canViewDay({ ...base, date: '2026-11-01', shiftBusinessDate: '2026-11-01' })).toBe(true);
  });
  it('an active approved grant of either kind opens older days', () => {
    expect(canViewDay({ ...base, date: '2026-11-01', request: grant('VIEW') })).toBe(true);
    expect(canViewDay({ ...base, date: '2026-11-01', request: grant('EDIT') })).toBe(true);
    expect(canViewDay({ ...base, date: '2026-11-01', request: { status: 'PENDING', isActive: false, kind: 'VIEW' } })).toBe(false);
    expect(canViewDay({ ...base, date: '2026-11-01', request: { ...grant('VIEW'), isActive: false } })).toBe(false);
  });
  it('viewDays 0 means only today and open shift day', () => {
    expect(canViewDay({ ...base, viewDays: 0, date: '2026-11-10' })).toBe(false);
  });
});

describe('canEditDay', () => {
  it('only today, the open shift day, or an active EDIT grant', () => {
    expect(canEditDay({ ...base, date: '2026-11-11' })).toBe(true);
    expect(canEditDay({ ...base, date: '2026-11-10' })).toBe(false);
    expect(canEditDay({ ...base, date: '2026-11-10', request: grant('VIEW') })).toBe(false);
    expect(canEditDay({ ...base, date: '2026-11-10', request: grant('EDIT') })).toBe(true);
    expect(canEditDay({ ...base, date: '2026-11-10', shiftBusinessDate: '2026-11-10' })).toBe(true);
  });
});
