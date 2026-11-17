import { describe, expect, it } from 'vitest';
import { ownerLinks } from './ownerLinks';

const ORIGINAL = [
  '/app/owner',
  '/app/owner/bookings',
  '/app/owner/inbox',
  '/app/owner/payment-flags',
  '/app/accountant/verification',
  '/app/accountant/handovers',
  '/app/accountant/staff-history',
  '/app/accountant/reports',
  '/app/accountant/bookly',
  '/app/owner/users',
  '/app/owner/settings',
  '/app/owner/corrections',
  '/app/owner/control',
];
const ADDED = ['/app/accountant/inbox', '/app/accountant/team'];
const PHASE_4 = ['/app/accountant/attendance', '/app/accountant/schedule'];

describe('owner navigation', () => {
  it('keeps every original link in the original order', () => {
    const kept = ownerLinks.map((l) => l.to).filter((to) => ORIGINAL.includes(to));
    expect(kept).toEqual(ORIGINAL);
  });
  it('adds only the new finance, team, attendance and schedule links', () => {
    const extra = ownerLinks.map((l) => l.to).filter((to) => !ORIGINAL.includes(to));
    expect(extra.sort()).toEqual([...ADDED, ...PHASE_4].sort());
  });
  it('has unique routes and every link has a label key and an icon', () => {
    const tos = ownerLinks.map((l) => l.to);
    expect(new Set(tos).size).toBe(tos.length);
    for (const l of ownerLinks) {
      expect(l.key).toMatch(/^(owner|accountant)\./);
      expect(l.icon).toBeTruthy();
    }
  });
});
