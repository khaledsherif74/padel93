import { LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BottomDock({
  totalBalanceLabel,
  totalBalanceValue,
  handoverLabel,
  handoverValue,
  title,
  actions = [],
}) {
  const mainAction = actions[0];
  const secondaryActions = actions.slice(1);
  const MainIcon = mainAction?.icon ?? LockKeyhole;

  return (
    <section
      className="staff-my-shift rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-[0_8px_24px_rgba(0,35,70,0.06)] sm:p-5"
      aria-label={title}
    >
      <h2 className="mb-3 font-inter text-base font-extrabold text-[#002346]">{title}</h2>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.4fr)]">
        <MetricCard label={totalBalanceLabel} value={totalBalanceValue} />
        <MetricCard label={handoverLabel} value={handoverValue} warning />
        <div className="col-span-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:col-span-1">
          {secondaryActions.map((action) => {
            const Icon = action.icon;
            const className = `flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-2 rounded-[14px] border border-[#D5DDE7] bg-white px-1.5 py-2 text-[#002346] outline-none transition hover:border-[#8DC63F] hover:bg-[#F7FBF1] focus-visible:ring-2 focus-visible:ring-[#01649B] disabled:cursor-not-allowed disabled:opacity-45`;
            const content = (
              <>
                {Icon && <Icon className="size-5 shrink-0" strokeWidth={1.9} aria-hidden="true" />}
                <span className="text-center font-inter text-[11px] font-semibold leading-tight sm:text-xs">
                  {action.label}
                </span>
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
      </div>

      {mainAction && <MainAction action={mainAction} icon={MainIcon} />}
    </section>
  );
}

function MetricCard({ label, value, warning = false }) {
  return (
    <div
      className={`min-w-0 rounded-[14px] px-3 py-3 ${
        warning
          ? 'border border-[#F1D9A0] bg-[#FFF8E6] text-[#6B3A0A]'
          : 'bg-[#F3F5F9] text-[#002346]'
      }`}
    >
      <p
        className={`font-inter text-[11px] font-semibold leading-4 ${warning ? 'text-[#7A4A12]' : 'text-[#4A5A70]'}`}
      >
        {label}
      </p>
      <p className="mt-1 break-words font-inter text-base font-extrabold leading-tight tabular-nums sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function MainAction({ action, icon: Icon }) {
  const className = `mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#002346] px-4 py-3 font-inter text-sm font-bold text-white outline-none transition hover:bg-[#0B3B6E] focus-visible:ring-2 focus-visible:ring-[#8DC63F] disabled:cursor-not-allowed disabled:opacity-45`;
  const content = (
    <>
      <Icon className="size-[18px]" strokeWidth={2} aria-hidden="true" />
      <span>{action.label}</span>
    </>
  );

  if (action.to && !action.disabled) {
    return (
      <Link to={action.to} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} disabled={action.disabled} className={className}>
      {content}
    </button>
  );
}
