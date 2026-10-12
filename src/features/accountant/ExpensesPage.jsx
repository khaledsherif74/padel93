import { CheckCircle2, Plus, ReceiptText, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetExpenseCategoriesQuery,
  useGetExpensesQuery,
  useCreateExpenseMutation,
} from '../../app/api';
import { formatDateTime, businessDate } from '../../shared/lib/date';
import { formatEgpWithCurrency, toPiasters } from '../../shared/lib/money';
import { errorMessage } from '../../shared/lib/apiError';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import Badge from '../../shared/ui/Badge';
import Input from '../../shared/ui/Input';
import Select from '../../shared/ui/Select';
import MoneyInput from '../../shared/ui/MoneyInput';
import ReceiptCapture from '../../shared/ui/ReceiptCapture';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';

export default function ExpensesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const today = businessDate();
  const categories = useGetExpenseCategoriesQuery();
  const expenses = useGetExpensesQuery({ date: today, paidFrom: 'ACCOUNTANT', limit: 50 });
  const [create, state] = useCreateExpenseMutation();
  const clientRequest = useClientRequestId();
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [method, setMethod] = useState('CASH');
  const [description, setDescription] = useState('');
  const [receiptId, setReceiptId] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return undefined;
    const timer = window.setTimeout(() => setSaved(false), 4000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  async function submit(event) {
    event.preventDefault();
    let value;
    try {
      value = toPiasters(amount);
    } catch {
      return;
    }
    if (!categoryId || !description.trim() || !Number.isInteger(value) || value <= 0) return;

    try {
      await create({
        categoryId,
        amount: value,
        method,
        description: description.trim(),
        ...(receiptId ? { receiptId } : {}),
        clientRequestId: clientRequest.id,
      }).unwrap();
      clientRequest.regenerate();
      setAmount('');
      setCategoryId('');
      setMethod('CASH');
      setDescription('');
      setReceiptId('');
      setSaved(true);
    } catch {
      // Error rendered below.
    }
  }

  const options = (categories.data?.items ?? []).map((item) => ({
    value: item.id,
    label: i18n.language === 'ar' && item.nameAr ? item.nameAr : item.name,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={t('accountant.expensesEyebrow')}
        title={t('accountant.expensesTitle')}
        description={t('accountant.expensesDescription')}
        actions={
          <Button variant="ghost" onClick={expenses.refetch}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {t('common.refresh')}
          </Button>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <ReceiptText className="size-5 text-edge" aria-hidden="true" />
            <h2 className="font-cairo text-lg font-extrabold text-navy">
              {t('accountant.addExpense')}
            </h2>
          </div>

          <form className="mt-5 space-y-5" onSubmit={submit}>
            <Select
              label={t('staff.category')}
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              placeholder={t('staff.chooseCategory')}
              options={options}
            />

            <MoneyInput
              label={t('common.amount')}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />

            <Select
              label={t('common.method')}
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              options={[
                { value: 'CASH', label: t('method.CASH') },
                { value: 'VISA', label: t('method.VISA') },
                { value: 'INSTAPAY', label: t('method.INSTAPAY') },
              ]}
            />

            <Input
              label={t('staff.description')}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('staff.descriptionPlaceholder')}
            />

            <ReceiptCapture
              label={t('staff.receiptOptional')}
              value={receiptId}
              onUploaded={setReceiptId}
              onClear={() => setReceiptId('')}
            />

            {state.error && (
              <p className="font-tajawal text-sm text-red-700" role="alert">
                {errorMessage(state.error, t)}
              </p>
            )}

            {saved && (
              <Card className="border-ball/50 bg-ball/10 p-4" role="status" aria-live="polite">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-court" aria-hidden="true" />
                  <p className="font-tajawal text-sm font-semibold text-navy">
                    {t('accountant.expenseSaved')}
                  </p>
                </div>
              </Card>
            )}

            <Button type="submit" loading={state.isLoading}>
              <Plus className="size-4" aria-hidden="true" />
              {t('accountant.saveExpense')}
            </Button>
          </form>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-cairo text-xs font-bold uppercase tracking-[0.14em] text-ball">
                {t('accountant.today')}
              </p>
              <h2 className="mt-1 font-cairo text-xl font-black text-navy">
                {t('accountant.accountantExpenses')}
              </h2>
            </div>
            <Badge tone="info">{today}</Badge>
          </div>

          <div className="mt-5 space-y-3">
            {expenses.isLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-navy/5" />
                ))}
              </>
            ) : expenses.isError ? (
              <ErrorState
                title={t('errors.generic')}
                description={errorMessage(expenses.error, t)}
                onRetry={expenses.refetch}
              />
            ) : expenses.data?.items?.length ? (
              expenses.data.items.map((item) => (
                <div key={item.id} className="rounded-xl border border-navy/10 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-cairo text-sm font-bold text-navy">
                          {item.category?.name}
                        </p>
                        <Badge tone="neutral">{t(`method.${item.method || 'CASH'}`)}</Badge>
                      </div>
                      <p className="mt-1 font-tajawal text-sm text-navy/65">{item.description}</p>
                      <p className="mt-1 font-tajawal text-xs text-navy/45">
                        {formatDateTime(item.recordedAt, locale)}
                      </p>
                    </div>
                    <p className="font-cairo text-sm font-black text-navy">
                      {formatEgpWithCurrency(item.amount, locale)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title={t('accountant.noAccountantExpenses')}
                description={t('accountant.noAccountantExpensesHint')}
              />
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
