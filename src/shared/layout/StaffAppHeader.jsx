import { CircleUserRound, LogOut } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { selectUser } from '../../features/auth/authSelectors';
import { authLoggedOut } from '../../features/auth/authSlice';
import NotificationsBell from './NotificationsBell';
import Logo from '../ui/Logo';

export default function StaffAppHeader() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useSelector(selectUser);
  const isProfilePage = pathname === '/app/staff/profile';

  function signOut() {
    dispatch(authLoggedOut());
    navigate('/login', { replace: true });
  }

  // Staff Home reserves space for its overlapping collection card. The profile
  // page has its own compact hero, so it should not inherit that extra spacing.
  const bottomPadding = isProfilePage ? 'pb-3 lg:pb-4' : 'pb-[72px] lg:pb-24';

  return (
    <header
      className={`relative z-0 bg-[#002346] px-4 pt-[max(1rem,env(safe-area-inset-top))] text-white sm:px-6 sm:pt-5 lg:px-8 ${bottomPadding}`}
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3">
        <Link
          to="/app/staff"
          className="flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F]"
          aria-label={t('staff.homeDashboardTitle')}
        >
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white p-0.5">
            <Logo className="!h-11 !w-11" />
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
          <Link
            to="/app/staff/profile"
            className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-white outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#8DC63F]"
            aria-label={t('common.profile')}
            title={t('common.profile')}
          >
            <CircleUserRound className="size-5" aria-hidden="true" />
          </Link>
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
