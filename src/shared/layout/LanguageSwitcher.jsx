import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher({ dark = false }) {
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === 'ar';

  function toggleLanguage() {
    void i18n.changeLanguage(isArabic ? 'en' : 'ar');
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 font-cairo text-sm font-semibold outline-none transition focus-visible:ring-2 ${
        dark
          ? 'border-white/10 bg-white/5 text-white hover:bg-white/10 focus-visible:ring-ball'
          : 'border-navy/10 bg-white text-navy shadow-sm hover:border-edge/35 hover:bg-navy/[0.02] focus-visible:ring-edge'
      }`}
      aria-label={isArabic ? t('language.switchToEnglish') : t('language.switchToArabic')}
    >
      <Languages className="size-4" aria-hidden="true" />
      <span>{isArabic ? 'English' : 'العربية'}</span>
    </button>
  );
}
