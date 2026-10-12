import { AlertCircle, CalendarDays, Filter, RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useGetAppointmentsQuery, useGetSettingsQuery } from '../../app/api';
import { selectPermissions } from '../auth/authSelectors';
import { businessDate, formatTime } from '../../shared/lib/date';
import { errorMessage } from '../../shared/lib/apiError';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';
import Skeleton from '../../shared/ui/Skeleton';

export default function AppointmentsPage() {
  const { t, i18n } = useTranslation();
  const permissions = useSelector(selectPermissions);
  const canViewOtherDays = permissions?.['appointment.viewOtherDays'] !== false;
  const { data: settings } = useGetSettingsQuery();
  const closeTime = settings?.closeTime || '04:00';
  const today = businessDate(undefined, closeTime);

  const [date, setDate] = useState(today);
  const [needsAttention, setNeedsAttention] = useState(false);
  const [court, setCourt] = useState('');

  const query = useGetAppointmentsQuery(
    {
      date,
      ...(court ? { court: Number(court) } : {}),
      ...(needsAttention ? { needsAttention: 'true' } : {}),
    },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true },
  );
  const visibleItems = query.data?.items ?? [];

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

  function resetFilters() {
    setDate(today);
    setNeedsAttention(false);
    setCourt('');
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow={t('staff.eyebrow')}
        title={t('nav.appointments')}
        description={t('staff.appointmentsDescription')}
      />

      <Card className="mb-5 p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 font-cairo text-sm font-semibold">
              <CalendarDays className="size-4 text-edge" aria-hidden="true" />
              {t('staff.businessDayLabel')}
            </span>
            <input
              type="date"
              value={date}
              min={canViewOtherDays ? undefined : today}
              max={canViewOtherDays ? undefined : today}
              disabled={!canViewOtherDays}
              onChange={(event) => setDate(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-base text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15 disabled:cursor-not-allowed disabled:bg-navy/5 disabled:text-navy/40"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 font-cairo text-sm font-semibold">
              <Filter className="size-4 text-edge" aria-hidden="true" />
              {t('staff.courtFilter')}
            </span>
            <select
              value={court}
              onChange={(event) => setCourt(event.target.value)}
              className="min-h-12 w-full min-w-44 rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-base text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
            >
              <option value="">{t('common.all')}</option>
              {Array.from({ length: settings?.courts || 2 }, (_, index) => index + 1).map(
                (value) => (
                  <option key={value} value={value}>
                    {t('staff.courtNumber', { number: value })}
                  </option>
                ),
              )}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setNeedsAttention((value) => !value)}
              className={`inline-flex min-h-12 items-center gap-2 rounded-xl border px-4 font-cairo text-sm font-bold transition outline-none focus-visible:ring-2 focus-visible:ring-edge ${
                needsAttention
                  ? 'border-ball bg-ball text-navy'
                  : 'border-navy/10 bg-white text-navy hover:bg-navy/5'
              }`}
              aria-pressed={needsAttention}
            >
              <AlertCircle className="size-4" aria-hidden="true" />
              {t('staff.needsAttention')}
            </button>

            <Button variant="ghost" onClick={resetFilters}>
              <RotateCcw className="size-4" aria-hidden="true" />
              {t('common.reset')}
            </Button>
          </div>
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
      ) : visibleItems.length === 0 ? (
        <EmptyState
          title={needsAttention ? t('staff.noAttention') : t('staff.noAppointments')}
          description={t('staff.noAppointmentsHint')}
        />
      ) : (
        <div className="space-y-3">
          {visibleItems.map((appointment) => (
            <AppointmentRow key={appointment.id} appointment={appointment} locale={locale} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function AppointmentRow({ appointment, locale, t }) {
  const badge = paymentBadge(appointment.payment?.state, t);
  return (
    <Link to={`/app/staff/appointments/${appointment.id}`} className="group block">
      <Card className="p-4 transition group-hover:border-edge/30 group-hover:shadow-md sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-cairo text-lg font-extrabold">
                {appointment.customer?.name || t('staff.walkIn')}
              </h2>
              <Badge tone={badge.tone}>{badge.label}</Badge>
              {appointment.payment?.needsAttention && (
                <Badge tone="warning">{t('staff.attention')}</Badge>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-tajawal text-sm text-navy/55">
              <span>{appointment.court?.name || t('staff.court')}</span>
              <span>{appointment.service || t('staff.padelBooking')}</span>
              <span>
                {formatTime(appointment.startsAt, locale)} –{' '}
                {formatTime(appointment.endsAt, locale)}
              </span>
            </div>

            {appointment.customer?.phone && (
              <p className="mt-2 font-tajawal text-xs text-navy/45">{appointment.customer.phone}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-navy/7 pt-3 sm:min-w-44 sm:border-0 sm:pt-0 sm:text-end">
            <div>
              <p className="font-cairo text-xs font-semibold text-navy/45">{t('staff.due')}</p>
              <p className="mt-1 font-cairo text-lg font-black">
                {(appointment.payment?.due / 100).toFixed(2)} EGP
              </p>
            </div>
            <Search className="size-5 text-edge" aria-hidden="true" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

function paymentBadge(state, t) {
  const values = {
    PAID: { tone: 'success', label: t('payment.PAID') },
    PARTIAL: { tone: 'warning', label: t('payment.PARTIAL') },
    UNPAID: { tone: 'danger', label: t('payment.UNPAID') },
    PENDING_EXCEPTION: { tone: 'warning', label: t('payment.PENDING_EXCEPTION') },
    WAIVED: { tone: 'info', label: t('payment.WAIVED') },
    OVERPAID: { tone: 'success', label: t('payment.OVERPAID') },
  };
  return values[state] || { tone: 'neutral', label: state || t('payment.UNKNOWN') };
}
