import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CircleUserRound,
  ClipboardCheck,
  Home,
  ReceiptText,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  UsersRound,
  WalletCards,
  CreditCard,
} from 'lucide-react';
import AppHeader from './AppHeader';
import SideNav from './SideNav';
import MobileNav from './MobileNav';
import MobileDrawer from './MobileDrawer';
import { authLoggedOut } from '../../features/auth/authSlice';
import { selectPermissions, selectRole, selectUser } from '../../features/auth/authSelectors';
import { useTranslation } from 'react-i18next';

export default function AppShell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const role = useSelector(selectRole);
  const permissions = useSelector(selectPermissions);
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function logout() {
    dispatch(authLoggedOut());
    navigate('/login', { replace: true });
  }

  const links = getLinksForRole(role, permissions);

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
          className="min-w-0 flex-1 px-3 pb-24 pt-5 outline-none sm:px-6 lg:px-8 lg:pb-10 lg:pt-7"
        >
          <Outlet />
        </main>
      </div>

      <MobileNav />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} links={links} />
    </div>
  );
}

function getLinksForRole(role, permissions) {
  if (role === 'OWNER') {
    return [
      { to: '/app/owner', key: 'owner.navDashboard', icon: Home, end: true },
      { to: '/app/owner/bookings', key: 'owner.navAppointments', icon: CalendarDays },
      { to: '/app/owner/inbox', key: 'owner.navInbox', icon: ClipboardCheck },
      { to: '/app/owner/payment-flags', key: 'owner.paymentFlags', icon: AlertTriangle },
      { to: '/app/accountant/verification', key: 'owner.navVerification', icon: ClipboardCheck },
      { to: '/app/accountant/handovers', key: 'owner.navHandovers', icon: Send },
      { to: '/app/accountant/shifts', key: 'owner.navShifts', icon: WalletCards },
      { to: '/app/accountant/reports', key: 'owner.navReports', icon: BarChart3 },
      { to: '/app/accountant/bookly', key: 'owner.navBookly', icon: RefreshCw },
      { to: '/app/owner/users', key: 'owner.navUsers', icon: UsersRound },
      { to: '/app/owner/settings', key: 'owner.navSettings', icon: Settings2 },
      { to: '/app/owner/corrections', key: 'owner.navCorrections', icon: ShieldCheck },
      { to: '/app/owner/control', key: 'owner.navControl', icon: ShieldCheck },
    ];
  }
  if (role === 'ACCOUNTANT') {
    return [
      { to: '/app/accountant', key: 'accountant.navDashboard', icon: Home, end: true },
      {
        to: '/app/accountant/verification',
        key: 'accountant.navVerification',
        icon: ClipboardCheck,
      },
      { to: '/app/accountant/handovers', key: 'accountant.navHandovers', icon: Send },
      { to: '/app/accountant/shifts', key: 'accountant.navShifts', icon: WalletCards },
      { to: '/app/accountant/reports', key: 'accountant.navReports', icon: BarChart3 },
      { to: '/app/accountant/bookly', key: 'accountant.navBookly', icon: RefreshCw },
      { to: '/app/accountant/expenses', key: 'accountant.navExpenses', icon: ReceiptText },
    ];
  }
  const staffLinks = [
    { to: '/app/staff', key: 'common.dashboard', icon: Home, end: true },
    { to: '/app/staff/appointments', key: 'nav.appointments', icon: CalendarDays },
    { to: '/app/staff/quick-add', key: 'nav.quickAdd', icon: CreditCard },
    { to: '/app/staff/expenses', key: 'nav.expenses', icon: ReceiptText },
    { to: '/app/staff/records', key: 'nav.records', icon: BarChart3 },
    { to: '/app/staff/payment-flags', key: 'owner.paymentFlags', icon: AlertTriangle },
  ];
  if (permissions?.['transfer.create'] !== false) {
    staffLinks.splice(4, 0, { to: '/app/staff/handover', key: 'nav.handover', icon: Send });
  }
  return staffLinks;
}
