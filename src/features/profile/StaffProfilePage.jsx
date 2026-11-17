import { ChevronLeft, Globe2, LogOut } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { selectUser } from '../auth/authSelectors';
import { authLoggedOut } from '../auth/authSlice';

export default function StaffProfilePage() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const role = user?.role ?? 'STAFF';
  const roleLabel = t(`role.${role}`);
  const homePath = role === 'ACCOUNTANT' ? '/app/accountant' : '/app/staff';
  const name = user?.name || roleLabel;
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase() || 'S';

  function signOut() {
    dispatch(authLoggedOut());
    navigate('/login', { replace: true });
  }

  return (
    <div className="staff-design min-h-screen bg-[#F3F5F9] pb-[max(2rem,env(safe-area-inset-bottom))] font-inter text-[#0E1B2B]">
      <header className="bg-[#002346] px-4 pb-5 pt-2 text-white">
        <div className="mx-auto w-full max-w-[1120px]">
          <button
            type="button"
            onClick={() => navigate(homePath)}
            className="flex size-10 items-center justify-center rounded-[12px] bg-white/10 text-white outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#8DC63F]"
            aria-label={t('common.back')}
          >
            <ChevronLeft className="size-6 rtl:rotate-180" strokeWidth={2.3} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-1 flex flex-col items-center gap-1.5 text-center">
          <div className="flex size-16 items-center justify-center rounded-full border-[3px] border-[#8DC63F] bg-[#1E4C80] text-[28px] font-extrabold text-white">
            {initial}
          </div>
          <h1 className="max-w-[min(90vw,720px)] truncate font-inter text-lg font-extrabold text-white">
            {name}
          </h1>
          <span className="rounded-full bg-[#164D46] px-2.5 py-1 font-inter text-xs font-bold text-[#C4EA92]">
            {roleLabel}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[880px] space-y-4 px-4 pb-10 pt-3 sm:px-6 sm:pt-4 lg:px-8">
        <section className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#E6EEF8] text-[#0B3B6E]">
              <Globe2 className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-inter text-[15px] font-bold text-[#0E1B2B] sm:text-base">
                {t('profile.languageHeading')}
              </h2>
              <p className="mt-0.5 font-inter text-xs text-[#4A5A70]">
                {t('profile.languageSubheading')}
              </p>
            </div>
          </div>

          <div
            role="radiogroup"
            aria-label={t('profile.languageHeading')}
            className="mt-3 grid grid-cols-2 gap-1 rounded-[14px] bg-[#E3E9F1] p-1"
          >
            <button
              type="button"
              role="radio"
              aria-checked={i18n.language === 'en'}
              onClick={() => i18n.changeLanguage('en')}
              className={`min-h-11 rounded-[10px] px-3 font-inter text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[#01649B] ${
                i18n.language === 'en'
                  ? 'bg-white text-[#002346] shadow-[0_1px_4px_rgba(0,35,70,0.16)]'
                  : 'bg-transparent text-[#4A5A70] hover:bg-white/50'
              }`}
            >
              English
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={i18n.language === 'ar'}
              onClick={() => i18n.changeLanguage('ar')}
              className={`min-h-11 rounded-[10px] px-3 font-inter text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#01649B] ${
                i18n.language === 'ar'
                  ? 'bg-white text-[#002346] shadow-[0_1px_4px_rgba(0,35,70,0.16)]'
                  : 'bg-transparent text-[#4A5A70] hover:bg-white/50'
              }`}
            >
              العربية
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-white">
          <button
            type="button"
            onClick={signOut}
            className="flex min-h-[56px] w-full items-center gap-3 px-4 text-start font-inter text-[15px] font-bold text-[#B42318] outline-none transition hover:bg-[#FEF5F4] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B42318]"
          >
            <LogOut className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
            {t('common.logout')}
          </button>
        </section>
      </main>
    </div>
  );
}
