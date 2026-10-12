import {
  AlertCircle,
  ArrowRight,
  CircleDollarSign,
  Clock3,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  useGetAppointmentsQuery,
  useGetCurrentShiftsQuery,
  useGetGoalQuery,
  useGetSettingsQuery,
  useOpenShiftMutation,
  useGetMyDrawerQuery,
} from '../../app/api';
import { selectPermissions, selectUser } from '../auth/authSelectors';
import { businessDate, currentMonth, formatTime } from '../../shared/lib/date';
import { errorMessage } from '../../shared/lib/apiError';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import { toPiasters, formatEgpWithCurrency } from '../../shared/lib/money';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import Badge from '../../shared/ui/Badge';
import Skeleton from '../../shared/ui/Skeleton';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';
import MoneyInput from '../../shared/ui/MoneyInput';
import ProgressRing from '../../shared/ui/ProgressRing';
import Modal from '../../shared/ui/Modal';

export default function StaffHomePage() {
  const { t, i18n } = useTranslation();
  const user = useSelector(selectUser);
  const permissions = useSelector(selectPermissions);
  const [needsAttention, setNeedsAttention] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const clientRequest = useClientRequestId();

  const drawer = useGetMyDrawerQuery(undefined, { refetchOnMountOrArgChange: true });

  const { data: settings } = useGetSettingsQuery();
  const closeTime = settings?.closeTime || '04:00';
  const today = businessDate(undefined, closeTime);
  const month = currentMonth();

  const shifts = useGetCurrentShiftsQuery(undefined, { pollingInterval: 15_000 });
  const appointments = useGetAppointmentsQuery({
    date: today,
    ...(needsAttention ? { needsAttention: 'true' } : {}),
  });
  const canViewGoal = permissions?.['goal.view'] !== false;
  const goal = useGetGoalQuery(month, { skip: !canViewGoal });
  const [openShift, openState] = useOpenShiftMutation();

  const shift = shifts.data?.items?.[0] ?? null;
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const goalProgress = Number(goal.data?.progress ?? 0);

  const visibleAppointments = useMemo(
    () => (appointments.data?.items ?? []).slice(0, 8),
    [appointments.data],
  );

  async function submitOpeningFloat(event) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('openingFloat');
    let amount;
    try {
      amount = toPiasters(value);
    } catch {
      return;
    }
    if (!Number.isInteger(amount) || amount < 0) return;

    try {
      await openShift({
        openingFloat: amount,
        clientRequestId: clientRequest.id,
      }).unwrap();
      clientRequest.regenerate();
      setOpenModal(false);
      event.currentTarget.reset();
    } catch {
      // Error shown in the modal.
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={t('staff.eyebrow')}
        title={t('staff.homeTitle', { name: user?.name })}
        description={t('staff.homeDescription')}
        actions={
          <Button variant="secondary" onClick={() => setOpenModal(true)} disabled={Boolean(shift)}>
            <WalletCards className="size-4" aria-hidden="true" />
            {t('staff.openShift')}
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card dark className="p-5 sm:col-span-2 lg:col-span-2">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Clock3 className="size-5 text-ball" aria-hidden="true" />
                <p className="font-cairo text-xs font-bold uppercase tracking-[0.14em] text-ball">
                  {t('staff.shiftStatus')}
                </p>
              </div>

              {shifts.isLoading ? (
                <Skeleton className="mt-4 h-10 w-40 bg-white/10" />
              ) : shift ? (
                <>
                  <h2 className="mt-3 font-cairo text-3xl font-black">
                    {t('staff.shiftOpen')}
                    <span className="ms-2 font-tajawal text-sm font-semibold text-white/60">
                      ({formatTime(shift.openedAt, locale)})
                    </span>
                  </h2>
                  <p className="mt-2 font-tajawal text-sm leading-7 text-white/65">
                    {t('staff.shiftOpenHint')}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mt-3 font-cairo text-3xl font-black">{t('staff.shiftClosed')}</h2>
                  <p className="mt-2 font-tajawal text-sm leading-7 text-white/65">
                    {t('staff.shiftClosedHint')}
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {shift && (
                <Link to={`/app/staff/shifts/${shift.id}/close`}>
                  <Button>
                    {t('staff.closeShift')}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-cairo text-xs font-semibold text-navy/50">{t('staff.myDrawer')}</p>
          {drawer.isLoading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : drawer.data?.open ? (
            <p className="mt-2 font-cairo text-2xl font-black">
              {formatEgpWithCurrency(drawer.data.expectedCashNow ?? 0, locale)}
            </p>
          ) : (
            <p className="mt-2 font-cairo text-2xl font-black">—</p>
          )}
          <p className="mt-1 font-tajawal text-xs text-navy/50">
            {drawer.data?.open ? t('staff.myDrawerHint') : t('staff.noOpenShift')}
          </p>
        </Card>

        <Card className="p-5">
          <p className="font-cairo text-xs font-semibold text-navy/50">{t('staff.today')}</p>
          <p className="mt-2 font-cairo text-2xl font-black">{today}</p>
          <p className="mt-1 font-tajawal text-xs text-navy/50">{t('staff.businessDay')}</p>
        </Card>

        <Card className="p-5">
          <p className="font-cairo text-xs font-semibold text-navy/50">
            {t('staff.appointmentCount')}
          </p>
          <p className="mt-2 font-cairo text-3xl font-black">
            {appointments.data?.items?.length ?? '—'}
          </p>
          <p className="mt-1 font-tajawal text-xs text-navy/50">{t('staff.today')}</p>
        </Card>
      </section>

      {canViewGoal && (
        <Card dark className="overflow-hidden border-navy bg-night p-6 shadow-card-dark sm:p-7">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="font-cairo text-xs font-bold uppercase tracking-[0.14em] text-ball">
                {t('staff.monthlyGoal')}
              </p>
              <h2 className="mt-2 font-cairo text-2xl font-black text-white">
                {goal.data?.goalHours != null
                  ? `${goal.data.goalHours.toFixed(1)} ${t('staff.hours')}`
                  : t('staff.noGoal')}
              </h2>
              {goal.data?.goalHours != null && (
                <p className="mt-2 max-w-xl font-tajawal text-sm leading-7 text-white/65">
                  {t('staff.goalProgressText', {
                    completed: Number(goal.data.completedHours ?? 0).toFixed(1),
                    remaining: Number(goal.data.remainingToPlayHours ?? 0).toFixed(1),
                  })}
                </p>
              )}
            </div>
            {goal.isLoading ? (
              <Skeleton className="size-32 rounded-full bg-white/10" />
            ) : goal.data?.goalHours != null ? (
              <ProgressRing
                value={goalProgress}
                label={`${Math.round(goalProgress * 100)}%`}
                sublabel={t('staff.booked')}
              />
            ) : null}
          </div>
        </Card>
      )}

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-cairo text-xs font-bold uppercase tracking-[0.14em] text-ball">
              {t('staff.todayAppointments')}
            </p>
            <h2 className="mt-1 font-cairo text-2xl font-black">{t('staff.bookingList')}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setNeedsAttention((value) => !value)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-cairo text-sm font-bold transition outline-none focus-visible:ring-2 focus-visible:ring-edge ${
                needsAttention
                  ? 'border-ball bg-ball text-navy'
                  : 'border-navy/10 bg-white text-navy hover:bg-navy/5'
              }`}
              aria-pressed={needsAttention}
            >
              <AlertCircle className="size-4" aria-hidden="true" />
              {t('staff.needsAttention')}
            </button>

            <Link
              to="/app/staff/appointments"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-cairo text-sm font-bold text-edge outline-none focus-visible:ring-2 focus-visible:ring-edge"
            >
              {t('common.seeAll')}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {appointments.isLoading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-24" />
            ))}
          </div>
        ) : appointments.isError ? (
          <ErrorState
            title={t('errors.generic')}
            description={errorMessage(appointments.error, t)}
            onRetry={appointments.refetch}
          />
        ) : visibleAppointments.length === 0 ? (
          <EmptyState
            title={needsAttention ? t('staff.noAttention') : t('staff.noAppointments')}
            description={t('staff.noAppointmentsHint')}
          />
        ) : (
          <div className="grid gap-3">
            {visibleAppointments.map((appointment) => (
              <Link
                key={appointment.id}
                to={`/app/staff/appointments/${appointment.id}`}
                className="group block"
              >
                <Card className="p-4 transition group-hover:-translate-y-px group-hover:border-edge/30">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-cairo text-lg font-extrabold">
                          {appointment.customer?.name || t('staff.walkIn')}
                        </span>
                        <PaymentBadge state={appointment.payment?.state} t={t} />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-tajawal text-sm text-navy/55">
                        <span>{appointment.court?.name || t('staff.court')}</span>
                        <span>
                          {formatTime(appointment.startsAt, locale)} –{' '}
                          {formatTime(appointment.endsAt, locale)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-start sm:text-end">
                        <p className="font-cairo text-xs font-semibold text-navy/45">
                          {t('staff.due')}
                        </p>
                        <p className="mt-1 font-cairo text-base font-black">
                          {formatEgpWithCurrency(appointment.payment?.due ?? 0, locale)}
                        </p>
                      </div>
                      <ArrowRight
                        className="size-5 text-edge transition group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <QuickActions />

      <OpenShiftModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSubmit={submitOpeningFloat}
        state={openState}
        error={openState.error}
      />
    </div>
  );
}

function PaymentBadge({ state, t }) {
  const map = {
    PAID: ['success', 'payment.PAID'],
    PARTIAL: ['warning', 'payment.PARTIAL'],
    UNPAID: ['danger', 'payment.UNPAID'],
    PENDING_EXCEPTION: ['warning', 'payment.PENDING_EXCEPTION'],
    WAIVED: ['info', 'payment.WAIVED'],
    OVERPAID: ['success', 'payment.OVERPAID'],
  };
  const [tone, key] = map[state] ?? ['neutral', null];
  return <Badge tone={tone}>{key ? t(key) : state || t('payment.UNKNOWN')}</Badge>;
}

function QuickActions() {
  const { t } = useTranslation();
  const permissions = useSelector(selectPermissions);
  const actions = [
    { to: '/app/staff/quick-add', icon: CircleDollarSign, key: 'staff.quickAdd' },
    { to: '/app/staff/expenses', icon: ReceiptText, key: 'staff.addExpense' },
    ...(permissions?.['transfer.create']
      ? [{ to: '/app/staff/handover', icon: WalletCards, key: 'staff.handover' }]
      : []),
    { to: '/app/staff/records', icon: ReceiptText, key: 'nav.records' },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map(({ to, icon: Icon, key }) => (
        <Link key={to} to={to}>
          <Card className="h-full p-5 transition hover:-translate-y-px hover:border-edge/30">
            <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-cairo text-base font-extrabold">{t(key)}</h3>
            <ArrowRight className="mt-3 size-4 text-edge" aria-hidden="true" />
          </Card>
        </Link>
      ))}
    </section>
  );
}

function OpenShiftModal({ open, onClose, onSubmit, state, error }) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onClose={state.isLoading ? undefined : onClose} title={t('staff.openShift')}>
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="rounded-xl bg-navy p-4 text-white">
          <p className="font-cairo text-sm font-bold">{t('staff.openShiftInstruction')}</p>
          <p className="mt-1 font-tajawal text-xs leading-6 text-white/65">
            {t('staff.openShiftWarning')}
          </p>
        </div>

        <MoneyInput
          name="openingFloat"
          label={t('staff.openingFloat')}
          placeholder="0.00"
          inputMode="decimal"
          required
        />

        {error && (
          <p className="font-tajawal text-sm text-red-700" role="alert">
            {errorMessage(error, t)}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={state.isLoading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={state.isLoading}>
            {t('staff.confirmOpenShift')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
