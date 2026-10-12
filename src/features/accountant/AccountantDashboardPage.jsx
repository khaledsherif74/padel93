import {
  ArrowUpRight,
  Banknote,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Landmark,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetDashboardBalancesQuery, useGetGoalQuery } from '../../app/api';
import { currentMonth } from '../../shared/lib/date';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import KpiCard from '../../shared/ui/KpiCard';
import Skeleton from '../../shared/ui/Skeleton';
import ErrorState from '../../shared/ui/ErrorState';
import ProgressRing from '../../shared/ui/ProgressRing';

export default function AccountantDashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const month = currentMonth();
  const balances = useGetDashboardBalancesQuery();
  const goal = useGetGoalQuery(month);

  if (balances.isLoading) {
    return <DashboardSkeleton t={t} />;
  }

  if (balances.isError) {
    return (
      <ErrorState
        title={t('errors.generic')}
        description={t('accountant.dashboardLoadError')}
        onRetry={balances.refetch}
      />
    );
  }

  const data = balances.data ?? {};
  const cash = data.cash ?? {};
  const bank = data.bank ?? {};
  const todo = data.todo ?? {};
  const progress = Number(goal.data?.progress ?? 0);

  const todoItems = [
    {
      key: 'unverified',
      count: todo.unverifiedPayments ?? 0,
      label: t('accountant.todoUnverified'),
      to: '/app/accountant/verification',
      icon: ClipboardCheck,
    },
    {
      key: 'transfers',
      count: todo.pendingTransfers ?? 0,
      label: t('accountant.todoTransfers'),
      to: '/app/accountant/handovers',
      icon: Banknote,
    },
    {
      key: 'variance',
      count: todo.shiftsWithVariance ?? 0,
      label: t('accountant.todoVariance'),
      to: '/app/accountant/shifts',
      icon: CircleAlert,
    },
    {
      key: 'bookly',
      count: todo.unacknowledgedBooklyChanges ?? 0,
      label: t('accountant.todoBookly'),
      to: '/app/accountant/bookly',
      icon: RefreshCw,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={t('accountant.eyebrow')}
        title={t('accountant.dashboardTitle')}
        description={t('accountant.dashboardDescription')}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t('accountant.drawerCash')}
          value={formatEgpWithCurrency(cash.drawer ?? 0, locale)}
          icon={Banknote}
          detail={t('accountant.cashLocationDetail')}
        />
        <KpiCard
          label={t('accountant.accountantCash')}
          value={formatEgpWithCurrency(cash.accountant ?? 0, locale)}
          icon={Landmark}
          detail={t('accountant.cashLocationDetail')}
        />
        <KpiCard
          label={t('accountant.inTransit')}
          value={formatEgpWithCurrency(cash.inTransit ?? 0, locale)}
          icon={RefreshCw}
          detail={t('accountant.cashLocationDetail')}
        />
        <KpiCard
          label={t('accountant.disputedGap')}
          value={formatEgpWithCurrency(cash.disputedGap ?? 0, locale)}
          icon={CircleAlert}
          detail={t('accountant.disputedGapDetail')}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-navy/10 bg-navy px-5 py-5 text-white sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
                <Landmark className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-cairo text-lg font-extrabold">{t('accountant.bankBuckets')}</h2>
                <p className="mt-1 font-tajawal text-xs text-white/65">
                  {t('accountant.bankBucketsHint')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
            {['VISA', 'INSTAPAY'].map((method) => {
              const bucket = bank[method] ?? {};
              return (
                <div key={method} className="rounded-2xl border border-navy/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-cairo text-sm font-bold text-navy">
                      {t(`method.${method}`)}
                    </p>
                    <Badge tone="info">{t('accountant.verificationBucket')}</Badge>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Bucket
                      label={t('verification.VERIFIED')}
                      value={bucket.verified ?? 0}
                      locale={locale}
                    />
                    <Link
                      to="/app/accountant/verification"
                      className="block rounded-xl border border-edge/30 bg-court/5 p-3 outline-none transition hover:border-edge/60 hover:bg-court/10 focus-visible:ring-2 focus-visible:ring-edge"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-cairo text-xs font-semibold text-navy/55">
                          {t('verification.PENDING')}
                        </p>
                        <p className="font-cairo text-base font-black text-navy">
                          {formatEgpWithCurrency(bucket.pending ?? 0, locale)}
                        </p>
                      </div>
                      <span className="mt-1 block font-tajawal text-[10px] font-semibold text-edge">
                        {t('accountant.openVerification')}
                      </span>
                    </Link>
                    <Bucket
                      label={t('verification.REJECTED')}
                      value={bucket.rejected ?? 0}
                      locale={locale}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card dark className="overflow-hidden bg-night text-white shadow-card-dark">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Clock3 className="size-5 text-ball" strokeWidth={1.8} aria-hidden="true" />
                <p className="font-cairo text-xs font-bold uppercase tracking-[0.14em] text-ball">
                  {t('accountant.monthlyGoal')}
                </p>
              </div>
              <h2 className="mt-3 font-cairo text-2xl font-black">
                {goal.data?.goalHours != null
                  ? `${Number(goal.data.goalHours).toFixed(1)} ${t('staff.hours')}`
                  : t('staff.noGoal')}
              </h2>
              {goal.data?.goalHours != null && (
                <p className="mt-2 max-w-md font-tajawal text-sm leading-7 text-white/65">
                  {t('accountant.goalHint', { progress: Math.round(progress * 100) })}
                </p>
              )}
            </div>
            {goal.isLoading ? (
              <Skeleton className="size-28 rounded-full bg-white/10" />
            ) : goal.data?.goalHours != null ? (
              <ProgressRing
                value={progress}
                label={`${Math.round(progress * 100)}%`}
                sublabel={t('accountant.progress')}
              />
            ) : null}
          </div>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="font-cairo text-xs font-bold uppercase tracking-[0.14em] text-ball">
              {t('accountant.todoEyebrow')}
            </p>
            <h2 className="mt-1 font-cairo text-2xl font-black text-navy">
              {t('accountant.todoTitle')}
            </h2>
          </div>
          {todo.openShifts > 0 && (
            <Link className="font-cairo text-sm font-bold text-edge" to="/app/accountant/shifts">
              {t('accountant.openShifts', { count: todo.openShifts })}
            </Link>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {todoItems.map(({ key, count, label, to, icon: Icon }) => (
            <Link
              key={key}
              to={to}
              className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card outline-none transition hover:-translate-y-0.5 hover:border-edge/35 focus-visible:ring-2 focus-visible:ring-edge"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
                  <Icon className="size-4" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <ArrowUpRight className="size-4 text-navy/35" aria-hidden="true" />
              </div>
              <p className="mt-5 font-cairo text-3xl font-black text-navy">{count}</p>
              <p className="mt-1 font-tajawal text-sm leading-6 text-navy/60">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-cairo text-xs font-bold uppercase tracking-[0.14em] text-ball">
                {t('accountant.cashSummary')}
              </p>
              <h2 className="mt-1 font-cairo text-xl font-black text-navy">
                {t('accountant.cashLocations')}
              </h2>
            </div>
            <ShieldCheck className="size-5 text-edge" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SummaryRow label={t('accountant.drawer')} value={cash.drawer} locale={locale} />
            <SummaryRow
              label={t('accountant.accountant')}
              value={cash.accountant}
              locale={locale}
            />
            <SummaryRow label={t('accountant.owner')} value={cash.owner} locale={locale} />
            <SummaryRow
              label={t('accountant.shortage')}
              value={cash.shortage}
              locale={locale}
              tone={cash.shortage ? 'danger' : 'neutral'}
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-cairo text-xs font-bold uppercase tracking-[0.14em] text-ball">
                {t('accountant.ownerPaid')}
              </p>
              <h2 className="mt-1 font-cairo text-xl font-black text-navy">
                {formatEgpWithCurrency(data.ownerPaidExpenses ?? 0, locale)}
              </h2>
            </div>
            <Banknote className="size-5 text-edge" aria-hidden="true" />
          </div>
          <p className="mt-3 font-tajawal text-sm leading-7 text-navy/60">
            {t('accountant.ownerPaidHint')}
          </p>
        </Card>
      </section>
    </div>
  );
}

function Bucket({ label, value, locale }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-navy/[0.035] p-3 dark:bg-white/5">
      <p className="font-cairo text-xs font-semibold text-navy/55 dark:text-white/55">{label}</p>
      <p className="font-cairo text-base font-black text-navy dark:text-white">
        {formatEgpWithCurrency(value, locale)}
      </p>
    </div>
  );
}

function SummaryRow({ label, value, locale, tone = 'neutral' }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-navy/10 px-4 py-3">
      <p className="font-cairo text-sm font-semibold text-navy/65">{label}</p>
      <Badge tone={tone}>{formatEgpWithCurrency(value ?? 0, locale)}</Badge>
    </div>
  );
}

function DashboardSkeleton({ t }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={t('accountant.eyebrow')}
        title={t('accountant.dashboardTitle')}
        description={t('accountant.dashboardDescription')}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-36" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {[1, 2].map((item) => (
          <Skeleton key={item} className="h-64" />
        ))}
      </div>
    </div>
  );
}
