import { LogOut } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { selectUser } from '../../features/auth/authSelectors';
import { authLoggedOut } from '../../features/auth/authSlice';
import NotificationsBell from './NotificationsBell';

export default function StaffAppHeader() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  function signOut() {
    dispatch(authLoggedOut());
    navigate('/login', { replace: true });
  }

  return (
    <header className="bg-[#002346] px-4 pb-[72px] pt-[max(1rem,env(safe-area-inset-top))] text-white sm:px-6 sm:pt-5 lg:px-8 lg:pb-24">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3">
        <Link
          to="/app/staff"
          className="flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F]"
          aria-label={t('staff.homeDashboardTitle')}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#8DC63F] font-inter text-sm font-extrabold text-[#002346] sm:size-10">
            93
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-inter text-sm font-extrabold tracking-[0.04em] sm:text-base">
              PADEL 93
            </span>
            <span className="mt-0.5 block truncate font-inter text-xs text-[#B9C7DA] sm:text-sm">
              {t('staff.greeting', { name: user?.name ?? '' })} · {t('role.STAFF')}
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/10">
            <NotificationsBell />
          </div>
          <button
            type="button"
            onClick={signOut}
            className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-white outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#8DC63F]"
            aria-label={t('common.logout')}
            title={t('common.logout')}
          >
            <LogOut className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
