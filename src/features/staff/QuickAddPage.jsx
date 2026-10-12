import { CheckCircle2, CircleDollarSign, CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useCreateIncomeMutation } from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import { selectPermissions } from '../auth/authSelectors';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import { toPiasters } from '../../shared/lib/money';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import MoneyInput from '../../shared/ui/MoneyInput';
import Select from '../../shared/ui/Select';
import Badge from '../../shared/ui/Badge';
import ReceiptCapture from '../../shared/ui/ReceiptCapture';

const schema = z.object({
  method: z.enum(['CASH', 'VISA', 'INSTAPAY']),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/),
  reference: z.string().trim().max(64).optional(),
  note: z.string().trim().min(3).max(500),
});

export default function QuickAddPage() {
  const { t } = useTranslation();
  const [receiptId, setReceiptId] = useState('');
  const [saved, setSaved] = useState(false);
  const permissions = useSelector(selectPermissions);
  const clientRequest = useClientRequestId();
  const [createIncome, state] = useCreateIncomeMutation();

  const {
    register,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { method: 'CASH', amount: '', reference: '', note: '' },
  });
  const method = watch('method');

  useEffect(() => {
    if (!saved) return undefined;
    const timer = window.setTimeout(() => setSaved(false), 4000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  async function submit(values) {
    let amount;
    try {
      amount = toPiasters(values.amount);
    } catch {
      return;
    }

    try {
      await createIncome({
        clientRequestId: clientRequest.id,
        source: 'OTHER',
        method: values.method,
        amount,
        ...(receiptId ? { receiptId } : {}),
        ...(values.reference ? { reference: values.reference } : {}),
        note: values.note,
      }).unwrap();

      clientRequest.regenerate();
      reset();
      setReceiptId('');
      setSaved(true);
    } catch {
      // Error rendered below.
    }
  }

  if (permissions?.['income.create'] === false) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-7 text-center">
          <p className="font-cairo text-lg font-black">{t('errors.forbidden')}</p>
          <p className="mt-2 font-tajawal text-sm leading-7 text-navy/60">
            {t('staff.permissionDisabled')}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={t('staff.eyebrow')}
        title={t('nav.quickAdd')}
        description={t('staff.quickAddDescription')}
      />

      <Card className="p-5 sm:p-7">
        <form className="space-y-5" onSubmit={handleSubmit(submit)}>
          <div className="flex items-center gap-3 rounded-xl bg-navy/[0.03] p-4">
            <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
              <CircleDollarSign className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div>
              <p className="font-cairo text-sm font-bold text-navy">{t('source.OTHER')}</p>
              <p className="mt-0.5 font-tajawal text-xs text-navy/55">{t('source.OTHER_HINT')}</p>
            </div>
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
              <Input
                label={t('staff.reference')}
                placeholder={t('staff.referencePlaceholder')}
                {...register('reference')}
              />
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
            label={t('staff.description')}
            placeholder={t('staff.descriptionPlaceholder')}
            error={errors.note ? t('errors.noteRequired') : undefined}
            {...register('note')}
          />

          {state.error && (
            <Card className="border-red-200 bg-red-50 p-4">
              <p className="font-tajawal text-sm leading-7 text-red-800" role="alert">
                {errorMessage(state.error, t)}
              </p>
            </Card>
          )}

          {saved && (
            <Card className="border-ball/50 bg-ball/10 p-4" role="status" aria-live="polite">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-court" aria-hidden="true" />
                <p className="font-tajawal text-sm font-semibold text-navy">
                  {t('staff.quickAddSaved')}
                </p>
              </div>
            </Card>
          )}

          <div className="flex items-center justify-between gap-3 rounded-xl bg-navy p-4 text-white">
            <div className="flex items-center gap-3">
              <CreditCard className="size-5 text-ball" aria-hidden="true" />
              <p className="font-tajawal text-sm">{t('staff.noOptimisticMoney')}</p>
            </div>
            <Badge tone="neutral" className="border border-white/15 bg-white/10 text-white">
              {t('staff.pendingSafe')}
            </Badge>
          </div>

          <Button
            type="submit"
            className="w-full"
            loading={state.isLoading}
            disabled={method !== 'CASH' && !receiptId}
          >
            {t('staff.savePayment')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
