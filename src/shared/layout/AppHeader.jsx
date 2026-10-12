import { CircleUserRound, LogOut, ShieldCheck, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';
import RoleBadge from './RoleBadge';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationsBell from './NotificationsBell';
import Button from '../ui/Button';

export default function AppHeader({ user, onLogout, onMenuClick }) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy text-white shadow-lg shadow-navy/10">
      <div className="mx-auto flex min-h-[76px] w-full max-w-[1600px] items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex size-11 items-center justify-center rounded-xl text-white/75 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-ball lg:hidden"
            aria-label={t('common.primaryNavigation')}
          >
            <Menu className="size-5" strokeWidth={1.8} aria-hidden="true" />
          </button>

          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg">
            <Logo className="w-14" />
          </div>

          <div className="hidden min-w-0 sm:block">
            <p className="truncate font-cairo text-sm font-black tracking-wide">PADEL 93</p>
            <p className="font-tajawal text-xs text-white/60">{t('brand.tagline')}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <LanguageSwitcher dark />
          <NotificationsBell />

          <Link
            to="/app/profile"
            className="flex size-11 items-center justify-center rounded-xl text-white/75 outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ball sm:hidden"
            aria-label={t('common.profile')}
          >
            <CircleUserRound className="size-5" strokeWidth={1.8} aria-hidden="true" />
          </Link>

          <div className="hidden items-center gap-2 rounded-xl bg-white/5 px-3 py-2 sm:flex">
            <div className="flex size-8 items-center justify-center rounded-full border border-ball/60 text-ball">
              <ShieldCheck className="size-4" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div className="text-start">
              <p className="font-cairo text-xs font-bold text-white">{user?.name}</p>
              <RoleBadge role={user?.role} />
            </div>
          </div>

          <Button
            variant="darkGhost"
            className="min-h-11 px-3 sm:px-4"
            onClick={onLogout}
            aria-label={t('common.logout')}
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('common.logout')}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
