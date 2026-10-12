import { CalendarRange, RefreshCw, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import {
  useGetBooklyChangesQuery,
  useGetBooklyStatusQuery,
  useGetAppointmentQuery,
  useGetIncomesQuery,
  useSyncBooklyMutation,
} from '../../app/api';
import { businessDate } from '../../shared/lib/date';
import { errorMessage } from '../../shared/lib/apiError';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import Skeleton from '../../shared/ui/Skeleton';

const toDate = (value) => DateTime.fromISO(value).toFormat('yyyy-LL-dd');

export default function BooklyPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const today = businessDate();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(toDate(DateTime.fromISO(today).plus({ days: 30 })));
  const [selectedChange, setSelectedChange] = useState(null);
  const status = useGetBooklyStatusQuery();
  const changes = useGetBooklyChangesQuery(undefined, { refetchOnMountOrArgChange: true, refetchOnFocus: true });
  const [sync, syncState] = useSyncBooklyMutation();
  const appointment = useGetAppointmentQuery(selectedChange?.appointmentId, { skip: !selectedChange?.appointmentId });
  const incomes = useGetIncomesQuery(
    selectedChange?.appointmentId ? { appointmentId: selectedChange.appointmentId, limit: 50 } : undefined,
    { skip: !selectedChange?.appointmentId },
  );

  const lastRun = status.data?.runs?.[0];
  const hasChanges = (changes.data?.items?.length ?? 0) > 0;

  async function syncNow() {
    try { await sync({ from, to }).unwrap(); } catch { /* error below */ }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow={t('accountant.booklyEyebrow')} title={t('accountant.booklyTitle')} description={t('accountant.booklyDescription')} />

      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="overflow-hidden p-0">
          <div className="bg-navy px-5 py-5 text-white sm:px-6">
            <p className="font-cairo text-xs font-bold uppercase tracking-[0.14em] text-ball">{t('accountant.booklyStatus')}</p>
            <h2 className="mt-1 font-cairo text-xl font-black">{status.data?.mode ? status.data.mode.toUpperCase() : '—'}</h2>
          </div>
          <div className="space-y-3 p-5 sm:p-6">
            <StatusRow label={t('accountant.lastSync')} value={lastRun?.startedAt ? new Date(lastRun.startedAt).toLocaleString(locale) : t('accountant.never')} />
            {lastRun ? (
              <div className="rounded-2xl border border-navy/10 bg-white p-4">
                <p className="font-cairo text-xs font-bold uppercase tracking-[0.12em] text-navy/45">{t('accountant.lastSyncResult')}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <Metric label={t('accountant.fetched')} value={lastRun.fetched ?? 0} />
                  <Metric label={t('accountant.created')} value={lastRun.created ?? 0} />
                  <Metric label={t('accountant.updated')} value={lastRun.updated ?? 0} />
                  <Metric label={t('accountant.removed')} value={lastRun.removed ?? 0} />
                  <Metric label={t('accountant.changesCount')} value={lastRun.changes ?? 0} />
                </div>
              </div>
            ) : (
              <StatusRow label={t('accountant.lastSyncResult')} value="—" />
            )}
            {lastRun?.error && <p className="rounded-xl bg-red-50 px-4 py-3 font-tajawal text-sm text-red-800" role="alert">{lastRun.error}</p>}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <CalendarRange className="size-5 text-edge" aria-hidden="true" />
            <div>
              <h2 className="font-cairo text-lg font-extrabold text-navy">{t('accountant.syncTitle')}</h2>
              <p className="mt-1 font-tajawal text-sm text-navy/55">{t('accountant.syncHint')}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DateField label={t('accountant.syncFrom')} value={from} onChange={setFrom} />
            <DateField label={t('accountant.syncTo')} value={to} onChange={setTo} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2"><Button loading={syncState.isLoading} onClick={syncNow}><RefreshCw className="size-4" aria-hidden="true" />{t('accountant.syncNow')}</Button></div>
          {syncState.error && <p className="mt-3 font-tajawal text-sm text-red-700" role="alert">{errorMessage(syncState.error, t)}</p>}
        </Card>
      </section>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-4 border-b border-navy/10 px-5 py-5 sm:px-6">
          <div>
            <p className="font-cairo text-xs font-bold uppercase tracking-[0.14em] text-ball">{t('accountant.booklyChangesEyebrow')}</p>
            <h2 className="mt-1 font-cairo text-xl font-black text-navy">{t('accountant.booklyChangesTitle')}</h2>
          </div>
          <Badge tone={hasChanges ? 'warning' : 'success'}>{changes.data?.items?.length ?? 0}</Badge>
        </div>
        {changes.isLoading ? (
          <div className="space-y-3 p-5">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : changes.isError ? (
          <div className="p-5"><p className="font-tajawal text-sm text-red-700" role="alert">{errorMessage(changes.error, t)}</p></div>
        ) : !hasChanges ? (
          <div className="p-5"><EmptyState title={t('accountant.noBooklyChanges')} description={t('accountant.noBooklyChangesHint')} /></div>
        ) : (
          <div>{changes.data.items.map((change) => <ChangeRow key={change.id} change={change} locale={locale} t={t} selected={selectedChange?.id === change.id} onSelect={() => setSelectedChange(change)} />)}</div>
        )}
      </Card>

      {selectedChange && (
        <Card className="overflow-hidden border-edge/25">
          <div className="flex items-start justify-between gap-4 bg-navy px-5 py-5 text-white sm:px-6">
            <div>
              <p className="font-cairo text-xs font-bold uppercase tracking-[0.14em] text-ball">{t('accountant.appointmentDetails')}</p>
              <h2 className="mt-1 font-cairo text-xl font-black">{appointment.data?.court?.name || selectedChange.court || t('common.unavailable')}</h2>
            </div>
            <button type="button" className="rounded-xl p-2 text-white/70 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-ball" onClick={() => setSelectedChange(null)} aria-label={t('common.close')}>
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {appointment.isLoading ? (
            <div className="grid gap-3 p-5 sm:grid-cols-2"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
          ) : appointment.isError ? (
            <div className="p-5"><p className="font-tajawal text-sm text-red-700" role="alert">{errorMessage(appointment.error, t)}</p></div>
          ) : (
            <AppointmentSnapshot appointment={appointment.data} incomes={incomes.data?.items ?? []} locale={locale} t={t} />
          )}
        </Card>
      )}
    </div>
  );
}

function DateField({ label, value, onChange }) { return <label className="block"><span className="mb-2 block font-cairo text-sm font-semibold text-navy">{label}</span><input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="min-h-12 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-base text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15" /></label>; }
function StatusRow({ label, value }) { return <div className="flex items-center justify-between gap-3 rounded-xl border border-navy/10 px-4 py-3"><span className="font-cairo text-xs font-semibold text-navy/50">{label}</span><strong className="font-tajawal text-sm text-navy">{value}</strong></div>; }
function Metric({ label, value }) { return <div className="rounded-xl border border-navy/8 bg-navy/[0.02] p-3"><p className="font-cairo text-[11px] font-semibold text-navy/50">{label}</p><p className="mt-1 font-cairo text-lg font-black text-navy">{value}</p></div>; }
function ChangeRow({ change, locale, t, selected, onSelect }) {
  return (
    <button type="button" onClick={onSelect} className={`block w-full border-b border-navy/7 px-5 py-5 text-start outline-none transition last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-edge sm:px-6 ${selected ? 'bg-court/[0.045]' : 'hover:bg-navy/[0.02]'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><Badge tone={change.hadPayments ? 'danger' : 'warning'}>{change.hadPayments ? t('accountant.afterPayment') : t('accountant.beforePayment')}</Badge><p className="font-cairo text-sm font-bold text-navy">{change.court || t('common.unavailable')}</p></div>
          <p className="mt-2 font-tajawal text-sm text-navy/65">{t('accountant.booklyChangedField', { field: change.field })}</p>
          <p className="mt-1 font-tajawal text-xs text-navy/45">{new Date(change.detectedAt).toLocaleString(locale)}</p>
        </div>
        <div className="rounded-xl border border-navy/10 bg-navy/[0.025] p-3 font-tajawal text-xs leading-6 text-navy/70"><div><strong>{t('accountant.oldValue')}:</strong> {change.oldValue ?? '—'}</div><div><strong>{t('accountant.newValue')}:</strong> {change.newValue ?? '—'}</div></div>
      </div>
      <p className="mt-3 font-tajawal text-xs font-semibold text-edge">{t('accountant.openAppointmentDetails')}</p>
    </button>
  );
}

function AppointmentSnapshot({ appointment, incomes, locale, t }) {
  const payment = appointment.payment ?? {};
  return (
    <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_0.9fr]">
      <div className="space-y-3">
        <InfoRow label={t('staff.court')} value={appointment.court?.name || '—'} />
        <InfoRow label={t('staff.service')} value={appointment.service || '—'} />
        <InfoRow label={t('staff.businessDayLabel')} value={appointment.businessDate || '—'} />
        <InfoRow label={t('accountant.customer')} value={appointment.customer?.name || t('staff.walkIn')} />
        <InfoRow label={t('accountant.customerPhone')} value={appointment.customer?.phone || '—'} />
        <InfoRow label={t('accountant.booklyStatusLabel')} value={appointment.status || '—'} />
      </div>
      <div className="space-y-3">
        <InfoRow label={t('staff.expected')} value={formatEgpWithCurrency(payment.expected ?? 0, locale)} />
        <InfoRow label={t('staff.collected')} value={formatEgpWithCurrency(payment.collected ?? 0, locale)} />
        <InfoRow label={t('staff.waived')} value={formatEgpWithCurrency(payment.waived ?? 0, locale)} />
        <InfoRow label={t('staff.due')} value={formatEgpWithCurrency(payment.due ?? 0, locale)} />
        <div className="rounded-2xl border border-navy/10 p-4">
          <p className="font-cairo text-xs font-bold uppercase tracking-[0.12em] text-navy/45">{t('accountant.paymentRecords')}</p>
          <div className="mt-3 space-y-2">
            {incomes.length ? incomes.map((income) => (
              <div key={income.id} className="flex items-center justify-between gap-3 rounded-xl bg-navy/[0.03] px-3 py-2">
                <span className="font-tajawal text-xs text-navy/65">{t(`method.${income.method}`)} · {income.recordedBy?.name || '—'}</span>
                <strong className="font-cairo text-sm text-navy">{formatEgpWithCurrency(income.amount, locale)}</strong>
              </div>
            )) : <p className="font-tajawal text-xs text-navy/50">{t('accountant.noPaymentRecords')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) { return <div className="rounded-xl border border-navy/10 p-4"><p className="font-cairo text-[11px] font-semibold text-navy/45">{label}</p><p className="mt-1 font-tajawal text-sm font-semibold text-navy">{value}</p></div>; }
