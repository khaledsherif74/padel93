import { describe, expect, it } from 'vitest';
import {
  breakAction,
  clockState,
  effectiveState,
  liveWorkedMinutes,
  nextAction,
  splitMinutes,
  weekBars,
} from './attendanceMath';

const open = { workedMinutes: 90 };

describe('clockState / actions', () => {
  it('derives OUT, IN and ON_BREAK from /attendance/me', () => {
    expect(clockState(null)).toBe('OUT');
    expect(clockState({ open: null, openBreak: null })).toBe('OUT');
    expect(clockState({ open, openBreak: null })).toBe('IN');
    expect(clockState({ open, openBreak: { id: 'b' } })).toBe('ON_BREAK');
  });
  it('main button flips between clock in and clock out, break only while clocked in', () => {
    expect(nextAction('OUT')).toBe('clock-in');
    expect(nextAction('IN')).toBe('clock-out');
    expect(nextAction('ON_BREAK')).toBe('clock-out');
    expect(breakAction('OUT')).toBeNull();
    expect(breakAction('IN')).toBe('break/start');
    expect(breakAction('ON_BREAK')).toBe('break/end');
  });
});

describe('liveWorkedMinutes', () => {
  const me = (extra = {}) => ({ open, openBreak: null, ...extra });
  it('adds minutes elapsed since the data arrived', () => {
    expect(liveWorkedMinutes(me(), 1_000_000, 1_000_000 + 5 * 60_000 + 30_000)).toBe(95);
  });
  it('stops counting while on a break', () => {
    expect(liveWorkedMinutes(me({ openBreak: { id: 'b' } }), 1_000_000, 1_000_000 + 600_000)).toBe(
      90,
    );
  });
  it('never goes backwards if the device clock moved', () => {
    expect(liveWorkedMinutes(me(), 2_000_000, 1_000_000)).toBe(90);
  });
  it('is 0 when clocked out', () => {
    expect(liveWorkedMinutes({ open: null, openBreak: null }, 0, 999_999)).toBe(0);
  });
});

describe('splitMinutes', () => {
  it('splits into hours and minutes', () => {
    expect(splitMinutes(0)).toEqual({ hours: 0, minutes: 0 });
    expect(splitMinutes(65)).toEqual({ hours: 1, minutes: 5 });
    expect(splitMinutes(9 * 60 + 30)).toEqual({ hours: 9, minutes: 30 });
    expect(splitMinutes(-5)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe('weekBars', () => {
  it('scales against the longest day but never fills the bar for a short week', () => {
    const bars = weekBars([
      { date: '2026-11-07', workedMinutes: 600 },
      { date: '2026-11-08', workedMinutes: 300 },
      { date: '2026-11-09', workedMinutes: 0 },
    ]);
    expect(bars.map((b) => b.ratio)).toEqual([1, 0.5, 0]);
    const short = weekBars([{ date: 'd', workedMinutes: 120 }]);
    expect(short[0].ratio).toBeCloseTo(0.25);
  });
});

describe('effectiveState (server state plus taps still waiting to sync)', () => {
  it('no waiting taps: the server state stands', () => {
    expect(effectiveState('OUT', [])).toBe('OUT');
    expect(effectiveState('IN', [])).toBe('IN');
  });
  it('the newest waiting tap decides what the buttons offer', () => {
    expect(effectiveState('OUT', ['clock-in'])).toBe('IN');
    expect(effectiveState('OUT', ['clock-in', 'break/start'])).toBe('ON_BREAK');
    expect(effectiveState('OUT', ['clock-in', 'break/start', 'break/end'])).toBe('IN');
    expect(effectiveState('IN', ['clock-out'])).toBe('OUT');
    expect(effectiveState('ON_BREAK', ['break/end'])).toBe('IN');
  });
});
