import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Home,
  ReceiptText,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { ownerLinks } from './ownerLinks';
import { hubLink } from './hubLink';
import AppHeader from './AppHeader';
import SideNav from './SideNav';
import MobileNav from './MobileNav';
import MobileDrawer from './MobileDrawer';
import { authLoggedOut } from '../../features/auth/authSlice';
import { selectRole, selectUser } from '../../features/auth/authSelectors';
import { useTranslation } from 'react-i18next';

export default function AppShell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const role = useSelector(selectRole);
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function logout() {
    dispatch(authLoggedOut());
    navigate('/login', { replace: true });
  }

  const links = getLinksForRole(role);

  return (
    <div className="min-h-screen bg-white text-navy">
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>

      <AppHeader user={user} onLogout={logout} onMenuClick={() => setDrawerOpen(true)} />

      <div className="mx-auto flex w-full max-w-[1600px]">
        <SideNav />
        <main
          id="main-content"
          tabIndex={-1}
          className={`min-w-0 flex-1 px-3 pt-5 outline-none sm:px-6 lg:px-8 lg:pb-10 lg:pt-7 ${role === 'OWNER' ? 'pb-24' : 'pb-10'}`}
        >
          <Outlet />
        </main>
      </div>

      <MobileNav />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} links={links} />
    </div>
  );
}

function getLinksForRole(role) {
  if (role === 'OWNER') return [hubLink, ...ownerLinks];
  return [];
}
