import { describe, expect, it } from 'vitest';
import { groupByUserAndDate, isOvernight, shiftHours, weekDates, weekStart } from './scheduleGrid';

describe('weekStart (Egypt week starts on Saturday)', () => {
  it('returns the Saturday on or before the date', () => {
    expect(weekStart('2026-11-14')).toBe('2026-11-14');
    expect(weekStart('2026-11-13')).toBe('2026-11-07');
    expect(weekStart('2026-11-15')).toBe('2026-11-14');
    expect(weekStart('2026-11-20')).toBe('2026-11-14');
  });
});

describe('weekDates', () => {
  it('lists 7 consecutive days across a month boundary', () => {
    expect(weekDates('2026-10-31')).toEqual([
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
    ]);
  });
});

describe('shift helpers', () => {
  it('end at or before start means overnight', () => {
    expect(isOvernight('16:00', '04:00')).toBe(true);
    expect(isOvernight('09:00', '17:00')).toBe(false);
    expect(isOvernight('10:00', '10:00')).toBe(true);
  });
  it('shiftHours counts across midnight', () => {
    expect(shiftHours('16:00', '04:00')).toBe(12);
    expect(shiftHours('09:00', '17:30')).toBe(8.5);
  });
});

describe('groupByUserAndDate', () => {
  it('indexes shifts by person then day, sorted by start time', () => {
    const items = [
      { id: '2', userId: 'u1', date: '2026-11-14', startTime: '20:00', endTime: '23:00' },
      { id: '1', userId: 'u1', date: '2026-11-14', startTime: '09:00', endTime: '12:00' },
      { id: '3', userId: 'u2', date: '2026-11-15', startTime: '16:00', endTime: '04:00' },
    ];
    const g = groupByUserAndDate(items);
    expect(g.u1['2026-11-14'].map((s) => s.id)).toEqual(['1', '2']);
    expect(g.u2['2026-11-15']).toHaveLength(1);
    expect(g.u2['2026-11-14']).toBeUndefined();
  });
});
