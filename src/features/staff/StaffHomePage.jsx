import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  Phone,
  LockKeyhole,
  ShoppingBag,
  ReceiptText,
  NotebookPen,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  useCreateOwnerNotaMutation,
  useGetOwnerNotaOwnersQuery,
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
  const [notaOpen, setNotaOpen] = useState(false);
  const [notaOwnerId, setNotaOwnerId] = useState('');
  const [notaAmount, setNotaAmount] = useState('');
  const [notaNote, setNotaNote] = useState('');
  const [createOwnerNota, ownerNotaState] = useCreateOwnerNotaMutation();
  const notaOwners = useGetOwnerNotaOwnersQuery(undefined, { pollingInterval: 60_000 });
  const activeNotaOwners = notaOwners.data?.items ?? [];
  useEffect(() => {
    if (!activeNotaOwners.some((owner) => owner.id === notaOwnerId) && activeNotaOwners[0]) {
      setNotaOwnerId(activeNotaOwners[0].id);
    }
  }, [activeNotaOwners, notaOwnerId]);
  const [requestReason, setRequestReason] = useState('');
  const [requestFormOpen, setRequestFormOpen] = useState(false);

  const shifts = useGetCurrentShiftsQuery(undefined, { pollingInterval: 15_000 });
  const shift = shifts.data?.items?.[0] ?? null;
  const shiftBusinessDate = shift?.businessDate ?? null;
  const closingBusinessDate = shiftBusinessDate ?? today;
  const closingDateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${closingBusinessDate}T12:00:00Z`));
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

  const selectedDateEditRequest = dayRequests.find((item) => (item.kind ?? 'EDIT') === 'EDIT');
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

  async function submitClose(event, countedCash) {
    event.preventDefault();
    if (!shift) return;
    try {
      const body = { clientRequestId: clientRequest.id, countedCash };
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
        kind: 'EDIT',
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
    (total, booking) => total + Math.max(0, booking.payment.due ?? 0),
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
  const appointmentsLoading = appointments.isFetching && !appointments.currentData;

  const goalData = goalQuery.data ?? null;
  const goalSummary = useMemo(() => {
    if (!goalData) return null;
    const { goalHours, achievedToDateHours, targetToDateHours, deltaHours, onTrack } = goalData;
    if (goalHours == null || achievedToDateHours == null || targetToDateHours == null) return null;
    return { goalHours, achievedToDateHours, targetToDateHours, deltaHours, onTrack };
  }, [goalData]);

  const collectedToday = financialDataConsistent ? (financialData.todayBalance ?? 0) : 0;
  const toBeCollected = financialDataConsistent ? (financialData.outstanding.amount ?? 0) : 0;
  const collectionTotal = collectedToday + toBeCollected;
  const collectionProgress =
    collectionTotal > 0 ? Math.min(100, (collectedToday / collectionTotal) * 100) : 0;
  const cashCollected = financialDataConsistent
    ? collectedToday -
      (financialData.visa ?? 0) -
      (financialData.instapay ?? 0) -
      (financialData.shopSales ?? 0)
    : 0;
  const todayGoalAchieved = goalSummary?.achievedToDateHours ?? 0;
  const todayGoalTarget = goalSummary?.targetToDateHours ?? 0;
  const monthGoalAchieved = goalData?.completedHours ?? goalData?.bookedHours ?? 0;
  const monthGoalTarget = goalData?.goalHours ?? 0;
  const minimumSelectableDate = addDays(today, -Math.max(0, Number(settings?.staffViewDays ?? 3)));
  const canGoPrevious = selectedDate > minimumSelectableDate;

  return (
    <div className="staff-design min-h-screen min-w-0 bg-[#F3F5F9] pb-[max(2rem,env(safe-area-inset-bottom))] font-inter text-[#0E1B2B]">
      <div className="mx-auto w-full max-w-[1440px] min-w-0 space-y-4 px-4 sm:px-6 lg:px-8">
        <section
          aria-label={t('staff.moneyToday')}
          className="relative z-20 -mb-14 -translate-y-14 grid gap-4 rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-[0_8px_24px_rgba(0,35,70,0.12)] sm:-mb-16 sm:-translate-y-16 sm:p-5 lg:-mb-[76px] lg:-translate-y-[76px] lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:gap-6 lg:p-6"
        >
          <div className="min-w-0">
            <p className="font-inter text-sm font-semibold text-[#4A5A70]">
              {t('staff.collectedToday')}
            </p>
            <p className="mt-1 break-words font-inter text-[32px] font-extrabold leading-none tracking-[-0.03em] text-[#002346] sm:text-4xl">
              {financialDataConsistent ? money(collectedToday) : '—'}
            </p>
            <div className="mt-4 h-[10px] overflow-hidden rounded-full bg-[#E6EBF2]">
              <div
                className="h-full rounded-full bg-[#8DC63F] transition-[width]"
                style={{ width: `${collectionProgress}%` }}
              />
            </div>
            <div className="mt-2 flex items-start justify-between gap-3 font-inter text-[11px] leading-4 text-[#4A5A70] sm:text-xs">
              <span>
                {financialDataConsistent
                  ? t('staff.collectedOfTarget', {
                      collected: money(collectedToday),
                      total: money(collectionTotal),
                    })
                  : '—'}
              </span>
              <span className="shrink-0 text-end font-bold text-[#8F460A]">
                {financialDataConsistent
                  ? t('staff.toCollectCount', {
                      amount: money(toBeCollected),
                      count: financialData.outstanding.count,
                    })
                  : '—'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-1.5 sm:gap-2">
              <MoneyChip
                label={t('method.CASH')}
                value={financialDataConsistent ? money(cashCollected) : '—'}
              />
              <MoneyChip
                label={t('staff.card')}
                value={financialDataConsistent ? money(financialData.visa) : '—'}
              />
              <MoneyChip
                label={t('method.INSTAPAY')}
                value={financialDataConsistent ? money(financialData.instapay) : '—'}
              />
              <MoneyChip
                label={t('staff.shopShort')}
                value={financialDataConsistent ? money(financialData.shopSales) : '—'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[#EEF2F6] pt-4 lg:border-s lg:border-t-0 lg:ps-6 lg:pt-0">
            <GoalRing
              label={t('staff.goalToday')}
              achieved={todayGoalAchieved}
              target={todayGoalTarget}
              color="#8DC63F"
              unit={t('staff.hoursShort')}
              loading={goalQuery.isLoading}
            />
            <GoalRing
              label={t('staff.goalMonth')}
              achieved={monthGoalAchieved}
              target={monthGoalTarget}
              color="#0B3B6E"
              unit={t('staff.hoursShort')}
              loading={goalQuery.isLoading}
            />
          </div>
        </section>

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
          <div className="rounded-[14px] border border-blue-200 bg-blue-50 px-3 py-2 font-tajawal text-sm leading-6 text-blue-950">
            {t('staff.otherDayFinancialsHint', {
              viewDate: selectedDate,
              shiftDate: shiftBusinessDate ?? today,
            })}
            {shiftBusinessDate && (
              <Button className="ms-2" variant="ghost" onClick={() => setDay(shiftBusinessDate)}>
                {t('staff.useActiveShiftDate')}
              </Button>
            )}
            {selectedDate < today && canViewSelectedDate && !canEditSelectedDate && (
              <ReadOnlyDayBanner date={selectedDate} request={selectedDateEditRequest} />
            )}
          </div>
        )}

        <section className="space-y-2.5" aria-label={t('staff.bookingDateFilter')}>
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => canGoPrevious && setDay(addDays(selectedDate, -1))}
              disabled={!canGoPrevious}
              className="flex size-12 shrink-0 items-center justify-center rounded-[14px] border border-[#D5DDE7] bg-white text-[#002346] outline-none transition hover:border-[#01649B] focus-visible:ring-2 focus-visible:ring-[#01649B] disabled:opacity-40"
              aria-label={t('staff.previousDay')}
            >
              <ChevronLeft className="size-5 rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
            </button>
            <SegmentedDateFilter
              items={filterItems}
              activeId={activeFilter}
              onChange={onFilterChange}
              ariaLabel={t('staff.bookingDateFilter')}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-0.5">
            <CourtPill active={court === ''} onClick={() => setCourt('')}>
              {t('common.all')}
            </CourtPill>
            {(courtOptions.data?.items ?? []).map((item) => (
              <CourtPill
                key={item.id}
                active={court === String(item.id)}
                onClick={() => setCourt(String(item.id))}
              >
                {item.name}
              </CourtPill>
            ))}
          </div>
        </section>

        <section aria-label={t('staff.todayAppointments')}>
          {!canViewSelectedDate ? (
            <div className="rounded-[18px] border border-amber-200 bg-[#FDF0E2] p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-amber-300 text-amber-800">
                  <LockKeyhole className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-inter text-sm font-extrabold text-[#8F460A]">
                    {t('staff.pastDayLocked')}
                  </h3>
                  <p className="mt-1 font-tajawal text-xs leading-5 text-amber-900">
                    {t('staff.pastDayLockedHint')}
                  </p>
                  <p className="mt-1 font-tajawal text-xs leading-5 text-amber-900/85">
                    {t('staff.editAccessShiftHint')}
                  </p>
                  {selectedDateEditRequest?.status === 'PENDING' ? (
                    <p className="mt-2 inline-flex rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 font-cairo text-xs font-bold text-amber-900">
                      {t('staff.accessRequestPending')}
                    </p>
                  ) : (
                    <>
                      {selectedDateEditRequest?.status === 'REJECTED' && (
                        <p className="mt-2 font-tajawal text-xs text-red-700">
                          {t('staff.accessRequestRejected')}
                        </p>
                      )}
                      {!requestFormOpen ? (
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
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : appointmentsLoading ? (
            <div className="grid gap-2 md:grid-cols-2">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <Skeleton key={item} className="h-28" />
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
            <div className="grid gap-2.5 md:grid-cols-2 xl:gap-3">
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
                <details className="rounded-[16px] border border-dashed border-[#A9C98A] bg-[#F7FBF1] p-3 md:col-span-2">
                  <summary className="cursor-pointer font-inter text-sm font-semibold text-[#3E6B12]">
                    {t('staff.paidBookings', { count: bookingGroups.paid.length })}
                  </summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
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
                <details className="rounded-[16px] border border-[#E2E8F0] bg-white p-3 md:col-span-2">
                  <summary className="cursor-pointer font-inter text-sm font-semibold text-[#4A5A70]">
                    {t('staff.cancelledBookings', { count: bookingGroups.cancelled.length })}
                  </summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
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

        <section
          id="hours-goal"
          className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 sm:p-5"
          aria-label={t('staff.hoursGoal')}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-inter text-base font-extrabold text-[#002346]">
              {t('staff.hoursGoal')}
            </h2>
            <span className="font-inter text-xs text-[#4A5A70]">{t('staff.bookedHours')}</span>
          </div>
          <div className="mt-4 space-y-4">
            <GoalBar
              label={t('staff.goalToday')}
              achieved={todayGoalAchieved}
              target={todayGoalTarget}
              color="#8DC63F"
              unit={t('staff.hoursShort')}
            />
            <GoalBar
              label={t('staff.goalMonth')}
              achieved={monthGoalAchieved}
              target={monthGoalTarget}
              color="#0B3B6E"
              unit={t('staff.hoursShort')}
            />
          </div>
        </section>

        <BottomDock
          title={t('staff.myShift')}
          totalBalanceLabel={t('staff.totalBalance')}
          totalBalanceValue={financialDataConsistent ? money(financialData.totalBalance ?? 0) : '—'}
          handoverLabel={t('staff.handoverInTransit')}
          handoverValue={
            financialDataConsistent ? money(financialData.handoverInTransit ?? 0) : '—'
          }
          actions={[
            {
              key: shift ? 'close' : 'open',
              label: shift ? t('staff.closeShift') : t('staff.openShift'),
              icon: LockKeyhole,
              variant: 'primary',
              onClick: shift ? startClosing : () => setOpenShiftModal(true),
              disabled: shifts.isLoading,
            },
            {
              key: 'shop',
              label: t('staff.shopSale'),
              icon: ShoppingBag,
              variant: 'secondary',
              onClick: openStandaloneSale,
              disabled: !canRecordIncome || selectedDate !== shiftBusinessDate,
            },
            {
              key: 'expense',
              label: t('staff.expense'),
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
            {
              key: 'nota',
              label: 'Nota',
              icon: NotebookPen,
              variant: 'secondary',
              onClick: () => setNotaOpen(true),
              disabled: !shift,
            },
          ]}
        />
      </div>

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
        screen
        subtitle={`${currentUser?.name ?? ''} · ${closingDateLabel}`}
        onClose={closeState.isLoading ? undefined : () => setClosingOpen(false)}
        title={closingResult ? t('staff.shiftResult') : t('staff.closeShift')}
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
            onReviewUnpaid={() => {
              setClosingOpen(false);
              setDay(shiftBusinessDate ?? today);
              document
                .getElementById('staff-bookings')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
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

      <Modal open={notaOpen} onClose={() => setNotaOpen(false)} title={t('staff.notaTitle')}>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const amount = Math.round(Number(notaAmount) * 100);
            if (!Number.isFinite(amount) || amount <= 0) return;
            try {
              await createOwnerNota({
                ownerId: notaOwnerId,
                shiftId: shift.id,
                amount,
                ...(notaNote.trim() ? { note: notaNote.trim() } : {}),
              }).unwrap();
              setNotaAmount('');
              setNotaNote('');
              setNotaOpen(false);
            } catch {
              /* mutation error is displayed below */
            }
          }}
        >
          <label className="block space-y-1 text-sm font-semibold text-[#4A5A70]">
            <span>{t('staff.notaOwner')}</span>
            <select
              value={notaOwnerId}
              onChange={(event) => setNotaOwnerId(event.target.value)}
              required
              disabled={notaOwners.isLoading || activeNotaOwners.length === 0}
              className="min-h-12 w-full rounded-xl border border-[#D5DDE7] bg-white px-3 text-[#0E1B2B]"
            >
              {activeNotaOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm font-semibold text-[#4A5A70]">
            <span>{t('staff.notaAmount')}</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={notaAmount}
              onChange={(event) => setNotaAmount(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-[#D5DDE7] px-3 text-[#0E1B2B]"
            />
          </label>
          <label className="block space-y-1 text-sm font-semibold text-[#4A5A70]">
            <span>{t('staff.notaNote')}</span>
            <textarea
              value={notaNote}
              onChange={(event) => setNotaNote(event.target.value)}
              maxLength={500}
              rows={2}
              className="w-full rounded-xl border border-[#D5DDE7] px-3 py-2 text-[#0E1B2B]"
            />
          </label>
          {(ownerNotaState.error || notaOwners.isError) && (
            <p role="alert" className="text-sm text-red-700">
              {t('staff.notaError')}
            </p>
          )}
          <button
            type="submit"
            disabled={
              ownerNotaState.isLoading ||
              notaOwners.isLoading ||
              !notaOwnerId ||
              activeNotaOwners.length === 0 ||
              !notaAmount ||
              Number(notaAmount) <= 0
            }
            className="min-h-12 w-full rounded-xl bg-[#8DC63F] px-4 font-bold text-[#0E2A05] disabled:opacity-50"
          >
            {ownerNotaState.isLoading ? t('common.loading') : t('staff.notaSave')}
          </button>
          <p className="text-xs text-[#64748B]">{t('staff.notaHint')}</p>
        </form>
      </Modal>

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

function MoneyChip({ label, value }) {
  return (
    <div className="min-w-0 rounded-[10px] bg-[#F3F5F9] px-1.5 py-2 text-center sm:px-2">
      <p className="truncate font-inter text-[10px] text-[#4A5A70] sm:text-[11px]">{label}</p>
      <p className="mt-0.5 truncate font-inter text-xs font-bold text-[#0E1B2B] tabular-nums sm:text-sm">
        {value}
      </p>
    </div>
  );
}

function GoalRing({ label, achieved, target, color, unit, loading }) {
  const progress = target > 0 ? Math.min(100, Math.max(0, (achieved / target) * 100)) : 0;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div
        className="relative size-9 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${color} ${progress}%, #E6EBF2 ${progress}% 100%)` }}
        aria-hidden="true"
      >
        <span className="absolute inset-[5px] rounded-full bg-white" />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate font-inter text-[10px] text-[#4A5A70] sm:text-xs">{label}</p>
        <p className="mt-0.5 truncate font-inter text-xs font-extrabold text-[#002346] tabular-nums sm:text-sm">
          {loading
            ? '—'
            : `${Number(achieved ?? 0).toFixed(1)} / ${Number(target ?? 0).toFixed(1)} ${unit}`}
        </p>
      </div>
    </div>
  );
}

