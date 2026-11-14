import { Link } from 'react-router-dom';

export default function BottomDock({
  totalBalanceLabel,
  totalBalanceValue,
  handoverLabel,
  handoverValue,
  actions = [],
}) {
  return (
    <section
      className="rounded-2xl border border-navy/10 bg-white p-3 shadow-card space-y-3"
      aria-label="Staff actions"
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-navy/[0.04] px-3 py-2">
          <p className="font-tajawal text-xs font-semibold text-navy/55">{totalBalanceLabel}</p>
          <p className="font-cairo text-base font-black tabular-nums text-navy">
            {totalBalanceValue}
          </p>
        </div>
        <Link
          to="/app/staff/handover"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 outline-none transition hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-edge"
        >
          <p className="font-tajawal text-xs font-semibold text-amber-900/70">{handoverLabel}</p>
          <p className="font-cairo text-base font-black tabular-nums text-amber-900">
            {handoverValue}
          </p>
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          const className = `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 font-cairo text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-edge ${
            action.variant === 'primary'
              ? 'bg-ball text-navy hover:bg-ball/90'
              : 'bg-navy/5 text-navy hover:bg-navy/10'
          } ${action.disabled ? 'opacity-50' : ''}`;
          const content = (
            <>
              <Icon className="size-5" strokeWidth={1.9} aria-hidden="true" />
              <span className="text-center leading-tight">{action.label}</span>
            </>
          );
          if (action.to && !action.disabled) {
            return (
              <Link key={action.key} to={action.to} className={className}>
                {content}
              </Link>
            );
          }
          return (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={className}
            >
              {content}
            </button>
          );
        })}
      </div>
    </section>
  );
}
