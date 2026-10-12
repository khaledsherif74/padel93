import {
  AlertTriangle,
  ArrowUpRight,
  BookOpenCheck,
  CalendarDays,
  RefreshCw,
  CircleDollarSign,
  ClipboardCheck,
  HandCoins,
  ReceiptText,
  ShieldCheck,
  WalletCards,
  UsersRound,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useGetDashboardBalancesQuery,
  useGetGoalQuery,
} from '../../app/api';
import { currentMonth } from '../../shared/lib/date';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import KpiCard from '../../shared/ui/KpiCard';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Skeleton from '../../shared/ui/Skeleton';
import ErrorState from '../../shared/ui/ErrorState';

const KPI_ITEMS = [
  ['drawer', 'owner.kpiDrawer', WalletCards],
  ['accountant', 'owner.kpiAccountant', CircleDollarSign],
  ['inTransit', 'owner.kpiTransit', HandCoins],
  ['pendingExceptions', 'owner.kpiExceptions', AlertTriangle],
  ['pendingExpenseApprovals', 'owner.kpiExpenseApprovals', ReceiptText],
  ['unverifiedPayments', 'owner.kpiUnverified', ClipboardCheck],
  ['disputedTransfers', 'owner.kpiDisputed', ShieldCheck],
  ['openShifts', 'owner.kpiOpenShifts', CalendarDays],
  ['booklyChanges', 'owner.kpiBooklyChanges', RefreshCw],
];

