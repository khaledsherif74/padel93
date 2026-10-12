import { describe, expect, it } from 'vitest';
import ar from './ar';
import en from './en';

function leafPaths(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('translation parity', () => {
  it('keeps Arabic and English translation trees aligned', () => {
    const arKeys = leafPaths(ar.translation).sort();
    const enKeys = leafPaths(en.translation).sort();
    expect(arKeys).toEqual(enKeys);
  });
});
