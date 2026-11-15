import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { useGetFinanceStaffBoardQuery } from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Card from '../../shared/ui/Card';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';
import PageHeader from '../../shared/ui/PageHeader';
import Skeleton from '../../shared/ui/Skeleton';
import StatCard from '../../shared/ui/StatCard';

function Figure({ label, value, danger = false }) {
  return (
    <div className="min-w-0">
      <p className="font-tajawal text-xs text-navy/55">{label}</p>
      <p className={`font-cairo text-base font-black ${danger ? 'text-red-700' : 'text-navy'}`}>
        {value}
      </p>
    </div>
  );
}

export default function StaffBoardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const board = useGetFinanceStaffBoardQuery(undefined, {
    pollingInterval: 30_000,
    refetchOnFocus: true,
  });
  const money = (n) => formatEgpWithCurrency(n ?? 0, locale);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={t('accountant.navSection')}
        title={t('accountant.staffBoardTitle')}
        description={t('accountant.staffBoardHint')}
        actions={
          <Button variant="ghost" onClick={board.refetch}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {t('common.refresh')}
          </Button>
        }
      />
      {board.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : board.isError ? (
        <ErrorState
          title={t('errors.generic')}
          description={errorMessage(board.error, t)}
          onRetry={board.refetch}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              tone="navy"
              label={t('accountant.drawerTotal')}
              value={money(board.data.drawer)}
              hint={t('accountant.drawerTotalHint')}
            />
          </div>
          {board.data.items.length === 0 ? (
            <EmptyState
              title={t('accountant.noStaff')}
              description={t('accountant.staffBoardHint')}
            />
          ) : (
            <ul className="space-y-3">
              {board.data.items.map((person) => (
                <li key={person.id}>
                  <Card className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="font-cairo text-lg font-extrabold text-navy">{person.name}</p>
                        {person.openShift && (
                          <Badge tone="success">{t('accountant.openShiftBadge')}</Badge>
                        )}
                      </div>
                      <Link
                        to={`/app/accountant/staff/${person.id}`}
                        className="inline-flex min-h-11 items-center font-cairo text-sm font-bold text-edge outline-none focus-visible:ring-2 focus-visible:ring-edge"
                      >
                        {t('accountant.viewHistory')}
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <Figure
                        label={t('accountant.collectedToday')}
                        value={money(person.collectedToday)}
                      />
                      <Figure label={t('accountant.cashToday')} value={money(person.cashToday)} />
                      <Figure
                        label={t('accountant.handedOverToday')}
                        value={money(person.handedOverToday)}
                      />
                      <Figure
                        label={t('accountant.receivedToday')}
                        value={money(person.receivedToday)}
                      />
                      <Figure
                        label={t('accountant.unhandedToday')}
                        value={money(person.unhandedToday)}
                      />
                      <Figure
                        label={t('accountant.pendingHandovers')}
                        value={`${person.pendingHandovers.count} · ${money(person.pendingHandovers.amount)}`}
                      />
                      <Figure
                        label={t('accountant.handoverDifference')}
                        value={money(person.handoverDifference)}
                        danger={person.handoverDifference !== 0}
                      />
                    </div>
                    {person.editsToday > 0 && (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 font-tajawal text-sm text-amber-900">
                        {t('accountant.editsToday', { count: person.editsToday })}
                      </p>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
