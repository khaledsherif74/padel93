import { useTranslation } from 'react-i18next';
import {
  useDecideStaffDateAccessRequestMutation,
  useGetPendingStaffDateAccessRequestsQuery,
} from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import { formatDateTime } from '../../shared/lib/date';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Card from '../../shared/ui/Card';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';
import PageHeader from '../../shared/ui/PageHeader';
import Skeleton from '../../shared/ui/Skeleton';

export default function DateAccessRequestsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const list = useGetPendingStaffDateAccessRequestsQuery(undefined, {
    pollingInterval: 20_000,
    refetchOnFocus: true,
  });
  const [decide, state] = useDecideStaffDateAccessRequestMutation();
  const items = list.data?.items ?? [];

  async function submit(id, decision) {
    try {
      await decide({ id, decision }).unwrap();
    } catch {
      // The mutation error is rendered under the list.
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={t('accountant.navSection')}
        title={t('accountant.dateAccessRequests')}
        description={t('accountant.dateAccessRequestsHint')}
      />
      {list.isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : list.isError ? (
        <ErrorState
          title={t('errors.generic')}
          description={errorMessage(list.error, t)}
          onRetry={list.refetch}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={t('accountant.noDateAccessRequests')}
          description={t('accountant.dateAccessRequestsHint')}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((request) => (
            <li key={request.id}>
              <Card className="space-y-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-cairo text-base font-extrabold text-navy">
                    {request.staff?.name}
                  </p>
                  <Badge tone={request.kind === 'EDIT' ? 'warning' : 'info'}>
                    {t(`accountant.accessKind.${request.kind}`)}
                  </Badge>
                  <span className="font-tajawal text-sm text-navy/60">{request.businessDate}</span>
                </div>
                <p className="font-tajawal text-sm leading-6 text-navy/75">{request.reason}</p>
                <p className="font-tajawal text-xs text-navy/45">
                  {formatDateTime(request.createdAt, locale)}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => submit(request.id, 'REJECTED')}
                    disabled={state.isLoading}
                  >
                    {t('accountant.reject')}
                  </Button>
                  <Button onClick={() => submit(request.id, 'APPROVED')} loading={state.isLoading}>
                    {t('accountant.approve')}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {state.error && (
        <p className="font-tajawal text-sm text-red-700" role="alert">
          {errorMessage(state.error, t)}
        </p>
      )}
    </div>
  );
}
