import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar';
import en from './en';

export const LANGUAGE_KEY = 'padel93.language';
export const DEFAULT_LANGUAGE = 'ar';

function readLanguage() {
  try {
    const value = localStorage.getItem(LANGUAGE_KEY);
    return value === 'en' || value === 'ar' ? value : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function applyDocumentDirection(language) {
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
  document.documentElement.dir = direction;
  document.body.dataset.language = language;
}

const initialLanguage = readLanguage();

i18n.use(initReactI18next).init({
  resources: { ar, en },
  lng: initialLanguage,
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
});

applyDocumentDirection(initialLanguage);

i18n.on('languageChanged', (language) => {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Storage may be disabled; the in-memory language still works.
  }
  applyDocumentDirection(language);
});

export default i18n;
