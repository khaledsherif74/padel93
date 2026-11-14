import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useUpdateIncomeMutation } from '../../app/api';
import { selectPermissions } from '../auth/authSelectors';
import { errorMessage } from '../../shared/lib/apiError';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import { buildEditBody, validateEdit } from '../../shared/lib/paymentEdit';
import Modal from '../../shared/ui/Modal';
import Button from '../../shared/ui/Button';
import MoneyInput from '../../shared/ui/MoneyInput';
import MethodRadios from '../../shared/ui/MethodRadios';
import ReceiptCapture from '../../shared/ui/ReceiptCapture';

const textareaClass =
  'w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-sm text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15';

function initialDraft(income) {
  return {
    method: income.method,
    amountText: (income.amount / 100).toFixed(2),
    note: income.note ?? '',
    receiptId: '',
    reason: '',
  };
}

export default function EditPaymentModal({ income, locale, onClose, onSaved }) {
  const { t } = useTranslation();
  const permissions = useSelector(selectPermissions);
  const [updateIncome, state] = useUpdateIncomeMutation();
  const [draft, setDraft] = useState(() => (income ? initialDraft(income) : null));

  useEffect(() => {
    setDraft(income ? initialDraft(income) : null);
  }, [income]);

  if (!income || !draft) return null;
  const methods =
    permissions?.['income.createCard'] !== false ? ['CASH', 'VISA', 'INSTAPAY'] : ['CASH'];
  const check = validateEdit(income, draft);
  const patch = (changes) => setDraft((d) => ({ ...d, ...changes }));

  async function submit(event) {
    event.preventDefault();
    const body = buildEditBody(income, draft);
    if (!check.ok || !body) return;
    try {
      await updateIncome({ id: income.id, body }).unwrap();
      onSaved();
    } catch {
      // The mutation error is rendered in the modal.
    }
  }

  return (
    <Modal open onClose={state.isLoading ? undefined : onClose} title={t('staff.editPayment')}>
      <form className="space-y-5" onSubmit={submit}>
        <p className="rounded-xl bg-navy/5 px-4 py-3 font-tajawal text-sm text-navy/70">
          {t('method.' + income.method)} · {formatEgpWithCurrency(income.amount, locale)}
        </p>
        <MethodRadios
          name="edit-method"
          value={draft.method}
          onChange={(method) => patch({ method, receiptId: '' })}
          methods={methods}
          t={t}
        />
        <MoneyInput
          label={t('common.amount')}
          placeholder="0.00"
          value={draft.amountText}
          onChange={(event) => patch({ amountText: event.target.value })}
        />
        {draft.method !== 'CASH' && draft.method !== income.method && (
          <>
            <ReceiptCapture
              value={draft.receiptId}
              onUploaded={(id) => patch({ receiptId: id })}
              onClear={() => patch({ receiptId: '' })}
              label={t('staff.receiptForPayment')}
            />
            {!draft.receiptId && (
              <p className="font-tajawal text-xs text-red-700">{t('receipt.requiredForCard')}</p>
            )}
          </>
        )}
        <label className="block">
          <span className="mb-2 block font-cairo text-sm font-semibold">
            {t('common.noteOptional')}
          </span>
          <textarea
            rows={2}
            value={draft.note}
            onChange={(event) => patch({ note: event.target.value })}
            className={textareaClass}
          />
        </label>
        <label className="block">
          <span className="mb-2 block font-cairo text-sm font-semibold">
            {t('staff.editReason')}
          </span>
          <textarea
            rows={2}
            value={draft.reason}
            onChange={(event) => patch({ reason: event.target.value })}
            placeholder={t('staff.editReasonPlaceholder')}
            className={textareaClass}
          />
        </label>
        {state.error && (
          <p className="font-tajawal text-sm text-red-700" role="alert">
            {errorMessage(state.error, t)}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={state.isLoading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={state.isLoading} disabled={!check.ok}>
            {t('staff.saveChanges')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
