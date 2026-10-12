import { AlertCircle, CalendarDays, Filter, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetAppointmentsQuery, useGetSettingsQuery } from '../../app/api';
import { businessDate, formatTime } from '../../shared/lib/date';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import { errorMessage } from '../../shared/lib/apiError';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';
import Skeleton from '../../shared/ui/Skeleton';

export default function OwnerBookingsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const settings = useGetSettingsQuery();
  const closeTime = settings.data?.closeTime || '04:00';
  const [date, setDate] = useState(businessDate(undefined, closeTime));
  const [court, setCourt] = useState('');
  const [needsAttention, setNeedsAttention] = useState(false);
  const query = useGetAppointmentsQuery({ date, ...(needsAttention ? { needsAttention: 'true' } : {}) }, { refetchOnMountOrArgChange: true, refetchOnFocus: true });

  const items = useMemo(() => (query.data?.items ?? []).filter((item) => !court || String(item.court?.id) === court), [query.data?.items, court]);

  function reset() {
    setDate(businessDate(undefined, closeTime));
    setCourt('');
    setNeedsAttention(false);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow={t('owner.eyebrow')} title={t('owner.navAppointments')} description={t('owner.bookingsDescription')} />

      <Card className="p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 font-cairo text-sm font-semibold"><CalendarDays className="size-4 text-edge" aria-hidden="true" />{t('staff.businessDayLabel')}</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-12 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-base text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15" />
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 font-cairo text-sm font-semibold"><Filter className="size-4 text-edge" aria-hidden="true" />{t('staff.courtFilter')}</span>
            <select value={court} onChange={(e) => setCourt(e.target.value)} className="min-h-12 w-full min-w-44 rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-base text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15">
              <option value="">{t('common.all')}</option>
              {Array.from({ length: settings.data?.courts || 2 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{t('staff.courtNumber', { number: value })}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setNeedsAttention((value) => !value)} aria-pressed={needsAttention} className={`inline-flex min-h-12 items-center gap-2 rounded-xl border px-4 font-cairo text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-edge ${needsAttention ? 'border-ball bg-ball text-navy' : 'border-navy/10 bg-white text-navy hover:bg-navy/5'}`}><AlertCircle className="size-4" aria-hidden="true" />{t('staff.needsAttention')}</button>
            <Button variant="ghost" onClick={reset}>{t('common.reset')}</Button>
          </div>
        </div>
      </Card>

      {query.isLoading ? (
        <div className="grid gap-3">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : query.isError ? (
        <ErrorState title={t('errors.generic')} description={errorMessage(query.error, t)} onRetry={query.refetch} />
      ) : items.length === 0 ? (
        <EmptyState title={needsAttention ? t('staff.noAttention') : t('staff.noAppointments')} description={t('staff.noAppointmentsHint')} />
      ) : (
        <div className="space-y-3">
          {items.map((appointment) => (
            <Link key={appointment.id} to={`/app/owner/bookings/${appointment.id}`} className="group block outline-none focus-visible:ring-2 focus-visible:ring-edge rounded-2xl">
              <Card className="p-4 transition group-hover:border-edge/30 group-hover:shadow-md sm:p-5">
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-cairo text-lg font-extrabold text-navy">{appointment.customer?.name || t('staff.walkIn')}</h2>
                      <Badge tone={appointment.payment?.needsAttention ? 'warning' : appointment.payment?.state === 'PAID' ? 'success' : 'neutral'}>{t(`payment.${appointment.payment?.state}`, appointment.payment?.state || t('payment.UNKNOWN'))}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-tajawal text-sm text-navy/55"><span>{appointment.court?.name || t('staff.court')}</span><span>{appointment.service || t('staff.padelBooking')}</span><span>{formatTime(appointment.startsAt, locale)} – {formatTime(appointment.endsAt, locale)}</span></div>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-navy/7 pt-3 sm:min-w-44 sm:border-0 sm:pt-0 sm:text-end"><div><p className="font-cairo text-xs font-semibold text-navy/45">{t('staff.due')}</p><p className="mt-1 font-cairo text-lg font-black text-navy">{formatEgpWithCurrency(appointment.payment?.due ?? 0, locale)}</p></div><Search className="size-5 text-edge" aria-hidden="true" /></div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
