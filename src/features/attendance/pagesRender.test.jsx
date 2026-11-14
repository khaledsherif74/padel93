import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';

const memoryStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
  };
};
globalThis.document ??= { documentElement: {}, body: { dataset: {} } };
globalThis.localStorage ??= memoryStorage();
globalThis.sessionStorage ??= memoryStorage();
globalThis.window ??= globalThis;

let i18n;
let store;
let pages;
beforeAll(async () => {
  i18n = (await import('../../shared/i18n')).default;
  store = (await import('../../app/store')).store;
  pages = [
    ['AttendancePage', (await import('./AttendancePage')).default],
    ['AttendanceBoardPage', (await import('./AttendanceBoardPage')).default],
    ['SchedulePage', (await import('../schedule/SchedulePage')).default],
    ['OwnerSettingsPage', (await import('../owner/OwnerSettingsPage')).default],
  ];
});

function render(Page, lang) {
  i18n.changeLanguage(lang);
  return renderToString(
    <Provider store={store}>
      <MemoryRouter>
        <Page />
      </MemoryRouter>
    </Provider>,
  );
}

describe.each(['en', 'ar'])('new pages first paint (%s)', (lang) => {
  it('every page renders without throwing', () => {
    for (const [name, Page] of pages) {
      let html = '';
      expect(() => (html = render(Page, lang)), name).not.toThrow();
      expect(html.length, name).toBeGreaterThan(50);
    }
  });
});
