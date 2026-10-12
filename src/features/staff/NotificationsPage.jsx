import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetNotificationsQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation } from '../../app/api';
import { formatDateTime } from '../../shared/lib/date';
import { errorMessage } from '../../shared/lib/apiError';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import Skeleton from '../../shared/ui/Skeleton';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const [cursor, setCursor] = useState();
  const [items, setItems] = useState([]);
  const query = useGetNotificationsQuery({ unread: 'true', limit: 30, ...(cursor ? { cursor } : {}) });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll, allState] = useMarkAllNotificationsReadMutation();

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

  // The bell is designed for the latest unread items; this page focuses on the same feed.
  if (query.isLoading && !cursor) {
    return <div className="mx-auto max-w-4xl space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-28" />)}</div>;
  }

  if (query.isError && !cursor) {
    return <ErrorState title={t('errors.generic')} description={errorMessage(query.error, t)} onRetry={query.refetch} />;
  }

  const currentItems = cursor ? items : query.data?.items ?? [];
  const merged = cursor ? items : query.data?.items ?? items;
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

  async function read(id) {
    try {
      await markRead(id).unwrap();
      setItems((previous) => previous.filter((item) => item.id !== id));
    } catch {
      // Keep the item visible when the write fails.
    }
  }

  async function readAll() {
    try {
      await markAll().unwrap();
      setItems([]);
      setCursor(undefined);
    } catch {
      // Mutation state below is enough for the user to retry.
    }
  }

  const rows = merged.length ? merged : currentItems;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={t('notifications.eyebrow')}
        title={t('notifications.title')}
        description={t('notifications.pageDescription')}
        actions={
          <Button variant="ghost" onClick={readAll} loading={allState.isLoading} disabled={!rows.length}>
            <CheckCheck className="size-4" aria-hidden="true" />
            {t('notifications.markAll')}
          </Button>
        }
      />

      {!rows.length ? (
        <EmptyState title={t('notifications.empty')} description={t('notifications.emptyHint')} />
      ) : (
        <div className="space-y-3">
          {rows.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ball text-ball">
                  <Bell className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-cairo text-base font-bold">{item.title}</h2>
                    <span className="font-tajawal text-[11px] text-navy/40">{formatDateTime(item.createdAt, locale)}</span>
                  </div>
                  <p className="mt-2 font-tajawal text-sm leading-7 text-navy/65">{item.body}</p>
                  <Button variant="ghost" className="mt-2 px-0" onClick={() => read(item.id)}>
                    {t('notifications.markRead')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {query.data?.nextCursor && (
        <div className="flex justify-center">
          <Button variant="ghost" loading={query.isFetching} onClick={() => setCursor(query.data.nextCursor)}>
            {t('common.loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}
