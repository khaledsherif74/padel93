import { describe, expect, it } from 'vitest';
import { getManageTiles } from '../../features/accountant/financeTiles';

const keys = (tiles) => tiles.map((t) => t.to.split('/').pop());

describe('finance Manage tiles', () => {
  it('accountant sees the finance pages, expenses, schedule and attendance; salaries stays hidden', () => {
    expect(keys(getManageTiles('ACCOUNTANT', { salaries: false }))).toEqual(['team', 'shifts', 'reports', 'expenses', 'bookly', 'schedule', 'attendance']);
  });
  it('owner does not get the finance-only expenses tile but does get schedule and attendance', () => {
    const owner = keys(getManageTiles('OWNER', { salaries: false }));
    expect(owner).not.toContain('expenses');
    expect(owner).toEqual(expect.arrayContaining(['schedule', 'attendance']));
  });
  it('the salaries tile appears only behind its flag', () => {
    expect(keys(getManageTiles('ACCOUNTANT', { salaries: true }))).toEqual(['team', 'shifts', 'reports', 'expenses', 'bookly', 'schedule', 'attendance', 'salaries']);
  });
});
