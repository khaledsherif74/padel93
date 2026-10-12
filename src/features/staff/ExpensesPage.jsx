import { ReceiptText, Tags } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  useCreateExpenseMutation,
  useGetExpenseCategoriesQuery,
  useGetExpensesQuery,
} from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import { selectPermissions } from '../auth/authSelectors';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import { businessDate, formatDateTime } from '../../shared/lib/date';
import { formatEgpWithCurrency, toPiasters } from '../../shared/lib/money';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import MoneyInput from '../../shared/ui/MoneyInput';
import Select from '../../shared/ui/Select';
import ReceiptCapture from '../../shared/ui/ReceiptCapture';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';
import Skeleton from '../../shared/ui/Skeleton';
import Badge from '../../shared/ui/Badge';

const schema = z.object({
  categoryId: z.string().min(1),
  amount: z.string().trim().min(1),
  method: z.enum(['CASH', 'VISA', 'INSTAPAY']),
  description: z.string().trim().min(3).max(200),
});

export default function ExpensesPage() {
  const { t, i18n } = useTranslation();
  const [receiptId, setReceiptId] = useState('');
  const permissions = useSelector(selectPermissions);
  const [saved, setSaved] = useState(null);
  const clientRequest = useClientRequestId();
  const categories = useGetExpenseCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const date = businessDate();
  const list = useGetExpensesQuery(
    { date },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true },
  );
  const [createExpense, state] = useCreateExpenseMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { categoryId: '', amount: '', method: 'CASH', description: '' },
  });

  useEffect(() => {
    if (!saved) return undefined;
    const timer = window.setTimeout(() => setSaved(null), 5000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const categoryOptions = useMemo(
    () =>
      (categories.data?.items ?? [])
        .filter(
          (item) => !/salary|salaries|راتب|رواتب/i.test(`${item.name ?? ''} ${item.nameAr ?? ''}`),
        )
        .map((item) => ({
          value: item.id,
          label: i18n.language === 'ar' && item.nameAr ? item.nameAr : item.name,
        })),
    [categories.data, i18n.language],
  );

  async function submit(values) {
    let amount;
    try {
      amount = toPiasters(values.amount);
    } catch {
      return;
    }

    try {
      const response = await createExpense({
        clientRequestId: clientRequest.id,
        categoryId: values.categoryId,
        amount,
        method: values.method,
        description: values.description,
        ...(receiptId ? { receiptId } : {}),
      }).unwrap();
      clientRequest.regenerate();
      reset({ categoryId: '', amount: '', description: '' });
      setReceiptId('');
      setSaved(response);
    } catch {
      // Error rendered below.
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={t('staff.eyebrow')}
        title={t('nav.expenses')}
        description={t('staff.expensesDescription')}
      />

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
              <ReceiptText className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-cairo text-lg font-extrabold">{t('staff.addExpense')}</h2>
              <p className="mt-1 font-tajawal text-xs text-navy/50">{t('staff.expenseFormHint')}</p>
            </div>
          </div>

          {permissions?.['expense.create'] === false ? (
            <div className="mt-5 rounded-xl bg-navy p-5 text-white">
              <p className="font-cairo text-sm font-bold">{t('errors.forbidden')}</p>
              <p className="mt-2 font-tajawal text-xs leading-6 text-white/65">
                {t('staff.permissionDisabled')}
              </p>
            </div>
          ) : categories.isError ? (
            <div className="mt-5">
              <ErrorState
                title={t('errors.generic')}
                description={errorMessage(categories.error, t)}
                onRetry={categories.refetch}
              />
            </div>
          ) : categories.isLoading ? (
            <div className="mt-5 space-y-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (
            <form className="mt-5 space-y-5" onSubmit={handleSubmit(submit)}>
              <Select
                label={t('staff.category')}
                placeholder={t('staff.chooseCategory')}
                options={categoryOptions}
                error={errors.categoryId ? t('errors.categoryRequired') : undefined}
                {...register('categoryId')}
              />
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
                  { value: 'VISA', label: t('method.VISA') },
                  { value: 'INSTAPAY', label: t('method.INSTAPAY') },
                ]}
                {...register('method')}
              />
              <Input
                label={t('staff.description')}
                placeholder={t('staff.expenseDescriptionPlaceholder')}
                error={errors.description ? t('errors.descriptionRequired') : undefined}
                {...register('description')}
              />
              <ReceiptCapture
                value={receiptId}
                onUploaded={setReceiptId}
                onClear={() => setReceiptId('')}
                label={t('staff.receiptOptional')}
              />

              {state.error && (
                <p className="font-tajawal text-sm leading-7 text-red-700" role="alert">
                  {errorMessage(state.error, t)}
                </p>
              )}
              {saved && (
                <Card className="border-ball/40 bg-ball/10 p-4">
                  <p className="font-tajawal text-sm text-navy">{t('staff.expenseSaved')}</p>
                </Card>
              )}

              <Button type="submit" className="w-full" loading={state.isLoading}>
                {t('staff.saveExpense')}
              </Button>
            </form>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
              <Tags className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-cairo text-lg font-extrabold">{t('staff.todayExpenses')}</h2>
              <p className="mt-1 font-tajawal text-xs text-navy/50">{date}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {list.isLoading ? (
              [1, 2, 3].map((item) => <Skeleton key={item} className="h-20" />)
            ) : list.isError ? (
              <ErrorState
                title={t('errors.generic')}
                description={errorMessage(list.error, t)}
                onRetry={list.refetch}
              />
            ) : (list.data?.items ?? []).length === 0 ? (
              <EmptyState title={t('staff.noExpenses')} description={t('staff.noExpensesHint')} />
            ) : (
              list.data.items.map((expense) => (
                <div key={expense.id} className="rounded-xl border border-navy/8 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-cairo text-sm font-bold text-navy">
                        {expense.category?.name}
                      </p>
                      <p className="mt-1 font-tajawal text-sm text-navy/60">
                        {expense.description}
                      </p>
                      <p className="mt-2 font-tajawal text-[11px] text-navy/40">
                        {formatDateTime(
                          expense.recordedAt,
                          i18n.language === 'ar' ? 'ar-EG' : 'en-US',
                        )}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="font-cairo text-sm font-black">
                        {formatEgpWithCurrency(
                          expense.amount,
                          i18n.language === 'ar' ? 'ar-EG' : 'en-US',
                        )}
                      </p>
                      <Badge
                        tone={
                          expense.approval === 'PENDING'
                            ? 'warning'
                            : expense.approval === 'REJECTED'
                              ? 'danger'
                              : 'neutral'
                        }
                      >
                        {t(`approval.${expense.approval}`)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