function GoalBar({ label, achieved, target, color, unit }) {
  const percentage = target > 0 ? Math.min(100, Math.max(0, (achieved / target) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 font-inter text-xs sm:text-sm">
        <span className="font-semibold text-[#33435A]">{label}</span>
        <span className="shrink-0 text-[#4A5A70] tabular-nums">
          <b className="font-extrabold text-[#002346]">
            {Number(achieved ?? 0).toFixed(1)} {unit}
          </b>
          {' / '}
          {Number(target ?? 0).toFixed(1)} {unit}
        </span>
      </div>
      <div className="mt-2 h-[10px] overflow-hidden rounded-full bg-[#E6EBF2]">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function CourtPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-9 shrink-0 rounded-full border px-4 font-inter text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#01649B] sm:text-sm ${
        active
          ? 'border-[#002346] bg-[#002346] text-white'
          : 'border-[#CDD6E2] bg-white text-[#33435A] hover:border-[#01649B]'
      }`}
    >
      {children}
    </button>
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
  const phone = appointment.customer?.phone;
  const phoneHref = phone ? `tel:${String(phone).replace(/[^+\d]/g, '')}` : null;

  return (
    <article
      className={`min-w-0 rounded-[16px] border border-[#E2E8F0] bg-white p-3 shadow-[0_2px_8px_rgba(0,35,70,0.035)] sm:p-3.5 ${style.border}`}
      style={{ backgroundColor: style.background }}
    >
      <div className="flex min-w-0 items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate font-inter text-[15px] font-bold leading-5 text-[#0E1B2B] sm:text-base">
            {appointment.customer?.name || t('staff.walkIn')}
          </p>
          <p className="mt-0.5 truncate font-inter text-xs leading-5 text-[#4A5A70] sm:text-[13px]">
            <span dir="ltr" className="tabular-nums">
              {formatTime(appointment.startsAt, locale)}–{formatTime(appointment.endsAt, locale)}
            </span>
            {appointment.court?.name || appointment.court?.staffName
              ? ` · ${appointment.court.name || appointment.court.staffName}`
              : ''}
          </p>
          {rewardHours > 0 && (
            <span className="mt-1 inline-flex rounded-md bg-[#EAF3DE] px-2 py-1 font-inter text-[10px] font-bold text-[#315A0B]">
              {t('staff.rewardHoursBadge', { hours: rewardHours })}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-end">
          <p className="font-inter text-[15px] font-extrabold leading-5 text-[#002346] tabular-nums sm:text-base">
            {formatEgpWithCurrency(due > 0 ? due : (appointment.payment?.expected ?? 0), locale)}
          </p>
          <span
            className={`rounded-full px-2 py-0.5 font-inter text-[10px] font-bold ${
              status === 'PAID'
                ? 'bg-[#EAF6DF] text-[#3E6B12]'
                : status === 'PARTIAL'
                  ? 'bg-[#FFF4D6] text-[#80520A]'
                  : 'bg-[#FDF0E2] text-[#8F460A]'
            }`}
          >
            {t(`payment.${status}`)}
          </span>
        </div>
      </div>

      {appointment.note && (
        <p className="mt-2 truncate rounded-[8px] border border-[#D9E5F3] bg-[#EAF1F9] px-2.5 py-1.5 font-inter text-[11px] font-medium text-[#174B7C]">
          {appointment.note}
        </p>
      )}

      <div className="mt-3 flex min-w-0 items-center gap-2">
        {phoneHref && (
          <a
            href={phoneHref}
            className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-[#D5DDE7] bg-white text-[#0B3B6E] outline-none transition hover:border-[#01649B] focus-visible:ring-2 focus-visible:ring-[#01649B]"
            aria-label={t('staff.callPlayer')}
          >
            <Phone className="size-[18px]" strokeWidth={2} aria-hidden="true" />
          </a>
        )}
        <button
          type="button"
          onClick={onRecordSale}
          disabled={!canRecordIncome}
          className="min-h-11 min-w-0 flex-1 rounded-[12px] border border-[#D5DDE7] bg-white px-2 font-inter text-xs font-semibold text-[#002346] outline-none transition hover:border-[#01649B] focus-visible:ring-2 focus-visible:ring-[#01649B] disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
        >
          {t('staff.addShopSales')}
        </button>
        {due > 0 && (
          <button
            type="button"
            onClick={onRecordPayment}
            disabled={!canRecordIncome}
            className="min-h-11 min-w-0 flex-[1.25] rounded-[12px] bg-[#8DC63F] px-2 font-inter text-xs font-bold text-[#0E2A05] outline-none transition hover:bg-[#9AD34D] focus-visible:ring-2 focus-visible:ring-[#002346] disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
          >
            {t('staff.recordPayment')}
          </button>
        )}
      </div>
      <BookingPaymentLines
        incomes={appointment.incomes}
        userId={userId}
        canEditDay={canEditDay}
        locale={locale}
        t={t}
        onEdit={onEditIncome}
      />
    </article>
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
  onReviewUnpaid,
}) {
  const moneyFmt = (amount) => formatEgpWithCurrency(amount ?? 0, locale);
  const now = Date.now();
  const unpaidSummary = summarizeUnpaid(summary.bookings ?? [], now);
  const expectedCash = summary.cash?.expectedCash ?? 0;
  const [countedCashInput, setCountedCashInput] = useState((expectedCash / 100).toFixed(2));
  useEffect(() => setCountedCashInput((expectedCash / 100).toFixed(2)), [expectedCash]);
  const countedCashPiasters = Number.isFinite(Number(countedCashInput))
    ? Math.round(Number(countedCashInput) * 100)
    : NaN;
  const closingDifference = Number.isFinite(countedCashPiasters)
    ? countedCashPiasters - expectedCash
    : 0;
  const playedMinutes = (summary.bookings ?? []).reduce((total, booking) => {
    const start = new Date(booking.startsAt).getTime();
    const end = new Date(booking.endsAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return total;
    return total + Math.max(0, Math.round((Math.min(now, end) - start) / 60_000));
  }, 0);
  const playedHours = playedMinutes / 60;
  const closeReasonValid = !requiresCloseReason || closeReason.trim().length >= 3;

  const summaryRows = [
    [t('staff.closingCash'), moneyFmt(summary.byMethod?.CASH)],
    [t('staff.closingVisa'), moneyFmt(summary.byMethod?.VISA)],
    [t('staff.closingInstapay'), moneyFmt(summary.byMethod?.INSTAPAY)],
    [t('staff.closingShopSales'), moneyFmt(summary.shop?.total)],
    [t('staff.closingExpenses'), `− ${moneyFmt(summary.expenses?.total)}`],
    [t('staff.closingHoursPlayed'), `${playedHours.toFixed(1)} ${t('staff.hoursShort')}`],
  ];

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden font-inter text-[#0E1B2B] sm:space-y-5">
      <ol className="grid grid-cols-3 gap-2" aria-label={t('staff.closingProgress')}>
        <ClosingStep number="1" label={t('staff.closingStepCheck')} active />
        <ClosingStep number="2" label={t('staff.closingStepCountCash')} active />
        <ClosingStep number="3" label={t('staff.closingStepHandover')} />
      </ol>

      {unpaidSummary.unpaid > 0 && (
        <section className="rounded-[20px] border border-[#F5C78E] bg-[#FDF0E2] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 size-7 shrink-0 text-[#9A4C0B]"
              strokeWidth={2}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-inter text-base font-extrabold leading-6 text-[#8F460A] sm:text-lg">
                {t('staff.closingUnpaidCount', {
                  count: unpaidSummary.unpaid,
                  amount: moneyFmt(unpaidSummary.unpaidDue),
                })}
              </p>
              <p className="mt-0.5 font-inter text-sm leading-5 text-[#9A4C0B]">
                {t('staff.closingUnpaidHint')}
              </p>
              <button
                type="button"
                onClick={onReviewUnpaid}
                className="mt-2 inline-flex min-h-10 items-center font-inter text-sm font-bold text-[#8F460A] underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-[#01649B]"
              >
                {t('staff.closingReviewUnpaid')} <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-5">
        <section className="min-w-0 rounded-[22px] border border-[#E2E8F0] bg-white p-4 sm:p-6">
          <h2 className="font-inter text-xl font-extrabold text-[#002346]">
            {t('staff.closingStepSummary')}
          </h2>
          <div className="mt-4 divide-y divide-[#E7ECF2]">
            {summaryRows.map(([label, value]) => (
              <div
                key={label}
                className="grid min-h-[48px] min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2.5"
              >
                <span className="min-w-0 break-words font-inter text-sm text-[#4A5A70] sm:text-base">
                  {label}
                </span>
                <span className="shrink-0 font-inter text-sm font-bold text-[#0E1B2B] tabular-nums sm:text-base">
                  {value}
                </span>
              </div>
            ))}
            <div className="grid min-h-[54px] min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 pt-3">
              <span className="min-w-0 break-words font-inter text-sm font-extrabold text-[#002346] sm:text-base">
                {t('staff.closingExpectedCash')}
              </span>
              <span className="shrink-0 font-inter text-base font-extrabold text-[#002346] tabular-nums sm:text-lg">
                {moneyFmt(expectedCash)}
              </span>
            </div>
          </div>
        </section>

        <form
          className="min-w-0 space-y-4"
          onSubmit={(event) => onSubmit(event, countedCashPiasters)}
        >
          <section className="min-w-0 rounded-[22px] border border-[#E2E8F0] bg-white p-4 sm:p-6">
            <h2 className="font-inter text-xl font-extrabold text-[#002346]">
              {t('staff.closingStepCountHeading')}
            </h2>
            <label className="mt-4 block">
              <span className="mb-2 block font-inter text-sm font-semibold text-[#4A5A70] sm:text-base">
                {t('staff.closingCashNow')}
              </span>
              <span className="flex min-h-[72px] items-center gap-3 rounded-[18px] border-[2px] border-[#174B7C] bg-white px-4 sm:min-h-[82px] sm:px-5">
                <span className="shrink-0 font-inter text-sm font-bold text-[#4A5A70] sm:text-base">
                  EGP
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={countedCashInput}
                  onChange={(event) => setCountedCashInput(event.target.value)}
                  required
                  className="min-w-0 flex-1 bg-transparent font-inter text-xl font-extrabold text-[#002346] outline-none sm:text-2xl"
                />
                <span className="rounded-full bg-[#EAF1F9] px-2.5 py-1 font-inter text-[10px] font-bold text-[#174B7C] sm:text-xs">
                  {t('common.edit')}
                </span>
              </span>
              <span className="mt-2 block font-inter text-xs leading-5 text-[#4A5A70]">
                {t('staff.closingCashExpectedHint', { amount: moneyFmt(expectedCash) })}
              </span>
            </label>

            <div
              className={`mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[14px] px-3.5 py-3 sm:px-4 ${
                closingDifference === 0
                  ? 'bg-[#DCFCE7] text-[#166534]'
                  : closingDifference < 0
                    ? 'bg-[#FEE2E2] text-[#991B1B]'
                    : 'bg-[#EAF1F9] text-[#174B7C]'
              }`}
              role="status"
              aria-live="polite"
            >
              <span className="font-inter text-sm font-bold">{t('staff.closingDifference')}</span>
              <span className="min-w-0 text-end font-inter text-sm font-bold tabular-nums">
                {moneyFmt(closingDifference)}
              </span>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block font-inter text-sm font-semibold text-[#4A5A70]">
                {t('common.noteOptional')}
              </span>
              <textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t('staff.closeNotePlaceholder')}
                className="min-h-[88px] w-full resize-y rounded-[16px] border border-[#D5DDE7] bg-white px-4 py-3 font-inter text-sm text-[#0E1B2B] outline-none placeholder:text-[#8593A6] focus:border-[#01649B] focus:ring-2 focus:ring-[#01649B]/15"
              />
            </label>

            {requiresCloseReason && (
              <label className="mt-4 block">
                <span className="mb-2 block font-inter text-sm font-semibold text-[#8F460A]">
                  {t('staff.closeReasonRequired')}
                </span>
                <textarea
                  rows={2}
                  minLength={3}
                  required
                  value={closeReason}
                  onChange={(event) => setCloseReason(event.target.value)}
                  placeholder={t('staff.closeReasonPlaceholder')}
                  className="w-full rounded-[16px] border border-[#F1C58B] bg-[#FFFBF5] px-4 py-3 font-inter text-sm text-[#0E1B2B] outline-none placeholder:text-[#9A7A5D] focus:border-[#01649B] focus:ring-2 focus:ring-[#01649B]/15"
                />
              </label>
            )}
            {error && (
              <p className="mt-3 font-inter text-sm text-red-700" role="alert">
                {errorMessage(error, t)}
              </p>
            )}
          </section>

          <section className="min-w-0 rounded-[22px] border border-[#E2E8F0] bg-white p-4 sm:p-6">
            <h2 className="font-inter text-xl font-extrabold text-[#002346]">
              {t('staff.closingStepHandoverHeading')}
            </h2>
            <p className="mt-4 font-inter text-sm font-semibold text-[#4A5A70]">
              {t('staff.closingGiveCashTo')}
            </p>
            <Link
              to="/app/staff/handover"
              className="mt-2 flex min-h-[60px] items-center justify-between gap-3 rounded-[16px] border border-[#D5DDE7] bg-white px-4 py-3 font-inter text-sm font-bold text-[#002346] outline-none transition hover:border-[#01649B] focus-visible:ring-2 focus-visible:ring-[#01649B]"
            >
              <span>{t('staff.closingOpenHandover')}</span>
              <ChevronDown className="size-5 shrink-0" aria-hidden="true" />
            </Link>
            <p className="mt-3 font-inter text-xs leading-5 text-[#4A5A70]">
              {t('staff.closingHandoverSeparateHint')}
            </p>
          </section>

          <button
            type="submit"
            disabled={
              state.isLoading ||
              !closeReasonValid ||
              !Number.isFinite(countedCashPiasters) ||
              countedCashPiasters < 0
            }
            className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-[20px] bg-[#8DC63F] px-5 py-4 font-inter text-base font-extrabold text-[#0E2A05] outline-none transition hover:bg-[#9AD34D] focus-visible:ring-2 focus-visible:ring-[#002346] disabled:cursor-not-allowed disabled:opacity-50 sm:text-lg"
          >
            <LockKeyhole className="size-5" aria-hidden="true" />
            {state.isLoading ? t('common.loading') : t('staff.closeShift')}
          </button>
        </form>
      </div>
    </div>
  );
}

function ClosingStep({ number, label, active = false }) {
  return (
    <li className="min-w-0 text-center">
      <span className={`block h-[9px] rounded-full ${active ? 'bg-[#8DC63F]' : 'bg-[#D5DDE7]'}`} />
      <span
        className={`mt-2 block truncate font-inter text-sm font-bold sm:text-base ${active ? 'text-[#3E6B12]' : 'text-[#4A5A70]'}`}
      >
        {number} {label}
      </span>
    </li>
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
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <Card dark className="min-w-0 max-w-full border-navy bg-navy p-4 text-white shadow-card-dark">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ball text-ball">
            {owed ? (
              <AlertTriangle className="size-5" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-5" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Badge tone={owed ? 'danger' : 'success'}>
              {owed ? t('staff.closingNeedsAttention') : t('staff.closingAllClear')}
            </Badge>
            <h3 className="mt-1 break-words font-cairo text-base font-black">
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
                ? t('staff.closingCashSystemCalculated')
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
                <span className="shrink-0 font-cairo font-black">{money(item.due)}</span>
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
