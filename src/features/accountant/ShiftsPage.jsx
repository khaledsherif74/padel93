import { CalendarDays, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetShiftQuery, useGetShiftsQuery } from '../../app/api';
import { formatDateTime } from '../../shared/lib/date';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import { errorMessage } from '../../shared/lib/apiError';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Select from '../../shared/ui/Select';
import Skeleton from '../../shared/ui/Skeleton';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';

export default function ShiftsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const [status, setStatus] = useState('CLOSED');
  const [date, setDate] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const query = useGetShiftsQuery({
    status: status || undefined,
    ...(date ? { date } : {}),
    limit: 50,
  });
  const detail = useGetShiftQuery(selectedId, { skip: !selectedId });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={t('accountant.shiftsEyebrow')}
        title={t('accountant.shiftsTitle')}
        description={t('accountant.shiftsDescription')}
        actions={
          <Button variant="ghost" onClick={query.refetch}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {t('common.refresh')}
          </Button>
        }
      />

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-[180px_1fr_auto] md:items-end">
          <Select
            label={t('common.status')}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={[
              ['', t('common.all')],
              ['OPEN', t('shiftStatus.OPEN')],
              ['CLOSED', t('shiftStatus.CLOSED')],
            ].map(([value, label]) => ({ value, label }))}
          />
          <label className="block">
            <span className="mb-2 block font-cairo text-sm font-semibold text-navy">
              {t('accountant.filterDate')}
            </span>
            <div className="flex min-h-12 items-center gap-2 rounded-xl border border-navy/10 bg-white px-4 focus-within:border-edge focus-within:ring-2 focus-within:ring-edge/15">
              <CalendarDays className="size-4 text-edge" aria-hidden="true" />
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="min-w-0 flex-1 bg-transparent font-tajawal text-base text-navy outline-none"
              />
            </div>
          </label>
          <Button
            variant="ghost"
            onClick={() => {
              setStatus('CLOSED');
              setDate('');
            }}
          >
            {t('common.reset')}
          </Button>
        </div>
      </Card>

      {query.isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-28" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title={t('errors.generic')}
          description={errorMessage(query.error, t)}
          onRetry={query.refetch}
        />
      ) : query.data?.items?.length === 0 ? (
        <EmptyState title={t('accountant.noShifts')} description={t('accountant.noShiftsHint')} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-card">
          <div className="hidden grid-cols-[1fr_0.7fr_0.75fr_0.75fr_0.75fr_0.65fr] gap-4 border-b border-navy/10 bg-navy/[0.025] px-5 py-3 lg:grid">
            <TableHead text={t('accountant.staffMember')} />
            <TableHead text={t('accountant.openedAt')} />
            <TableHead text={t('accountant.bookedTotal')} />
            <TableHead text={t('accountant.expectedCash')} />
            <TableHead text={t('accountant.counted')} />
            <TableHead text={t('accountant.variance')} />
          </div>

          {query.data.items.map((shift) => {
            const variance = Number(shift.variance ?? 0);
            const expanded = selectedId === shift.id;
            return (
              <div key={shift.id} className="border-b border-navy/7 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setSelectedId(expanded ? null : shift.id)}
                  className="grid w-full gap-3 px-4 py-4 text-start outline-none transition hover:bg-navy/[0.02] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-edge lg:grid-cols-[1fr_0.7fr_0.75fr_0.75fr_0.75fr_0.65fr] lg:items-center lg:gap-4 lg:px-5"
                >
                  <div>
                    <p className="font-cairo text-sm font-bold text-navy">
                      {shift.openedBy?.name ?? '—'}
                    </p>
                    <p className="mt-1 font-tajawal text-xs text-navy/45">
                      {shift.status === 'OPEN' ? t('shiftStatus.OPEN') : t('shiftStatus.CLOSED')}
                    </p>
                  </div>
                  <p className="font-tajawal text-xs text-navy/55">
                    {formatDateTime(shift.openedAt, locale)}
                  </p>
                  <p className="font-cairo text-sm font-semibold text-navy">
                    {shift.bookedTotal == null
                      ? '—'
                      : formatEgpWithCurrency(shift.bookedTotal, locale)}
                  </p>
                  <p className="font-cairo text-sm font-semibold text-navy">
                    {shift.status === 'OPEN'
                      ? shift.expectedCashNow != null
                        ? formatEgpWithCurrency(shift.expectedCashNow, locale)
                        : '—'
                      : shift.expectedCash == null
                        ? '—'
                        : formatEgpWithCurrency(shift.expectedCash, locale)}
                  </p>
                  <p className="font-cairo text-sm font-semibold text-navy">
                    {shift.countedCash == null
                      ? '—'
                      : formatEgpWithCurrency(shift.countedCash, locale)}
                  </p>
                  <div className="flex items-center justify-between gap-2 lg:justify-end">
                    <Badge tone={variance === 0 ? 'success' : 'danger'}>
                      {shift.variance == null ? '—' : formatEgpWithCurrency(variance, locale)}
                    </Badge>
                    {expanded ? (
                      <ChevronUp className="size-4 text-navy/35" />
                    ) : (
                      <ChevronDown className="size-4 text-navy/35" />
                    )}
                  </div>
                </button>

                {expanded && <ShiftDetail detail={detail} locale={locale} t={t} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ShiftDetail({ detail, locale, t }) {
  if (detail.isLoading)
    return (
      <div className="px-4 pb-5">
        <Skeleton className="h-40" />
      </div>
    );
  if (detail.isError)
    return (
      <div className="px-4 pb-5">
        <ErrorState
          title={t('errors.generic')}
          description={errorMessage(detail.error, t)}
          onRetry={detail.refetch}
        />
      </div>
    );
  const data = detail.data ?? {};
  return (
    <div className="mx-4 mb-5 rounded-2xl border border-navy/10 bg-navy/[0.02] p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat
          label={t('accountant.openingFloat')}
          value={formatEgpWithCurrency(data.openingFloat ?? 0, locale)}
        />
        <Stat
          label={t('accountant.bookedTotal')}
          value={formatEgpWithCurrency(data.bookedTotal ?? 0, locale)}
        />
        <Stat
          label={t('accountant.expectedNow')}
          value={
            data.expectedCashNow == null ? '—' : formatEgpWithCurrency(data.expectedCashNow, locale)
          }
        />
        <Stat
          label={t('accountant.counted')}
          value={data.countedCash == null ? '—' : formatEgpWithCurrency(data.countedCash, locale)}
        />
        <Stat
          label={t('accountant.variance')}
          value={data.variance == null ? '—' : formatEgpWithCurrency(data.variance, locale)}
        />
      </div>
      {data.closeNote && <p className="mt-4 font-tajawal text-sm text-navy/60">{data.closeNote}</p>}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-navy/10 bg-white p-3">
      <p className="font-cairo text-[11px] font-semibold text-navy/45">{label}</p>
      <p className="mt-1 font-cairo text-sm font-black text-navy">{value}</p>
    </div>
  );
}

function TableHead({ text }) {
  return (
    <p className="font-cairo text-[11px] font-bold uppercase tracking-wide text-navy/45">{text}</p>
  );
}
