import { X } from 'lucide-react';
import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function MobileDrawer({ open, onClose, links }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] lg:hidden" role="presentation">
      <div className="absolute inset-0 bg-navy/60" onMouseDown={onClose} aria-hidden="true" />
      <aside
        className="absolute inset-y-0 start-0 w-72 max-w-[85vw] overflow-y-auto bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={t('common.primaryNavigation')}
      >
        <div className="flex items-center justify-between border-b border-navy/10 px-4 py-4">
          <p className="font-cairo text-sm font-black text-navy">PADEL 93</p>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full text-navy/60 hover:bg-navy/5"
            aria-label={t('common.close')}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {links.map(({ to, key, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex min-h-12 items-center gap-3 rounded-xl px-3 font-cairo text-sm font-semibold transition ${
                  isActive ? 'bg-ball text-navy' : 'text-navy/75 hover:bg-navy/5 hover:text-navy'
                }`
              }
            >
              <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
              <span>{t(key)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  );
}
