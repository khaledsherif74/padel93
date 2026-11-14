import { describe, expect, it } from 'vitest';
import { fitWithin } from './imageFit';

describe('fitWithin', () => {
  it('shrinks the long side to max and keeps the ratio', () => {
    expect(fitWithin(3000, 4000, 720)).toEqual({ width: 540, height: 720 });
    expect(fitWithin(4000, 3000, 720)).toEqual({ width: 720, height: 540 });
  });
  it('never upscales', () => {
    expect(fitWithin(300, 200, 720)).toEqual({ width: 300, height: 200 });
  });
  it('returns whole numbers of at least 1 pixel', () => {
    const r = fitWithin(1001, 7, 100);
    expect(Number.isInteger(r.width) && Number.isInteger(r.height)).toBe(true);
    expect(r.height).toBeGreaterThanOrEqual(1);
  });
  it('guards against bad sizes', () => {
    expect(fitWithin(0, 100, 720)).toBeNull();
    expect(fitWithin(NaN, 100, 720)).toBeNull();
  });
});
