import { ArrowRight, CalendarDays, Settings2, UsersRound, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetDashboardBalancesQuery, useGetGoalQuery } from '../../app/api';
import { currentMonth } from '../../shared/lib/date';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import Badge from '../../shared/ui/Badge';
import ErrorState from '../../shared/ui/ErrorState';
import Skeleton from '../../shared/ui/Skeleton';

export default function OwnerDashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const month = currentMonth();
  const balances = useGetDashboardBalancesQuery();
  const goal = useGetGoalQuery(month, { refetchOnMountOrArgChange: true, refetchOnFocus: true });
  const money = (value) => formatEgpWithCurrency(value ?? 0, locale);

  if (balances.isLoading) return <OwnerDashboardSkeleton />;
  if (balances.isError) {
    return (
      <ErrorState
        title={t('owner.dashboardLoadError')}
        description={t('errors.generic')}
        onRetry={balances.refetch}
      />
    );
  }

  const cash = balances.data?.cash ?? {};
  const todo = balances.data?.todo ?? {};
  const totalCash =
    Number(cash.drawer ?? 0) +
    Number(cash.accountant ?? 0) +
    Number(cash.owner ?? 0) +
    Number(cash.inTransit ?? 0);
  const goalProgress = Math.max(0, Math.min(100, Number(goal.data?.progress ?? 0) * 100));
  const pendingApprovals =
    Number(todo.pendingPaymentFlags ?? 0) + Number(todo.pendingExpenseApprovals ?? 0);
  const attention = [
    {
      to: '/app/owner/inbox',
      label: t('owner.ownerInboxAttention'),
      value: pendingApprovals,
      tone: pendingApprovals ? 'amber' : 'neutral',
      hint: t('owner.ownerInboxAttentionHint'),
    },
    {
      to: '/app/accountant/verification',
      label: t('owner.paymentVerificationAttention'),
      value: todo.unverifiedPayments ?? 0,
      tone: todo.unverifiedPayments ? 'amber' : 'neutral',
      hint: money(todo.unverifiedAmount),
    },
    {
      to: '/app/accountant/handovers',
      label: t('accountant.disputedGap'),
      value: todo.disputedTransfers ?? 0,
      tone: todo.disputedTransfers ? 'red' : 'neutral',
      hint: money(cash.disputedGap),
    },
    {
      to: '/app/accountant/staff-history',
      label: t('accountant.shiftsAttention'),
      value: todo.shiftsWithVariance ?? 0,
      tone: todo.shiftsWithVariance ? 'red' : 'neutral',
      hint: t('accountant.shiftsAttentionHint'),
    },
    {
      to: '/app/accountant/bookly',
      label: t('accountant.booklyChanges'),
      value: todo.unacknowledgedBooklyChanges ?? 0,
      tone: todo.unacknowledgedBooklyChanges ? 'amber' : 'neutral',
      hint: t('accountant.booklyChanges'),
    },
  ];

  return (
    <div className="relative z-40 mx-auto -mt-5 w-full max-w-[1280px] space-y-5 font-inter text-[#0E1B2B]">
      <section
        className="rounded-[20px] border border-[#E2E8F0] bg-white p-4 shadow-[0_8px_24px_rgba(0,35,70,0.10)] sm:p-5"
        aria-label={t('owner.cashTitle')}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#4A5A70]">{t('owner.cashTitle')}</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-[#002346] sm:text-4xl">
              {money(totalCash)}
            </p>
          </div>
          <Badge tone="success">{t('owner.live')}</Badge>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MoneyTile label={t('accountant.drawer')} value={money(cash.drawer)} />
          <MoneyTile label={t('accountant.accountant')} value={money(cash.accountant)} />
          <MoneyTile label={t('accountant.inTransit')} value={money(cash.inTransit)} />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="owner-attention-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="owner-attention-heading" className="text-lg font-extrabold text-[#002346]">
            {t('owner.waitingDecision')}
          </h2>
          <Link
            to="/app/owner/inbox"
            className="text-sm font-bold text-[#0B3B6E] underline underline-offset-2"
          >
            {t('owner.openInbox')}
          </Link>
        </div>
        <div className="space-y-2">
          {attention.map((item) => (
            <AttentionRow key={item.to} {...item} />
          ))}
        </div>
      </section>

      <section className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-[#002346]">{t('accountant.monthlyGoal')}</h2>
          <Badge tone={goal.data?.achievable === false ? 'warning' : 'success'}>
            {goal.data?.goalHours != null ? `${Math.round(goalProgress)}%` : t('owner.notSet')}
          </Badge>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-[#4A5A70]">
            {goal.data?.completedHours ?? 0} / {goal.data?.goalHours ?? 0} {t('staff.hours')}
          </span>
          <span className="font-bold tabular-nums text-[#002346]">
            {goal.data?.goalHours != null ? `${Math.round(goalProgress)}%` : '—'}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#E5EAF1]">
          <div className="h-full rounded-full bg-[#8DC63F]" style={{ width: `${goalProgress}%` }} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-[#002346]">{t('owner.workspaceSections')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <WorkspaceCard
            title={t('owner.navOperations')}
            description={t('owner.operationsGroupHint')}
            icon={CalendarDays}
            links={[
              ['/app/owner/bookings', t('owner.navAppointments')],
              ['/app/accountant/bookly', t('owner.navBookly')],
            ]}
          />
          <WorkspaceCard
            title={t('owner.navFinance')}
            description={t('owner.financeGroupHint')}
            icon={WalletCards}
            links={[
              ['/app/owner/inbox', t('owner.navInbox')],
              ['/app/owner/payment-flags', t('owner.paymentFlags')],
              ['/app/accountant/reports', t('owner.navReports')],
              ['/app/owner/notas', t('owner.notaManagementTitle')],
            ]}
          />
          <WorkspaceCard
            title={t('owner.navTeam')}
            description={t('owner.teamGroupHint')}
            icon={UsersRound}
            links={[
              ['/app/owner/team', t('owner.navTeam')],
              ['/app/accountant/staff-history', t('accountant.staffHistoryTitle')],
              ['/app/accountant/attendance', t('owner.navAttendance')],
              ['/app/accountant/schedule', t('owner.navSchedule')],
            ]}
          />
          <WorkspaceCard
            title={t('owner.navSystem')}
            description={t('owner.systemGroupHint')}
            icon={Settings2}
            links={[
              ['/app/owner/settings', t('owner.navSettings')],
              ['/app/owner/control', t('owner.navControl')],
              ['/app/profile', t('common.profile')],
            ]}
          />
        </div>
      </section>
    </div>
  );
}

function MoneyTile({ label, value }) {
  return (
    <div className="min-w-0 rounded-[12px] bg-[#F3F5F9] px-2.5 py-3 sm:px-3">
      <p className="truncate text-[11px] font-semibold text-[#4A5A70] sm:text-xs">{label}</p>
      <p className="mt-1 break-words text-sm font-extrabold tabular-nums text-[#002346] sm:text-base">
        {value}
      </p>
    </div>
  );
}

function AttentionRow({ to, label, value, hint, tone }) {
  const dot = tone === 'red' ? 'bg-[#E5484D]' : tone === 'amber' ? 'bg-[#F5A524]' : 'bg-[#8DC63F]';
  return (
    <Link
      to={to}
      className="flex min-h-[54px] items-center justify-between gap-3 rounded-[13px] border border-[#E2E8F0] bg-white px-3.5 py-2.5 outline-none transition hover:border-[#B7C7DA] focus-visible:ring-2 focus-visible:ring-[#01649B]"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={`size-2.5 shrink-0 rounded-full ${dot}`} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[#20334B]">{label}</span>
          <span className="block truncate text-xs text-[#8593A6]">{hint}</span>
        </span>
      </span>
      <span className="shrink-0 text-sm font-extrabold tabular-nums text-[#002346]">{value}</span>
    </Link>
  );
}

function WorkspaceCard({ title, description, icon: Icon, links }) {
  return (
    <article className="rounded-[16px] border border-[#E2E8F0] bg-white p-4 shadow-[0_2px_8px_rgba(0,35,70,0.04)]">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#E6EEF8] text-[#0B3B6E]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="font-extrabold text-[#002346]">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[#64748B]">{description}</p>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {links.map(([to, label]) => (
          <Link
            key={to}
            to={to}
            className="flex min-h-9 items-center justify-between gap-2 rounded-lg px-2 text-sm font-semibold text-[#0B3B6E] hover:bg-[#F3F5F9]"
          >
            <span>{label}</span>
            <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </article>
  );
}

function OwnerDashboardSkeleton() {
  return (
    <div className="relative z-40 -mt-5 space-y-4">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
