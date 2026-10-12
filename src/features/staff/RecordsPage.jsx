import { Banknote, Send, Filter } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetExpensesQuery, useGetIncomesQuery, useGetTransfersQuery } from '../../app/api';
import { businessDate, formatDateTime } from '../../shared/lib/date';
import { errorMessage } from '../../shared/lib/apiError';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';
import Skeleton from '../../shared/ui/Skeleton';
import Badge from '../../shared/ui/Badge';
import LoadMore from '../../shared/ui/LoadMore';

const TABS = ['incomes', 'expenses', 'transfers'];

export default function RecordsPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('incomes');
  const [date, setDate] = useState(businessDate());
  const [incomeMethod, setIncomeMethod] = useState('');
  const [transferStatus, setTransferStatus] = useState('');
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow={t('staff.eyebrow')}
        title={t('nav.records')}
        description={t('staff.recordsDescription')}
      />

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2">
          {(tab === 'incomes' || tab === 'expenses') && (
            <label className="block">
              <span className="mb-2 flex items-center gap-2 font-cairo text-sm font-semibold">
                <Filter className="size-4 text-edge" aria-hidden="true" />
                {t('staff.businessDayLabel')}
              </span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-base text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
              />
            </label>
          )}

          {tab === 'incomes' && (
            <SelectFilter
              value={incomeMethod}
              onChange={setIncomeMethod}
              label={t('common.method')}
              options={[
                ['', t('common.all')],
                ['CASH', t('method.CASH')],
                ['VISA', t('method.VISA')],
                ['INSTAPAY', t('method.INSTAPAY')],
              ]}
            />
          )}

          {tab === 'transfers' && (
            <SelectFilter
              value={transferStatus}
              onChange={setTransferStatus}
              label={t('common.status')}
              options={[
                ['', t('common.all')],
                ['PENDING', t('transferStatus.PENDING')],
                ['CONFIRMED', t('transferStatus.CONFIRMED')],
                ['DISPUTED', t('transferStatus.DISPUTED')],
                ['RESOLVED', t('transferStatus.RESOLVED')],
                ['CANCELLED', t('transferStatus.CANCELLED')],
              ]}
            />
          )}
        </div>
      </Card>

      <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl bg-navy p-1.5">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`min-h-11 whitespace-nowrap rounded-xl px-4 font-cairo text-sm font-bold transition ${tab === value ? 'bg-ball text-navy' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
          >
            {t(`records.${value}`)}
          </button>
        ))}
      </div>

      {tab === 'incomes' && (
        <IncomesFeed
          key={`income-${date}-${incomeMethod}`}
          date={date}
          method={incomeMethod}
          locale={locale}
          t={t}
        />
      )}
      {tab === 'expenses' && (
        <ExpensesFeed key={`expense-${date}`} date={date} locale={locale} t={t} />
      )}
      {tab === 'transfers' && (
        <TransfersFeed
          key={`transfer-${transferStatus}`}
          status={transferStatus}
          locale={locale}
          t={t}
        />
      )}
    </div>
  );
}

