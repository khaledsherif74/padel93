import { AlertTriangle, Check, ClipboardCheck, RefreshCw, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useGetExpensesQuery,
  useGetIncomesQuery,
  useGetTransfersQuery,
  useGetBooklyChangesQuery,
  useGetNotificationsQuery,
  useDecideExpenseMutation,
  useVerifyIncomeMutation,
  useResolveTransferMutation,
  useAckBooklyChangeMutation,
} from '../../app/api';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import Modal from '../../shared/ui/Modal';
import Skeleton from '../../shared/ui/Skeleton';
import ErrorState from '../../shared/ui/ErrorState';
import { errorMessage } from '../../shared/lib/apiError';
import { formatEgpWithCurrency } from '../../shared/lib/money';

export default function OwnerInboxPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const expenses = useGetExpensesQuery({ approval: 'PENDING', status: 'ACTIVE', limit: 50 });
  const incomes = useGetIncomesQuery({ verification: 'PENDING', status: 'ACTIVE', limit: 50 });
  const transfers = useGetTransfersQuery(
    { kind: 'HANDOVER', status: 'DISPUTED', limit: 50 },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true },
  );
  const changes = useGetBooklyChangesQuery();
  const notifications = useGetNotificationsQuery({ unread: 'true', limit: 20 });

  const [active, setActive] = useState(null);

  const [decideExpense, expenseState] = useDecideExpenseMutation();
  const [verifyIncome, incomeState] = useVerifyIncomeMutation();
  const [resolveTransfer, transferState] = useResolveTransferMutation();
  const [ackBooklyChange, booklyState] = useAckBooklyChangeMutation();

  const sections = useMemo(
    () => [
      {
        key: 'expenses',
        title: t('owner.pendingExpenseApprovals'),
        count: expenses.data?.items?.length ?? 0,
        tone: 'info',
        icon: ClipboardCheck,
      },
      {
        key: 'payments',
        title: t('owner.unverifiedPayments'),
        count: incomes.data?.items?.length ?? 0,
        tone: 'info',
        icon: RefreshCw,
      },
      {
        key: 'disputes',
        title: t('owner.disputedTransfers'),
        count: transfers.data?.items?.length ?? 0,
        tone: 'danger',
        icon: AlertTriangle,
      },
      {
        key: 'bookly',
        title: t('owner.booklyChanges'),
        count: changes.data?.items?.length ?? 0,
        tone: 'warning',
        icon: RefreshCw,
      },
    ],
    [changes.data, expenses.data, incomes.data, t, transfers.data],
  );

  const refreshAll = () => {
    expenses.refetch();
    incomes.refetch();
    transfers.refetch();
    changes.refetch();
    notifications.refetch();
  };

  async function submitActive() {
    if (!active) return;

    try {
      if (active.type === 'expense') {
        await decideExpense({
          id: active.item.id,
          decision: active.decision,
          ...(active.note ? { note: active.note } : {}),
        }).unwrap();
      }

      if (active.type === 'income') {
        await verifyIncome({
          id: active.item.id,
          decision: active.decision,
          ...(active.note ? { note: active.note } : {}),
        }).unwrap();
      }

      if (active.type === 'transfer') {
        await resolveTransfer({
          id: active.item.id,
          settledAmount: Number(active.settledAmount),
          note: active.note,
        }).unwrap();
      }

      if (active.type === 'bookly') {
        await ackBooklyChange(active.item.id).unwrap();
      }

      setActive(null);
    } catch {
      // Mutation error appears in the modal.
    }
  }

  const activeError =
    expenseState.error || incomeState.error || transferState.error || booklyState.error;
  const activeLoading =
    expenseState.isLoading ||
    incomeState.isLoading ||
    transferState.isLoading ||
    booklyState.isLoading;

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <PageHeader
        eyebrow={t('owner.inboxEyebrow')}
        title={t('owner.inboxTitle')}
        description={t('owner.inboxDescription')}
        actions={
          <Button variant="ghost" onClick={refreshAll}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {t('common.refresh')}
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <Card key={section.key} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
                <section.icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <Badge tone={section.count > 0 ? section.tone : 'neutral'}>{section.count}</Badge>
            </div>
            <p className="mt-4 font-cairo text-sm font-extrabold text-navy">{section.title}</p>
            <p className="mt-1 font-tajawal text-xs leading-6 text-navy/55">
              {section.count > 0
                ? t('owner.itemsWaiting', { count: section.count })
                : t('owner.nothingWaiting')}
            </p>
          </Card>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
        <div className="space-y-5">
          <QueueSection
            title={t('owner.pendingExpenseApprovals')}
            icon={ClipboardCheck}
            state={expenses}
            empty={t('owner.noPendingExpenses')}
            t={t}
          >
            {expenses.data?.items?.map((item) => (
              <QueueRow
                key={item.id}
                title={item.category?.name ?? t('staff.category')}
                subtitle={item.description}
                amount={formatEgpWithCurrency(item.amount, locale)}
                badge={item.approval}
                onPrimary={() =>
                  setActive({ type: 'expense', item, decision: 'APPROVED', note: '' })
                }
                onSecondary={() =>
                  setActive({ type: 'expense', item, decision: 'REJECTED', note: '' })
                }
                primaryLabel={t('owner.approve')}
                secondaryLabel={t('owner.reject')}
              />
            ))}
          </QueueSection>

          <QueueSection
            title={t('owner.unverifiedPayments')}
            icon={RefreshCw}
            state={incomes}
            empty={t('owner.noUnverifiedPayments')}
            t={t}
          >
            {incomes.data?.items?.map((item) => (
              <QueueRow
                key={item.id}
                title={`${item.method} · ${item.source}`}
                subtitle={`${item.note ?? ''}${item.reference ? ` · ${item.reference}` : ''}`}
                amount={formatEgpWithCurrency(item.amount, locale)}
                badge={item.verification}
                onPrimary={() =>
                  setActive({ type: 'income', item, decision: 'VERIFIED', note: '' })
                }
                onSecondary={() =>
                  setActive({ type: 'income', item, decision: 'REJECTED', note: '' })
                }
                primaryLabel={t('owner.verify')}
                secondaryLabel={t('owner.reject')}
              />
            ))}
          </QueueSection>

          <QueueSection
            title={t('owner.disputedTransfers')}
            icon={AlertTriangle}
            state={transfers}
            empty={t('owner.noDisputedTransfers')}
            t={t}
          >
            {transfers.data?.items?.map((item) => (
              <QueueRow
                key={item.id}
                title={t('owner.disputedTransferTitle', {
                  name: item.from?.name ?? t('common.unavailable'),
                })}
                subtitle={item.responseNote ?? t('owner.noDecisionNote')}
                amount={formatEgpWithCurrency(item.amountReceived ?? 0, locale)}
                badge={item.status}
                onPrimary={() =>
                  setActive({
                    type: 'transfer',
                    item,
                    settledAmount: item.amountReceived ?? 0,
                    note: '',
                  })
                }
                primaryLabel={t('owner.resolve')}
                secondaryLabel={null}
              />
            ))}
          </QueueSection>

          <QueueSection
            title={t('owner.booklyChanges')}
            icon={RefreshCw}
            state={changes}
            empty={t('owner.noBooklyChanges')}
            t={t}
          >
            {changes.data?.items?.map((item) => (
              <QueueRow
                key={item.id}
                title={item.court ?? t('staff.court')}
                subtitle={t('accountant.booklyChangedField', { field: item.field })}
                amount={
                  item.hadPayments ? t('accountant.afterPayment') : t('accountant.beforePayment')
                }
                badge={item.hadPayments ? 'ALERT' : 'INFO'}
                onPrimary={() => setActive({ type: 'bookly', item })}
                primaryLabel={t('owner.acknowledge')}
                secondaryLabel={null}
              />
            ))}
          </QueueSection>
        </div>

        <Card className="h-fit p-5 sm:p-6 xl:sticky xl:top-[102px]">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-cairo text-xs font-bold uppercase tracking-[0.15em] text-ball">
                {t('owner.noticeEyebrow')}
              </p>
              <h2 className="mt-1 font-cairo text-lg font-extrabold text-navy">
                {t('owner.noticeTitle')}
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {(notifications.data?.items ?? []).length === 0 ? (
              <p className="rounded-xl border border-navy/10 bg-white p-4 font-tajawal text-sm leading-6 text-navy/55">
                {t('owner.noNotifications')}
              </p>
            ) : (
              notifications.data.items.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-xl border border-navy/10 p-4">
                  <p className="font-cairo text-sm font-bold text-navy">{item.title}</p>
                  <p className="mt-1 font-tajawal text-xs leading-6 text-navy/60">{item.body}</p>
                </div>
              ))
            )}
          </div>

          <Link to="/app/notifications" className="mt-4 inline-flex">
            <Button variant="ghost" className="px-0">
              {t('owner.openNotifications')}
            </Button>
          </Link>
        </Card>
      </div>

      <Modal
        open={Boolean(active)}
        onClose={() => !activeLoading && setActive(null)}
        title={active ? actionTitle(active, t) : ''}
      >
        {active && (
          <DecisionContent
            active={active}
            setActive={setActive}
            loading={activeLoading}
            error={activeError}
            onSubmit={submitActive}
            t={t}
            locale={locale}
          />
        )}
      </Modal>
    </div>
  );
}

