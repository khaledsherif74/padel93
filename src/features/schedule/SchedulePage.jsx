import { ChevronLeft, ChevronRight, Copy, Plus, Send } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCopyScheduleWeekMutation, useGetScheduleQuery, usePublishScheduleMutation } from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import { businessDate } from '../../shared/lib/date';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Card from '../../shared/ui/Card';
import ErrorState from '../../shared/ui/ErrorState';
import PageHeader from '../../shared/ui/PageHeader';
import Skeleton from '../../shared/ui/Skeleton';
import ShiftModal from './ShiftModal';
import { groupByUserAndDate, isOvernight, shiftHours, weekDates, weekStart } from './scheduleGrid';

export default function SchedulePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const today = businessDate();
  const [start, setStart] = useState(() => weekStart(today));
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState(null);

  const schedule = useGetScheduleQuery({ from: start, days: 7 });
  const [publish, publishState] = usePublishScheduleMutation();
  const [copyWeek, copyState] = useCopyScheduleWeekMutation();

  const dates = weekDates(start);
  const shift = (days) => setStart(DateTime.fromISO(start, { zone: 'utc' }).plus({ days }).toISODate());
  const drafts = schedule.data?.items.filter((s) => !s.published).length ?? 0;

  async function doPublish() {
    setNotice(null);
    try {
      const res = await publish({ from: start, days: 7 }).unwrap();
      setNotice({ tone: 'success', text: res.published ? t('attendance.publishedCount', { n: res.published }) : t('attendance.nothingToPublish') });
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err, t) });
    }
  }

  async function doCopy() {
    setNotice(null);
    try {
      const prev = DateTime.fromISO(start, { zone: 'utc' }).minus({ days: 7 }).toISODate();
      const res = await copyWeek({ fromStart: prev, toStart: start }).unwrap();
      setNotice({ tone: 'success', text: t('attendance.copied', { created: res.created, skipped: res.skipped }) });
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err, t) });
    }
  }

  const dayHead = (d) => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));
  const grid = groupByUserAndDate(schedule.data?.items ?? []);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('attendance.scheduleTitle')}
        description={t('attendance.scheduleSubtitle')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" loading={copyState.isLoading} onClick={doCopy}>
              <Copy className="size-4" aria-hidden="true" />
              {t('attendance.copyPrev')}
            </Button>
            <Button loading={publishState.isLoading} disabled={drafts === 0} onClick={doPublish}>
              <Send className="size-4" aria-hidden="true" />
              {t('attendance.publish')}
              {drafts > 0 && ` (${drafts})`}
            </Button>
          </div>
        }
      />

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" aria-label={t('attendance.prevWeek')} onClick={() => shift(-7)}>
          <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
        </Button>
        <button type="button" className="font-cairo text-sm font-bold text-edge outline-none focus-visible:ring-2 focus-visible:ring-edge" onClick={() => setStart(weekStart(today))}>
          {dayHead(dates[0])} → {dayHead(dates[6])} · {t('attendance.thisWeek')}
        </button>
        <Button variant="ghost" aria-label={t('attendance.nextWeek')} onClick={() => shift(7)}>
          <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
        </Button>
      </div>

      {notice && (
        <p className={`rounded-xl p-4 font-tajawal text-sm ${notice.tone === 'error' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-900'}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}

      {schedule.isLoading ? (
        <Skeleton className="h-64" />
      ) : schedule.isError ? (
        <ErrorState title={t('errors.generic')} description={errorMessage(schedule.error, t)} onRetry={schedule.refetch} />
      ) : schedule.data.staff.length === 0 ? (
        <p className="rounded-xl bg-navy/[0.03] p-4 text-center font-tajawal text-sm text-navy/55">{t('attendance.noStaff')}</p>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-start">
            <thead>
              <tr className="border-b border-navy/10">
                <th className="p-3 text-start font-cairo text-xs font-bold text-navy/60">{t('attendance.person')}</th>
                {dates.map((d) => (
                  <th key={d} className={`p-3 text-start font-cairo text-xs font-bold ${d === today ? 'text-edge' : 'text-navy/60'}`}>
                    {dayHead(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.data.staff.map((person) => {
                const total = Object.values(grid[person.id] ?? {}).flat().reduce((sum, s) => sum + shiftHours(s.startTime, s.endTime), 0);
                return (
                  <tr key={person.id} className="border-b border-navy/5 align-top">
                    <th scope="row" className="p-3 text-start font-cairo text-sm font-bold text-navy">
                      {person.name}
                      <span className="block font-tajawal text-xs font-normal text-navy/55">{total ? `${total} h` : ''}</span>
                    </th>
                    {dates.map((d) => {
                      const past = d < today;
                      const cell = grid[person.id]?.[d] ?? [];
                      return (
                        <td key={d} className="p-2">
                          <div className="space-y-1">
                            {cell.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                disabled={past}
                                onClick={() => setModal(s)}
                                className={`block w-full rounded-lg border px-2 py-1.5 text-start font-tajawal text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-edge disabled:cursor-default ${
                                  s.published ? 'border-edge/30 bg-edge/10 text-navy' : 'border-dashed border-amber-500 bg-amber-50 text-amber-900'
                                }`}
                                dir="ltr"
                              >
                                {s.startTime}-{s.endTime}
                                {isOvernight(s.startTime, s.endTime) && <span className="ms-1 opacity-60">+1</span>}
                                {!s.published && <Badge tone="warning" className="ms-1 px-1.5 py-0 text-[10px]">{t('attendance.draft')}</Badge>}
                              </button>
                            ))}
                            {!past && (
                              <button
                                type="button"
                                aria-label={`${t('attendance.addShift')}: ${person.name} ${dayHead(d)}`}
                                onClick={() => setModal({ userId: person.id, date: d })}
                                className="flex min-h-8 w-full items-center justify-center rounded-lg text-navy/35 outline-none hover:bg-navy/5 hover:text-navy focus-visible:ring-2 focus-visible:ring-edge"
                              >
                                <Plus className="size-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {modal && (
        <ShiftModal
          key={modal.id ?? `${modal.userId}-${modal.date}`}
          shift={modal}
          staff={schedule.data?.staff ?? []}
          dates={dates}
          locale={locale}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
