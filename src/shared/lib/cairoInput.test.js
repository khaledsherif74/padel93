import { describe, expect, it } from 'vitest';
import { fromInputValue, toInputValue } from './cairoInput';

describe('cairoInput (datetime-local values are Cairo wall-clock time)', () => {
  it('shows a UTC instant as Cairo time (UTC+2 in winter)', () => {
    expect(toInputValue('2026-11-12T14:00:00.000Z')).toBe('2026-11-12T16:00');
  });
  it('follows daylight saving (UTC+3 in summer)', () => {
    expect(toInputValue('2026-07-12T14:00:00.000Z')).toBe('2026-07-12T17:00');
  });
  it('turns what finance typed back into the right UTC instant', () => {
    expect(fromInputValue('2026-11-12T16:00')).toBe('2026-11-12T14:00:00.000Z');
    expect(fromInputValue('2026-11-13T01:30')).toBe('2026-11-12T23:30:00.000Z');
  });
  it('round-trips', () => {
    const iso = '2026-11-12T22:45:00.000Z';
    expect(fromInputValue(toInputValue(iso))).toBe(iso);
  });
  it('handles empty and invalid input', () => {
    expect(toInputValue(null)).toBe('');
    expect(toInputValue('nope')).toBe('');
    expect(fromInputValue('')).toBeNull();
    expect(fromInputValue('garbage')).toBeNull();
  });
});
