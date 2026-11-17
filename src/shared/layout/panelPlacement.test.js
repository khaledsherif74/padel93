import { describe, expect, it } from 'vitest';
import { placePanel } from './panelPlacement';

const base = { viewportWidth: 360, maxWidth: 390, margin: 12, gap: 10 };

describe('placePanel', () => {
  it('fits the screen: width never exceeds viewport minus margins', () => {
    const r = placePanel({ ...base, anchor: { left: 300, right: 344, bottom: 60 }, rtl: false });
    expect(r.width).toBe(336);
    expect(r.left).toBeGreaterThanOrEqual(12);
    expect(r.left + r.width).toBeLessThanOrEqual(360 - 12);
  });

  it('RTL bell at the left edge: panel stays on screen instead of running off the right', () => {
    const r = placePanel({ ...base, anchor: { left: 120, right: 164, bottom: 60 }, rtl: true });
    expect(r.left).toBeGreaterThanOrEqual(12);
    expect(r.left + r.width).toBeLessThanOrEqual(360 - 12);
  });

  it('PC: LTR aligns the panel to the bell inline-end (right edge)', () => {
    const r = placePanel({ viewportWidth: 1280, maxWidth: 390, margin: 12, gap: 10, anchor: { left: 1100, right: 1144, bottom: 60 }, rtl: false });
    expect(r.width).toBe(390);
    expect(r.left + r.width).toBe(1144);
  });

  it('PC: RTL aligns the panel to the bell inline-end (left edge)', () => {
    const r = placePanel({ viewportWidth: 1280, maxWidth: 390, margin: 12, gap: 10, anchor: { left: 140, right: 184, bottom: 60 }, rtl: true });
    expect(r.left).toBe(140);
  });

  it('sits just below the bell', () => {
    expect(placePanel({ ...base, anchor: { left: 0, right: 44, bottom: 60 }, rtl: false }).top).toBe(70);
  });
});
