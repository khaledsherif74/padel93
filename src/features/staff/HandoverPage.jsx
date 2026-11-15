import { ArrowDownToLine, Ban, CheckCircle2, Clock3, Send, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useCancelTransferMutation,
  useConfirmTransferMutation,
  useCreateTransferMutation,
  useGetTransfersQuery,
  useGetTransferReceiversQuery,
} from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import { formatDateTime } from '../../shared/lib/date';
import { formatEgpWithCurrency, toPiasters } from '../../shared/lib/money';
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
import { selectUser } from '../auth/authSelectors';

const schema = z.object({
  amount: z.string().trim().min(1),
  note: z.string().trim().max(500).optional(),
  toUserId: z.string().trim().min(1),
});

export default function HandoverPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const currentUser = useSelector(selectUser);
  const [proofId, setProofId] = useState('');
  const requestId = useClientRequestId();
  const [createTransfer, createState] = useCreateTransferMutation();
  const [cancelTransfer, cancelState] = useCancelTransferMutation();
  const list = useGetTransfersQuery(
    { kind: 'HANDOVER', limit: 30 },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true, pollingInterval: 15_000 },
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
    <div className="staff-design min-h-[calc(100vh-104px)] min-w-0 bg-[#F3F5F9] font-inter text-[#0E1B2B]">
      <div className="mx-auto -mt-14 w-full max-w-[1120px] min-w-0 px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8 lg:pb-12">
        <div className="mb-5 min-w-0 space-y-3">
          <Link
            to="/app/staff"
            className="inline-flex min-h-10 items-center rounded-lg font-inter text-sm font-bold text-[#0B3B6E] outline-none focus-visible:ring-2 focus-visible:ring-[#01649B]"
          >
            {t('common.back')}
          </Link>
          <div>
            <p className="font-inter text-xs font-bold uppercase tracking-[0.14em] text-[#4A5A70]">
              PADEL 93 · {t('staff.myShift')}
            </p>
            <h1 className="mt-1 font-inter text-2xl font-extrabold text-[#002346] sm:text-3xl">
              {t('nav.handover')}
            </h1>
            <p className="mt-2 max-w-2xl font-inter text-sm leading-6 text-[#4A5A70]">
              {t('staff.handoverDescription')}
            </p>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:gap-5">
          <Card className="min-w-0 rounded-[18px] border border-[#E2E8F0] p-4 shadow-[0_8px_24px_rgba(0,35,70,0.05)] sm:p-5">
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
                required
                error={errors.toUserId ? t('staff.handoverReceiverRequired') : undefined}
                {...register('toUserId')}
                options={receiverItems.map((user) => ({
                  value: user.id,
                  label: `${user.name} · ${t(`role.${user.role}`, user.role)}`,
                }))}
                placeholder={t('staff.handoverReceiverChoose')}
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

          <Card className="min-w-0 rounded-[18px] border border-[#E2E8F0] p-4 shadow-[0_8px_24px_rgba(0,35,70,0.05)] sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full border border-ball text-ball">
                <WalletCards className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-cairo text-base font-extrabold">{t('staff.myHandovers')}</h2>
                <p className="mt-0.5 font-tajawal text-xs text-navy/50">
                  {t('staff.receiverCounts')}
                </p>
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
                <EmptyState
                  title={t('staff.noHandovers')}
                  description={t('staff.noHandoversHint')}
                />
              ) : (
                <>
                  {pending.map((transfer) => (
                    <HandoverRow
                      key={transfer.id}
                      transfer={transfer}
                      currentUserId={currentUser?.id}
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
                          currentUserId={currentUser?.id}
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
      </div>
    </div>
  );
}

function HandoverRow({ transfer, currentUserId, locale, t, onCancel, cancelLoading }) {
  const isSender = transfer.from?.id === currentUserId;
  const isReceiver = transfer.to?.id === currentUserId;
  const counterpart = isSender ? transfer.to : transfer.from;
  const counterpartLabel = counterpart?.name
    ? t(isSender ? 'staff.handoverTo' : 'staff.handoverFrom', { name: counterpart.name })
    : !transfer.to && isSender
      ? t('staff.handoverReceiverAny')
      : null;
  return (
    <div className="min-w-0 rounded-[14px] border border-[#E2E8F0] p-3">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
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
            {counterpartLabel && (
              <span className="min-w-0 break-words font-tajawal text-[10px] text-navy/55">
                {counterpartLabel}
              </span>
            )}
          </div>
          <p className="mt-1 font-tajawal text-[10px] text-navy/45">
            {formatDateTime(transfer.createdAt, locale)}
          </p>
        </div>
        {transfer.status === 'PENDING' && isReceiver ? (
          <Badge tone="warning">{t('staff.amountHidden')}</Badge>
        ) : (
          <p className="shrink-0 text-end font-cairo text-sm font-black sm:text-base">
            {formatEgpWithCurrency(transfer.amountSent, locale)}
          </p>
        )}
      </div>

      {transfer.note && (
        <p className="mt-2 font-tajawal text-xs leading-5 text-navy/60">{transfer.note}</p>
      )}
      {transfer.amountReceived != null && (
        <p className="mt-1 font-tajawal text-[10px] text-navy/55">
          {t('staff.received')}: {formatEgpWithCurrency(transfer.amountReceived, locale)}
        </p>
      )}
      {transfer.settledAmount != null && transfer.status === 'RESOLVED' && (
        <p className="mt-1 font-tajawal text-[10px] text-navy/55">
          {t('staff.settled')}: {formatEgpWithCurrency(transfer.settledAmount, locale)}
        </p>
      )}
      {transfer.responseNote && transfer.status !== 'CONFIRMED' && (
        <p className="mt-1 font-tajawal text-xs text-red-700">{transfer.responseNote}</p>
      )}
      {transfer.status === 'PENDING' && isReceiver && (
        <IncomingHandoverConfirmation transfer={transfer} t={t} />
      )}
      {transfer.status === 'PENDING' && isSender && (
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

function IncomingHandoverConfirmation({ transfer, t }) {
  const [received, setReceived] = useState('');
  const [note, setNote] = useState('');
  const [confirmTransfer, state] = useConfirmTransferMutation();
  let receivedAmount = null;
  if (received.trim()) {
    try {
      receivedAmount = toPiasters(received);
    } catch {
      receivedAmount = null;
    }
  }
  const noteRequired = note.trim().length < 3;
  const canConfirm = receivedAmount != null && receivedAmount >= 0 && !noteRequired;

  async function submit(event) {
    event.preventDefault();
    if (!canConfirm) return;
    try {
      await confirmTransfer({
        id: transfer.id,
        receivedAmount,
        note: note.trim() || undefined,
      }).unwrap();
    } catch {
      // The API error is displayed below.
    }
  }

  return (
    <form
      className="mt-3 space-y-2 rounded-xl border border-edge/15 bg-sky-50/50 p-3"
      onSubmit={submit}
    >
      <p className="font-cairo text-xs font-extrabold text-navy">{t('staff.incomingHandover')}</p>
      <MoneyInput
        label={t('staff.cashActuallyReceived')}
        value={received}
        onChange={(event) => setReceived(event.target.value)}
        placeholder="0.00"
      />
      <Input
        label={t('staff.handoverConfirmationNote')}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={t('staff.handoverConfirmationPlaceholder')}
      />
      {noteRequired && received.trim() && (
        <p className="font-tajawal text-xs text-red-700" role="alert">
          {t('staff.handoverNoteRequired')}
        </p>
      )}
      {state.error && (
        <p className="font-tajawal text-xs text-red-700" role="alert">
          {errorMessage(state.error, t)}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={!canConfirm} loading={state.isLoading}>
        <CheckCircle2 className="size-4" aria-hidden="true" />
        {t('staff.countAndConfirm')}
      </Button>
    </form>
  );
}

function StatusIcon({ status }) {
  if (status === 'CONFIRMED')
    return <CheckCircle2 className="size-4 text-ball" aria-hidden="true" />;
  if (status === 'PENDING') return <Clock3 className="size-4 text-edge" aria-hidden="true" />;
  return <ArrowDownToLine className="size-4 text-edge" aria-hidden="true" />;
}
