import {
  ArrowLeft,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  UserRound,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  useCreatePaymentFlagMutation,
  useGetAppointmentQuery,
  useGetIncomesQuery,
  useGetPaymentFlagsQuery,
} from '../../app/api';
import { formatDateTime, formatTime } from '../../shared/lib/date';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import { errorMessage } from '../../shared/lib/apiError';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import ErrorState from '../../shared/ui/ErrorState';
import Skeleton from '../../shared/ui/Skeleton';
import { useClientRequestId } from '../../shared/lib/clientRequestId';

export default function OwnerBookingDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const appointment = useGetAppointmentQuery(id);
  const incomes = useGetIncomesQuery(id ? { appointmentId: id, limit: 50 } : undefined, {
    skip: !id,
    refetchOnMountOrArgChange: true,
  });
  const flags = useGetPaymentFlagsQuery(id ? { appointmentId: id, limit: 10 } : undefined, {
    skip: !id,
    refetchOnMountOrArgChange: true,
  });
  const [createFlag, flagState] = useCreatePaymentFlagMutation();
  const requestId = useClientRequestId();
  const [flagNote, setFlagNote] = useState('');

  if (appointment.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
      </div>
    );
  if (appointment.isError)
    return (
      <ErrorState
        title={t('errors.generic')}
        description={errorMessage(appointment.error, t)}
        onRetry={appointment.refetch}
      />
    );

  const item = appointment.data;
  const payment = item?.payment ?? {};
  const underpaid = payment.due > 0 && payment.collected > 0;
  const existingFlag = flags.data?.items?.[0];
  const showFlagPanel = underpaid || Boolean(existingFlag);

  async function submitFlag(event) {
    event.preventDefault();
    if (!flagNote.trim()) return;
    try {
      await createFlag({
        clientRequestId: requestId.id,
        appointmentId: id,
        note: flagNote.trim(),
      }).unwrap();
      requestId.regenerate();
      setFlagNote('');
      flags.refetch();
    } catch {
      // Error rendered below.
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={t('owner.navAppointments')}
        title={item.customer?.name || t('staff.walkIn')}
        description={t('owner.bookingDetailDescription')}
        actions={
          <Link to="/app/owner/bookings">
            <Button variant="ghost">
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t('common.back')}
            </Button>
          </Link>
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="bg-navy p-6 text-white sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  tone={
                    payment.needsAttention
                      ? 'warning'
                      : payment.state === 'PAID'
                        ? 'success'
                        : 'neutral'
                  }
                >
                  {t(`payment.${payment.state}`, payment.state || t('payment.UNKNOWN'))}
                </Badge>
                {underpaid && <Badge tone="danger">{t('owner.underpaidWarning')}</Badge>}
              </div>
              <h2 className="mt-3 font-cairo text-2xl font-black">
                {item.court?.name || t('staff.court')}
              </h2>
              <p className="mt-2 font-tajawal text-sm text-white/70">
                {item.service || t('staff.padelBooking')}
              </p>
            </div>
            <CalendarDays className="size-7 text-ball" aria-hidden="true" />
          </div>
        </div>

        <div className="grid gap-0 sm:grid-cols-3 lg:grid-cols-3">
          <Summary
            label={t('staff.expected')}
            value={formatEgpWithCurrency(payment.expected ?? 0, locale)}
          />
          <Summary
            label={t('staff.collected')}
            value={formatEgpWithCurrency(payment.collected ?? 0, locale)}
          />
          <Summary label={t('staff.due')} value={formatEgpWithCurrency(payment.due ?? 0, locale)} />
        </div>
      </Card>

      {showFlagPanel && (
        <Card className="border-amber-200 bg-amber-50 p-5 text-amber-950 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="font-cairo text-base font-black">
                {t(
                  existingFlag?.status === 'RESOLVED'
                    ? 'owner.paymentFlagResolvedTitle'
                    : 'owner.underpaidTitle',
                )}
              </h2>
              <p className="mt-1 font-tajawal text-sm leading-7">
                {t(
                  existingFlag?.status === 'RESOLVED'
                    ? 'owner.paymentFlagResolvedDescription'
                    : 'owner.underpaidDescription',
                )}
              </p>
              <p className="mt-1 font-tajawal text-xs leading-6 text-amber-950/70">
                {t('owner.paymentFlagAutomaticHint')}
              </p>

              {!existingFlag ? (
                <form className="mt-4 space-y-3" onSubmit={submitFlag}>
                  <Input
                    label={t('owner.paymentFlagNote')}
                    value={flagNote}
                    onChange={(e) => setFlagNote(e.target.value)}
                    placeholder={t('owner.paymentFlagNotePlaceholder')}
                  />
                  {flagState.error && (
                    <p className="font-tajawal text-sm text-red-800" role="alert">
                      {errorMessage(flagState.error, t)}
                    </p>
                  )}
                  <Button type="submit" loading={flagState.isLoading} disabled={!flagNote.trim()}>
                    {t('owner.raisePaymentFlag')}
                  </Button>
                </form>
              ) : (
                <div className="mt-4 rounded-xl border border-amber-300/60 bg-white/55 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={existingFlag.status === 'PENDING' ? 'warning' : 'success'}>
                      {t(`paymentFlagStatus.${existingFlag.status}`)}
                    </Badge>
                    <Badge
                      tone={existingFlag.origin === 'AUTO_UNDERPAYMENT' ? 'warning' : 'neutral'}
                    >
                      {t(`paymentFlagOrigin.${existingFlag.origin || 'OWNER'}`)}
                    </Badge>
                    <span className="font-tajawal text-xs text-amber-950/65">
                      {t('owner.paymentFlagAssignedTo')}: {existingFlag.assignedTo?.name || '—'}
                    </span>
                  </div>
                  <p className="mt-2 font-tajawal text-sm leading-6 text-amber-950/75">
                    {existingFlag.note}
                  </p>
                  {existingFlag.replyNote && (
                    <p className="mt-2 rounded-lg bg-white/70 p-3 font-tajawal text-sm leading-6 text-amber-950">
                      <strong>
                        {t(
                          existingFlag.status === 'RESOLVED'
                            ? 'owner.paymentFlagResolution'
                            : 'owner.paymentFlagReply',
                        )}
                        :
                      </strong>{' '}
                      {existingFlag.replyNote}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <UserRound className="size-5 text-edge" aria-hidden="true" />
            <h2 className="font-cairo text-lg font-extrabold text-navy">
              {t('owner.bookingCustomer')}
            </h2>
          </div>
          <div className="mt-5 space-y-3">
            <Info
              label={t('accountant.customer')}
              value={item.customer?.name || t('staff.walkIn')}
            />
            <Info label={t('accountant.customerPhone')} value={item.customer?.phone || '—'} />
            <Info label={t('staff.businessDayLabel')} value={item.businessDate || '—'} />
            <Info
              label={t('owner.bookingTime')}
              value={`${formatTime(item.startsAt, locale)} – ${formatTime(item.endsAt, locale)}`}
            />
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Clock3 className="size-5 text-edge" aria-hidden="true" />
            <h2 className="font-cairo text-lg font-extrabold text-navy">
              {t('owner.paymentHistory')}
            </h2>
          </div>
          <div className="mt-5 space-y-3">
            {incomes.isLoading ? (
              <Skeleton className="h-24" />
            ) : (incomes.data?.items ?? []).length ? (
              incomes.data.items.map((income) => (
                <div key={income.id} className="rounded-xl border border-navy/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-cairo text-sm font-bold text-navy">
                        {t(`method.${income.method}`)}
                      </p>
                      <p className="mt-1 font-tajawal text-xs text-navy/50">
                        {formatDateTime(income.recordedAt, locale)}
                      </p>
                      <p className="mt-1 font-tajawal text-xs text-navy/60">
                        {t('accountant.recordedBy')}: {income.recordedBy?.name || '—'}
                      </p>
                    </div>
                    <p className="font-cairo text-sm font-black text-navy">
                      {formatEgpWithCurrency(income.amount, locale)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {income.verification === 'VERIFIED' ||
                    income.verification === 'NOT_REQUIRED' ? (
                      <CheckCircle2 className="size-4 text-ball" aria-hidden="true" />
                    ) : (
                      <Clock3 className="size-4 text-edge" aria-hidden="true" />
                    )}
                    <Badge
                      tone={
                        income.verification === 'PENDING'
                          ? 'warning'
                          : income.verification === 'REJECTED'
                            ? 'danger'
                            : 'success'
                      }
                    >
                      {t(`verification.${income.verification}`)}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="font-tajawal text-sm text-navy/50">{t('owner.noPaymentHistory')}</p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div className="border-b border-navy/10 p-5 sm:border-e lg:border-b-0 lg:last:border-e-0">
      <p className="font-cairo text-xs font-semibold text-navy/50">{label}</p>
      <p className="mt-2 font-cairo text-xl font-black text-navy">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-navy/10 p-4">
      <p className="font-cairo text-xs font-semibold text-navy/45">{label}</p>
      <p className="mt-1 font-tajawal text-sm font-bold text-navy">{value}</p>
    </div>
  );
}
