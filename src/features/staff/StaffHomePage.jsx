import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Filter,
  LockKeyhole,
  RotateCcw,
  ShoppingBag,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  useCloseShiftMutation,
  useGetAppointmentsQuery,
  useGetCurrentShiftsQuery,
  useGetGoalQuery,
  useGetSettingsQuery,
  useGetShiftClosingSummaryQuery,
  useGetStaffFinancialOverviewQuery,
  useGetAppointmentCourtsQuery,
  useGetMyStaffDateAccessRequestsQuery,
  useCreateStaffDateAccessRequestMutation,
  useOpenShiftMutation,
} from '../../app/api';
import { businessDate, formatTime, addDays } from '../../shared/lib/date';
import { selectPermissions, selectUser } from '../auth/authSelectors';
import { errorMessage } from '../../shared/lib/apiError';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import { groupBookings } from '../../shared/lib/bookingGroups';
import { canEditDay, canViewDay } from '../../shared/lib/dayAccess';
import {
  getAppointmentPaymentStatus,
  getClosingRowPaymentStatus,
  isBookingStarted,
  paymentStatusStyle,
  summarizeUnpaid,
} from '../../shared/lib/paymentStatus';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import Badge from '../../shared/ui/Badge';
import Skeleton from '../../shared/ui/Skeleton';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';
import Modal from '../../shared/ui/Modal';
import BookingPaymentLines from './BookingPaymentLines';
import EditPaymentModal from './EditPaymentModal';
import ReadOnlyDayBanner from './ReadOnlyDayBanner';
import BookingPaymentModal from './BookingPaymentModal';
import ShopSaleModal from './ShopSaleModal';
import StaffExpenseModal from './StaffExpenseModal';
import BottomDock from './BottomDock';
import SegmentedDateFilter from './SegmentedDateFilter';

