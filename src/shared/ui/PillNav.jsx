import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

export default function PillNav({ items }) {
  const { t } = useTranslation();

  return (
    <nav
      className="flex max-w-full gap-2 overflow-x-auto rounded-2xl bg-navy p-1.5"
      aria-label={t('common.sectionNavigation')}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `whitespace-nowrap rounded-xl px-4 py-2.5 font-cairo text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-ball ${
              isActive ? 'bg-ball text-navy' : 'text-white/75 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
