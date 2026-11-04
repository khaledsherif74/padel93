import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useCreateIncomeMutation } from '../../app/api';
import { selectPermissions } from '../auth/authSelectors';
import { errorMessage } from '../../shared/lib/apiError';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import { toPiasters } from '../../shared/lib/money';
import Modal from '../../shared/ui/Modal';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import MoneyInput from '../../shared/ui/MoneyInput';
import Select from '../../shared/ui/Select';
import ReceiptCapture from '../../shared/ui/ReceiptCapture';

const schema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/),
  method: z.enum(['CASH', 'VISA', 'INSTAPAY']),
  note: z.string().trim().min(3).max(500),
});

export default function ShopSaleModal({ open, appointment, onClose, onSuccess }) {
  const { t } = useTranslation();
  const permissions = useSelector(selectPermissions);
  const clientRequest = useClientRequestId();
  const [receiptId, setReceiptId] = useState('');
  const [createIncome, state] = useCreateIncomeMutation();
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

  useEffect(() => {
    if (!open) return;
    reset({ amount: '', method: 'CASH', note: '' });
    setReceiptId('');
  }, [open, appointment?.id, reset]);

  async function submit(values) {
    const amount = toPiasters(values.amount);
    if (amount <= 0) return;
    try {
      await createIncome({
        clientRequestId: clientRequest.id,
        source: 'SHOP',
        ...(appointment?.id ? { appointmentId: appointment.id } : {}),
        method: values.method,
        amount,
        note: values.note.trim(),
        ...(receiptId ? { receiptId } : {}),
      }).unwrap();
      clientRequest.regenerate();
      onSuccess();
    } catch {
      // Mutation error is rendered below.
    }
  }

  return (
    <Modal
      open={open}
      onClose={state.isLoading ? undefined : onClose}
      title={appointment ? t('staff.recordLinkedShopSale') : t('staff.addShopSale')}
    >
      <form className="space-y-5" onSubmit={handleSubmit(submit)}>
        <div className="rounded-xl bg-navy p-4 text-white">
          <p className="font-cairo text-sm font-bold">
            {appointment ? t('staff.linkedShopSaleTitle') : t('staff.standaloneShopSaleTitle')}
          </p>
          <p className="mt-1 font-tajawal text-xs leading-6 text-white/65">
            {appointment ? t('staff.linkedShopSaleHint') : t('staff.standaloneShopSaleHint')}
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

        <Input
          label={t('staff.shopSaleDescription')}
          placeholder={t('staff.shopSaleDescriptionPlaceholder')}
          error={errors.note ? t('errors.noteRequired') : undefined}
          {...register('note')}
        />

        {state.error && (
          <p className="font-tajawal text-sm leading-7 text-red-700" role="alert">
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
            disabled={method !== 'CASH' && !receiptId}
          >
            {t('staff.saveShopSale')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
