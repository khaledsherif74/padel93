import Skeleton from './Skeleton';

const TONES = {
  navy: 'border-s-navy',
  green: 'border-s-emerald-600',
  red: 'border-s-red-600',
  amber: 'border-s-amber-500',
  blue: 'border-s-edge',
};

export default function StatCard({ label, value, hint, tone = 'navy', loading = false }) {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-navy/10 border-s-[6px] bg-white p-4 shadow-card ${TONES[tone] ?? TONES.navy}`}
    >
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="break-words font-cairo text-2xl font-black leading-tight text-navy">
          {value ?? '—'}
        </p>
      )}
      <p className="mt-1 font-cairo text-xs font-semibold text-navy/60">{label}</p>
      {hint && <p className="mt-1 font-tajawal text-xs leading-5 text-navy/45">{hint}</p>}
    </div>
  );
}
