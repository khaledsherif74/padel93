import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { useCreateIncomeBatchMutation } from '../../app/api';
import { selectPermissions } from '../auth/authSelectors';
import { errorMessage } from '../../shared/lib/apiError';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import { buildBatchBody, computeSplit } from '../../shared/lib/paymentSplit';
import Modal from '../../shared/ui/Modal';
import Button from '../../shared/ui/Button';
import MoneyInput from '../../shared/ui/MoneyInput';
import ReceiptCapture from '../../shared/ui/ReceiptCapture';
import MethodRadios from '../../shared/ui/MethodRadios';

const MAX_LINES = 5;
let lineSeq = 0;
const newLine = (amountText = '') => ({
  key: `line-${++lineSeq}`,
  method: 'CASH',
  amountText,
  receiptId: '',
});

export default function BookingPaymentModal({ open, appointment, locale, onClose, onSuccess }) {
  const { t } = useTranslation();
  const clientRequest = useClientRequestId();
  const [createBatch, state] = useCreateIncomeBatchMutation();
  const permissions = useSelector(selectPermissions);
  const [lines, setLines] = useState([newLine()]);
  const [note, setNote] = useState('');

  const expected = appointment?.payment?.expected ?? 0;
  const outstanding = Math.max(0, appointment?.payment?.due ?? 0);
  const alreadyCollected = appointment?.payment?.collected ?? 0;
  const methods =
    permissions?.['income.createCard'] !== false ? ['CASH', 'VISA', 'INSTAPAY'] : ['CASH'];

  useEffect(() => {
    if (!open || !appointment?.id) return;
    setLines([newLine((outstanding / 100).toFixed(2))]);
    setNote('');
  }, [open, appointment?.id, outstanding]);

  const { total, remaining, overpaid, projected, willBeUnderpaid, noteRequired, canSubmit } =
    computeSplit({ lines, outstanding, expected, alreadyCollected, note });

  const patchLine = (key, patch) =>
    setLines((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  function addLine() {
    if (lines.length >= MAX_LINES) return;
    setLines((rows) => [...rows, newLine(remaining > 0 ? (remaining / 100).toFixed(2) : '')]);
  }

  async function submit(event) {
    event.preventDefault();
    if (!appointment?.id || !canSubmit) return;
    try {
      await createBatch(
        buildBatchBody({
          clientRequestId: clientRequest.id,
          appointmentId: appointment.id,
          note,
          lines,
        }),
      ).unwrap();
      clientRequest.regenerate();
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
      <form className="space-y-5" onSubmit={submit}>
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

        {lines.map((line, index) => (
          <fieldset key={line.key} className="space-y-3 rounded-xl border border-navy/10 p-3">
            <div className="flex items-center justify-between">
              <legend className="font-cairo text-xs font-bold text-navy/55">
                {t('staff.paymentLine', { number: index + 1 })}
              </legend>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLines((rows) => rows.filter((row) => row.key !== line.key))}
                  className="flex size-9 items-center justify-center rounded-lg text-red-700 outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-300"
                  aria-label={t('staff.removePaymentLine')}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <MethodRadios
              name={`method-${line.key}`}
              value={line.method}
              onChange={(method) => patchLine(line.key, { method, receiptId: '' })}
              methods={methods}
              t={t}
            />
            <MoneyInput
              label={t('common.amount')}
              placeholder="0.00"
              value={line.amountText}
              onChange={(event) => patchLine(line.key, { amountText: event.target.value })}
            />
            {line.method !== 'CASH' && (
              <>
                <ReceiptCapture
                  value={line.receiptId}
                  onUploaded={(id) => patchLine(line.key, { receiptId: id })}
                  onClear={() => patchLine(line.key, { receiptId: '' })}
                  label={t('staff.receiptForPayment')}
                />
                {!line.receiptId && (
                  <p className="font-tajawal text-xs text-red-700">
                    {t('receipt.requiredForCard')}
                  </p>
                )}
              </>
            )}
          </fieldset>
        ))}

        {lines.length < MAX_LINES && (
          <Button variant="ghost" onClick={addLine} disabled={state.isLoading}>
            <Plus className="size-4" aria-hidden="true" />
            {t('staff.addPaymentLine')}
          </Button>
        )}

        {lines.length > 1 && (
          <div className="flex items-center justify-between rounded-xl bg-navy/5 px-4 py-3">
            <span className="font-tajawal text-sm text-navy/60">{t('staff.paymentTotal')}</span>
            <span className="font-cairo text-base font-black">
              {formatEgpWithCurrency(total, locale)}
            </span>
          </div>
        )}

        {overpaid && (
          <p className="font-tajawal text-sm text-red-700" role="alert">
            {t('staff.overpaymentBlocked', { due: formatEgpWithCurrency(outstanding, locale) })}
          </p>
        )}

        {willBeUnderpaid && !overpaid && (
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
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-3 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-sm text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
              placeholder={t('staff.underpaymentPlaceholder')}
            />
            {noteRequired && (
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
          <Button type="submit" loading={state.isLoading} disabled={!canSubmit}>
            {t('staff.savePayment')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