export default function StaffHomePage() {
  const { t, i18n } = useTranslation();
  const permissions = useSelector(selectPermissions);
  const currentUser = useSelector(selectUser);
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const clientRequest = useClientRequestId();

  const { data: settings } = useGetSettingsQuery();
  const today = businessDate(undefined, settings?.closeTime || '04:00');
  const [day, setDay] = useState(null);
  const [court, setCourt] = useState('');
  const [editingIncome, setEditingIncome] = useState(null);
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closingOpen, setClosingOpen] = useState(false);
  const [closeNote, setCloseNote] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [closingResult, setClosingResult] = useState(null);
  const [paymentAppointment, setPaymentAppointment] = useState(null);
  const [saleAppointment, setSaleAppointment] = useState(null);
  const [saleOpen, setSaleOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestFormOpen, setRequestFormOpen] = useState(false);

  const shifts = useGetCurrentShiftsQuery(undefined, { pollingInterval: 15_000 });
  const shift = shifts.data?.items?.[0] ?? null;
  const shiftBusinessDate = shift?.businessDate ?? null;
  const selectedDate = day || shiftBusinessDate || today;
  const accessRequests = useGetMyStaffDateAccessRequestsQuery(undefined, {
    pollingInterval: 15_000,
    refetchOnFocus: true,
  });
  const courtOptions = useGetAppointmentCourtsQuery();
  const dayRequests = (accessRequests.data?.items ?? []).filter(
    (item) => item.businessDate === selectedDate,
  );
  const isActiveGrant = (item) => item.status === 'APPROVED' && item.isActive;
  const selectedDateRequest =
    dayRequests.find((item) => isActiveGrant(item) && (item.kind ?? 'EDIT') === 'EDIT') ??
    dayRequests.find(isActiveGrant) ??
    dayRequests[0];
  const dayAccessInput = {
    date: selectedDate,
    today,
    viewDays: settings?.staffViewDays ?? 3,
    shiftBusinessDate,
    request: selectedDateRequest,
  };
  const canViewSelectedDate = canViewDay(dayAccessInput);
  const canEditSelectedDate = canEditDay(dayAccessInput);

  const showShiftFinancialOverview = shift
    ? selectedDate === shiftBusinessDate
    : selectedDate === today;
  const [createDateAccessRequest, dateAccessRequestState] =
    useCreateStaffDateAccessRequestMutation();

  const financial = useGetStaffFinancialOverviewQuery(
    { date: selectedDate },
    {
      skip: !canViewSelectedDate || !showShiftFinancialOverview,
      pollingInterval: 15_000,
      refetchOnMountOrArgChange: true,
    },
  );
  const appointments = useGetAppointmentsQuery(
    { date: selectedDate, ...(court ? { court: Number(court) } : {}) },
    { skip: !canViewSelectedDate, refetchOnMountOrArgChange: true, refetchOnFocus: true },
  );
  const [openShift, openState] = useOpenShiftMutation();
  const [closeShift, closeState] = useCloseShiftMutation();
  const canRecordIncome =
    Boolean(shift) && canEditSelectedDate && permissions?.['income.create'] !== false;
  const closingSummary = useGetShiftClosingSummaryQuery(shift?.id, {
    skip: !closingOpen || !shift?.id || Boolean(closingResult),
    refetchOnMountOrArgChange: true,
  });
  const goalQuery = useGetGoalQuery(undefined, {
    skip: !shift?.id || permissions?.['goal.view'] === false,
    refetchOnMountOrArgChange: true,
  });

  const bookingGroups = useMemo(
    () =>
      groupBookings(appointments.currentData?.items ?? [], {
        now: Date.now(),
        isToday: selectedDate === today,
      }),
    [appointments.currentData, selectedDate, today],
  );
  const hasAnyBooking =
    bookingGroups.active.length + bookingGroups.paid.length + bookingGroups.cancelled.length > 0;

  const filterItems = useMemo(
    () => [
      { id: 'yesterday', label: t('staff.filterYesterday'), date: addDays(today, -1) },
      { id: 'today', label: t('staff.filterToday'), date: today },
      { id: 'tomorrow', label: t('staff.filterTomorrow'), date: addDays(today, 1) },
    ],
    [t, today],
  );
  const activeFilter = filterItems.find((item) => item.date === selectedDate)?.id ?? null;
  const onFilterChange = (item) => setDay(item.date);

  async function submitOpeningFloat(event) {
    event.preventDefault();
    try {
      await openShift({ clientRequestId: clientRequest.id }).unwrap();
      clientRequest.regenerate();
      setOpenShiftModal(false);
      financial.refetch();
    } catch {
      /* shown in modal */
    }
  }

  function startClosing() {
    if (shiftBusinessDate && selectedDate !== shiftBusinessDate) setDay(shiftBusinessDate);
    setClosingResult(null);
    setCloseNote('');
    setCloseReason('');
    setClosingOpen(true);
  }

  async function submitClose(event) {
    event.preventDefault();
    if (!shift) return;
    try {
      const body = { clientRequestId: clientRequest.id };
      const note = closeNote.trim();
      const reason = closeReason.trim();
      if (note) body.note = note;
      if (reason) body.closeReason = reason;
      const response = await closeShift({ id: shift.id, body }).unwrap();
      clientRequest.regenerate();
      setClosingResult(response);
      setDay(null);
      shifts.refetch();
      financial.refetch();
    } catch {
      /* shown in modal */
    }
  }

  async function submitDateAccessRequest(event) {
    event.preventDefault();
    if (!requestReason.trim() || requestReason.trim().length < 5) return;
    try {
      await createDateAccessRequest({
        businessDate: selectedDate,
        reason: requestReason.trim(),
        kind: 'VIEW',
      }).unwrap();
      setRequestReason('');
      setRequestFormOpen(false);
      accessRequests.refetch();
    } catch {
      /* shown in access panel */
    }
  }

  function openStandaloneSale() {
    setSaleAppointment(null);
    setSaleOpen(true);
  }
  function openLinkedSale(appointment) {
    setSaleAppointment(appointment);
    setSaleOpen(true);
  }
  function afterIncomeSaved() {
    setPaymentAppointment(null);
    setSaleAppointment(null);
    setSaleOpen(false);
    appointments.refetch();
    financial.refetch();
  }

  const money = (amount) => formatEgpWithCurrency(amount ?? 0, locale);
  const summary = closingSummary.currentData;
  const financialData = financial.currentData;
  const appointmentItems = appointments.currentData?.items ?? [];
  const hasClosingBookingDetails = Array.isArray(summary?.bookings);

  const dashboardPayableBookings = appointmentItems.filter(
    (booking) =>
      !['CANCELLED', 'REJECTED', 'WAITLISTED', 'REMOVED', 'PRICE_MISSING'].includes(
        booking.payment?.state,
      ) && booking.payment?.expected != null,
  );
  const dashboardClosingBookingCount = appointmentItems.filter(
    (booking) =>
      !['CANCELLED', 'REJECTED', 'WAITLISTED', 'REMOVED'].includes(booking.payment?.state),
  ).length;
  const dashboardExpectedRevenue = dashboardPayableBookings.reduce(
    (total, booking) => total + Math.max(0, booking.payment.expected),
    0,
  );
  const dashboardOutstanding = dashboardPayableBookings.reduce(
    (total, booking) =>
      total + Math.max(0, (booking.payment.due ?? 0) - (booking.payment.onAccountOpen ?? 0)),
    0,
  );

  const closingCourtBookingCount = (summary?.courts ?? []).reduce(
    (total, courtRow) => total + (courtRow.bookings ?? 0),
    0,
  );
  const closingBookingCount = summary?.bookingCount ?? summary?.bookings?.length ?? 0;
  const closingDetailExpectedRevenue = (summary?.bookings ?? []).reduce(
    (total, booking) => total + Math.max(0, booking.expected ?? 0),
    0,
  );
  const closingCourtExpectedRevenue = (summary?.courts ?? []).reduce(
    (total, courtRow) => total + Math.max(0, courtRow.expected ?? 0),
    0,
  );

  const financialDataContractValid = Boolean(
    financialData &&
    financialData.businessDate === selectedDate &&
    Number.isFinite(financialData.visa) &&
    Number.isFinite(financialData.visaPending) &&
    Number.isFinite(financialData.instapay) &&
    Number.isFinite(financialData.instapayPending) &&
    Number.isFinite(financialData.shopSales) &&
    Number.isFinite(financialData.outstanding?.amount) &&
    Number.isFinite(financialData.outstanding?.count) &&
    Number.isFinite(financialData.expectedBookingRevenue) &&
    Number.isFinite(financialData.totalExpectedRevenue) &&
    Number.isFinite(financialData.bookingCount) &&
    typeof financialData.open === 'boolean',
  );
  const sameBusinessDay = Boolean(summary && summary.businessDate === selectedDate);
  const dashboardClosingDataReady = Boolean(
    sameBusinessDay && appointments.currentData && financialDataContractValid,
  );
  const dashboardFinancialMismatch = Boolean(
    financialDataContractValid &&
    appointments.currentData &&
    !court &&
    (financialData.bookingCount !== dashboardPayableBookings.length ||
      financialData.expectedBookingRevenue !== dashboardExpectedRevenue ||
      financialData.outstanding.amount !== dashboardOutstanding),
  );
  const closingBookingCountMismatch = Boolean(
    summary &&
    (summary.businessDate !== selectedDate ||
      !hasClosingBookingDetails ||
      closingBookingCount !== summary.bookings.length ||
      closingCourtBookingCount !== summary.bookings.length ||
      closingDetailExpectedRevenue !== closingCourtExpectedRevenue ||
      closingCourtExpectedRevenue !== (summary.totals?.courtsExpected ?? 0) ||
      (sameBusinessDay &&
        appointments.currentData &&
        !court &&
        dashboardClosingBookingCount !== closingBookingCount) ||
      dashboardFinancialMismatch ||
      (dashboardClosingDataReady &&
        (financialData.expectedBookingRevenue !== (summary.totals?.courtsExpected ?? 0) ||
          financialData.shopSales !== (summary.shop?.total ?? 0) ||
          financialData.totalExpectedRevenue !== (summary.totals?.totalDay ?? 0) ||
          financialData.outstanding.amount !== (summary.excel?.unpaid ?? 0) ||
          financialData.visa !== (summary.byMethod?.VISA ?? 0) ||
          financialData.instapay !== (summary.byMethod?.INSTAPAY ?? 0)))),
  );
  const financialDataConsistent = Boolean(
    financialDataContractValid && !dashboardFinancialMismatch,
  );
  const closingDashboardValidationPending = Boolean(
    summary &&
    sameBusinessDay &&
    !dashboardClosingDataReady &&
    (appointments.isFetching || financial.isFetching),
  );
  const closingDashboardValidationUnavailable = Boolean(
    summary &&
    sameBusinessDay &&
    !dashboardClosingDataReady &&
    !appointments.isFetching &&
    !financial.isFetching,
  );
  const financialLoading = financial.isFetching && !financial.currentData;
  const appointmentsLoading = appointments.isFetching && !appointments.currentData;

  const goalData = goalQuery.data ?? null;
  const goalSummary = useMemo(() => {
    if (!goalData) return null;
    const { goalHours, achievedToDateHours, targetToDateHours, deltaHours, onTrack } = goalData;
    if (goalHours == null || achievedToDateHours == null || targetToDateHours == null) return null;
    return { goalHours, achievedToDateHours, targetToDateHours, deltaHours, onTrack };
  }, [goalData]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 pt-1 pb-4">
      {showShiftFinancialOverview && financial.isError && (
        <ErrorState
          title={t('staff.financialDataUnavailable')}
          description={errorMessage(financial.error, t)}
          onRetry={financial.refetch}
        />
      )}
      {showShiftFinancialOverview && financial.isSuccess && !financialDataConsistent && (
        <ErrorState
          title={t('staff.financialDataOutOfSync')}
          description={t('staff.financialDataOutOfSyncHint')}
          onRetry={financial.refetch}
        />
      )}

      {canViewSelectedDate && !showShiftFinancialOverview && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 font-tajawal text-sm leading-6 text-blue-950">
          {t('staff.otherDayFinancialsHint', {
            viewDate: selectedDate,
            shiftDate: shiftBusinessDate ?? today,
          })}
          {shiftBusinessDate && (
            <Button className="ms-2" variant="ghost" onClick={() => setDay(shiftBusinessDate)}>
              {t('staff.useActiveShiftDate')}
            </Button>
          )}
          {canViewSelectedDate && !canEditSelectedDate && <ReadOnlyDayBanner date={selectedDate} />}
        </div>
      )}

      {/* R1: three compact cards (row on mobile, col on desktop) */}
      <section
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        aria-label={t('staff.summaryCards')}
      >
        <CompactStatCard
          label={t('staff.todayBalance')}
          value={financialDataConsistent ? money(financialData.todayBalance ?? 0) : '—'}
          loading={financialLoading}
        >
          <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 font-tajawal text-[11px] leading-4 text-navy/55">
            <span>
              {t('method.CASH')}:{' '}
              {financialDataConsistent
                ? money(
                    (financialData.todayBalance ?? 0) - financialData.visa - financialData.instapay,
                  )
                : '—'}
            </span>
            <span>
              {t('method.VISA')}: {financialDataConsistent ? money(financialData.visa) : '—'}
            </span>
            <span>
              {t('method.INSTAPAY')}:{' '}
              {financialDataConsistent ? money(financialData.instapay) : '—'}
            </span>
            <span>
              {t('staff.shopSales')}:{' '}
              {financialDataConsistent ? money(financialData.shopSales) : '—'}
            </span>
          </div>
        </CompactStatCard>
        <CompactStatCard
          label={t('staff.toBeCollected')}
          value={financialDataConsistent ? money(financialData.outstanding.amount) : '—'}
          loading={financialLoading}
        >
          {financialDataConsistent && (
            <p className="mt-1.5 font-tajawal text-[11px] leading-4 text-navy/55">
              {t('staff.outstandingPaymentsHint', { count: financialData.outstanding.count })}
            </p>
          )}
        </CompactStatCard>
        <CompactStatCard
          label={t('staff.todayGoal')}
          value={
            !goalSummary
              ? '—'
              : goalSummary.onTrack
                ? `+${goalSummary.deltaHours.toFixed(1)}${t('staff.hoursShort')}`
                : `${goalSummary.deltaHours.toFixed(1)}${t('staff.hoursShort')}`
          }
          tone={!goalSummary ? 'navy' : goalSummary.onTrack ? 'green' : 'red'}
        >
          {goalSummary && (
            <p className="mt-1.5 font-tajawal text-[11px] leading-4 text-navy/55">
              {goalSummary.achievedToDateHours.toFixed(1)} /{' '}
              {goalSummary.targetToDateHours.toFixed(1)} {t('staff.hoursShort')}
            </p>
          )}
        </CompactStatCard>
      </section>

      {/* Filters (date, court, reset) on a single line */}
      <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-1 sm:gap-2">
        <div className="min-w-fit flex-1">
          <SegmentedDateFilter
            items={filterItems}
            activeId={activeFilter}
            onChange={onFilterChange}
            ariaLabel={t('staff.bookingDateFilter')}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <label className="flex items-center gap-1 rounded-xl border border-navy/10 bg-white px-2 py-1 font-tajawal text-[10px] text-navy sm:px-3 sm:py-1.5 sm:text-xs">
            <Filter className="size-3 text-edge sm:size-3.5" aria-hidden="true" />
            <span className="font-cairo text-[10px] font-semibold sm:text-xs">
              {t('staff.courtFilter')}
            </span>
            <select
              value={court}
              onChange={(event) => setCourt(event.target.value)}
              className="bg-transparent font-tajawal text-[10px] outline-none sm:text-xs"
            >
              <option value="">{t('common.all')}</option>
              {(courtOptions.data?.items ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setDay(null);
              setCourt('');
            }}
            className="flex items-center justify-center gap-1 rounded-xl px-2 py-1 font-cairo text-[10px] font-semibold text-navy/60 outline-none hover:bg-navy/5 focus-visible:ring-2 focus-visible:ring-edge sm:px-3 sm:py-1.5 sm:text-xs"
          >
            <RotateCcw className="size-3 sm:size-3.5" aria-hidden="true" />
            {t('common.reset')}
          </button>
        </div>
      </div>

      <section>
        {!canViewSelectedDate ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-amber-300 text-amber-800">
                <LockKeyhole className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-cairo text-sm font-extrabold text-amber-950">
                  {t('staff.pastDayLocked')}
                </h3>
                <p className="mt-1 font-tajawal text-xs leading-5 text-amber-900">
                  {t('staff.pastDayLockedHint')}
                </p>
                {selectedDateRequest?.status === 'PENDING' ? (
                  <p className="mt-2 inline-flex rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 font-cairo text-xs font-bold text-amber-900">
                    {t('staff.accessRequestPending')}
                  </p>
                ) : !requestFormOpen ? (
                  <Button className="mt-2" onClick={() => setRequestFormOpen(true)}>
                    {t('staff.requestPastDayAccess')}
                  </Button>
                ) : (
                  <form className="mt-2 space-y-2" onSubmit={submitDateAccessRequest}>
                    <textarea
                      value={requestReason}
                      onChange={(event) => setRequestReason(event.target.value)}
                      minLength={5}
                      maxLength={500}
                      required
                      rows={2}
                      className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 font-tajawal text-sm text-navy"
                      placeholder={t('staff.accessRequestReasonPlaceholder')}
                    />
                    {dateAccessRequestState.error && (
                      <p className="font-tajawal text-sm text-red-700" role="alert">
                        {errorMessage(dateAccessRequestState.error, t)}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="submit"
                        loading={dateAccessRequestState.isLoading}
                        disabled={requestReason.trim().length < 5}
                      >
                        {t('staff.sendAccessRequest')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setRequestFormOpen(false)}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </section>
        ) : appointmentsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Skeleton key={item} className="h-20" />
            ))}
          </div>
        ) : appointments.isError ? (
          <ErrorState
            title={t('errors.generic')}
            description={errorMessage(appointments.error, t)}
            onRetry={appointments.refetch}
          />
        ) : !hasAnyBooking ? (
          <EmptyState
            title={t('staff.noAppointments')}
            description={t('staff.noAppointmentsHint')}
          />
        ) : (
          <div className="space-y-2">
            {bookingGroups.active.map((appointment) => (
              <BookingRow
                key={appointment.id}
                appointment={appointment}
                locale={locale}
                t={t}
                canRecordIncome={canRecordIncome}
                onRecordPayment={() => setPaymentAppointment(appointment)}
                onRecordSale={() => openLinkedSale(appointment)}
                userId={currentUser?.id}
                canEditDay={canEditSelectedDate}
                onEditIncome={setEditingIncome}
              />
            ))}
            {bookingGroups.paid.length > 0 && (
              <details className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-2">
                <summary className="cursor-pointer font-cairo text-sm font-bold text-emerald-900">
                  {t('staff.paidBookings', { count: bookingGroups.paid.length })}
                </summary>
                <div className="mt-2 space-y-2">
                  {bookingGroups.paid.map((appointment) => (
                    <BookingRow
                      key={appointment.id}
                      appointment={appointment}
                      locale={locale}
                      t={t}
                      canRecordIncome={canRecordIncome}
                      onRecordPayment={() => setPaymentAppointment(appointment)}
                      onRecordSale={() => openLinkedSale(appointment)}
                      userId={currentUser?.id}
                      canEditDay={canEditSelectedDate}
                      onEditIncome={setEditingIncome}
                    />
                  ))}
                </div>
              </details>
            )}
            {bookingGroups.cancelled.length > 0 && (
              <details className="rounded-xl border border-navy/10 bg-white p-2">
                <summary className="cursor-pointer font-cairo text-sm font-bold text-navy/60">
                  {t('staff.cancelledBookings', { count: bookingGroups.cancelled.length })}
                </summary>
                <div className="mt-2 space-y-2">
                  {bookingGroups.cancelled.map((appointment) => (
                    <BookingRow
                      key={appointment.id}
                      appointment={appointment}
                      locale={locale}
                      t={t}
                      canRecordIncome={false}
                      onRecordPayment={() => {}}
                      onRecordSale={() => {}}
                      userId={currentUser?.id}
                      canEditDay={false}
                      onEditIncome={() => {}}
                    />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </section>

      <BottomDock
        totalBalanceLabel={t('staff.totalBalance')}
        totalBalanceValue={financialDataConsistent ? money(financialData.totalBalance ?? 0) : '—'}
        handoverLabel={t('staff.handoverInTransit')}
        handoverValue={financialDataConsistent ? money(financialData.handoverInTransit ?? 0) : '—'}
        actions={[
          {
            key: shift ? 'close' : 'open',
            label: shift ? t('staff.closeShift') : t('staff.openShift'),
            icon: WalletCards,
            variant: 'primary',
            onClick: shift ? startClosing : () => setOpenShiftModal(true),
            disabled: shifts.isLoading,
          },
          {
            key: 'shop',
            label: t('staff.addShopSale'),
            icon: ShoppingBag,
            variant: 'secondary',
            onClick: openStandaloneSale,
            disabled: !canRecordIncome || selectedDate !== shiftBusinessDate,
          },
          {
            key: 'expense',
            label: t('staff.addExpense'),
            icon: ReceiptText,
            variant: 'secondary',
            onClick: () => setExpenseOpen(true),
            disabled:
              !shift ||
              selectedDate !== shiftBusinessDate ||
              permissions?.['expense.create'] === false,
          },
          {
            key: 'handover',
            label: t('staff.cashHandover'),
            icon: Banknote,
            variant: 'secondary',
            to: '/app/staff/handover',
          },
        ]}
      />

      <EditPaymentModal
        income={editingIncome}
        locale={locale}
        onClose={() => setEditingIncome(null)}
        onSaved={() => setEditingIncome(null)}
      />

      <OpenShiftModal
        open={openShiftModal}
        onClose={() => setOpenShiftModal(false)}
        onSubmit={submitOpeningFloat}
        state={openState}
        error={openState.error}
        totalBalance={
          financialData?.totalBalance != null
            ? formatEgpWithCurrency(financialData.totalBalance, locale)
            : null
        }
      />

      <Modal
        open={closingOpen}
        onClose={closeState.isLoading ? undefined : () => setClosingOpen(false)}
        title={closingResult ? t('staff.shiftResult') : t('staff.closingReviewTitle')}
        className="sm:max-w-[94vw] lg:max-w-6xl"
      >
        {closingResult ? (
          <ClosingResult
            result={closingResult}
            locale={locale}
            t={t}
            onDone={() => setClosingOpen(false)}
          />
        ) : closingSummary.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
            <Skeleton className="h-64" />
          </div>
        ) : closingSummary.isError ? (
          <ErrorState
            title={t('errors.generic')}
            description={errorMessage(closingSummary.error, t)}
            onRetry={closingSummary.refetch}
          />
        ) : summary && !hasClosingBookingDetails ? (
          <ErrorState
            title={t('staff.closingDataOutOfSync')}
            description={t('staff.closingDataOutOfSyncHint')}
            onRetry={closingSummary.refetch}
          />
        ) : summary && closingDashboardValidationPending ? (
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
            <Skeleton className="h-64" />
          </div>
        ) : summary && closingDashboardValidationUnavailable ? (
          <ErrorState
            title={t('staff.closingVerificationUnavailable')}
            description={t('staff.closingVerificationUnavailableHint')}
            onRetry={() => {
              appointments.refetch();
              financial.refetch();
              closingSummary.refetch();
            }}
          />
        ) : summary && closingBookingCountMismatch ? (
          <ErrorState
            title={t('staff.closingBookingCountMismatch')}
            description={t('staff.closingBookingCountMismatchHint')}
            onRetry={closingSummary.refetch}
          />
        ) : summary ? (
          <ClosingReview
            summary={summary}
            goal={goalData}
            locale={locale}
            t={t}
            note={closeNote}
            setNote={setCloseNote}
            closeReason={closeReason}
            setCloseReason={setCloseReason}
            requiresCloseReason={Boolean(shift?.reopenReason)}
            onSubmit={submitClose}
            state={closeState}
            error={closeState.error}
          />
        ) : (
          <ErrorState
            title={t('errors.generic')}
            description={t('staff.closingSummaryUnavailable')}
          />
        )}
      </Modal>

      <BookingPaymentModal
        open={Boolean(paymentAppointment)}
        appointment={paymentAppointment}
        locale={locale}
        onClose={() => setPaymentAppointment(null)}
        onSuccess={afterIncomeSaved}
      />

      <StaffExpenseModal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        onSuccess={() => {
          if (canViewSelectedDate && showShiftFinancialOverview) financial.refetch();
          if (closingOpen && shift?.id) closingSummary.refetch();
        }}
      />

      <ShopSaleModal
        open={saleOpen}
        appointment={saleAppointment}
        onClose={() => {
          setSaleOpen(false);
          setSaleAppointment(null);
        }}
        onSuccess={afterIncomeSaved}
      />
    </div>
  );
}

// ---------------------------------------------------------------
// Staff-only primitives (bigger, readable, but still compact)
// ---------------------------------------------------------------

function CompactStatCard({ label, value, tone = 'navy', loading, children }) {
  const toneClass = {
    navy: 'border-s-navy',
    green: 'border-s-emerald-600',
    red: 'border-s-red-600',
    amber: 'border-s-amber-500',
    blue: 'border-s-edge',
  }[tone];

  return (
    <div
      className={`min-w-0 rounded-xl border border-navy/10 border-s-[4px] bg-white p-2.5 shadow-card sm:rounded-2xl sm:p-3 ${toneClass}`}
    >
      <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start sm:justify-start">
        <p className="font-cairo text-xs font-semibold text-navy/60 sm:order-2 sm:mt-1">{label}</p>
        {loading ? (
          <Skeleton className="h-5 w-16 sm:w-24" />
        ) : (
          <p className="break-words font-cairo text-sm font-black leading-tight tabular-nums text-navy sm:order-1 sm:text-base">
            {value ?? '—'}
          </p>
        )}
      </div>
      {children && <div className="mt-1.5 w-full">{children}</div>}
    </div>
  );
}

function BookingRow({
  appointment,
  locale,
  t,
  canRecordIncome,
  onRecordPayment,
  onRecordSale,
  userId,
  canEditDay,
  onEditIncome,
}) {
  const status = getAppointmentPaymentStatus(appointment);
  const style = paymentStatusStyle(status, { context: 'card' });
  const due = Math.max(0, appointment.payment?.due ?? 0);
  const rewardHours = Number(appointment.reward?.hoursUsed ?? 0);

  return (
    <div
      className={`rounded-xl border px-3 py-2 shadow-card ${style.border}`}
      style={{ backgroundColor: style.background }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Name first, then Court Name */}
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-cairo text-sm font-bold text-navy">
              {appointment.customer?.name || t('staff.walkIn')}
            </p>
            <span
              className="shrink-0 truncate rounded-md bg-navy/10 px-1.5 py-0.5 font-cairo text-[10px] font-bold text-navy/70 max-w-[120px]"
              title={appointment.court?.staffName || appointment.court?.name}
            >
              {appointment.court?.staffName || appointment.court?.name || ''}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-tajawal text-[11px] text-navy/60">
            <span className="tabular-nums">
              {formatTime(appointment.startsAt, locale)}–{formatTime(appointment.endsAt, locale)}
            </span>
            {appointment.customer?.phone && (
              <span dir="ltr" className="tabular-nums">
                {appointment.customer.phone}
              </span>
            )}
            {rewardHours > 0 && (
              <span className="shrink-0 rounded-md bg-ball/25 px-1 py-0.5 font-cairo text-[9px] font-bold text-navy">
                {t('staff.rewardHoursBadge', { hours: rewardHours })}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 text-end">
          {due > 0 && (
            <p className="font-cairo text-sm font-black tabular-nums text-navy">
              {formatEgpWithCurrency(due, locale)}
            </p>
          )}
          <span className="rounded-md bg-navy/5 px-1.5 py-0.5 font-cairo text-[10px] font-bold text-navy/70">
            {t(`payment.${status}`)}
          </span>
        </div>
      </div>
      {appointment.note && (
        <div className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-[11px] font-tajawal text-amber-900 border border-amber-100 truncate">
          <span className="font-bold mr-1">{t('staff.note') || 'Note'}:</span>
          {appointment.note}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {due > 0 && (
          <button
            type="button"
            onClick={onRecordPayment}
            disabled={!canRecordIncome}
            className="min-h-8 rounded-lg bg-navy px-2.5 py-1 font-cairo text-xs font-bold text-white outline-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ball"
          >
            {t('staff.addPayment')}
          </button>
        )}
        <button
          type="button"
          onClick={onRecordSale}
          disabled={!canRecordIncome}
          className="min-h-8 rounded-lg bg-ball px-2.5 py-1 font-cairo text-xs font-bold text-navy outline-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-navy"
        >
          {t('staff.addShopSales')}
        </button>
      </div>
      <BookingPaymentLines
        incomes={appointment.incomes}
        userId={userId}
        canEditDay={canEditDay}
        locale={locale}
        t={t}
        onEdit={onEditIncome}
      />
    </div>
  );
}

function OpenShiftModal({ open, onClose, onSubmit, state, error, totalBalance }) {
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
        {totalBalance != null && (
          <div className="flex items-center justify-between rounded-xl border border-navy/10 bg-white px-4 py-3">
            <span className="font-tajawal text-sm text-navy/60">{t('staff.totalBalance')}</span>
            <span className="font-cairo text-base font-black">{totalBalance}</span>
          </div>
        )}
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

function UnpaidBanner({ summary, money, t }) {
  const owed = summary.unpaid > 0;
  return (
    <div
      role={owed ? 'alert' : 'status'}
      className={`rounded-xl border p-3 ${owed ? 'border-red-300 bg-red-50 text-red-950' : 'border-emerald-300 bg-emerald-50 text-emerald-950'}`}
    >
      <p className="font-cairo text-base font-black">
        {owed
          ? t('staff.closingUnpaidHeadline', {
              unpaid: summary.unpaid,
              total: summary.total,
              due: money(summary.unpaidDue),
            })
          : t('staff.closingAllPaid', { total: summary.total })}
      </p>
      {summary.upcoming > 0 && (
        <p className="mt-1 font-tajawal text-xs opacity-75">
          {t('staff.closingUpcoming', { count: summary.upcoming })}
        </p>
      )}
    </div>
  );
}

function ClosingReview({
  summary,
  goal,
  locale,
  t,
  note,
  setNote,
  closeReason,
  setCloseReason,
  requiresCloseReason,
  onSubmit,
  state,
  error,
}) {
  const moneyFmt = (amount) => formatEgpWithCurrency(amount ?? 0, locale);
  const methods = [
    ['CASH', t('method.CASH')],
    ['VISA', t('method.VISA')],
    ['INSTAPAY', t('method.INSTAPAY')],
  ];
  const now = Date.now();
  const unpaidSummary = summarizeUnpaid(summary.bookings ?? [], now);
  const sortedBookings = [...(summary.bookings ?? [])].sort((a, b) => {
    const rank = (row) => {
      const status = getClosingRowPaymentStatus(row);
      if (status === 'UNPAID' || status === 'PARTIAL') return 0;
      return 1;
    };
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return new Date(a.startsAt) - new Date(b.startsAt);
  });

  const expected = summary.totals?.totalDay ?? 0;
  const collected = summary.totals?.collected ?? 0;
  const fullyPaid = collected === expected;

  return (
    <div className="space-y-5">
      <div
        className={`rounded-xl border p-4 ${fullyPaid ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-cairo text-sm font-black text-navy">{t('staff.closingPaidTitle')}</p>
          <Badge tone={fullyPaid ? 'success' : 'danger'}>
            {fullyPaid ? t('staff.closingBalanced') : t('staff.closingGap')}
          </Badge>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          {methods.map(([m, label]) => (
            <div key={m} className="rounded-lg bg-white px-2 py-1 shadow-sm border border-navy/5">
              <p className="font-tajawal text-[10px] text-navy/55">{label}</p>
              <p className="font-cairo text-sm font-black text-navy">
                {moneyFmt(summary.byMethod?.[m])}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-white px-2 py-1 shadow-sm border border-navy/5">
            <p className="font-tajawal text-[10px] text-navy/55">
              {t('staff.closingCollectedTotal')}
            </p>
            <p className="font-cairo text-sm font-black text-navy">{moneyFmt(collected)}</p>
          </div>
          <div className="rounded-lg bg-white px-2 py-1 shadow-sm border border-navy/5">
            <p className="font-tajawal text-[10px] text-navy/55">
              {t('staff.closingExpectedTotal')}
            </p>
            <p className="font-cairo text-sm font-black text-navy">{moneyFmt(expected)}</p>
          </div>
        </div>
        {!fullyPaid && (
          <p className="mt-2 font-cairo text-xs font-bold text-red-900">
            {t('staff.closingGapAmount', {
              amount: moneyFmt(Math.max(0, expected - collected)),
            })}
          </p>
        )}
      </div>

      {unpaidSummary.unpaid > 0 && <UnpaidBanner summary={unpaidSummary} money={moneyFmt} t={t} />}

      {goal && goal.goalHours != null && (
        <div className="rounded-xl border border-navy/10 bg-white p-3">
          <p className="font-cairo text-xs font-bold text-navy/60">{t('staff.monthlyTarget')}</p>
          <p className="mt-1 font-cairo text-lg font-black text-navy">
            {goal.achievedToDateHours.toFixed(1)} / {goal.targetToDateHours.toFixed(1)}{' '}
            {t('staff.hoursShort')}
            <span
              className={`ms-2 font-cairo text-sm font-bold ${goal.deltaHours >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
            >
              {goal.deltaHours >= 0 ? '+' : ''}
              {goal.deltaHours.toFixed(1)}
            </span>
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-navy/10">
        <table className="min-w-[700px] w-full border-collapse text-start text-xs">
          <thead className="bg-navy/5 font-cairo text-[10px] text-navy/60">
            <tr>
              <th className="px-2 py-2 text-start">{t('staff.booking')}</th>
              <th className="px-2 py-2 text-end">{t('staff.expected')}</th>
              <th className="px-2 py-2 text-end">{t('staff.collected')}</th>
              <th className="px-2 py-2 text-end">{t('staff.due')}</th>
              <th className="px-2 py-2 text-end">{t('staff.shop')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedBookings.map((booking) => {
              const rowStyle = paymentStatusStyle(getClosingRowPaymentStatus(booking), {
                context: isBookingStarted(booking, now) ? 'closing' : 'card',
              });
              return (
                <tr
                  key={booking.appointmentId}
                  className="border-t border-navy/8 align-top"
                  style={{ backgroundColor: rowStyle.background }}
                >
                  <td className="px-2 py-2">
                    <p className="font-cairo text-xs font-bold text-navy">
                      {booking.customerName || t('staff.walkIn')}
                    </p>
                    <p className="font-tajawal text-[10px] text-navy/55">
                      {booking.courtName} · {formatTime(booking.startsAt, locale)}–
                      {formatTime(booking.endsAt, locale)}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-end font-cairo text-xs">
                    {moneyFmt(booking.expected)}
                  </td>
                  <td className="px-2 py-2 text-end font-cairo text-xs">
                    {moneyFmt(booking.collected)}
                  </td>
                  <td className="px-2 py-2 text-end font-cairo text-xs font-bold">
                    {moneyFmt(Math.max(0, booking.due ?? 0))}
                  </td>
                  <td className="px-2 py-2 text-end font-cairo text-xs">
                    {moneyFmt(booking.linkedShopSales)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-navy/10 bg-white p-3">
          <p className="font-cairo text-xs font-extrabold text-navy">{t('staff.courtBreakdown')}</p>
          <div className="mt-2 space-y-1 text-xs">
            {(summary.courts ?? []).map((court) => (
              <div key={court.courtId} className="flex items-center justify-between gap-2">
                <span className="font-cairo text-xs">
                  {court.courtId} · {court.bookings} {t('staff.bookings')}
                </span>
                <span className="font-cairo text-xs">{moneyFmt(court.expected)}</span>
              </div>
            ))}
            {(summary.courts ?? []).length === 0 && (
              <p className="text-navy/50">{t('staff.noCourtActivity')}</p>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-navy/10 bg-white p-3">
          <p className="font-cairo text-xs font-extrabold text-navy">
            {t('staff.shopAndOperatingExpenses')}
          </p>
          <div className="mt-2 space-y-1 text-xs">
            <Row
              label={t('staff.shopSalesInBookings')}
              value={moneyFmt(summary.shop?.inBookings)}
            />
            <Row label={t('staff.shopSalesOutside')} value={moneyFmt(summary.shop?.outside)} />
            <Row label={t('staff.expenses')} value={moneyFmt(summary.expenses?.total)} />
            <Row
              label={t('staff.totalExpenses')}
              value={moneyFmt(summary.expenses?.total)}
              strong
            />
          </div>
        </div>
      </div>

      <form className="space-y-3 border-t border-navy/10 pt-4" onSubmit={onSubmit}>
        {requiresCloseReason && (
          <label className="block">
            <span className="mb-1 block font-cairo text-xs font-semibold">
              {t('staff.closeReasonRequired')}
            </span>
            <textarea
              rows={2}
              value={closeReason}
              onChange={(event) => setCloseReason(event.target.value)}
              placeholder={t('staff.closeReasonPlaceholder')}
              className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 font-tajawal text-xs text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block font-cairo text-xs font-semibold">
            {t('common.noteOptional')}
          </span>
          <textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('staff.closeNotePlaceholder')}
            className="w-full rounded-xl border border-navy/10 bg-white px-3 py-2 font-tajawal text-xs text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
          />
        </label>
        {error && (
          <p className="font-tajawal text-sm text-red-700" role="alert">
            {errorMessage(error, t)}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="submit" loading={state.isLoading}>
            {t('staff.confirmClose')}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Row({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`font-tajawal text-xs ${strong ? 'font-bold text-navy' : 'text-navy/60'}`}>
        {label}
      </span>
      <span className={`font-cairo text-xs ${strong ? 'font-black' : 'font-bold'}`}>{value}</span>
    </div>
  );
}

function ClosingResult({ result, locale, t, onDone }) {
  const variance = result.shift?.variance ?? 0;
  const positive = variance > 0;
  const unresolved = result.unresolved ?? [];
  const bookings = result.bookings ?? {
    total: unresolved.length,
    unpaid: unresolved.length,
    unpaidDue: unresolved.reduce((n, item) => n + (item.due ?? 0), 0),
  };
  const owed = bookings.unpaid > 0;
  const money = (amount) => formatEgpWithCurrency(amount ?? 0, locale);
  const rowStyle = paymentStatusStyle('UNPAID', { context: 'closing' });

  return (
    <div className="space-y-4">
      <Card dark className="border-navy bg-navy p-4 text-white shadow-card-dark">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ball text-ball">
            {owed ? (
              <AlertTriangle className="size-5" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-5" aria-hidden="true" />
            )}
          </div>
          <div>
            <Badge tone={owed ? 'danger' : 'success'}>
              {owed ? t('staff.closingNeedsAttention') : t('staff.closingAllClear')}
            </Badge>
            <h3 className="mt-1 font-cairo text-base font-black">
              {owed
                ? t('staff.closingUnpaidHeadline', {
                    unpaid: bookings.unpaid,
                    total: bookings.total,
                    due: money(bookings.unpaidDue),
                  })
                : t('staff.closingAllPaid', { total: bookings.total })}
            </h3>
            <p className="mt-1 font-tajawal text-xs text-white/65">
              {variance === 0
                ? t('staff.closingDrawerBalanced')
                : `${t('staff.closingDrawerLabel')}: ${positive ? t('staff.over') : t('staff.short')} ${money(Math.abs(variance))}`}
            </p>
            {result.shift?.closedLate && (
              <p className="mt-1 font-tajawal text-[11px] text-amber-200">
                {t('staff.closedLate')}
              </p>
            )}
          </div>
        </div>
      </Card>
      {unresolved.length > 0 && (
        <Card className="p-3">
          <h3 className="font-cairo text-sm font-extrabold">{t('staff.unresolvedBookings')}</h3>
          <div className="mt-2 space-y-1.5">
            {unresolved.map((item, index) => (
              <div
                key={item.appointmentId || index}
                className={`flex items-center justify-between gap-2 rounded-lg border p-2 text-xs ${rowStyle.border}`}
                style={{ backgroundColor: rowStyle.background }}
              >
                <div className="min-w-0">
                  <p className="font-cairo font-bold">
                    {item.court || item.customerName || t('staff.booking')}
                  </p>
                  <p className="font-tajawal text-[10px] text-navy/60">
                    {formatTime(item.startsAt, locale)} – {formatTime(item.endsAt, locale)}
                    {item.reason === 'IN_PROGRESS' ? ` · ${t('staff.closingInProgress')}` : ''}
                  </p>
                </div>
                <span className="font-cairo font-black">{money(item.due)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Button className="w-full" onClick={onDone}>
        {t('common.done')}
      </Button>
    </div>
  );
}
