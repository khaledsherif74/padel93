import {
  AlertTriangle,
  BarChart3,
  Home,
  ReceiptText,
  Settings2,
  CircleUserRound,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectRole } from '../../features/auth/authSelectors';

export default function MobileNav() {
  const { t } = useTranslation();
  const role = useSelector(selectRole);

  if (role === 'OWNER') {
    return (
      <Nav
        links={[
          { to: '/app/owner', key: 'owner.navDashboard', icon: Home, end: true },
          { to: '/app/owner/payment-flags', key: 'owner.paymentFlags', icon: AlertTriangle },
          { to: '/app/owner/settings', key: 'owner.navSettings', icon: Settings2 },
          { to: '/app/profile', key: 'common.profile', icon: CircleUserRound },
        ]}
        t={t}
      />
    );
  }

  if (role === 'ACCOUNTANT') {
    return (
      <Nav
        links={[
          { to: '/app/accountant', key: 'accountant.navDashboard', icon: Home, end: true },
          { to: '/app/accountant/reports', key: 'accountant.navReports', icon: BarChart3 },
          { to: '/app/accountant/expenses', key: 'accountant.navExpenses', icon: ReceiptText },
          { to: '/app/profile', key: 'common.profile', icon: CircleUserRound },
        ]}
        t={t}
      />
    );
  }

  if (role !== 'STAFF') return null;

  return (
    <Nav
      links={[
        { to: '/app/staff', key: 'common.dashboard', icon: Home, end: true },
        { to: '/app/staff/payment-flags', key: 'owner.paymentFlags', icon: AlertTriangle },
        { to: '/app/profile', key: 'common.profile', icon: CircleUserRound },
      ]}
      t={t}
    />
  );
}

function Nav({ links, t }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-navy/10 bg-white px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(0,35,70,0.08)] lg:hidden"
      aria-label={t('common.primaryNavigation')}
    >
      <div className="mx-auto flex max-w-md justify-around gap-1.5 px-1">
        {links.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 font-cairo text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge ${
                isActive ? 'bg-ball text-navy' : 'text-navy hover:bg-navy/5 hover:text-navy'
              }`
            }
          >
            <Icon className="size-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <span className="max-w-full truncate">{t(key)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