export default function OwnerDashboardPage() {
  const { t, i18n } = useTranslation();
  const month = currentMonth();
  const balances = useGetDashboardBalancesQuery();
  const goal = useGetGoalQuery(month, { refetchOnMountOrArgChange: true, refetchOnFocus: true });
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

  const valueFor = useMemo(() => {
    const cash = balances.data?.cash ?? {};
    const todo = balances.data?.todo ?? {};

    return {
      drawer: formatEgpWithCurrency(cash.drawer ?? 0, locale),
      accountant: formatEgpWithCurrency(cash.accountant ?? 0, locale),
      inTransit: formatEgpWithCurrency(cash.inTransit ?? 0, locale),
      pendingExceptions: todo.pendingExceptions ?? 0,
      pendingExpenseApprovals: todo.pendingExpenseApprovals ?? 0,
      unverifiedPayments: todo.unverifiedPayments ?? 0,
      disputedTransfers: todo.disputedTransfers ?? 0,
      openShifts: todo.openShifts ?? 0,
      booklyChanges: todo.unacknowledgedBooklyChanges ?? 0,
    };
  }, [balances.data, locale]);

  if (balances.isLoading) {
    return <OwnerDashboardSkeleton />;
  }

  if (balances.isError) {
    return (
      <ErrorState
        title={t('owner.dashboardLoadError')}
        description={t('errors.generic')}
        onRetry={balances.refetch}
      />
    );
  }

  const goalProgress = Math.min(100, Math.max(0, (goal.data?.progress ?? 0) * 100));
  const hasGoal = goal.data?.goalHours != null;
  const goalAchievable = goal.data?.achievable !== false;

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <PageHeader
        eyebrow={t('owner.eyebrow')}
        title={t('owner.dashboardTitle')}
        description={t('owner.dashboardDescription')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/app/owner/inbox">
              <Button>
                <ClipboardCheck className="size-4" aria-hidden="true" />
                {t('owner.openInbox')}
              </Button>
            </Link>
            <Link to="/app/owner/users">
              <Button variant="ghost">
                <UsersRound className="size-4" aria-hidden="true" />
                {t('owner.users')}
              </Button>
            </Link>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label={t('owner.kpiStrip')}>
        {KPI_ITEMS.map(([key, label, Icon]) => (
          <KpiCard
            key={key}
            label={t(label)}
            value={valueFor[key]}
            detail={key.includes('pending') || key === 'unverifiedPayments' || key === 'disputedTransfers' || key === 'openShifts' || key === 'booklyChanges' ? t('owner.actionNeeded') : t('owner.currentRecorded')}
            icon={Icon}
          />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="bg-navy p-6 text-white sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-cairo text-xs font-bold uppercase tracking-[0.15em] text-ball">
                  {t('owner.cashEyebrow')}
                </p>
                <h2 className="mt-1 font-cairo text-2xl font-black">
                  {t('owner.cashTitle')}
                </h2>
                <p className="mt-2 max-w-xl font-tajawal text-sm leading-7 text-white/70">
                  {t('owner.cashDescription')}
                </p>
              </div>
              <Badge tone="success">{t('owner.live')}</Badge>
            </div>
          </div>

          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
            <MoneyTile label={t('accountant.drawer')} value={valueFor.drawer} />
            <MoneyTile label={t('accountant.accountant')} value={valueFor.accountant} />
            <MoneyTile label={t('accountant.inTransit')} value={valueFor.inTransit} />
            <MoneyTile label={t('accountant.owner')} value={formatEgpWithCurrency(balances.data?.cash?.owner ?? 0, locale)} />
          </div>

          <div className="grid gap-3 border-t border-navy/10 p-5 sm:grid-cols-2 sm:p-6">
            <BalanceNote
              label={t('accountant.disputedGap')}
              value={formatEgpWithCurrency(balances.data?.cash?.disputedGap ?? 0, locale)}
              tone="warning"
            />
            <BalanceNote
              label={t('accountant.shortage')}
              value={formatEgpWithCurrency(balances.data?.cash?.shortage ?? 0, locale)}
              tone="danger"
            />
          </div>
        </Card>

        <Card className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-cairo text-xs font-bold uppercase tracking-[0.15em] text-ball">
                {t('owner.goalEyebrow')}
              </p>
              <h2 className="mt-1 font-cairo text-2xl font-black text-navy">
                {t('accountant.monthlyGoal')}
              </h2>
            </div>
            <Badge tone={goalAchievable ? 'success' : 'warning'}>
              {hasGoal ? (goalAchievable ? t('owner.achievable') : t('owner.notAchievable')) : t('owner.notSet')}
            </Badge>
          </div>

          {goal.isLoading ? (
            <div className="mt-6 space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : hasGoal ? (
            <>
              <div className="mt-6 flex items-end justify-between gap-3">
                <p className="font-cairo text-4xl font-black text-navy">
                  {Math.round(goalProgress)}%
                </p>
                <p className="font-tajawal text-sm text-navy/55">
                  {goal.data.completedHours ?? 0} {t('staff.hours')} / {goal.data.goalHours ?? 0} {t('staff.hours')}
                </p>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-navy/8">
                <div
                  className="h-full rounded-full bg-ball transition-[width] duration-500"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Stat label={t('owner.remaining')} value={`${goal.data.remainingToPlayHours ?? 0} ${t('staff.hours')}`} />
                <Stat label={t('owner.capacity')} value={`${goal.data.remainingCapacityHours ?? 0} ${t('staff.hours')}`} />
              </div>
            </>
          ) : (
            <div className="mt-8 rounded-2xl border border-navy/10 bg-white p-5 text-center">
              <p className="font-cairo text-sm font-bold text-navy">{t('owner.noGoal')}</p>
              <Link to="/app/owner/settings" className="mt-3 inline-flex">
                <Button variant="ghost">{t('owner.setGoal')}</Button>
              </Link>
            </div>
          )}
        </Card>
      </section>

      <Card className="p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-cairo text-xs font-bold uppercase tracking-[0.15em] text-ball">
              {t('owner.quickActionsEyebrow')}
            </p>
            <h2 className="mt-1 font-cairo text-2xl font-black text-navy">
              {t('owner.quickActionsTitle')}
            </h2>
          </div>
          <p className="font-tajawal text-sm text-navy/55">
            {t('owner.quickActionsHint')}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction to="/app/owner/bookings" icon={CalendarDays} label={t('owner.navAppointments')} text={t('owner.bookingsDescription')} />
          <QuickAction to="/app/owner/inbox" icon={ClipboardCheck} label={t('owner.inbox')} text={t('owner.inboxDescription')} />
          <QuickAction to="/app/accountant/reports" icon={BookOpenCheck} label={t('accountant.navReports')} text={t('owner.reportsDescription')} />
          <QuickAction to="/app/owner/control" icon={ShieldCheck} label={t('owner.controlCenter')} text={t('owner.controlDescription')} />
        </div>
      </Card>
    </div>
  );
}

function MoneyTile({ label, value }) {
  return (
    <div className="border-b border-navy/10 p-5 last:border-b-0 sm:border-e lg:border-b-0 lg:last:border-e-0">
      <p className="font-cairo text-xs font-semibold text-navy/50">{label}</p>
      <p className="mt-2 font-cairo text-xl font-black text-navy">{value}</p>
    </div>
  );
}

function BalanceNote({ label, value, tone }) {
  const toneClasses = {
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
  };

  return (
    <div className={`rounded-xl border p-4 ${toneClasses[tone]}`}>
      <p className="font-cairo text-xs font-semibold opacity-75">{label}</p>
      <p className="mt-1 font-cairo text-base font-black">{value}</p>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-navy/10 p-4">
      <p className="font-cairo text-xs font-semibold text-navy/45">{label}</p>
      <p className="mt-1 font-tajawal text-sm font-bold text-navy">{value}</p>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, text }) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-navy/10 bg-white p-5 outline-none transition hover:border-edge/40 hover:shadow-card focus-visible:ring-2 focus-visible:ring-edge"
    >
      <div className="flex size-11 items-center justify-center rounded-full border border-ball text-ball">
        <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <h3 className="font-cairo text-base font-extrabold text-navy">{label}</h3>
        <ArrowUpRight className="size-4 text-edge transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
      </div>
      <p className="mt-2 font-tajawal text-sm leading-6 text-navy/55">{text}</p>
    </Link>
  );
}

function OwnerDashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-28" />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
