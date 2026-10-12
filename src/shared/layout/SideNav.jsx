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
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { selectPermissions, selectRole } from '../../features/auth/authSelectors';

const ownerLinks = [
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
  { to: '/app/profile', key: 'common.profile', icon: CircleUserRound },
];

const accountantLinks = [
  { to: '/app/accountant', key: 'accountant.navDashboard', icon: Home, end: true },
  { to: '/app/accountant/verification', key: 'accountant.navVerification', icon: ClipboardCheck },
  { to: '/app/accountant/handovers', key: 'accountant.navHandovers', icon: Send },
  { to: '/app/accountant/shifts', key: 'accountant.navShifts', icon: WalletCards },
  { to: '/app/accountant/reports', key: 'accountant.navReports', icon: BarChart3 },
  { to: '/app/accountant/bookly', key: 'accountant.navBookly', icon: RefreshCw },
  { to: '/app/accountant/expenses', key: 'accountant.navExpenses', icon: ReceiptText },
  { to: '/app/profile', key: 'common.profile', icon: CircleUserRound },
];

const staffLinks = [
  { to: '/app/staff', key: 'common.dashboard', icon: Home, end: true },
  { to: '/app/staff/appointments', key: 'nav.appointments', icon: CalendarDays },
  { to: '/app/staff/quick-add', key: 'nav.quickAdd', icon: ReceiptText },
  { to: '/app/staff/expenses', key: 'nav.expenses', icon: ReceiptText },
  { to: '/app/staff/handover', key: 'nav.handover', icon: Send, permission: 'transfer.create' },
  { to: '/app/staff/records', key: 'nav.records', icon: BarChart3 },
  { to: '/app/staff/payment-flags', key: 'owner.paymentFlags', icon: AlertTriangle },
  { to: '/app/profile', key: 'common.profile', icon: CircleUserRound },
];

export default function SideNav() {
  const { t } = useTranslation();
  const role = useSelector(selectRole);
  const permissions = useSelector(selectPermissions);
  const links =
    role === 'OWNER' ? ownerLinks : role === 'ACCOUNTANT' ? accountantLinks : staffLinks;

  return (
    <aside className="hidden w-72 shrink-0 border-e border-navy/10 bg-white p-4 lg:block">
      <div className="sticky top-[92px] max-h-[calc(100vh-110px)] space-y-1 overflow-y-auto pe-1">
        <p className="px-3 pb-2 font-cairo text-xs font-bold uppercase tracking-[0.15em] text-navy/45">
          {role === 'OWNER'
            ? t('owner.navSection')
            : role === 'ACCOUNTANT'
              ? t('accountant.navSection')
              : t('shell.operations')}
        </p>

        {links.map(({ to, key, icon: Icon, end, permission }) => {
          if (permission && !permissions?.[permission]) return null;
          return <NavItem key={to} to={to} label={t(key)} icon={Icon} end={end} />;
        })}
      </div>
    </aside>
  );
}

function NavItem({ to, label, icon: Icon, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex min-h-12 items-center gap-3 rounded-xl px-3 font-cairo text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge ${
          isActive ? 'bg-ball text-navy shadow-sm' : 'text-navy/70 hover:bg-navy/5 hover:text-navy'
        }`
      }
    >
      <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}
