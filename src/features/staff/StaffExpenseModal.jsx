import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateExpenseMutation, useGetExpenseCategoriesQuery } from '../../app/api';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import { toPiasters } from '../../shared/lib/money';
import { errorMessage } from '../../shared/lib/apiError';
import Modal from '../../shared/ui/Modal';
import Button from '../../shared/ui/Button';
import ReceiptCapture from '../../shared/ui/ReceiptCapture';

export default function StaffExpenseModal({ open, onClose, onSuccess }) {
  const { t, i18n } = useTranslation();
  const categories = useGetExpenseCategoriesQuery(undefined, { skip: !open, refetchOnMountOrArgChange: true });
  const [createExpense, state] = useCreateExpenseMutation();
  const requestId = useClientRequestId();
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [description, setDescription] = useState('');
  const [receiptId, setReceiptId] = useState('');
  const [formError, setFormError] = useState('');

  const categoryOptions = useMemo(() => (categories.data?.items ?? []), [categories.data]);

  function reset() {
    setCategoryId(''); setAmount(''); setMethod('CASH'); setDescription(''); setReceiptId(''); setFormError('');
  }

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    if (!categoryId || !description.trim() || description.trim().length < 3) {
      setFormError(t('errors.descriptionRequired', { defaultValue: 'Choose a category and enter a clear description.' }));
      return;
    }
    let amountInPiasters;
    try { amountInPiasters = toPiasters(amount); } catch {
      setFormError(t('errors.invalidAmount', { defaultValue: 'Enter a valid amount.' }));
      return;
    }
    try {
      const expense = await createExpense({
        clientRequestId: requestId.id,
        categoryId,
        amount: amountInPiasters,
        method,
        description: description.trim(),
        ...(receiptId ? { receiptId } : {}),
      }).unwrap();
      requestId.regenerate();
      reset();
      onSuccess?.(expense);
      onClose?.();
    } catch (error) {
      setFormError(errorMessage(error, t));
    }
  }

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  return (
    <Modal open={open} onClose={state.isLoading ? undefined : onClose} title={t('staff.addExpense', { defaultValue: 'Add expense' })}>
      <form className="space-y-4" onSubmit={submit}>
        <p className="rounded-xl bg-navy/[0.04] p-3 font-tajawal text-sm leading-6 text-navy/65">
          {t('staff.expenseFormHint', { defaultValue: 'This expense will be recorded against your active cash drawer and included in shift closing.' })}
        </p>
        {categories.isLoading ? (
          <p className="font-tajawal text-sm text-navy/55">{t('common.loading')}</p>
        ) : categories.isError ? (
          <p className="font-tajawal text-sm text-red-700">{errorMessage(categories.error, t)}</p>
        ) : (
          <label className="block">
            <span className="mb-2 block font-cairo text-sm font-semibold text-navy">{t('staff.category', { defaultValue: 'Category' })}</span>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required className="min-h-12 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-base text-navy">
              <option value="">{t('staff.chooseCategory', { defaultValue: 'Choose a category' })}</option>
              {categoryOptions.map((item) => <option key={item.id} value={item.id}>{locale === 'ar-EG' && item.nameAr ? item.nameAr : item.name}</option>)}
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-2 block font-cairo text-sm font-semibold text-navy">{t('common.amount', { defaultValue: 'Amount' })}</span>
          <input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required placeholder="0.00" className="min-h-12 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-base text-navy" />
        </label>
        <label className="block">
          <span className="mb-2 block font-cairo text-sm font-semibold text-navy">{t('common.method', { defaultValue: 'Payment method' })}</span>
          <select value={method} onChange={(event) => setMethod(event.target.value)} className="min-h-12 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-base text-navy">
            <option value="CASH">{t('method.CASH', { defaultValue: 'Cash' })}</option>
            <option value="VISA">{t('method.VISA', { defaultValue: 'Visa' })}</option>
            <option value="INSTAPAY">{t('method.INSTAPAY', { defaultValue: 'InstaPay' })}</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block font-cairo text-sm font-semibold text-navy">{t('staff.description', { defaultValue: 'Description' })}</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={3} maxLength={200} required rows={3} placeholder={t('staff.expenseDescriptionPlaceholder', { defaultValue: 'Describe what the expense was for' })} className="w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-sm text-navy" />
        </label>
        <ReceiptCapture value={receiptId} onUploaded={setReceiptId} onClear={() => setReceiptId('')} label={t('staff.receiptOptional', { defaultValue: 'Receipt (optional)' })} />
        {formError && <p className="font-tajawal text-sm text-red-700" role="alert">{formError}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={state.isLoading}>{t('common.cancel')}</Button>
          <Button type="submit" loading={state.isLoading} disabled={categories.isLoading || categories.isError}>{t('staff.saveExpense', { defaultValue: 'Save expense' })}</Button>
        </div>
      </form>
    </Modal>
  );
}
