import { ArrowRight, Banknote, ShieldCheck, UsersRound, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  useGetDashboardBalancesQuery,
  useGetFinanceEditsQuery,
  useGetGoalQuery,
  useGetPendingStaffDateAccessRequestsQuery,
} from '../../app/api';
import { selectRole } from '../auth/authSelectors';
import { getManageTiles } from './financeTiles';
import { currentMonth } from '../../shared/lib/date';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import Modal from '../../shared/ui/Modal';
import Button from '../../shared/ui/Button';
import Skeleton from '../../shared/ui/Skeleton';
import ErrorState from '../../shared/ui/ErrorState';
import GoalSetter from './GoalSetter';

export default function AccountantDashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const month = currentMonth();
  const balances = useGetDashboardBalancesQuery();
  const goal = useGetGoalQuery(month);
  const role = useSelector(selectRole);
  const [goalOpen, setGoalOpen] = useState(false);
  const accessRequests = useGetPendingStaffDateAccessRequestsQuery(undefined, {
    pollingInterval: 30_000,
  });
  const editsToday = useGetFinanceEditsQuery(undefined, { pollingInterval: 30_000 });

  if (balances.isLoading) return <DashboardSkeleton />;
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
  const visa = bank.VISA ?? {};
  const instapay = bank.INSTAPAY ?? {};
  const cashWithAccountant =
    Number(cash.accountant ?? 0) + Number(visa.verified ?? 0) + Number(instapay.verified ?? 0);
  const pendingCardAmount = Number(visa.pending ?? 0) + Number(instapay.pending ?? 0);
  const money = (value) => formatEgpWithCurrency(value ?? 0, locale);
  const handovers = Number(todo.pendingTransfers ?? 0);
  const access = accessRequests.data?.items?.length ?? 0;
  const edits = editsToday.data?.items?.length ?? 0;
  const requestCount = handovers + access + edits;
  const progress = Math.min(100, Math.max(0, Number(goal.data?.progress ?? 0) * 100));
  const tiles = getManageTiles(role);

  const attention = [
    {
      to: '/app/accountant/verification',
      label: t('accountant.pendingCardVerification'),
      value: todo.unverifiedPayments ?? 0,
      hint: money(todo.unverifiedAmount),
      tone: 'amber',
    },
    {
      to: '/app/accountant/inbox',
      label: t('accountant.requestsCard'),
      value: requestCount,
      hint: t('accountant.requestsCardHint', { handovers, access, edits }),
      tone: requestCount ? 'amber' : 'neutral',
    },
    {
      to: '/app/accountant/staff-history',
      label: t('accountant.shiftsAttention'),
      value: todo.shiftsWithVariance ?? 0,
      hint: t('accountant.shiftsAttentionHint'),
      tone: todo.shiftsWithVariance ? 'red' : 'neutral',
    },
    {
      to: '/app/accountant/handovers',
      label: t('accountant.disputedGap'),
      value: money(cash.disputedGap),
      hint: `${todo.disputedTransfers ?? 0} ${t('accountant.disputedTransfersCount')}`,
      tone: Number(cash.disputedGap ?? 0) > 0 ? 'red' : 'neutral',
    },
    {
      to: '/app/accountant/bookly',
      label: t('accountant.booklyChanges'),
      value: todo.unacknowledgedBooklyChanges ?? 0,
      hint: t('accountant.booklyChanges'),
      tone: todo.unacknowledgedBooklyChanges ? 'amber' : 'neutral',
    },
  ];

  return (
    <div className="relative z-40 mx-auto -mt-5 w-full max-w-[1120px] space-y-5 font-inter text-[#0E1B2B]">
      <section
        className="rounded-[20px] border border-[#E2E8F0] bg-white p-4 shadow-[0_8px_24px_rgba(0,35,70,0.10)] sm:p-5"
        aria-label={t('accountant.accountantCash')}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#4A5A70]">{t('accountant.accountantCash')}</p>
            <p className="mt-1 break-words text-3xl font-extrabold tracking-tight text-[#002346] sm:text-4xl">
              {money(cashWithAccountant)}
            </p>
          </div>
          <span className="rounded-full bg-[#EAF4D9] px-3 py-1 text-xs font-bold text-[#426B15]">
            {t('accountant.confirmedBalances')}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MethodBalance label={t('method.CASH')} value={money(cash.accountant)} icon={Banknote} />
          <MethodBalance label={t('method.VISA')} value={money(visa.verified)} icon={WalletCards} />
          <MethodBalance
            label={t('method.INSTAPAY')}
            value={money(instapay.verified)}
            icon={ShieldCheck}
          />
        </div>
        {pendingCardAmount > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FFF6E8] px-3 py-2 text-xs text-[#8F5400]">
            <span className="font-semibold">{t('accountant.pendingCardVerification')}</span>
            <span className="font-extrabold tabular-nums">{money(pendingCardAmount)}</span>
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="accountant-attention-heading">
        <h2 id="accountant-attention-heading" className="text-lg font-extrabold text-[#002346]">
          {t('accountant.needsAttention')}
        </h2>
        <div className="space-y-2">
          {attention.map((item) => (
            <AttentionRow key={item.to} {...item} />
          ))}
        </div>
      </section>

      <section className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-[#002346]">
              {t('accountant.monthlyGoal')}
            </h2>
            <p className="mt-1 text-xs text-[#64748B]">{t('owner.goalEyebrow')}</p>
          </div>
          <Button variant="ghost" className="min-h-9 px-3" onClick={() => setGoalOpen(true)}>
            {t('accountant.setGoalTitle')}
          </Button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-[#4A5A70]">
            {goal.data?.completedHours ?? 0} / {goal.data?.goalHours ?? 0} {t('staff.hours')}
          </span>
          <span className="font-extrabold tabular-nums text-[#002346]">
            {goal.data?.goalHours != null ? `${Math.round(progress)}%` : '—'}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#E5EAF1]">
          <div
            className="h-full rounded-full bg-[#8DC63F] transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="accountant-manage-heading">
        <h2 id="accountant-manage-heading" className="text-lg font-extrabold text-[#002346]">
          {t('accountant.manageSection')}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {tiles.map(({ to, key, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex min-h-[92px] flex-col items-start justify-between gap-3 rounded-[15px] border border-[#E2E8F0] bg-white p-3.5 text-start shadow-[0_2px_8px_rgba(0,35,70,0.04)] outline-none transition hover:border-[#8DC63F] focus-visible:ring-2 focus-visible:ring-[#01649B]"
            >
              <Icon className="size-5 text-[#0B3B6E]" aria-hidden="true" />
              <span className="flex w-full items-center justify-between gap-2 text-sm font-bold text-[#002346]">
                {t(key)}
                <ArrowRight
                  className="size-4 shrink-0 text-[#8593A6] rtl:rotate-180"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
          <Link
            to="/app/accountant/staff-history"
            className="flex min-h-[92px] flex-col items-start justify-between gap-3 rounded-[15px] border border-[#E2E8F0] bg-white p-3.5 text-start shadow-[0_2px_8px_rgba(0,35,70,0.04)] outline-none hover:border-[#8DC63F] focus-visible:ring-2 focus-visible:ring-[#01649B]"
          >
            <UsersRound className="size-5 text-[#0B3B6E]" aria-hidden="true" />
            <span className="flex w-full items-center justify-between gap-2 text-sm font-bold text-[#002346]">
              {t('accountant.staffHistoryTitle')}
              <ArrowRight className="size-4 text-[#8593A6] rtl:rotate-180" aria-hidden="true" />
            </span>
          </Link>
          <Link
            to="/app/accountant/profile"
            className="flex min-h-[92px] flex-col items-start justify-between gap-3 rounded-[15px] border border-[#E2E8F0] bg-white p-3.5 text-start shadow-[0_2px_8px_rgba(0,35,70,0.04)] outline-none hover:border-[#8DC63F] focus-visible:ring-2 focus-visible:ring-[#01649B]"
          >
            <UsersRound className="size-5 text-[#0B3B6E]" aria-hidden="true" />
            <span className="flex w-full items-center justify-between gap-2 text-sm font-bold text-[#002346]">
              {t('common.profile')}
              <ArrowRight className="size-4 text-[#8593A6] rtl:rotate-180" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </section>

      <Modal
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        title={t('accountant.setGoalTitle')}
      >
        <GoalSetter month={month} current={goal.data?.goalHours} />
      </Modal>
    </div>
  );
}

function MethodBalance({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0 rounded-[12px] bg-[#F3F5F9] px-2.5 py-3 sm:px-3">
      <div className="flex items-center gap-1.5 text-[#4A5A70]">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate text-[11px] font-semibold sm:text-xs">{label}</span>
      </div>
      <p className="mt-1 break-words text-sm font-extrabold tabular-nums text-[#002346] sm:text-base">
        {value}
      </p>
    </div>
  );
}

function AttentionRow({ to, label, value, hint, tone }) {
  const color =
    tone === 'red' ? 'bg-[#E5484D]' : tone === 'amber' ? 'bg-[#F5A524]' : 'bg-[#8DC63F]';
  return (
    <Link
      to={to}
      className="flex min-h-[54px] items-center justify-between gap-3 rounded-[13px] border border-[#E2E8F0] bg-white px-3.5 py-2.5 outline-none transition hover:border-[#B7C7DA] focus-visible:ring-2 focus-visible:ring-[#01649B]"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={`size-2.5 shrink-0 rounded-full ${color}`} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[#20334B]">{label}</span>
          <span className="block truncate text-xs text-[#8593A6]">{hint}</span>
        </span>
      </span>
      <span className="shrink-0 text-sm font-extrabold tabular-nums text-[#002346]">{value}</span>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="relative z-40 -mt-5 space-y-4">
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
