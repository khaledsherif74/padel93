import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { CreditCard } from 'lucide-react';
import { useCreateIncomeMutation } from '../../app/api';
import { selectPermissions } from '../auth/authSelectors';
import { errorMessage } from '../../shared/lib/apiError';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import { formatEgpWithCurrency, toPiasters } from '../../shared/lib/money';
import Modal from '../../shared/ui/Modal';
import Button from '../../shared/ui/Button';
import Select from '../../shared/ui/Select';
import MoneyInput from '../../shared/ui/MoneyInput';
import ReceiptCapture from '../../shared/ui/ReceiptCapture';

const schema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/),
  method: z.enum(['CASH', 'VISA', 'INSTAPAY']),
  note: z.string().trim().max(500).optional(),
});

export default function BookingPaymentModal({ open, appointment, locale, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [receiptId, setReceiptId] = useState('');
  const clientRequest = useClientRequestId();
  const [createIncome, state] = useCreateIncomeMutation();
  const permissions = useSelector(selectPermissions);
  const {
    register,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', method: 'CASH', note: '' },
  });
  const method = watch('method');
  const amountText = watch('amount');
  const noteText = watch('note');
  const expected = appointment?.payment?.expected ?? 0;
  const outstanding = Math.max(0, appointment?.payment?.due ?? 0);
  const alreadyCollected = appointment?.payment?.collected ?? 0;

  useEffect(() => {
    if (!open || !appointment?.id) return;
    reset({ amount: (outstanding / 100).toFixed(2), method: 'CASH', note: '' });
    setReceiptId('');
  }, [open, appointment?.id, outstanding, reset]);

  let amountPiasters = 0;
  try {
    amountPiasters = amountText ? toPiasters(amountText) : 0;
  } catch {
    amountPiasters = 0;
  }
  const projected = alreadyCollected + amountPiasters;
  const willBeUnderpaid = expected > 0 && projected > 0 && projected < expected;
  const noteRequired = willBeUnderpaid && !noteText?.trim();

  async function submit(values) {
    if (!appointment?.id) return;
    const amount = toPiasters(values.amount);
    if (amount <= 0 || (willBeUnderpaid && !values.note?.trim())) return;
    try {
      await createIncome({
        clientRequestId: clientRequest.id,
        source: 'APPOINTMENT',
        appointmentId: appointment.id,
        method: values.method,
        amount,
        ...(receiptId ? { receiptId } : {}),
        ...(values.note?.trim() ? { note: values.note.trim() } : {}),
      }).unwrap();
      clientRequest.regenerate();
      setReceiptId('');
      reset();
      onSuccess();
    } catch {
      // Mutation error is rendered in the modal.
    }
  }

  if (!appointment) return null;

  return (
    <Modal
      open={open}
      onClose={state.isLoading ? undefined : onClose}
      title={t('staff.recordPayment')}
    >
      <form className="space-y-5" onSubmit={handleSubmit(submit)}>
        <div className="rounded-xl bg-navy p-4 text-white">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-ball" aria-hidden="true" />
            <p className="font-cairo text-sm font-bold">
              {appointment.customer?.name || t('staff.walkIn')}
            </p>
          </div>
          <p className="mt-1 font-tajawal text-xs leading-6 text-white/65">
            {t('staff.recordPaymentHint', { due: formatEgpWithCurrency(outstanding, locale) })}
          </p>
        </div>

        <MoneyInput
          label={t('common.amount')}
          placeholder="0.00"
          error={errors.amount ? t('errors.invalidAmount') : undefined}
          {...register('amount')}
        />

        <Select
          label={t('common.method')}
          options={[
            { value: 'CASH', label: t('method.CASH') },
            ...(permissions?.['income.createCard'] !== false
              ? [
                  { value: 'VISA', label: t('method.VISA') },
                  { value: 'INSTAPAY', label: t('method.INSTAPAY') },
                ]
              : []),
          ]}
          {...register('method')}
        />

        {method !== 'CASH' && (
          <>
            <ReceiptCapture
              value={receiptId}
              onUploaded={setReceiptId}
              onClear={() => setReceiptId('')}
              label={t('staff.receiptForPayment')}
            />
            {!receiptId && (
              <p className="font-tajawal text-xs text-red-700">{t('receipt.requiredForCard')}</p>
            )}
          </>
        )}

        {willBeUnderpaid && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-cairo text-sm font-bold text-amber-900">
              {t('staff.underpaymentTitle')}
            </p>
            <p className="mt-1 font-tajawal text-xs leading-6 text-amber-900/75">
              {t('staff.underpaymentHint', {
                collected: formatEgpWithCurrency(projected, locale),
                expected: formatEgpWithCurrency(expected, locale),
              })}
            </p>
            <textarea
              rows={3}
              className="mt-3 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-sm text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
              placeholder={t('staff.underpaymentPlaceholder')}
              {...register('note')}
            />
            {noteRequired && amountText && (
              <p className="mt-1.5 font-tajawal text-xs text-red-700">
                {t('staff.underpaymentNoteRequired')}
              </p>
            )}
          </div>
        )}

        {state.error && (
          <p className="font-tajawal text-sm text-red-700" role="alert">
            {errorMessage(state.error, t)}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={state.isLoading}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            loading={state.isLoading}
            disabled={(method !== 'CASH' && !receiptId) || noteRequired}
          >
            {t('staff.savePayment')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