function IncomesFeed({ date, method, locale, t }) {
  const [cursor, setCursor] = useState();
  const [items, setItems] = useState([]);
  const query = useGetIncomesQuery({
    date,
    limit: 20,
    ...(method ? { method } : {}),
    ...(cursor ? { cursor } : {}),
  });

  useEffect(() => {
    if (!query.data) return;
    setItems((previous) => {
      const incoming = query.data.items ?? [];
      if (!cursor) return incoming;
      const map = new Map(previous.map((item) => [item.id, item]));
      incoming.forEach((item) => map.set(item.id, item));
      return [...map.values()];
    });
  }, [query.data, cursor]);

  return (
    <FeedShell
      loading={query.isLoading && !cursor && !items.length}
      error={query.isError && !cursor ? query.error : null}
      retry={query.refetch}
      t={t}
    >
      {items.length === 0 ? (
        <EmptyState title={t('records.noIncomes')} description={t('records.noIncomesHint')} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Banknote className="size-4 text-edge" aria-hidden="true" />
                    <p className="font-cairo text-sm font-bold">{t(`method.${item.method}`)}</p>
                    <Badge
                      tone={
                        item.verification === 'PENDING'
                          ? 'warning'
                          : item.verification === 'REJECTED'
                            ? 'danger'
                            : 'neutral'
                      }
                    >
                      {t(`verification.${item.verification}`)}
                    </Badge>
                  </div>
                  <p className="mt-1 font-tajawal text-xs text-navy/45">
                    {formatDateTime(item.recordedAt, locale)}
                  </p>
                </div>
                <p className="font-cairo text-base font-black">
                  {formatEgpWithCurrency(item.amount, locale)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
      <LoadMore
        hasMore={Boolean(query.data?.nextCursor)}
        loading={query.isFetching}
        onClick={() => setCursor(query.data.nextCursor)}
        label={t('common.loadMore')}
      />
    </FeedShell>
  );
}

function ExpensesFeed({ date, locale, t }) {
  const [cursor, setCursor] = useState();
  const [items, setItems] = useState([]);
  const query = useGetExpensesQuery({ date, limit: 20, ...(cursor ? { cursor } : {}) });

  useEffect(() => {
    if (!query.data) return;
    setItems((previous) => {
      const incoming = query.data.items ?? [];
      if (!cursor) return incoming;
      const map = new Map(previous.map((item) => [item.id, item]));
      incoming.forEach((item) => map.set(item.id, item));
      return [...map.values()];
    });
  }, [query.data, cursor]);

  return (
    <FeedShell
      loading={query.isLoading && !cursor && !items.length}
      error={query.isError && !cursor ? query.error : null}
      retry={query.refetch}
      t={t}
    >
      {items.length === 0 ? (
        <EmptyState title={t('records.noExpenses')} description={t('records.noExpensesHint')} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-cairo text-sm font-bold">{item.category?.name}</p>
                  <p className="mt-1 font-tajawal text-sm text-navy/60">{item.description}</p>
                  <p className="mt-1 font-tajawal text-xs text-navy/45">
                    {formatDateTime(item.recordedAt, locale)}
                  </p>
                </div>
                <p className="font-cairo text-base font-black">
                  {formatEgpWithCurrency(item.amount, locale)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
      <LoadMore
        hasMore={Boolean(query.data?.nextCursor)}
        loading={query.isFetching}
        onClick={() => setCursor(query.data.nextCursor)}
        label={t('common.loadMore')}
      />
    </FeedShell>
  );
}

function TransfersFeed({ status, locale, t }) {
  const [cursor, setCursor] = useState();
  const [items, setItems] = useState([]);
  const query = useGetTransfersQuery(
    { kind: 'HANDOVER', ...(status ? { status } : {}), limit: 20, ...(cursor ? { cursor } : {}) },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true },
  );

  useEffect(() => {
    if (!query.data) return;
    setItems((previous) => {
      const incoming = query.data.items ?? [];
      if (!cursor) return incoming;
      const map = new Map(previous.map((item) => [item.id, item]));
      incoming.forEach((item) => map.set(item.id, item));
      return [...map.values()];
    });
  }, [query.data, cursor]);

  return (
    <FeedShell
      loading={query.isLoading && !cursor && !items.length}
      error={query.isError && !cursor ? query.error : null}
      retry={query.refetch}
      t={t}
    >
      {items.length === 0 ? (
        <EmptyState title={t('records.noTransfers')} description={t('records.noTransfersHint')} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Send className="size-4 text-edge" aria-hidden="true" />
                    <p className="font-cairo text-sm font-bold">{t(`transferKind.${item.kind}`)}</p>
                    <Badge
                      tone={
                        item.status === 'CONFIRMED'
                          ? 'success'
                          : item.status === 'DISPUTED'
                            ? 'danger'
                            : item.status === 'PENDING'
                              ? 'warning'
                              : 'neutral'
                      }
                    >
                      {t(`transferStatus.${item.status}`)}
                    </Badge>
                  </div>
                  <p className="mt-1 font-tajawal text-xs text-navy/45">
                    {formatDateTime(item.createdAt, locale)}
                  </p>
                </div>
                <p className="font-cairo text-base font-black">
                  {formatEgpWithCurrency(item.amountSent, locale)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
      <LoadMore
        hasMore={Boolean(query.data?.nextCursor)}
        loading={query.isFetching}
        onClick={() => setCursor(query.data.nextCursor)}
        label={t('common.loadMore')}
      />
    </FeedShell>
  );
}

function FeedShell({ loading, error, retry, t, children }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-24" />
        ))}
      </div>
    );
  }
  if (error)
    return (
      <ErrorState
        title={t('errors.generic')}
        description={errorMessage(error, t)}
        onRetry={retry}
      />
    );
  return children;
}

function SelectFilter({ value, onChange, label, options }) {
  return (
    <label className="block">
      <span className="mb-2 block font-cairo text-sm font-semibold">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-base text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue || 'all'} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
