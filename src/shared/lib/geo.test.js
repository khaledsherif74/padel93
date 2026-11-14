import { describe, expect, it } from 'vitest';
import { geoErrorKey, normalizePosition } from './geo';

describe('normalizePosition', () => {
  it('keeps only what the server needs and rounds accuracy to 0.1 m', () => {
    const out = normalizePosition({ coords: { latitude: 31.4165, longitude: 31.8133, accuracy: 12.3456, altitude: 5, speed: 1 }, timestamp: 1 });
    expect(out).toEqual({ lat: 31.4165, lng: 31.8133, accuracyM: 12.3 });
  });
  it('rejects a position without usable numbers', () => {
    expect(normalizePosition(null)).toBeNull();
    expect(normalizePosition({ coords: { latitude: NaN, longitude: 1, accuracy: 1 } })).toBeNull();
    expect(normalizePosition({ coords: { latitude: 1, longitude: 1 } })).toBeNull();
  });
});

describe('geoErrorKey', () => {
  it('maps browser error codes to translation keys', () => {
    expect(geoErrorKey({ code: 1 })).toBe('attendance.geoDenied');
    expect(geoErrorKey({ code: 2 })).toBe('attendance.geoUnavailable');
    expect(geoErrorKey({ code: 3 })).toBe('attendance.geoTimeout');
    expect(geoErrorKey(new Error('x'))).toBe('attendance.geoUnknown');
    expect(geoErrorKey(null)).toBe('attendance.geoUnknown');
  });
});
