import { Pencil } from 'lucide-react';
import { formatTime } from '../../shared/lib/date';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import { canEditIncomeLine } from '../../shared/lib/paymentEdit';
import Badge from '../../shared/ui/Badge';

function Revision({ revision, locale, t }) {
  const { before, after, reason } = revision;
  const changes = [];
  if (before.amount !== after.amount) {
    changes.push(
      `${formatEgpWithCurrency(before.amount, locale)} → ${formatEgpWithCurrency(after.amount, locale)}`,
    );
  }
  if (before.method !== after.method) {
    changes.push(`${t(`method.${before.method}`)} → ${t(`method.${after.method}`)}`);
  }
  if ((before.note ?? '') !== (after.note ?? '')) {
    changes.push(`“${before.note || '—'}” → “${after.note || '—'}”`);
  }
  return (
    <li className="rounded-lg bg-amber-50 px-3 py-2 font-tajawal text-xs leading-5 text-amber-950">
      <span className="font-bold">{changes.join(' · ')}</span>
      <span className="block text-amber-900/75">{t('staff.revisionReason', { reason })}</span>
    </li>
  );
}

export default function BookingPaymentLines({
  incomes = [],
  userId,
  canEditDay,
  locale,
  t,
  onEdit,
}) {
  if (incomes.length === 0) return null;
  const anyEdited = incomes.some((line) => (line.revisions ?? []).length > 0);

  return (
    <details className="mt-4 rounded-xl border border-navy/10 bg-white/70 p-3">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 font-cairo text-sm font-bold text-navy">
        {t('staff.paymentsCount', { count: incomes.length })}
        {anyEdited && <Badge tone="warning">{t('staff.editedBadge')}</Badge>}
      </summary>
      <ul className="mt-3 space-y-2">
        {incomes.map((line) => {
          const revisions = line.revisions ?? [];
          return (
            <li key={line.id} className="rounded-lg border border-navy/10 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 font-tajawal text-xs text-navy/60">
                    <span>{formatTime(line.recordedAt, locale)}</span>
                    <Badge tone={line.method === 'CASH' ? 'neutral' : 'info'}>
                      {t(`method.${line.method}`)}
                    </Badge>
                    {revisions.length > 0 && <Badge tone="warning">{t('staff.editedBadge')}</Badge>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="font-cairo text-base font-black text-navy">
                    {formatEgpWithCurrency(line.amount, locale)}
                  </p>
                  {canEditIncomeLine(line, { userId, canEditDay }) && (
                    <button
                      type="button"
                      onClick={() => onEdit(line)}
                      className="flex size-10 items-center justify-center rounded-lg text-navy/70 outline-none hover:bg-navy/5 focus-visible:ring-2 focus-visible:ring-edge"
                      aria-label={t('staff.editPayment')}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              {revisions.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {revisions.map((revision) => (
                    <Revision key={revision.id} revision={revision} locale={locale} t={t} />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
