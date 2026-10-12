import { AlertOctagon, Check, ReceiptText, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetIncomesQuery,
  useGetExpensesQuery,
  useVoidIncomeMutation,
  useVoidExpenseMutation,
  useDecidePaymentFlagMutation,
} from '../../app/api';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import Modal from '../../shared/ui/Modal';
import Badge from '../../shared/ui/Badge';
import Skeleton from '../../shared/ui/Skeleton';
import ErrorState from '../../shared/ui/ErrorState';
import EmptyState from '../../shared/ui/EmptyState';
import { errorMessage } from '../../shared/lib/apiError';
import { formatDateTime } from '../../shared/lib/date';
import { formatEgpWithCurrency } from '../../shared/lib/money';

export default function OwnerCorrectionsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

  // Incomes: only those on underpaid bookings with a PENDING flag.
  const incomes = useGetIncomesQuery(
    { status: 'ACTIVE', hasPendingFlag: 'true', limit: 50 },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true },
  );
  const expenses = useGetExpensesQuery({ status: 'ACTIVE', limit: 50 });

  const [confirmFlag, confirmState] = useDecidePaymentFlagMutation();
  const [voidIncome, incomeState] = useVoidIncomeMutation();
  const [voidExpense, expenseState] = useVoidExpenseMutation();

  // active = { type: 'confirmIncome' | 'voidIncome' | 'voidExpense', item, ... }
  const [active, setActive] = useState(null);
  const [reason, setReason] = useState('');

  async function submit() {
    if (!active) return;

    try {
      if (active.type === 'confirmIncome') {
        await confirmFlag({ id: active.item.paymentFlag.id, decision: 'APPROVED' }).unwrap();
      }
      if (active.type === 'voidIncome') {
        if (reason.trim().length < 3) return;
        await voidIncome({ id: active.item.id, reason: reason.trim() }).unwrap();
      }
      if (active.type === 'voidExpense') {
        if (reason.trim().length < 3) return;
        await voidExpense({ id: active.item.id, reason: reason.trim() }).unwrap();
      }
      setActive(null);
      setReason('');
    } catch {
      // Error rendered in the modal.
    }
  }

  const loading = confirmState.isLoading || incomeState.isLoading || expenseState.isLoading;
  const error = confirmState.error || incomeState.error || expenseState.error;

  return (
    <div className="mx-auto max-w-[1300px] space-y-7">
      <PageHeader
        eyebrow={t('owner.correctionsEyebrow')}
        title={t('owner.correctionsTitle')}
        description={t('owner.correctionsDescription')}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <IncomesList
          query={incomes}
          locale={locale}
          t={t}
          onConfirm={(item) => {
            setReason('');
            setActive({ type: 'confirmIncome', item });
          }}
          onVoid={(item) => {
            setReason('');
            setActive({ type: 'voidIncome', item });
          }}
        />

        <ExpensesList
          query={expenses}
          locale={locale}
          t={t}
          onVoid={(item) => {
            setReason('');
            setActive({ type: 'voidExpense', item });
          }}
        />
      </div>

      <Modal
        open={Boolean(active)}
        onClose={() => !loading && setActive(null)}
        title={active ? modalTitle(active, t) : ''}
      >
        {active && (
          <DecisionContent
            active={active}
            reason={reason}
            setReason={setReason}
            loading={loading}
            error={error}
            onSubmit={submit}
            onClose={() => setActive(null)}
            locale={locale}
            t={t}
          />
        )}
      </Modal>
    </div>
  );
}

function modalTitle(active, t) {
  if (active.type === 'confirmIncome') return t('owner.confirmFlaggedPaymentTitle');
  if (active.type === 'voidIncome') return t('owner.voidIncomeTitle');
  return t('owner.voidTitle');
}

