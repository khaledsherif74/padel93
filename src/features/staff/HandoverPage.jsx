import { ArrowDownToLine, Ban, CheckCircle2, Clock3, Send, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useCancelTransferMutation,
  useCreateTransferMutation,
  useGetTransfersQuery,
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
import ReceiptCapture from '../../shared/ui/ReceiptCapture';
import EmptyState from '../../shared/ui/EmptyState';
import Skeleton from '../../shared/ui/Skeleton';
import ErrorState from '../../shared/ui/ErrorState';
import Badge from '../../shared/ui/Badge';

const schema = z.object({
  amount: z.string().trim().min(1),
  note: z.string().trim().max(500).optional(),
});

export default function HandoverPage() {
  const { t, i18n } = useTranslation();
  const [proofId, setProofId] = useState('');
  const requestId = useClientRequestId();
  const [createTransfer, createState] = useCreateTransferMutation();
  const [cancelTransfer, cancelState] = useCancelTransferMutation();
  const list = useGetTransfersQuery({ kind: 'HANDOVER', limit: 20 }, { refetchOnMountOrArgChange: true, refetchOnFocus: true });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', note: '' },
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
        ...(proofId ? { proofId } : {}),
      }).unwrap();
      requestId.regenerate();
      reset();
      setProofId('');
    } catch {
      // Error rendered below.
    }
  }

  async function cancel(id) {
    try {
      await cancelTransfer(id).unwrap();
    } catch {
      // Mutation state is rendered in the row.
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={t('staff.eyebrow')}
        title={t('nav.handover')}
        description={t('staff.handoverDescription')}
      />

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
              <Send className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-cairo text-lg font-extrabold">{t('staff.sendCash')}</h2>
              <p className="mt-1 font-tajawal text-xs text-navy/50">{t('staff.handoverFormHint')}</p>
            </div>
          </div>

          <form className="mt-5 space-y-5" onSubmit={handleSubmit(submit)}>
            <MoneyInput
              label={t('staff.handoverAmount')}
              placeholder="0.00"
              error={errors.amount ? t('errors.invalidAmount') : undefined}
              {...register('amount')}
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
              <p className="font-tajawal text-sm leading-7 text-red-700" role="alert">
                {errorMessage(createState.error, t)}
              </p>
            )}

            <Button type="submit" className="w-full" loading={createState.isLoading}>
              {t('staff.sendHandover')}
            </Button>
          </form>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
              <WalletCards className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-cairo text-lg font-extrabold">{t('staff.myHandovers')}</h2>
              <p className="mt-1 font-tajawal text-xs text-navy/50">{t('staff.receiverCounts')}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {list.isLoading ? (
              [1, 2, 3].map((item) => <Skeleton key={item} className="h-24" />)
            ) : list.isError ? (
              <ErrorState title={t('errors.generic')} description={errorMessage(list.error, t)} onRetry={list.refetch} />
            ) : (list.data?.items ?? []).length === 0 ? (
              <EmptyState title={t('staff.noHandovers')} description={t('staff.noHandoversHint')} />
            ) : (
              list.data.items.map((transfer) => (
                <div key={transfer.id} className="rounded-xl border border-navy/8 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusIcon status={transfer.status} />
                        <Badge tone={transfer.status === 'PENDING' ? 'warning' : transfer.status === 'CONFIRMED' ? 'success' : transfer.status === 'DISPUTED' ? 'danger' : 'neutral'}>
                          {t(`transferStatus.${transfer.status}`)}
                        </Badge>
                      </div>
                      <p className="mt-2 font-tajawal text-xs text-navy/45">{formatDateTime(transfer.createdAt, i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                    </div>
                    <p className="font-cairo text-lg font-black">{formatEgpWithCurrency(transfer.amountSent, i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                  </div>

                  {transfer.note && <p className="mt-3 font-tajawal text-sm leading-6 text-navy/60">{transfer.note}</p>}

                  {transfer.status === 'CONFIRMED' && transfer.amountReceived != null && (
                    <p className="mt-2 font-tajawal text-xs text-navy/55">
                      {t('staff.received')}: {formatEgpWithCurrency(transfer.amountReceived, i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                    </p>
                  )}

                  {transfer.status === 'PENDING' && (
                    <div className="mt-3 flex justify-end">
                      <Button variant="ghost" className="text-red-700" onClick={() => cancel(transfer.id)} loading={cancelState.isLoading}>
                        <Ban className="size-4" aria-hidden="true" />
                        {t('staff.cancelHandover')}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'CONFIRMED') return <CheckCircle2 className="size-4 text-ball" aria-hidden="true" />;
  if (status === 'PENDING') return <Clock3 className="size-4 text-edge" aria-hidden="true" />;
  return <ArrowDownToLine className="size-4 text-edge" aria-hidden="true" />;
}
