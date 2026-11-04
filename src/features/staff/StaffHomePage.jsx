import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Filter,
  RotateCcw,
  ShoppingBag,
  ReceiptText,
  LockKeyhole,
  Smartphone,
  WalletCards,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { businessDate, formatTime } from '../../shared/lib/date';
import { selectPermissions } from '../auth/authSelectors';
import { errorMessage } from '../../shared/lib/apiError';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import { formatEgpWithCurrency, toPiasters } from '../../shared/lib/money';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import Badge from '../../shared/ui/Badge';
import Skeleton from '../../shared/ui/Skeleton';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';
import MoneyInput from '../../shared/ui/MoneyInput';
import Modal from '../../shared/ui/Modal';
import BookingPaymentModal from './BookingPaymentModal';
import ShopSaleModal from './ShopSaleModal';
import StaffExpenseModal from './StaffExpenseModal';

export default function StaffHomePage() {
  const { t, i18n } = useTranslation();
  const permissions = useSelector(selectPermissions);
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const clientRequest = useClientRequestId();

  const { data: settings } = useGetSettingsQuery();
  const today = businessDate(undefined, settings?.closeTime || '04:00');
  const [date, setDate] = useState('');
  const [court, setCourt] = useState('');
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closingOpen, setClosingOpen] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [closingResult, setClosingResult] = useState(null);
  const [paymentAppointment, setPaymentAppointment] = useState(null);
  const [saleAppointment, setSaleAppointment] = useState(null);
  const [saleOpen, setSaleOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestFormOpen, setRequestFormOpen] = useState(false);

  // Closing is tied to the business date on which the active shift was opened.
  // Default the dashboard to that same date so the booking list, financial overview,
  // and closing review start from one consistent business-day scope.
  const shifts = useGetCurrentShiftsQuery(undefined, { pollingInterval: 15_000 });
  const shift = shifts.data?.items?.[0] ?? null;
  const shiftBusinessDate = shift?.businessDate ?? null;
  const selectedDate = date || shiftBusinessDate || today;
  const accessRequests = useGetMyStaffDateAccessRequestsQuery(undefined, {
    pollingInterval: 15_000,
    refetchOnFocus: true,
  });
  const courtOptions = useGetAppointmentCourtsQuery();
  const selectedDateRequest = (accessRequests.data?.items ?? []).find(
    (item) => item.businessDate === selectedDate,
  );
  const approvedDateRequest =
    selectedDateRequest?.status === 'APPROVED' && selectedDateRequest.isActive;
  const canViewSelectedDate =
    selectedDate >= today || selectedDate === shiftBusinessDate || Boolean(approvedDateRequest);
  // Cash/card/shop figures are shift-scoped. When a shift is open, only show
  // them beside that shift's business day. With no open shift, show today's
  // booking totals and zero/current-day collection figures only.
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
  const canRecordIncome = Boolean(shift) && permissions?.['income.create'] !== false;
  const closingSummary = useGetShiftClosingSummaryQuery(shift?.id, {
    skip: !closingOpen || !shift?.id || Boolean(closingResult),
    refetchOnMountOrArgChange: true,
  });
  const goalQuery = useGetGoalQuery(undefined, {
    skip: !closingOpen || !shift?.id || permissions?.['goal.view'] === false,
    refetchOnMountOrArgChange: true,
  });

  const visibleAppointments = useMemo(() => {
    const rows = appointments.currentData?.items ?? [];
    // Historical days require an owner approval grant. On the live business day,
    // remove a booking only after its scheduled playing time has ended.
    if (selectedDate !== today) return rows;
    const now = Date.now();
    return rows.filter((appointment) => new Date(appointment.endsAt).getTime() > now);
  }, [appointments.currentData, selectedDate, today]);

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
      await openShift({ openingFloat: amount, clientRequestId: clientRequest.id }).unwrap();
      clientRequest.regenerate();
      setOpenShiftModal(false);
      event.currentTarget.reset();
      financial.refetch();
    } catch {
      // The mutation error is shown in the open-shift modal.
    }
  }

  function startClosing() {
    // A shift can remain open across the 04:00 business-day boundary. Before
    // opening its closing review, return the dashboard to that shift's day.
    if (shiftBusinessDate && selectedDate !== shiftBusinessDate) {
      setDate(shiftBusinessDate);
    }
    setClosingResult(null);
    setCountedCash('');
    setCloseNote('');
    setClosingOpen(true);
  }

  async function submitClose(event) {
    event.preventDefault();
    if (!shift) return;
    let counted;
    try {
      counted = toPiasters(countedCash);
    } catch {
      return;
    }
    if (!Number.isInteger(counted) || counted < 0) return;

    try {
      const response = await closeShift({
        id: shift.id,
        body: {
          countedCash: counted,
          ...(closeNote.trim() ? { note: closeNote.trim() } : {}),
          clientRequestId: clientRequest.id,
        },
      }).unwrap();
      clientRequest.regenerate();
      setClosingResult(response);
      // After this shift is closed, let the dashboard fall back to the current
      // business date instead of pinning the page to the just-closed day.
      setDate('');
      shifts.refetch();
      financial.refetch();
    } catch {
      // The mutation error is shown in the closing review.
    }
  }

  async function submitDateAccessRequest(event) {
    event.preventDefault();
    if (!requestReason.trim() || requestReason.trim().length < 5) return;
    try {
      await createDateAccessRequest({
        businessDate: selectedDate,
        reason: requestReason.trim(),
      }).unwrap();
      setRequestReason('');
      setRequestFormOpen(false);
      accessRequests.refetch();
    } catch {
      // The request state is shown in the access panel.
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
  const noActiveShift = !financialLoading && financialData?.open === false;
  const shiftAction = (
    <ShiftAction
      shift={shift}
      loading={shifts.isLoading}
      onOpen={() => setOpenShiftModal(true)}
      onClose={startClosing}
      t={t}
    />
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={t('staff.eyebrow')}
        title={t('staff.homeDashboardTitle')}
        description={t('staff.homeDashboardDescription')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setExpenseOpen(true)}
              disabled={
                !shift ||
                selectedDate !== shiftBusinessDate ||
                permissions?.['expense.create'] === false
              }
              title={
                !shift
                  ? t('staff.openShiftBeforeRecording', {
                      defaultValue: 'Open a shift before recording an expense',
                    })
                  : selectedDate !== shiftBusinessDate
                    ? t('staff.expenseOnlyActiveShiftDay', {
                        defaultValue: 'Expenses can only be recorded against the active shift day.',
                      })
                    : undefined
              }
            >
              <ReceiptText className="size-4" aria-hidden="true" />
              {t('staff.addExpense', { defaultValue: 'Add expense' })}
            </Button>
            <Button
              variant="secondary"
              onClick={openStandaloneSale}
              disabled={!canRecordIncome || selectedDate !== shiftBusinessDate}
              title={
                !shift
                  ? t('staff.openShiftBeforeRecording')
                  : selectedDate !== shiftBusinessDate
                    ? t('staff.shopSaleOnlyActiveShiftDay', {
                        defaultValue:
                          'Standalone shop sales are recorded against the active shift day.',
                      })
                    : undefined
              }
            >
              <ShoppingBag className="size-4" aria-hidden="true" />
              {t('staff.addShopSale')}
            </Button>
            {shiftAction}
          </div>
        }
      />

      {financial.isError && (
        <ErrorState
          title={t('staff.financialDataUnavailable', {
            defaultValue: 'Financial overview could not be loaded',
          })}
          description={errorMessage(financial.error, t)}
          onRetry={financial.refetch}
        />
      )}
      {financial.isSuccess && !financialDataConsistent && (
        <ErrorState
          title={t('staff.financialDataOutOfSync', {
            defaultValue: 'Financial data does not match the selected business day',
          })}
          description={t('staff.financialDataOutOfSyncHint', {
            defaultValue:
              'The backend response is missing required totals or returned a different business date. Deploy the matching backend update and reload the dashboard.',
          })}
          onRetry={financial.refetch}
        />
      )}

      {canViewSelectedDate && !showShiftFinancialOverview && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 font-tajawal text-sm leading-6 text-blue-950">
          {t('staff.otherDayFinancialsHint', {
            defaultValue: `You are viewing bookings for ${selectedDate}. Financial cards are scoped to the active shift day (${shiftBusinessDate ?? today}) and are hidden here to avoid mixing collections with another day's bookings.`,
          })}
          {shiftBusinessDate && (
            <Button className="ms-2" variant="ghost" onClick={() => setDate(shiftBusinessDate)}>
              {t('staff.useActiveShiftDate', { defaultValue: 'Use active shift date' })}
            </Button>
          )}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <FinancialCard
          icon={Banknote}
          label={t('staff.cashInDrawer')}
          value={
            financial.isLoading
              ? null
              : !financialDataConsistent
                ? '—'
                : financialData.cashInDrawer == null
                  ? financialData.open
                    ? t('staff.hiddenUntilClose')
                    : '—'
                  : money(financialData.cashInDrawer)
          }
          hint={
            financialData?.cashInDrawer == null && financialData?.open
              ? t('staff.hiddenUntilCloseHint')
              : t('staff.cashInDrawerHint')
          }
          loading={financialLoading}
        />
        <FinancialCard
          icon={CreditCard}
          label={t('staff.visaPayments')}
          value={
            financialLoading ? null : financialDataConsistent ? money(financialData.visa) : '—'
          }
          hint={
            financialDataConsistent && noActiveShift
              ? t('staff.noActiveShiftHint')
              : financialDataConsistent
                ? t('staff.methodPaymentsHint', { pending: money(financialData.visaPending) })
                : t('staff.financialValuesUnavailable', {
                    defaultValue: 'Financial values unavailable',
                  })
          }
          loading={financialLoading}
        />
        <FinancialCard
          icon={Smartphone}
          label={t('staff.instapayPayments')}
          value={
            financialLoading ? null : financialDataConsistent ? money(financialData.instapay) : '—'
          }
          hint={
            financialDataConsistent && noActiveShift
              ? t('staff.noActiveShiftHint')
              : financialDataConsistent
                ? t('staff.methodPaymentsHint', { pending: money(financialData.instapayPending) })
                : t('staff.financialValuesUnavailable', {
                    defaultValue: 'Financial values unavailable',
                  })
          }
          loading={financialLoading}
        />
        <FinancialCard
          icon={ShoppingBag}
          label={t('staff.shopSales')}
          value={
            financialLoading ? null : financialDataConsistent ? money(financialData.shopSales) : '—'
          }
          hint={
            financialDataConsistent && noActiveShift
              ? t('staff.noActiveShiftHint')
              : financialDataConsistent
                ? t('staff.linkedAndStandaloneSales')
                : t('staff.financialValuesUnavailable', {
                    defaultValue: 'Financial values unavailable',
                  })
          }
          loading={financialLoading}
        />
        <FinancialCard
          icon={AlertTriangle}
          label={t('staff.outstandingPayments')}
          value={
            financialLoading
              ? null
              : financialDataConsistent
                ? money(financialData.outstanding.amount)
                : '—'
          }
          hint={
            financialDataConsistent
              ? t('staff.outstandingPaymentsHint', { count: financialData.outstanding.count })
              : t('staff.financialValuesUnavailable', {
                  defaultValue: 'Financial values unavailable',
                })
          }
          loading={financialLoading}
          emphasis={Boolean(financialData?.outstanding?.amount)}
        />
        <FinancialCard
          icon={ArrowRight}
          label={t('staff.totalExpectedRevenue')}
          value={
            financialLoading
              ? null
              : financialDataConsistent
                ? money(financialData.totalExpectedRevenue)
                : '—'
          }
          hint={
            financialDataConsistent
              ? t('staff.totalExpectedRevenueHint')
              : t('staff.financialValuesUnavailable', {
                  defaultValue: 'Financial values unavailable',
                })
          }
          loading={financialLoading}
        />
      </section>

      <section>
        <div className="mb-4">
          <p className="font-cairo text-xs font-bold uppercase tracking-[0.14em] text-ball">
            {t('staff.todayAppointments')}
          </p>
          <h2 className="mt-1 font-cairo text-2xl font-black">{t('staff.bookingList')}</h2>
        </div>

        <Card className="mb-5 p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 font-cairo text-sm font-semibold">
                <CalendarDays className="size-4 text-edge" aria-hidden="true" />
                {t('staff.businessDayLabel')}
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setDate(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-base text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
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
                {(courtOptions.data?.items ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <Button
              variant="ghost"
              onClick={() => {
                setDate('');
                setCourt('');
              }}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {t('common.reset')}
            </Button>
          </div>
        </Card>

        {shiftBusinessDate && selectedDate !== shiftBusinessDate && (
          <div
            className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            role="status"
          >
            <p className="font-tajawal text-sm leading-6 text-amber-900">
              {t('staff.historicalDateScopeWarning', {
                viewDate: selectedDate,
                shiftDate: shiftBusinessDate,
                defaultValue: `You are viewing ${selectedDate}. Financial closing belongs to the active shift's business day (${shiftBusinessDate}).`,
              })}
            </p>
            <Button variant="ghost" onClick={() => setDate(shiftBusinessDate)}>
              {t('staff.useActiveShiftDate', { defaultValue: 'Use active shift date' })}
            </Button>
          </div>
        )}

        {!canViewSelectedDate ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-amber-300 text-amber-800">
                <LockKeyhole className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-cairo text-base font-extrabold text-amber-950">
                  {t('staff.pastDayLocked', { defaultValue: 'This past business day is locked' })}
                </h3>
                <p className="mt-1 font-tajawal text-sm leading-6 text-amber-900">
                  {t('staff.pastDayLockedHint', {
                    defaultValue:
                      'Past business days require owner approval. Today and future booking schedules remain available.',
                  })}
                </p>
                {selectedDateRequest?.status === 'PENDING' ? (
                  <p className="mt-3 inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 font-cairo text-xs font-bold text-amber-900">
                    {t('staff.accessRequestPending', {
                      defaultValue: 'Your request is waiting for the owner.',
                    })}
                  </p>
                ) : (
                  <>
                    {selectedDateRequest?.status === 'REJECTED' && (
                      <p className="mt-3 font-tajawal text-xs text-amber-900">
                        {t('staff.accessRequestRejected', {
                          defaultValue:
                            'Your previous request was declined. You can send a new request with more details.',
                        })}
                      </p>
                    )}
                    {!requestFormOpen ? (
                      <Button className="mt-4" onClick={() => setRequestFormOpen(true)}>
                        {t('staff.requestPastDayAccess', {
                          defaultValue: 'Request access from owner',
                        })}
                      </Button>
                    ) : (
                      <form className="mt-4 space-y-3" onSubmit={submitDateAccessRequest}>
                        <label className="block">
                          <span className="mb-2 block font-cairo text-sm font-semibold text-amber-950">
                            {t('staff.accessRequestReason', {
                              defaultValue: 'Why do you need access to this day?',
                            })}
                          </span>
                          <textarea
                            value={requestReason}
                            onChange={(event) => setRequestReason(event.target.value)}
                            minLength={5}
                            maxLength={500}
                            required
                            rows={3}
                            className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3 font-tajawal text-sm text-navy"
                            placeholder={t('staff.accessRequestReasonPlaceholder', {
                              defaultValue:
                                'For example: correct a booking payment or review a missing record.',
                            })}
                          />
                        </label>
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
                            {t('staff.sendAccessRequest', { defaultValue: 'Send request' })}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setRequestFormOpen(false)}
                            disabled={dateAccessRequestState.isLoading}
                          >
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        ) : appointmentsLoading ? (
          <div className="grid gap-3">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-32" />
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
            title={t('staff.noAppointments')}
            description={t('staff.noAppointmentsHint')}
          />
        ) : (
          <div className="space-y-3">
            {visibleAppointments.map((appointment) => (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
                locale={locale}
                t={t}
                canRecordIncome={canRecordIncome}
                onRecordPayment={() => setPaymentAppointment(appointment)}
                onRecordSale={() => openLinkedSale(appointment)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-navy/10 bg-navy/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="font-cairo text-base font-extrabold">
            {shift ? t('staff.readyToCloseShift') : t('staff.shiftNotOpen')}
          </h2>
          <p className="mt-1 font-tajawal text-sm text-navy/55">
            {shift ? t('staff.closeShiftBottomHint') : t('staff.openShiftBottomHint')}
          </p>
        </div>
        {shiftAction}
      </div>

      <OpenShiftModal
        open={openShiftModal}
        onClose={() => setOpenShiftModal(false)}
        onSubmit={submitOpeningFloat}
        state={openState}
        error={openState.error}
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
            title={t('staff.closingDataOutOfSync', { defaultValue: 'Closing data is incomplete' })}
            description={t('staff.closingDataOutOfSyncHint', {
              defaultValue:
                'The backend response does not include the booking-level closing details expected by this dashboard. Deploy the updated backend files and reload this review.',
            })}
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
            title={t('staff.closingVerificationUnavailable', {
              defaultValue: 'Dashboard figures could not be verified',
            })}
            description={t('staff.closingVerificationUnavailableHint', {
              defaultValue:
                'The dashboard booking and financial data for the active shift day could not be loaded. Retry before closing this shift.',
            })}
            onRetry={() => {
              appointments.refetch();
              financial.refetch();
              closingSummary.refetch();
            }}
          />
        ) : summary && closingBookingCountMismatch ? (
          <ErrorState
            title={t('staff.closingBookingCountMismatch', {
              defaultValue: 'Booking totals do not match',
            })}
            description={t('staff.closingBookingCountMismatchHint', {
              defaultValue:
                'The booking rows, court totals, payment totals, or dashboard figures do not agree for the active shift business day. Do not close this shift until the figures are consistent.',
            })}
            onRetry={closingSummary.refetch}
          />
        ) : summary ? (
          <ClosingReview
            summary={summary}
            goal={goalQuery.data}
            goalLoading={goalQuery.isLoading}
            locale={locale}
            t={t}
            countedCash={countedCash}
            setCountedCash={setCountedCash}
            note={closeNote}
            setNote={setCloseNote}
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

function ShiftAction({ shift, loading, onOpen, onClose, t }) {
  return shift ? (
    <Button onClick={onClose} disabled={loading}>
      <WalletCards className="size-4" aria-hidden="true" />
      {t('staff.closeShift')}
    </Button>
  ) : (
    <Button variant="secondary" onClick={onOpen} disabled={loading}>
      <WalletCards className="size-4" aria-hidden="true" />
      {t('staff.openShift')}
    </Button>
  );
}

function FinancialCard({ icon: Icon, label, value, hint, loading, emphasis = false }) {
  return (
    <Card className={`min-w-0 p-4 sm:p-5 ${emphasis ? 'border-amber-200 bg-amber-50/60' : ''}`}>
      <div className="flex items-center gap-2 text-navy/55">
        <Icon className="size-4 shrink-0 text-edge" aria-hidden="true" />
        <p className="truncate font-cairo text-xs font-semibold">{label}</p>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p className="mt-3 break-words font-cairo text-xl font-black text-navy sm:text-2xl">
          {value ?? '—'}
        </p>
      )}
      <p className="mt-2 min-h-8 font-tajawal text-xs leading-5 text-navy/50">{hint}</p>
    </Card>
  );
}

function AppointmentRow({
  appointment,
  locale,
  t,
  canRecordIncome,
  onRecordPayment,
  onRecordSale,
}) {
  const state = appointment.payment?.state;
  const badge = paymentBadge(state, t);
  const rewardHours = Number(appointment.reward?.hoursUsed ?? 0);
  const expected = appointment.payment?.expected;
  const collected = Math.max(0, appointment.payment?.collected ?? 0);
  const due = Math.max(0, appointment.payment?.due ?? 0);

  // Preserve the original compact booking-card payment/status behavior.
  const freeWithNoCollection =
    due === 0 &&
    (expected === 0 || (rewardHours > 0 && appointment.reward?.courtCollectAmount === 0));
  const paid = ['PAID', 'OVERPAID'].includes(state) || freeWithNoCollection;
  const partiallyPaid = !paid && due > 0 && collected > 0;
  const cardStatusClass = paid
    ? 'border-emerald-300'
    : partiallyPaid
      ? 'border-amber-300'
      : 'border-navy/10';
  const cardBackground = paid ? '#dcfce7' : partiallyPaid ? '#fef3c7' : '#ffffff';
  const bookingNote = typeof appointment.note === 'string' ? appointment.note.trim() : '';

  return (
    <section
      className={`rounded-2xl border shadow-card p-4 text-navy transition sm:p-5 ${cardStatusClass}`}
      style={{ backgroundColor: cardBackground }}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-cairo text-lg font-extrabold">
              {appointment.customer?.name || t('staff.walkIn')}
            </h3>
            <Badge tone={badge.tone}>{badge.label}</Badge>
            {rewardHours > 0 && (
              <Badge tone="info">{t('staff.rewardHoursBadge', { hours: rewardHours })}</Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-tajawal text-sm text-navy/55">
            <span>{appointment.court?.name || t('staff.court')}</span>
            <span>{appointment.service || t('staff.padelBooking')}</span>
            <span>
              {formatTime(appointment.startsAt, locale)} – {formatTime(appointment.endsAt, locale)}
            </span>
            {appointment.customer?.phone && (
              <span>
                {t('staff.phone', { defaultValue: 'Phone' })}: {appointment.customer.phone}
              </span>
            )}
          </div>
          {appointment.reward?.nonRefundable && (
            <p className="mt-2 font-tajawal text-xs text-amber-800">
              {t('staff.rewardNonRefundable')}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-navy/7 pt-3 lg:min-w-64 lg:border-0 lg:pt-0">
          <div className="flex items-center justify-between gap-5 lg:justify-end">
            <div className="lg:text-end">
              <p className="font-cairo text-xs font-semibold text-navy/45">{t('staff.due')}</p>
              <p className="mt-1 font-cairo text-lg font-black">
                {formatEgpWithCurrency(due, locale)}
              </p>
              {appointment.reward?.courtCollectAmount != null && (
                <p className="mt-1 font-tajawal text-[11px] text-navy/50">
                  {t('staff.courtCollectionTarget')}:{' '}
                  {formatEgpWithCurrency(appointment.reward.courtCollectAmount, locale)}
                  {appointment.reward.courtCollectMinutes
                    ? ` · ${t('staff.rewardCourtMinutes', { minutes: appointment.reward.courtCollectMinutes })}`
                    : ''}
                </p>
              )}
            </div>
            {paid && <Badge tone="success">{t('payment.PAID')}</Badge>}
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {due > 0 && (
              <Button
                className="min-h-10 px-3 py-2 text-xs"
                onClick={onRecordPayment}
                disabled={!canRecordIncome}
              >
                <Banknote className="size-4" aria-hidden="true" />
                {t('staff.recordPayment')}
              </Button>
            )}
            <Button
              className="min-h-10 px-3 py-2 text-xs"
              variant="secondary"
              onClick={onRecordSale}
              disabled={!canRecordIncome}
            >
              <ShoppingBag className="size-4" aria-hidden="true" />
              {t('staff.addLinkedShopSale')}
            </Button>
          </div>
        </div>
      </div>

      {bookingNote && (
        <div className="mt-4 rounded-xl border border-navy/10 bg-white/55 p-3">
          <p className="font-cairo text-xs font-bold text-navy">
            {t('staff.bookingNotesOnly', { defaultValue: 'Booking notes only' })}
          </p>
          <p className="mt-1 whitespace-pre-wrap font-tajawal text-xs leading-6 text-navy/75">
            {bookingNote}
          </p>
        </div>
      )}
    </section>
  );
}

function paymentBadge(state, t) {
  const values = {
    PAID: { tone: 'success', label: t('payment.PAID') },
    PARTIAL: { tone: 'warning', label: t('payment.PARTIAL') },
    UNPAID: { tone: 'danger', label: t('payment.UNPAID') },
    ON_ACCOUNT: { tone: 'info', label: t('payment.ON_ACCOUNT', { defaultValue: 'On account' }) },
    OVERPAID: { tone: 'success', label: t('payment.OVERPAID') },
  };
  return values[state] || { tone: 'neutral', label: state || t('payment.UNKNOWN') };
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

function ClosingReview({
  summary,
  goal,
  goalLoading,
  locale,
  t,
  countedCash,
  setCountedCash,
  note,
  setNote,
  onSubmit,
  state,
  error,
}) {
  const money = (amount) => formatEgpWithCurrency(amount ?? 0, locale);
  const methods = [
    ['CASH', t('method.CASH')],
    ['VISA', t('method.VISA')],
    ['INSTAPAY', t('method.INSTAPAY')],
  ];
  const rewardHours = (summary.rewardUsage?.minutes ?? 0) / 60;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ReviewMetric label={t('staff.totalDayRevenue')} value={money(summary.totals?.totalDay)} />
        <ReviewMetric
          label={t('staff.bookedHours')}
          value={`${((summary.bookedMinutes ?? 0) / 60).toFixed(1)} ${t('staff.hours')}`}
        />
        <ReviewMetric
          label={t('staff.rewardHoursUsed')}
          value={`${rewardHours.toFixed(1)} ${t('staff.hours')}`}
        />
        <ReviewMetric label={t('staff.shopSales')} value={money(summary.shop?.total)} />
        <ReviewMetric
          label={t('staff.remainingMonthlyTarget')}
          value={
            goalLoading
              ? '—'
              : goal?.goalHours == null
                ? t('staff.noGoal')
                : `${Number(goal.remainingToPlayHours ?? 0).toFixed(1)} ${t('staff.hours')}`
          }
        />
      </div>

      <section className="space-y-3">
        <h3 className="font-cairo text-base font-extrabold">{t('staff.paymentBreakdown')}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {methods.map(([method, label]) => (
            <ReviewMetric
              key={method}
              label={label}
              value={
                summary.byMethod?.[method] == null
                  ? t('staff.hiddenUntilClose')
                  : money(summary.byMethod[method])
              }
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h3 className="font-cairo text-base font-extrabold">{t('staff.courtBreakdown')}</h3>
          <div className="mt-3 space-y-3">
            {(summary.courts ?? []).length ? (
              summary.courts.map((court) => (
                <div
                  key={court.courtId}
                  className="flex items-center justify-between gap-3 border-b border-navy/7 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-cairo text-sm font-bold">{court.courtName}</p>
                    <p className="mt-1 font-tajawal text-xs text-navy/50">
                      {court.bookings} {t('staff.bookings')} · {(court.minutes / 60).toFixed(1)}{' '}
                      {t('staff.hours')}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-cairo text-sm font-black">{money(court.expected)}</p>
                    <p className="mt-1 font-tajawal text-xs text-navy/50">
                      {t('staff.collectedThisShift', { defaultValue: 'Collected this shift' })}:{' '}
                      {court.collected == null
                        ? t('staff.hiddenUntilClose')
                        : money(court.collected)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-navy/50">{t('staff.noCourtActivity')}</p>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <h3 className="font-cairo text-base font-extrabold">
            {t('staff.shopAndOperatingExpenses')}
          </h3>
          <div className="mt-3 space-y-3">
            <SummaryLine
              label={t('staff.shopSalesInBookings')}
              value={money(summary.shop?.inBookings)}
            />
            <SummaryLine label={t('staff.shopSalesOutside')} value={money(summary.shop?.outside)} />
            {summary.elsewhere && (
              <div>
                <SummaryLine
                  label={t('staff.collectionsOutsideDayBookings', {
                    defaultValue: 'Collections outside this day’s bookings',
                  })}
                  value={money(summary.elsewhere.total)}
                />
                <p className="mt-1 font-tajawal text-[11px] leading-5 text-navy/45">
                  {methods
                    .map(
                      ([method, label]) =>
                        `${label}: ${money(summary.elsewhere.byMethod?.[method])}`,
                    )
                    .join(' · ')}
                </p>
              </div>
            )}
            <SummaryLine label={t('staff.expenses')} value={money(summary.expenses?.total)} />
            <SummaryLine
              label={t('staff.freeBookings')}
              value={`${summary.vouchers?.count ?? 0} · ${((summary.vouchers?.minutes ?? 0) / 60).toFixed(1)} ${t('staff.hours')}`}
            />
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="font-cairo text-base font-extrabold">{t('staff.bookingBreakdown')}</h3>
          <p className="font-tajawal text-xs text-navy/50">
            {summary.bookingCount ?? summary.bookings.length} {t('staff.bookings')}
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-navy/10">
          <table className="min-w-[850px] w-full border-collapse text-start text-sm">
            <thead className="bg-navy/5 font-cairo text-xs text-navy/60">
              <tr>
                <th className="px-3 py-3 text-start">{t('staff.booking')}</th>
                <th className="px-3 py-3 text-end">{t('staff.expected')}</th>
                <th className="px-3 py-3 text-end">
                  {t('staff.collectedThisShift', { defaultValue: 'Collected this shift' })}
                </th>
                <th className="px-3 py-3 text-end">{t('staff.due')}</th>
                <th className="px-3 py-3 text-end">{t('staff.shop')}</th>
                <th className="px-3 py-3 text-start">{t('staff.reward')}</th>
              </tr>
            </thead>
            <tbody>
              {(summary.bookings ?? []).map((booking) => (
                <tr key={booking.appointmentId} className="border-t border-navy/8 align-top">
                  <td className="px-3 py-3">
                    <p className="font-cairo font-bold">
                      {booking.customerName || t('staff.walkIn')}
                    </p>
                    <p className="mt-1 text-xs text-navy/50">
                      {booking.courtName} · {formatTime(booking.startsAt, locale)}–
                      {formatTime(booking.endsAt, locale)} ·{' '}
                      {((booking.durationMinutes ?? 0) / 60).toFixed(1)} {t('staff.hours')}
                    </p>
                    {booking.serviceName && (
                      <p className="mt-1 text-xs text-navy/50">{booking.serviceName}</p>
                    )}
                    {booking.customerPhone && (
                      <p className="mt-1 text-xs text-navy/45">{booking.customerPhone}</p>
                    )}
                    <p className="mt-1 text-[11px] text-navy/45">
                      {methods
                        .map(
                          ([method]) =>
                            `${t(`method.${method}`)} ${money(booking.byPaymentMethod?.[method])}`,
                        )
                        .join(' · ')}
                    </p>
                    {booking.internalNote && (
                      <p className="mt-1 max-w-[360px] whitespace-normal text-[11px] text-navy/45">
                        {booking.internalNote}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-end font-semibold">
                    {booking.expected == null ? '—' : money(booking.expected)}
                  </td>
                  <td className="px-3 py-3 text-end font-semibold">
                    {booking.collected == null
                      ? t('staff.hiddenUntilClose')
                      : money(booking.collected)}
                    {booking.previouslyCollected > 0 && (
                      <p className="mt-1 whitespace-nowrap text-[11px] font-normal text-navy/45">
                        {t('staff.previouslyCollected', { defaultValue: 'Previously collected' })}:{' '}
                        {money(booking.previouslyCollected)}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-end font-semibold">
                    {booking.due == null ? '—' : money(Math.max(0, booking.due))}
                  </td>
                  <td className="px-3 py-3 text-end">{money(booking.linkedShopSales)}</td>
                  <td className="px-3 py-3">
                    {booking.rewardMinutesUsed > 0 ? (
                      <div>
                        <Badge tone="info">{(booking.rewardMinutesUsed / 60).toFixed(1)}h</Badge>
                        <p className="mt-1 text-xs text-navy/55">
                          {booking.courtCollectAmount == null
                            ? ''
                            : `${t('staff.courtCollectionTarget')}: ${money(booking.courtCollectAmount)}${booking.courtCollectMinutes ? ` · ${t('staff.rewardCourtMinutes', { minutes: booking.courtCollectMinutes })}` : ''}`}
                        </p>
                        {booking.rewardNonRefundable && (
                          <p className="mt-1 text-[11px] text-amber-800">
                            {t('staff.rewardNonRefundable')}
                          </p>
                        )}
                      </div>
                    ) : booking.isVoucher ? (
                      <Badge tone="success">{t('staff.freeBooking')}</Badge>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h3 className="font-cairo text-base font-extrabold">{t('staff.expensesBreakdown')}</h3>
          <div className="mt-3 space-y-3">
            <SummaryLine label={t('staff.needs')} value={money(summary.expenses?.needs)} />
            <SummaryLine label={t('staff.supplies')} value={money(summary.expenses?.supplies)} />
            <SummaryLine label={t('staff.advances')} value={money(summary.expenses?.advances)} />
            <SummaryLine
              label={t('staff.totalExpenses')}
              value={money(summary.expenses?.total)}
              strong
            />
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <h3 className="font-cairo text-base font-extrabold">{t('staff.cashReconciliation')}</h3>
          <div className="mt-3 space-y-3">
            {summary.cash ? (
              <>
                <SummaryLine
                  label={t('staff.expectedDrawerCash')}
                  value={money(summary.cash.expectedCash)}
                />
                <SummaryLine
                  label={t('staff.openingFloat')}
                  value={money(summary.cash.openingFloat)}
                />
                <SummaryLine
                  label={t('staff.handoverSent')}
                  value={money(summary.cash.handoversSent)}
                />
                {summary.excel?.difference != null && (
                  <SummaryLine
                    label={t('staff.reconciliationDifference')}
                    value={money(summary.excel.difference)}
                    strong
                  />
                )}
              </>
            ) : (
              <p className="font-tajawal text-xs leading-6 text-navy/50">
                {t('staff.blindCashHiddenHint')}
              </p>
            )}
          </div>
        </Card>
      </section>

      <form className="space-y-4 border-t border-navy/10 pt-5" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <MoneyInput
              label={t('staff.countedCash')}
              placeholder="0.00"
              value={countedCash}
              onChange={(event) => setCountedCash(event.target.value)}
              required
            />
            <p className="mt-1.5 font-tajawal text-xs text-navy/50">{t('staff.countedCashHint')}</p>
          </div>
          <label className="block">
            <span className="mb-2 block font-cairo text-sm font-semibold">
              {t('common.noteOptional')}
            </span>
            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('staff.closeNotePlaceholder')}
              className="w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-sm text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
            />
          </label>
        </div>
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

function ReviewMetric({ label, value }) {
  return (
    <Card className="p-4">
      <p className="font-cairo text-xs font-semibold text-navy/50">{label}</p>
      <p className="mt-2 break-words font-cairo text-xl font-black">{value}</p>
    </Card>
  );
}

function SummaryLine({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className={`font-tajawal text-sm ${strong ? 'font-bold text-navy' : 'text-navy/60'}`}>
        {label}
      </p>
      <p className={`font-cairo text-sm ${strong ? 'font-black' : 'font-bold'}`}>{value}</p>
    </div>
  );
}

function ClosingResult({ result, locale, t, onDone }) {
  const variance = result.shift?.variance ?? 0;
  const positive = variance > 0;
  const unresolved = result.unresolved ?? [];
  return (
    <div className="space-y-5">
      <Card dark className="border-navy bg-navy p-6 text-white shadow-card-dark">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-ball text-ball">
            {variance === 0 ? (
              <CheckCircle2 className="size-6" aria-hidden="true" />
            ) : (
              <AlertTriangle className="size-6" aria-hidden="true" />
            )}
          </div>
          <div>
            <Badge tone={variance === 0 ? 'success' : positive ? 'warning' : 'danger'}>
              {variance === 0 ? t('staff.balanced') : positive ? t('staff.over') : t('staff.short')}
            </Badge>
            <h3 className="mt-2 font-cairo text-2xl font-black">
              {variance === 0
                ? t('staff.noVariance')
                : `${positive ? '+' : '−'}${formatEgpWithCurrency(Math.abs(variance), locale)}`}
            </h3>
            <p className="mt-1 font-tajawal text-sm text-white/65">
              {variance === 0 ? t('staff.shiftBalancedHint') : t('staff.shiftVarianceHint')}
            </p>
            {result.shift?.closedLate && (
              <p className="mt-2 font-tajawal text-xs text-amber-200">{t('staff.closedLate')}</p>
            )}
          </div>
        </div>
      </Card>
      {unresolved.length > 0 && (
        <Card className="p-5">
          <h3 className="font-cairo font-extrabold">{t('staff.unresolvedBookings')}</h3>
          <div className="mt-3 space-y-2">
            {unresolved.map((item, index) => (
              <div
                key={item.appointmentId || index}
                className="flex items-center justify-between gap-3 rounded-xl border border-navy/8 p-3"
              >
                <span className="font-cairo text-sm font-bold">
                  {item.court || item.customerName || t('staff.booking')}
                </span>
                <span className="font-cairo text-sm font-black">
                  {formatEgpWithCurrency(item.due, locale)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Button className="w-full" onClick={onDone}>
        {t('common.done', { defaultValue: 'Done' })}
      </Button>
    </div>
  );
}
