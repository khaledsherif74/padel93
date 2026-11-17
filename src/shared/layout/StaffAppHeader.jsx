import { CircleUserRound, LayoutGrid, LogOut } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { selectRole, selectUser } from '../../features/auth/authSelectors';
import { authLoggedOut } from '../../features/auth/authSlice';
import NotificationsBell from './NotificationsBell';
import Logo from '../ui/Logo';

const HOME_PATH = {
  STAFF: '/app/staff',
  ACCOUNTANT: '/app/accountant',
  OWNER: '/app/owner',
};
const PROFILE_PATH = {
  STAFF: '/app/staff/profile',
  ACCOUNTANT: '/app/accountant/profile',
  OWNER: '/app/profile',
};

export default function StaffAppHeader() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useSelector(selectUser);
  const role = useSelector(selectRole) ?? user?.role ?? 'STAFF';
  const homePath = HOME_PATH[role] ?? '/app';
  const profilePath = PROFILE_PATH[role] ?? '/app/profile';
  const isStaffHome = role === 'STAFF' && pathname === '/app/staff';
  const isProfilePage = pathname === profilePath;
  const showApps = Boolean(role) && pathname !== '/app/hub';
  const roleLabel = t(`role.${role}`);

  function signOut() {
    dispatch(authLoggedOut());
    navigate('/login', { replace: true });
  }

  const bottomPadding = isStaffHome ? 'pb-[72px] lg:pb-24' : isProfilePage ? 'pb-3' : 'pb-4';

  return (
    <header
      className={`relative z-10 bg-[#002346] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:px-6 sm:pt-3 lg:px-8 ${bottomPadding}`}
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            to={homePath}
            className="flex min-w-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F]"
            aria-label={t('staff.homeDashboardTitle')}
          >
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-white p-0.5 sm:size-11">
              <Logo className="!h-10 !w-10" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-inter text-sm font-extrabold tracking-[0.04em] sm:text-base">
                PADEL 93
              </span>
              <span className="mt-0.5 block truncate font-inter text-[11px] text-[#B9C7DA] sm:text-sm">
                {t('staff.greeting', { name: user?.name ?? '' })} · {roleLabel}
              </span>
            </span>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {showApps && (
            <Link
              to="/app/hub"
              className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-white outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#8DC63F] sm:w-auto sm:px-3"
              aria-label={t('hub.headerButton')}
              title={t('hub.headerButton')}
            >
              <LayoutGrid className="size-5" aria-hidden="true" />
              <span className="hidden ps-2 font-inter text-sm font-semibold sm:inline">
                {t('hub.headerButton')}
              </span>
            </Link>
          )}
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 sm:size-11">
            <NotificationsBell />
          </div>
          <Link
            to={profilePath}
            className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-white outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#8DC63F] sm:size-11"
            aria-label={t('common.profile')}
            title={t('common.profile')}
          >
            <CircleUserRound className="size-5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-white outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#8DC63F] sm:size-11"
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
