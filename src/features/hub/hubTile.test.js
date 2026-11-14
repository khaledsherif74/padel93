import { describe, expect, it } from 'vitest';
import { externalLinkProps, resolveTile, validateHubUrl } from './hubTile';

describe('externalLinkProps', () => {
  it('opens https urls in a new tab without leaking the opener', () => {
    expect(externalLinkProps('https://loyalty.padel93.com/staff.html')).toEqual({
      href: 'https://loyalty.padel93.com/staff.html',
      target: '_blank',
      rel: 'noopener noreferrer',
    });
  });

  it('trims the url', () => {
    expect(externalLinkProps('  https://padel93.com/x.php ').href).toBe('https://padel93.com/x.php');
  });

  it('refuses anything that is not a plain https url', () => {
    for (const bad of [
      '',
      '   ',
      null,
      undefined,
      42,
      'http://padel93.com',
      'javascript:alert(1)',
      'data:text/html,x',
      '//padel93.com',
      'padel93.com',
      'https://user:pw@padel93.com',
      'https://',
    ]) {
      expect(externalLinkProps(bad)).toBeNull();
    }
  });
});

describe('validateHubUrl', () => {
  it('accepts empty (hides the tile) and https urls', () => {
    expect(validateHubUrl('')).toBeNull();
    expect(validateHubUrl('   ')).toBeNull();
    expect(validateHubUrl('https://padel93.com/botpanelpadel93.php')).toBeNull();
  });
  it('flags everything else', () => {
    expect(validateHubUrl('http://padel93.com')).toBe('invalid');
    expect(validateHubUrl('padel93.com')).toBe('invalid');
    expect(validateHubUrl('javascript:alert(1)')).toBe('invalid');
  });
});

describe('resolveTile', () => {
  it('internal tile keeps its in-app path', () => {
    expect(resolveTile({ id: 'finance', kind: 'internal', status: 'live', path: '/app/staff' })).toEqual({
      id: 'finance',
      mode: 'internal',
      path: '/app/staff',
    });
  });

  it('internal tile with a path outside /app is dropped', () => {
    expect(resolveTile({ id: 'finance', kind: 'internal', status: 'live', path: 'https://evil.com' })).toBeNull();
    expect(resolveTile({ id: 'finance', kind: 'internal', status: 'live', path: '//evil.com' })).toBeNull();
    expect(resolveTile({ id: 'finance', kind: 'internal', status: 'live' })).toBeNull();
  });

  it('external tile keeps only safe links, with safe attributes', () => {
    const tile = resolveTile({
      id: 'bot',
      kind: 'external',
      status: 'live',
      links: [
        { id: 'hours', url: 'https://padel93.com/botpanelpadel93.php' },
        { id: 'reminders', url: 'javascript:alert(1)' },
      ],
    });
    expect(tile.mode).toBe('external');
    expect(tile.links).toEqual([
      { id: 'hours', href: 'https://padel93.com/botpanelpadel93.php', target: '_blank', rel: 'noopener noreferrer' },
    ]);
  });

  it('external tile with no safe link is dropped', () => {
    expect(resolveTile({ id: 'loyalty', kind: 'external', status: 'live', links: [{ id: 'main', url: 'http://x.com' }] })).toBeNull();
    expect(resolveTile({ id: 'loyalty', kind: 'external', status: 'live' })).toBeNull();
  });

  it('soon tile is not clickable', () => {
    expect(resolveTile({ id: 'attendance', kind: 'internal', status: 'soon', path: '/app/attendance' })).toEqual({
      id: 'attendance',
      mode: 'soon',
    });
  });

  it('garbage input is dropped', () => {
    expect(resolveTile(null)).toBeNull();
    expect(resolveTile({})).toBeNull();
  });
});
