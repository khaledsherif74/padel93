import { ArrowDownToLine, Ban, CheckCircle2, Clock3, Send, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useCancelTransferMutation,
  useCreateTransferMutation,
  useGetTransfersQuery,
  useGetTransferReceiversQuery,
} from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import { formatDateTime } from '../../shared/lib/date';
import { formatEgpWithCurrency, toPiasters } from '../../shared/lib/money';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import MoneyInput from '../../shared/ui/MoneyInput';
import Input from '../../shared/ui/Input';
import Select from '../../shared/ui/Select';
import ReceiptCapture from '../../shared/ui/ReceiptCapture';
import EmptyState from '../../shared/ui/EmptyState';
import Skeleton from '../../shared/ui/Skeleton';
import ErrorState from '../../shared/ui/ErrorState';
import Badge from '../../shared/ui/Badge';

const schema = z.object({
  amount: z.string().trim().min(1),
  note: z.string().trim().max(500).optional(),
  toUserId: z.string().trim().optional(),
});

export default function HandoverPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const [proofId, setProofId] = useState('');
  const requestId = useClientRequestId();
  const [createTransfer, createState] = useCreateTransferMutation();
  const [cancelTransfer, cancelState] = useCancelTransferMutation();
  const list = useGetTransfersQuery(
    { kind: 'HANDOVER', limit: 30 },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true },
  );
  const receivers = useGetTransferReceiversQuery();
  const receiverItems = receivers.data?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', note: '', toUserId: '' },
  });

  async function submit(values) {
    let amount;
    try {
      amount = toPiasters(values.amount);
    } catch {
      return;
    }
    try {
      await createTransfer({
        clientRequestId: requestId.id,
        amount,
        ...(values.note?.trim() ? { note: values.note.trim() } : {}),
        ...(values.toUserId ? { toUserId: values.toUserId } : {}),
        ...(proofId ? { proofId } : {}),
      }).unwrap();
      requestId.regenerate();
      reset();
      setProofId('');
      list.refetch();
    } catch {
      /* shown below */
    }
  }

  async function cancel(id) {
    try {
      await cancelTransfer(id).unwrap();
    } catch {
      /* shown by mutation state */
    }
  }

  const items = list.data?.items ?? [];
  const pending = items.filter((row) => row.status === 'PENDING');
  const recent = items.filter((row) => row.status !== 'PENDING').slice(0, 3);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        to="/app/staff"
        className="inline-flex min-h-11 items-center font-cairo text-sm font-bold text-edge outline-none focus-visible:ring-2 focus-visible:ring-edge"
      >
        {t('common.back')}
      </Link>
      <PageHeader title={t('nav.handover')} description={t('staff.handoverDescription')} />

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full border border-ball text-ball">
            <Send className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-cairo text-base font-extrabold">{t('staff.sendCash')}</h2>
            <p className="mt-0.5 font-tajawal text-xs text-navy/50">
              {t('staff.handoverFormHint')}
            </p>
          </div>
        </div>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit(submit)}>
          <MoneyInput
            label={t('staff.handoverAmount')}
            placeholder="0.00"
            error={errors.amount ? t('errors.invalidAmount') : undefined}
            {...register('amount')}
          />
          <Select
            label={t('staff.handoverReceiver')}
            {...register('toUserId')}
            options={receiverItems.map((user) => ({
              value: user.id,
              label: `${user.name} · ${t(`role.${user.role}`, user.role)}`,
            }))}
            placeholder={t('staff.handoverReceiverAny')}
          />
          <Input
            label={t('common.noteOptional')}
            placeholder={t('staff.handoverNotePlaceholder')}
            {...register('note')}
          />
          <ReceiptCapture
            value={proofId}
            onUploaded={setProofId}
            onClear={() => setProofId('')}
            label={t('staff.handoverProofOptional')}
          />

          {createState.error && (
            <p className="font-tajawal text-sm leading-6 text-red-700" role="alert">
              {errorMessage(createState.error, t)}
            </p>
          )}

          <Button type="submit" className="w-full" loading={createState.isLoading}>
            {t('staff.sendHandover')}
          </Button>
        </form>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full border border-ball text-ball">
            <WalletCards className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-cairo text-base font-extrabold">{t('staff.myHandovers')}</h2>
            <p className="mt-0.5 font-tajawal text-xs text-navy/50">{t('staff.receiverCounts')}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {list.isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)
          ) : list.isError ? (
            <ErrorState
              title={t('errors.generic')}
              description={errorMessage(list.error, t)}
              onRetry={list.refetch}
            />
          ) : pending.length === 0 && recent.length === 0 ? (
            <EmptyState title={t('staff.noHandovers')} description={t('staff.noHandoversHint')} />
          ) : (
            <>
              {pending.map((transfer) => (
                <HandoverRow
                  key={transfer.id}
                  transfer={transfer}
                  locale={locale}
                  t={t}
                  onCancel={cancel}
                  cancelLoading={cancelState.isLoading}
                />
              ))}
              {recent.length > 0 && (
                <>
                  <p className="pt-1 font-cairo text-[10px] font-bold uppercase tracking-wider text-navy/40">
                    {t('staff.recentHandovers')}
                  </p>
                  {recent.map((transfer) => (
                    <HandoverRow
                      key={transfer.id}
                      transfer={transfer}
                      locale={locale}
                      t={t}
                      onCancel={cancel}
                      cancelLoading={cancelState.isLoading}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function HandoverRow({ transfer, locale, t, onCancel, cancelLoading }) {
  const toLabel = transfer.to?.name ? t('staff.handoverTo', { name: transfer.to.name }) : null;
  return (
    <div className="rounded-xl border border-navy/8 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <StatusIcon status={transfer.status} />
            <Badge
              tone={
                transfer.status === 'PENDING'
                  ? 'warning'
                  : transfer.status === 'CONFIRMED'
                    ? 'success'
                    : transfer.status === 'DISPUTED'
                      ? 'danger'
                      : 'neutral'
              }
            >
              {t(`transferStatus.${transfer.status}`)}
            </Badge>
            {toLabel && <span className="font-tajawal text-[10px] text-navy/55">{toLabel}</span>}
          </div>
          <p className="mt-1 font-tajawal text-[10px] text-navy/45">
            {formatDateTime(transfer.createdAt, locale)}
          </p>
        </div>
        <p className="font-cairo text-base font-black">
          {formatEgpWithCurrency(transfer.amountSent, locale)}
        </p>
      </div>

      {transfer.note && (
        <p className="mt-2 font-tajawal text-xs leading-5 text-navy/60">{transfer.note}</p>
      )}
      {transfer.status === 'CONFIRMED' && transfer.amountReceived != null && (
        <p className="mt-1 font-tajawal text-[10px] text-navy/55">
          {t('staff.received')}: {formatEgpWithCurrency(transfer.amountReceived, locale)}
        </p>
      )}
      {transfer.status === 'PENDING' && (
        <div className="mt-2 flex justify-end">
          <Button
            variant="ghost"
            className="min-h-9 px-2 text-xs text-red-700"
            onClick={() => onCancel(transfer.id)}
            loading={cancelLoading}
          >
            <Ban className="size-3.5" aria-hidden="true" />
            {t('staff.cancelHandover')}
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'CONFIRMED')
    return <CheckCircle2 className="size-4 text-ball" aria-hidden="true" />;
  if (status === 'PENDING') return <Clock3 className="size-4 text-edge" aria-hidden="true" />;
  return <ArrowDownToLine className="size-4 text-edge" aria-hidden="true" />;
}
