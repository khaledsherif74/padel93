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
import { ownerLinks } from './ownerLinks';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { selectRole } from '../../features/auth/authSelectors';

const profileLink = { to: '/app/profile', key: 'common.profile', icon: CircleUserRound };

export default function SideNav() {
  const { t } = useTranslation();
  const role = useSelector(selectRole);
  if (role !== 'OWNER') return null;
  const links = [...ownerLinks, profileLink];

  return (
    <aside className="hidden w-72 shrink-0 border-e border-navy/10 bg-white p-4 lg:block">
      <div className="sticky top-[92px] max-h-[calc(100vh-110px)] space-y-1 overflow-y-auto pe-1">
        <p className="px-3 pb-2 font-cairo text-xs font-bold uppercase tracking-[0.15em] text-navy/45">
          {t('owner.navSection')}
        </p>

        {links.map(({ to, key, icon: Icon, end }) => (
          <NavItem key={to} to={to} label={t(key)} icon={Icon} end={end} />
        ))}
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