function DecisionContent({
  active,
  reason,
  setReason,
  loading,
  error,
  onSubmit,
  onClose,
  locale,
  t,
}) {
  const isConfirm = active.type === 'confirmIncome';
  const amount = active.item.amount ?? active.item.amountWaived ?? 0;
  const reasonRequired = !isConfirm;
  const canSubmit = !reasonRequired || reason.trim().length >= 3;

  return (
    <div className="space-y-5">
      {isConfirm ? (
        <div className="rounded-2xl border border-ball/40 bg-ball/10 p-4">
          <p className="font-cairo text-sm font-bold text-navy">
            {t('owner.confirmFlaggedPaymentHint')}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="font-cairo text-sm font-bold text-red-900">{t('owner.voidWarning')}</p>
        </div>
      )}

      <div className="rounded-2xl border border-navy/10 bg-white p-4">
        <p className="font-cairo text-xs font-semibold text-navy/45">{t('common.amount')}</p>
        <p className="mt-1 font-cairo text-2xl font-black text-navy">
          {formatEgpWithCurrency(amount, locale)}
        </p>
      </div>

      {active.item.paymentFlag && (
        <div className="rounded-2xl border border-navy/10 bg-navy/[0.02] p-4">
          <p className="font-cairo text-xs font-semibold text-navy/45">
            {t('owner.staffExplanation')}
          </p>
          <p className="mt-1 font-tajawal text-sm leading-6 text-navy">
            {active.item.paymentFlag.note}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone="danger">
              {t('owner.paymentFlagGap')}:{' '}
              {formatEgpWithCurrency(active.item.paymentFlag.difference ?? 0, locale)}
            </Badge>
            {active.item.appointment?.court && (
              <Badge tone="neutral">{active.item.appointment.court}</Badge>
            )}
          </div>
        </div>
      )}

      {reasonRequired && (
        <label className="block">
          <span className="mb-2 block font-cairo text-sm font-semibold text-navy">
            {t('owner.voidReason')}
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-28 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-sm text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
            placeholder={t('owner.voidReasonPlaceholder')}
          />
        </label>
      )}

      {error && (
        <p className="font-tajawal text-sm text-red-700" role="alert">
          {errorMessage(error, t)}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {isConfirm ? (
          <Button loading={loading} onClick={onSubmit} disabled={!canSubmit}>
            <Check className="size-4" aria-hidden="true" />
            {t('owner.confirmFlaggedPayment')}
          </Button>
        ) : (
          <Button variant="secondary" loading={loading} onClick={onSubmit} disabled={!canSubmit}>
            <X className="size-4" aria-hidden="true" />
            {t('owner.voidConfirm')}
          </Button>
        )}
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}

function IncomesList({ query, locale, t, onConfirm, onVoid }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-navy/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
            <ReceiptText className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-cairo text-lg font-extrabold text-navy">
              {t('owner.flaggedIncomes')}
            </h2>
            <p className="mt-0.5 font-tajawal text-xs text-navy/55">
              {t('owner.flaggedIncomesHint')}
            </p>
          </div>
        </div>
        <Badge tone="neutral">{query.data?.items?.length ?? 0}</Badge>
      </div>

      {query.isLoading ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : query.isError ? (
        <div className="p-5">
          <ErrorState
            title={t('errors.generic')}
            description={t('owner.correctionsLoadError')}
            onRetry={query.refetch}
          />
        </div>
      ) : (query.data?.items?.length ?? 0) === 0 ? (
        <div className="p-4">
          <EmptyState
            title={t('owner.noFlaggedIncomes')}
            description={t('owner.noFlaggedIncomesHint')}
          />
        </div>
      ) : (
        <div className="divide-y divide-navy/8">
          {query.data.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-cairo text-sm font-bold text-navy">
                    {item.appointment?.court ?? t('staff.court')}
                  </p>
                  <Badge tone="neutral">{t(`method.${item.method}`)}</Badge>
                  <Badge tone="warning">
                    {formatEgpWithCurrency(item.paymentFlag?.difference ?? 0, locale)}{' '}
                    {t('owner.outstanding')}
                  </Badge>
                </div>
                <p className="mt-1 font-tajawal text-sm text-navy/60">
                  {item.paymentFlag?.note ?? item.note ?? t('owner.noDescription')}
                </p>
                <p className="mt-1 font-tajawal text-xs text-navy/40">
                  {formatDateTime(item.recordedAt, locale)}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:items-end">
                <p className="font-cairo text-base font-black text-navy">
                  {formatEgpWithCurrency(item.amount, locale)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="min-h-10 px-3 text-red-800 hover:bg-red-50"
                    onClick={() => onVoid(item)}
                  >
                    <X className="size-4" aria-hidden="true" />
                    {t('owner.void')}
                  </Button>
                  <Button className="min-h-10 px-3" onClick={() => onConfirm(item)}>
                    <Check className="size-4" aria-hidden="true" />
                    {t('owner.confirmFlaggedPayment')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ExpensesList({ query, locale, t, onVoid }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-navy/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
            <AlertOctagon className="size-5" aria-hidden="true" />
          </div>
          <h2 className="font-cairo text-lg font-extrabold text-navy">
            {t('owner.expenseCorrections')}
          </h2>
        </div>
        <Badge tone="neutral">{query.data?.items?.length ?? 0}</Badge>
      </div>

      {query.isLoading ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : query.isError ? (
        <div className="p-5">
          <ErrorState
            title={t('errors.generic')}
            description={t('owner.correctionsLoadError')}
            onRetry={query.refetch}
          />
        </div>
      ) : (query.data?.items?.length ?? 0) === 0 ? (
        <div className="flex min-h-48 items-center justify-center p-6 text-center font-tajawal text-sm text-navy/55">
          {t('owner.noActiveExpense')}
        </div>
      ) : (
        <div className="divide-y divide-navy/8">
          {query.data.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-cairo text-sm font-bold text-navy">
                    {item.category?.name ?? t('staff.category')}
                  </p>
                  <Badge tone="neutral">{item.status}</Badge>
                </div>
                <p className="mt-1 font-tajawal text-sm text-navy/60">
                  {item.description ?? item.note ?? t('owner.noDescription')}
                </p>
                <p className="mt-1 font-tajawal text-xs text-navy/40">
                  {formatDateTime(item.recordedAt, locale)}
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                <p className="font-cairo text-base font-black text-navy">
                  {formatEgpWithCurrency(item.amount, locale)}
                </p>
                <Button
                  variant="ghost"
                  className="min-h-10 px-3 text-red-800 hover:bg-red-50"
                  onClick={() => onVoid(item)}
                >
                  <X className="size-4" aria-hidden="true" />
                  {t('owner.void')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
