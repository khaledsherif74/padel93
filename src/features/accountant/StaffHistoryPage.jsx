import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetFinanceStaffHistoryQuery } from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import { splitMinutes } from '../../shared/lib/attendanceMath';
import { formatDateTime, formatTime } from '../../shared/lib/date';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import Badge from '../../shared/ui/Badge';
import Card from '../../shared/ui/Card';
import ErrorState from '../../shared/ui/ErrorState';
import PageHeader from '../../shared/ui/PageHeader';
import Skeleton from '../../shared/ui/Skeleton';

function Section({ title, children, empty, isEmpty }) {
  return (
    <section className="space-y-3">
      <h2 className="font-cairo text-lg font-black text-navy">{title}</h2>
      {isEmpty ? (
        <p className="rounded-xl bg-navy/[0.03] p-4 text-center font-tajawal text-sm text-navy/55">{empty}</p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </section>
  );
}

export default function StaffHistoryPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const history = useGetFinanceStaffHistoryQuery(id);
  const money = (n) => formatEgpWithCurrency(n ?? 0, locale);

  if (history.isLoading) return <Skeleton className="mx-auto h-64 max-w-3xl" />;
  if (history.isError) {
    return (
      <ErrorState
        title={t('errors.generic')}
        description={errorMessage(history.error, t)}
        onRetry={history.refetch}
      />
    );
  }
  const { staff, shifts, handovers, edits, days } = history.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/app/accountant/staff"
        className="inline-flex min-h-11 items-center font-cairo text-sm font-bold text-edge outline-none focus-visible:ring-2 focus-visible:ring-edge"
      >
        {t('common.back')}
      </Link>
      <PageHeader
        eyebrow={t('accountant.historyTitle')}
        title={staff.name}
        description={t('accountant.historyHint', { days })}
      />

      <Section title={t('accountant.historyShifts')} empty={t('accountant.noRows')} isEmpty={shifts.length === 0}>
        {shifts.map((shift) => (
          <li key={shift.id}>
            <Card className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-tajawal text-sm text-navy">{formatDateTime(shift.openedAt, locale)}</p>
                <Badge tone={shift.status === 'OPEN' ? 'success' : 'neutral'}>
                  {t(`accountant.shiftStatus.${shift.status}`)}
                </Badge>
              </div>
              {shift.closedAt && (
                <p className="font-tajawal text-xs text-navy/55">
                  {t('accountant.closedAt')}: {formatDateTime(shift.closedAt, locale)}
                </p>
              )}
              <p className="font-cairo text-sm font-bold text-navy">
                {t('accountant.shiftExpected')}: {money(shift.expectedCash)}
                {shift.variance ? ` · ${t('accountant.shiftVariance')}: ${money(shift.variance)}` : ''}
              </p>
            </Card>
          </li>
        ))}
      </Section>

      <Section title={t('accountant.historyHandovers')} empty={t('accountant.noRows')} isEmpty={handovers.length === 0}>
        {handovers.map((h) => (
          <li key={h.id}>
            <Card className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-cairo text-sm font-bold text-navy">
                  {money(h.amountSent)}
                  {h.amountReceived != null && h.amountReceived !== h.amountSent
                    ? ` → ${money(h.amountReceived)}`
                    : ''}
                </p>
                <Badge tone={h.status === 'CONFIRMED' ? 'success' : h.status === 'PENDING' ? 'warning' : 'danger'}>
                  {t(`accountant.transferStatus.${h.status}`)}
                </Badge>
              </div>
              <p className="font-tajawal text-xs text-navy/55">{formatDateTime(h.createdAt, locale)}</p>
              {h.responseNote && <p className="font-tajawal text-xs text-navy/70">{h.responseNote}</p>}
            </Card>
          </li>
        ))}
      </Section>

      <Section title={t('accountant.historyEdits')} empty={t('accountant.noRows')} isEmpty={edits.length === 0}>
        {edits.map((edit) => (
          <li key={edit.id}>
            <Card className="space-y-1 p-3">
              <p className="font-cairo text-sm font-bold text-navy">
                {t(`method.${edit.before.method}`)} {money(edit.before.amount)} → {t(`method.${edit.after.method}`)}{' '}
                {money(edit.after.amount)}
              </p>
              <p className="font-tajawal text-xs text-navy/70">{t('staff.revisionReason', { reason: edit.reason })}</p>
              <p className="font-tajawal text-xs text-navy/45">{formatDateTime(edit.createdAt, locale)}</p>
            </Card>
          </li>
        ))}
      </Section>

      <section className="space-y-2">
        <h2 className="font-cairo text-lg font-black text-navy">{t('accountant.historyAttendance')}</h2>
        {(history.data.attendance ?? []).length === 0 ? (
          <p className="rounded-xl bg-navy/[0.03] p-4 text-center font-tajawal text-sm text-navy/55">{t('attendance.historyEmpty')}</p>
        ) : (
          <ul className="space-y-2">
            {history.data.attendance.map((rec) => {
              const w = splitMinutes(rec.workedMinutes);
              return (
                <li key={rec.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <div>
                      <p className="font-cairo text-sm font-bold text-navy">{rec.businessDate}</p>
                      <p className="font-tajawal text-xs tabular-nums text-navy/65">
                        {t('attendance.inAt', { time: formatTime(rec.clockInAt, locale) })} ·{' '}
                        {rec.clockOutAt ? t('attendance.outAt', { time: formatTime(rec.clockOutAt, locale) }) : t('attendance.stateIN')} ·{' '}
                        {t('attendance.hm', { h: w.hours, m: w.minutes })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {rec.status === 'NEEDS_REVIEW' && <Badge tone="danger">{t('attendance.needsReview')}</Badge>}
                      {rec.lateMinutes > 0 && <Badge tone="warning">{t('attendance.late', { n: rec.lateMinutes })}</Badge>}
                      {rec.adjusted && <Badge>{t('attendance.edited')}</Badge>}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
