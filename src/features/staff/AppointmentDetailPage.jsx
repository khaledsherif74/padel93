import { ArrowLeft, Banknote, CreditCard, ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateIncomeMutation, useGetAppointmentQuery } from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import { selectPermissions } from '../auth/authSelectors';
import { formatDateTime, formatTime } from '../../shared/lib/date';
import { formatEgpWithCurrency, toPiasters } from '../../shared/lib/money';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import Badge from '../../shared/ui/Badge';
import Input from '../../shared/ui/Input';
import Select from '../../shared/ui/Select';
import MoneyInput from '../../shared/ui/MoneyInput';
import Modal from '../../shared/ui/Modal';
import ReceiptCapture from '../../shared/ui/ReceiptCapture';
import ErrorState from '../../shared/ui/ErrorState';
import Skeleton from '../../shared/ui/Skeleton';

const paymentSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/),
  method: z.enum(['CASH', 'VISA', 'INSTAPAY']),
  reference: z.string().trim().max(64).optional(),
  note: z.string().trim().max(500).optional(),
});

export default function AppointmentDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const query = useGetAppointmentQuery(id);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const permissions = useSelector(selectPermissions);

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-48" />
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title={t('errors.generic')}
        description={errorMessage(query.error, t)}
        onRetry={query.refetch}
      />
    );
  }

  const appointment = query.data;
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const badge = paymentBadge(appointment.payment?.state, t);
  const hasRecordedAppointmentPayment = (appointment.incomes ?? []).some(
    (income) => income.source === 'APPOINTMENT',
  );
  const due = appointment.payment?.due ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={t('staff.appointmentDetail')}
        title={appointment.customer?.name || t('staff.walkIn')}
        description={`${appointment.court?.name || t('staff.court')} · ${formatTime(appointment.startsAt, locale)} – ${formatTime(appointment.endsAt, locale)}`}
        actions={
          <Link to="/app/staff/appointments">
            <Button variant="ghost">
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t('common.back')}
            </Button>
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric
          label={t('staff.expected')}
          value={formatEgpWithCurrency(appointment.payment?.expected ?? 0, locale)}
        />
        <Metric
          label={t('staff.collected')}
          value={formatEgpWithCurrency(appointment.payment?.collected ?? 0, locale)}
        />
        <Metric accent label={t('staff.due')} value={formatEgpWithCurrency(due, locale)} />
      </section>

      <Card dark className="border-navy bg-navy p-6 shadow-card-dark sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={badge.tone}>{badge.label}</Badge>
              {appointment.payment?.needsAttention && (
                <Badge tone="warning">{t('staff.attention')}</Badge>
              )}
            </div>
            <h2 className="mt-3 font-cairo text-2xl font-black text-white">
              {t('staff.paymentStatus')}
            </h2>
            <p className="mt-2 max-w-2xl font-tajawal text-sm leading-7 text-white/65">
              {t('staff.paymentInstruction')}
            </p>

            {hasRecordedAppointmentPayment && due > 0 && (
              <Link
                to="/app/staff/payment-flags"
                className="mt-3 inline-block rounded-xl bg-ball/15 px-4 py-2 font-tajawal text-sm text-white"
              >
                {t('staff.underpaidFlagged')}
              </Link>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {permissions?.['income.create'] !== false &&
              !hasRecordedAppointmentPayment &&
              due > 0 && (
                <Button onClick={() => setPaymentOpen(true)}>
                  <Banknote className="size-4" aria-hidden="true" />
                  {t('staff.recordPayment')}
                </Button>
              )}
            {hasRecordedAppointmentPayment && (
              <Badge tone="success">{t('staff.appointmentPaymentRecorded')}</Badge>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
            <ReceiptText className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-cairo text-lg font-extrabold">{t('staff.paymentHistory')}</h2>
            <p className="font-tajawal text-xs text-navy/50">{t('staff.recordedPayments')}</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {(appointment.incomes ?? []).length === 0 ? (
            <p className="rounded-xl bg-navy/5 p-4 font-tajawal text-sm text-navy/55">
              {t('staff.noPayments')}
            </p>
          ) : (
            appointment.incomes.map((income) => (
              <div
                key={income.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-navy/8 p-4"
              >
                <div>
                  <p className="font-cairo text-sm font-bold">{t(`method.${income.method}`)}</p>
                  <p className="mt-1 font-tajawal text-xs text-navy/50">
                    {formatDateTime(income.recordedAt, locale)}
                  </p>
                </div>
                <p className="font-cairo text-sm font-black">
                  {formatEgpWithCurrency(income.amount, locale)}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail label={t('staff.court')} value={appointment.court?.name || '—'} />
          <Detail label={t('staff.service')} value={appointment.service || '—'} />
          <Detail label={t('staff.phone')} value={appointment.customer?.phone || '—'} />
          <Detail label={t('staff.bookingStatus')} value={appointment.bookingStatus || '—'} />
          <Detail label={t('staff.businessDateLabel')} value={appointment.businessDate || '—'} />
          <Detail label={t('staff.note')} value={appointment.note || '—'} />
        </div>
      </Card>

      <PaymentModal
        open={paymentOpen}
        appointment={appointment}
        locale={locale}
        onClose={() => setPaymentOpen(false)}
        onSuccess={() => {
          setPaymentOpen(false);
          query.refetch();
        }}
      />
    </div>
  );
}

function Metric({ label, value, accent = false }) {
  return (
    <Card className={`p-5 ${accent ? 'border-ball/40' : ''}`}>
      <p className="font-cairo text-xs font-semibold text-navy/50">{label}</p>
      <p className={`mt-2 font-cairo text-2xl font-black ${accent ? 'text-court' : 'text-navy'}`}>
        {value}
      </p>
    </Card>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-xl border border-navy/8 p-4">
      <p className="font-cairo text-xs font-semibold text-navy/45">{label}</p>
      <p className="mt-1 font-tajawal text-sm text-navy">{value}</p>
    </div>
  );
}

function PaymentModal({ open, appointment, locale, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [receiptId, setReceiptId] = useState('');
  const clientRequest = useClientRequestId();
  const [createIncome, state] = useCreateIncomeMutation();
  const {
    register,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: '', method: 'CASH', reference: '', note: '' },
  });
  const method = watch('method');
  const amountText = watch('amount');
  const noteText = watch('note');
  const permissions = useSelector(selectPermissions);

  const expected = appointment.payment?.expected ?? 0;
  const alreadyCollected = appointment.payment?.collected ?? 0;
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
    const amount = toPiasters(values.amount);
    if (amount <= 0) return;
    if (willBeUnderpaid && !values.note?.trim()) return;
    try {
      await createIncome({
        clientRequestId: clientRequest.id,
        source: 'APPOINTMENT',
        appointmentId: appointment.id,
        method: values.method,
        amount,
        ...(receiptId ? { receiptId } : {}),
        ...(values.reference ? { reference: values.reference } : {}),
        ...(values.note?.trim() ? { note: values.note.trim() } : {}),
      }).unwrap();
      clientRequest.regenerate();
      setReceiptId('');
      reset();
      onSuccess();
    } catch {
      // Error is rendered below.
    }
  }

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
            <p className="font-cairo text-sm font-bold">{t('staff.recordPayment')}</p>
          </div>
          <p className="mt-1 font-tajawal text-xs leading-6 text-white/65">
            {t('staff.recordPaymentHint', {
              due: formatEgpWithCurrency(appointment.payment?.due ?? 0, locale),
            })}
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

        {/* Underpayment explanation — required by the server too. */}
        {willBeUnderpaid && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-cairo text-sm font-bold text-amber-900">
              {t('staff.underpaymentTitle')}
            </p>
            <p className="mt-1 font-tajawal text-xs leading-6 text-amber-900/75">
              {t('staff.underpaymentHint', {
                collected: formatEgpWithCurrency(projected),
                expected: formatEgpWithCurrency(expected),
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

function paymentBadge(state, t) {
  const values = {
    PAID: { tone: 'success', label: t('payment.PAID') },
    PARTIAL: { tone: 'warning', label: t('payment.PARTIAL') },
    UNPAID: { tone: 'danger', label: t('payment.UNPAID') },
    OVERPAID: { tone: 'success', label: t('payment.OVERPAID') },
  };
  return values[state] || { tone: 'neutral', label: state || t('payment.UNKNOWN') };
}
