import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSelector } from 'react-redux';
import StaffAppHeader from './StaffAppHeader';
import MobileNav from './MobileNav';
import { selectRole } from '../../features/auth/authSelectors';
import { useTranslation } from 'react-i18next';

export default function AppShell() {
  const role = useSelector(selectRole);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isStaffSection = role === 'STAFF' && pathname.startsWith('/app/staff');
  const isOwnerPage =
    role === 'OWNER' &&
    (pathname.startsWith('/app/owner/') ||
      pathname === '/app/accountant' ||
      pathname.startsWith('/app/accountant/') ||
      pathname === '/app/profile');

  const hasContextualBack = /^\/app\/owner\/bookings\/[^/]+$/.test(pathname);

  function goBack() {
    const historyIndex = window.history.state?.idx;
    if (Number.isInteger(historyIndex) && historyIndex > 0) {
      navigate(-1);
      return;
    }
    navigate('/app/owner', { replace: true });
  }

  return (
    <div className="min-h-screen min-w-0 bg-[#F3F5F9] text-navy">
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <StaffAppHeader />

      <div className="mx-auto flex w-full max-w-[1600px]">
        <main
          id="main-content"
          tabIndex={-1}
          className={
            isStaffSection
              ? 'relative z-20 min-w-0 flex-1 p-0 outline-none'
              : 'min-w-0 flex-1 px-3 pb-10 pt-2 outline-none sm:px-4 lg:px-6 lg:pb-8 lg:pt-3'
          }
        >
          {isOwnerPage && !hasContextualBack && (
            <div className="mx-auto mb-3 w-full max-w-[1600px]">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#D7E0EA] bg-white px-3 py-2 text-sm font-bold text-[#0B3B6E] shadow-sm outline-none transition hover:border-[#A8BBD0] hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#01649B]"
                aria-label={t('common.back')}
              >
                <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
                {t('common.back')}
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