function actionTitle(active, t) {
  if (active.type === 'expense')
    return active.decision === 'APPROVED' ? t('owner.approveExpense') : t('owner.rejectExpense');
  if (active.type === 'income')
    return active.decision === 'VERIFIED' ? t('owner.verifyPayment') : t('owner.rejectPayment');
  if (active.type === 'transfer') return t('owner.resolveTransfer');
  return t('owner.ackBookly');
}

function DecisionContent({ active, setActive, loading, error, onSubmit, t, locale }) {
  const needsNote =
    (active.type === 'expense' && active.decision === 'REJECTED') ||
    (active.type === 'income' && active.decision === 'REJECTED') ||
    active.type === 'transfer';

  const isBookly = active.type === 'bookly';

  if (isBookly) {
    return (
      <div className="space-y-5">
        <p className="font-tajawal text-sm leading-7 text-navy/65">{t('owner.ackBooklyHint')}</p>
        {active.item?.hadPayments && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 font-tajawal text-sm leading-6 text-amber-900">
            {t('owner.booklyAfterPaymentWarning')}
          </div>
        )}
        {error && (
          <p className="font-tajawal text-sm text-red-700" role="alert">
            {errorMessage(error, t)}
          </p>
        )}
        <div className="flex gap-2">
          <Button loading={loading} onClick={onSubmit}>
            <Check className="size-4" aria-hidden="true" />
            {t('owner.acknowledge')}
          </Button>
          <Button variant="ghost" onClick={() => setActive(null)} disabled={loading}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-navy/10 bg-white p-4">
        <p className="font-cairo text-xs font-semibold text-navy/45">{t('common.amount')}</p>
        <p className="mt-1 font-cairo text-2xl font-black text-navy">
          {active.type === 'transfer'
            ? formatEgpWithCurrency(Number(active.settledAmount || 0), locale)
            : formatEgpWithCurrency(active.item.amount ?? 0, locale)}
        </p>
      </div>

      {active.type === 'transfer' && (
        <Input
          label={t('owner.settledAmount')}
          type="number"
          min="0"
          inputMode="numeric"
          value={active.settledAmount ?? 0}
          onChange={(event) =>
            setActive((current) => ({ ...current, settledAmount: event.target.value }))
          }
          hint={t('owner.settledAmountHint')}
        />
      )}

      {needsNote && (
        <label className="block">
          <span className="mb-2 block font-cairo text-sm font-semibold text-navy">
            {t('owner.decisionNote')}
          </span>
          <textarea
            value={active.note ?? ''}
            onChange={(event) => setActive((current) => ({ ...current, note: event.target.value }))}
            className="min-h-28 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-sm text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
            placeholder={t('owner.decisionNotePlaceholder')}
          />
        </label>
      )}

      {error && (
        <p className="font-tajawal text-sm text-red-700" role="alert">
          {errorMessage(error, t)}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button loading={loading} onClick={onSubmit} disabled={needsNote && !active.note?.trim()}>
          <Check className="size-4" aria-hidden="true" />
          {t('owner.confirmDecision')}
        </Button>
        <Button variant="ghost" onClick={() => setActive(null)} disabled={loading}>
          <X className="size-4" aria-hidden="true" />
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}

function QueueSection({ title, icon: Icon, state, empty, children, t }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-navy/10 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
            <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <h2 className="font-cairo text-lg font-extrabold text-navy">{title}</h2>
        </div>
        <Badge tone="neutral">{state.data?.items?.length ?? 0}</Badge>
      </div>

      {state.isLoading ? (
        <div className="space-y-3 p-5 sm:p-6">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : state.isError ? (
        <div className="p-5 sm:p-6">
          <ErrorState
            title={t('errors.generic')}
            description={t('owner.queueLoadError')}
            onRetry={state.refetch}
          />
        </div>
      ) : (state.data?.items?.length ?? 0) === 0 ? (
        <p className="p-6 font-tajawal text-sm text-navy/55">{empty}</p>
      ) : (
        <div>{children}</div>
      )}
    </Card>
  );
}

function QueueRow({
  title,
  subtitle,
  amount,
  badge,
  onPrimary,
  onSecondary,
  primaryLabel,
  secondaryLabel,
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-navy/8 p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-cairo text-sm font-extrabold text-navy">{title}</h3>
          {badge && <Badge tone="neutral">{badge}</Badge>}
        </div>
        <p className="mt-1 font-tajawal text-sm leading-6 text-navy/55">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-3 sm:items-end">
        <p className="font-cairo text-base font-black text-navy">{amount}</p>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {onSecondary && (
            <Button
              variant="ghost"
              className="min-h-10 px-3 text-red-800 hover:bg-red-50"
              onClick={onSecondary}
            >
              <X className="size-4" aria-hidden="true" />
              {secondaryLabel}
            </Button>
          )}
          <Button className="min-h-10 px-3" onClick={onPrimary}>
            <Check className="size-4" aria-hidden="true" />
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
