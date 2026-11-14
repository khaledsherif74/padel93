import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetFinanceEditsQuery } from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import { formatDateTime } from '../../shared/lib/date';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import Card from '../../shared/ui/Card';
import ErrorState from '../../shared/ui/ErrorState';
import Skeleton from '../../shared/ui/Skeleton';
import DateAccessRequestsPage from './DateAccessRequestsPage';
import HandoverInboxPage from './HandoverInboxPage';

function EditsFeed() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const feed = useGetFinanceEditsQuery(undefined, {
    pollingInterval: 30_000,
    refetchOnFocus: true,
  });
  const money = (n) => formatEgpWithCurrency(n ?? 0, locale);

  if (feed.isLoading) return <Skeleton className="h-24 w-full" />;
  if (feed.isError) {
    return (
      <ErrorState
        title={t('errors.generic')}
        description={errorMessage(feed.error, t)}
        onRetry={feed.refetch}
      />
    );
  }
  if (feed.data.items.length === 0) {
    return (
      <p className="rounded-xl bg-navy/[0.03] p-4 text-center font-tajawal text-sm text-navy/55">
        {t('accountant.noEdits')}
      </p>
    );
  }
  return (
    <ul className="mx-auto max-w-3xl space-y-3">
      {feed.data.items.map((edit) => (
        <li key={edit.id}>
          <Card className="space-y-1 p-4">
            <p className="font-cairo text-sm font-extrabold text-navy">{edit.staff?.name}</p>
            <p className="font-cairo text-sm font-bold text-navy">
              {t(`method.${edit.before.method}`)} {money(edit.before.amount)} →{' '}
              {t(`method.${edit.after.method}`)} {money(edit.after.amount)}
            </p>
            <p className="font-tajawal text-sm text-navy/75">
              {t('staff.revisionReason', { reason: edit.reason })}
            </p>
            <p className="font-tajawal text-xs text-navy/45">
              {formatDateTime(edit.createdAt, locale)}
            </p>
          </Card>
        </li>
      ))}
    </ul>
  );
}

const TABS = [
  { id: 'handovers', key: 'accountant.tabHandovers', Component: HandoverInboxPage },
  { id: 'access', key: 'accountant.tabAccess', Component: DateAccessRequestsPage },
  { id: 'edits', key: 'accountant.tabEdits', Component: EditsFeed },
];

export default function RequestsInboxPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState('handovers');
  const Active = TABS.find((tab) => tab.id === active).Component;

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label={t('accountant.navInbox')}
        className="mx-auto flex max-w-3xl gap-2 overflow-x-auto pb-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={`min-h-11 shrink-0 rounded-full border px-4 font-cairo text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-edge ${active === tab.id ? 'border-navy bg-navy text-white' : 'border-navy/15 bg-white text-navy'}`}
          >
            {t(tab.key)}
          </button>
        ))}
      </div>
      <Active />
    </div>
  );
}
