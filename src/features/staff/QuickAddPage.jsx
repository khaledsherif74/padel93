import { CheckCircle2, CircleDollarSign, CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  useCreateIncomeMutation,
  useGetAppointmentsQuery,
  useGetSettingsQuery,
} from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import { selectPermissions } from '../auth/authSelectors';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import { businessDate, formatTime } from '../../shared/lib/date';
import { toPiasters, formatEgpWithCurrency } from '../../shared/lib/money';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import MoneyInput from '../../shared/ui/MoneyInput';
import Select from '../../shared/ui/Select';
import Badge from '../../shared/ui/Badge';
import ReceiptCapture from '../../shared/ui/ReceiptCapture';
import Skeleton from '../../shared/ui/Skeleton';

const schema = z.object({
  method: z.enum(['CASH', 'VISA', 'INSTAPAY']),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/),
  note: z.string().trim().min(3).max(500),
});

export default function QuickAddPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const [receiptId, setReceiptId] = useState('');
  const [saved, setSaved] = useState(false);
  const [searchParams] = useSearchParams();
  const [source, setSource] = useState(() =>
    searchParams.get('source') === 'SHOP' ? 'SHOP' : 'OTHER',
  );
  const [saleDate, setSaleDate] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const permissions = useSelector(selectPermissions);
  const clientRequest = useClientRequestId();
  const [createIncome, state] = useCreateIncomeMutation();
  const { data: settings } = useGetSettingsQuery();
  const today = businessDate(undefined, settings?.closeTime || '04:00');
  const selectedSaleDate = saleDate || today;
  const appointments = useGetAppointmentsQuery(
    { date: selectedSaleDate },
    { skip: source !== 'SHOP', refetchOnMountOrArgChange: true },
  );

  const {
    register,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { method: 'CASH', amount: '', note: '' },
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
        source,
        ...(source === 'SHOP' && appointmentId ? { appointmentId } : {}),
        method: values.method,
        amount,
        ...(receiptId ? { receiptId } : {}),
        note: values.note,
      }).unwrap();

      clientRequest.regenerate();
      reset();
      setReceiptId('');
      setAppointmentId('');
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
          <Select
            label={t('staff.movementType')}
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setAppointmentId('');
            }}
            options={[
              { value: 'SHOP', label: t('source.SHOP') },
              { value: 'OTHER', label: t('source.OTHER') },
            ]}
          />

          <div className="flex items-center gap-3 rounded-xl bg-navy/[0.03] p-4">
            <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
              <CircleDollarSign className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div>
              <p className="font-cairo text-sm font-bold text-navy">{t(`source.${source}`)}</p>
              <p className="mt-0.5 font-tajawal text-xs text-navy/55">
                {source === 'SHOP' ? t('staff.shopSaleHint') : t('source.OTHER_HINT')}
              </p>
            </div>
          </div>

          {source === 'SHOP' && (
            <div className="space-y-4 rounded-xl border border-navy/10 p-4">
              <label className="block">
                <span className="mb-2 block font-cairo text-sm font-semibold">
                  {t('staff.saleDate')}
                </span>
                <input
                  type="date"
                  value={selectedSaleDate}
                  onChange={(event) => {
                    setSaleDate(event.target.value);
                    setAppointmentId('');
                  }}
                  className="min-h-12 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-base text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
                />
              </label>

              <Select
                label={t('staff.linkToBooking')}
                value={appointmentId}
                onChange={(event) => setAppointmentId(event.target.value)}
                options={[
                  { value: '', label: t('staff.standaloneSale') },
                  ...(appointments.data?.items ?? []).map((appointment) => ({
                    value: appointment.id,
                    label: `${appointment.customer?.name || t('staff.walkIn')} · ${appointment.court?.name || t('staff.court')} · ${formatTime(appointment.startsAt, locale)}–${formatTime(appointment.endsAt, locale)}`,
                  })),
                ]}
              />
              {appointments.isLoading && <Skeleton className="h-10" />}
              {appointments.isError && (
                <p className="font-tajawal text-xs text-red-700" role="alert">
                  {errorMessage(appointments.error, t)}
                </p>
              )}
              <p className="font-tajawal text-xs leading-6 text-navy/55">
                {t('staff.shopSaleLinkHint')}
              </p>
            </div>
          )}

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
            label={t('staff.description')}
            placeholder={
              source === 'SHOP'
                ? t('staff.shopSaleDescriptionPlaceholder')
                : t('staff.descriptionPlaceholder')
            }
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
            disabled={
              (method !== 'CASH' && !receiptId) || (source === 'SHOP' && appointments.isLoading)
            }
          >
            {t('staff.savePayment')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
