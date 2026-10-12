import { describe, expect, it } from 'vitest';
import { formatEgp, toPiasters } from './money';

describe('money helpers', () => {
  it('converts EGP text into integer piasters without floating point input', () => {
    expect(toPiasters('10')).toBe(1000);
    expect(toPiasters('10.5')).toBe(1050);
    expect(toPiasters('10.05')).toBe(1005);
    expect(toPiasters('1,250.25')).toBe(125025);
  });

  it('rejects invalid monetary precision', () => {
    expect(() => toPiasters('10.125')).toThrow();
    expect(() => toPiasters('-1')).toThrow();
  });

  it('rejects non-integer piasters when formatting', () => {
    expect(() => formatEgp(100.5)).toThrow();
  });
});
