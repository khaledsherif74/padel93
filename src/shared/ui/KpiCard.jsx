import Card from './Card';

export default function KpiCard({ label, value, detail, icon: Icon }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-cairo text-xs font-semibold text-navy/50 dark:text-white/50">
            {label}
          </p>
          <p className="mt-2 truncate font-cairo text-2xl font-black text-navy dark:text-white">
            {value}
          </p>
          {detail && (
            <p className="mt-1 font-tajawal text-xs text-navy/50 dark:text-white/50">{detail}</p>
          )}
        </div>
        {Icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ball text-ball">
            <Icon className="size-4" strokeWidth={1.8} aria-hidden="true" />
          </div>
        )}
      </div>
    </Card>
  );
}
