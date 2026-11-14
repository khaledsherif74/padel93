import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  useGetAttendanceBoardQuery,
  useGetAttendanceRecordsQuery,
  useGetPayrollRulesQuery,
  useUpdatePayrollRulesMutation,
} from '../../app/api';
import { splitMinutes } from '../../shared/lib/attendanceMath';
import { errorMessage } from '../../shared/lib/apiError';
import { businessDate, formatTime } from '../../shared/lib/date';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Card from '../../shared/ui/Card';
import ErrorState from '../../shared/ui/ErrorState';
import Input from '../../shared/ui/Input';
import PageHeader from '../../shared/ui/PageHeader';
import Skeleton from '../../shared/ui/Skeleton';
import { selectPermissions } from '../auth/authSelectors';
import AdjustModal from './AdjustModal';
import PhotoThumb from './PhotoThumb';

function Summary({ label, value, tone }) {
  return (
    <Card className="p-4">
      <p className="font-tajawal text-xs text-navy/55">{label}</p>
      <p className={`font-cairo text-3xl font-black tabular-nums ${tone ?? 'text-navy'}`}>{value}</p>
    </Card>
  );
}

function RulesCard({ t }) {
  const rules = useGetPayrollRulesQuery();
  const [save, state] = useUpdatePayrollRulesMutation();
  const [grace, setGrace] = useState('');
  const [saved, setSaved] = useState(false);
  const value = Number(grace);
  const valid = grace !== '' && Number.isInteger(value) && value >= 0 && value <= 120;

  async function submit(event) {
    event.preventDefault();
    if (!valid) return;
    setSaved(false);
    try {
      await save({ lateGraceMinutes: value }).unwrap();
      setSaved(true);
      setGrace('');
    } catch {
      // Shown below.
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <form className="space-y-3" onSubmit={submit}>
        <h2 className="font-cairo text-base font-extrabold text-navy">{t('attendance.rulesTitle')}</h2>
        <Input
          label={t('attendance.graceLabel')}
          hint={t('attendance.graceHint')}
          type="number"
          min="0"
          max="120"
          inputMode="numeric"
          value={grace}
          onChange={(e) => setGrace(e.target.value)}
          placeholder={rules.data ? String(rules.data.lateGraceMinutes) : ''}
        />
        {state.error && <p className="font-tajawal text-sm text-red-700" role="alert">{errorMessage(state.error, t)}</p>}
        {saved && <p className="font-tajawal text-sm text-emerald-800">{t('attendance.saved')}</p>}
        <Button type="submit" loading={state.isLoading} disabled={!valid}>
          {t('attendance.save')}
        </Button>
      </form>
    </Card>
  );
}

function RecordCard({ record, locale, t, canAdjust, onAdjust }) {
  const [showPhotos, setShowPhotos] = useState(false);
  const worked = splitMinutes(record.workedMinutes);
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-cairo text-base font-black text-navy">{record.userName}</p>
          <p className="font-tajawal text-sm tabular-nums text-navy/65">
            {t('attendance.inAt', { time: formatTime(record.clockInAt, locale) })}
            {' · '}
            {record.clockOutAt ? t('attendance.outAt', { time: formatTime(record.clockOutAt, locale) }) : t('attendance.stateIN')}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {record.status === 'NEEDS_REVIEW' && <Badge tone="danger">{record.reviewReason === 'MISSED_CLOCK_OUT' ? t('attendance.missedClockOut') : t('attendance.needsReview')}</Badge>}
          {record.lateMinutes > 0 && <Badge tone="warning">{t('attendance.late', { n: record.lateMinutes })}</Badge>}
          {(record.clockInSource === 'OFFLINE' || record.clockOutSource === 'OFFLINE') && <Badge tone="info">{t('attendance.offlineTap')}</Badge>}
          {record.adjusted && <Badge>{t('attendance.edited')}</Badge>}
        </div>
      </div>
      <p className="font-tajawal text-xs text-navy/60">
        {t('attendance.hm', { h: worked.hours, m: worked.minutes })}
        {record.breakMinutes > 0 && ` · ${t('attendance.breakMin', { m: record.breakMinutes })}`}
        {record.clockInDistanceM != null && ` · ${t('attendance.fromCourt', { m: Math.round(record.clockInDistanceM) })}`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" className="min-h-10 px-3 py-2" onClick={() => setShowPhotos((v) => !v)}>
          {t('attendance.selfieIn')} / {t('attendance.selfieOut')}
        </Button>
        {canAdjust && (
          <Button variant="ghost" className="min-h-10 px-3 py-2" onClick={() => onAdjust(record)}>
            <Pencil className="size-4" aria-hidden="true" />
            {t('attendance.adjust')}
          </Button>
        )}
      </div>
      {showPhotos && (
        <div className="flex flex-wrap gap-3">
          <PhotoThumb photoId={record.clockInPhotoId} label={t('attendance.selfieIn')} />
          <PhotoThumb photoId={record.clockOutPhotoId} label={t('attendance.selfieOut')} />
        </div>
      )}
    </Card>
  );
}

export default function AttendanceBoardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const permissions = useSelector(selectPermissions);
  const [date, setDate] = useState(() => businessDate());
  const [editing, setEditing] = useState(null);

  const board = useGetAttendanceBoardQuery(date, { pollingInterval: 60_000 });
  const records = useGetAttendanceRecordsQuery({ from: date, to: date });
  const canAdjust = permissions?.['attendance.adjust'] !== false;
  const canRules = permissions?.['payroll.manage'] !== false;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={t('attendance.boardTitle')} description={t('attendance.boardSubtitle')} />
      <Input label={t('attendance.date')} type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />

      {board.isLoading ? (
        <Skeleton className="h-40" />
      ) : board.isError ? (
        <ErrorState title={t('errors.generic')} description={errorMessage(board.error, t)} onRetry={board.refetch} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Summary label={t('attendance.summaryIn')} value={board.data.summary.in} tone="text-emerald-800" />
            <Summary label={t('attendance.summaryLate')} value={board.data.summary.late} tone="text-amber-800" />
            <Summary label={t('attendance.summaryNotIn')} value={board.data.summary.notIn} />
            <Summary label={t('attendance.summaryReview')} value={board.data.summary.review} tone={board.data.summary.review ? 'text-red-800' : undefined} />
          </div>
          <ul className="space-y-2">
            {board.data.items.map((item) => (
              <li key={item.userId}>
                <Card className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <div>
                    <p className="font-cairo text-base font-black text-navy">{item.name}</p>
                    <p className="font-tajawal text-xs text-navy/60" dir="auto">
                      {item.scheduled.length
                        ? item.scheduled.map((s) => t('attendance.scheduledAt', { start: s.startTime, end: s.endTime })).join(' · ')
                        : t('attendance.notScheduled')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={item.state === 'IN' ? 'success' : item.state === 'DONE' ? 'neutral' : 'warning'}>{t(`attendance.state${item.state}`)}</Badge>
                    {item.onBreak && <Badge tone="info">{t('attendance.onBreak')}</Badge>}
                    {item.lateMinutes > 0 && <Badge tone="warning">{t('attendance.late', { n: item.lateMinutes })}</Badge>}
                    {item.needsReview && <Badge tone="danger">{t('attendance.needsReview')}</Badge>}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <section className="space-y-3">
        <h2 className="font-cairo text-lg font-black text-navy">{t('attendance.recordsTitle')}</h2>
        {records.isLoading && <Skeleton className="h-28" />}
        {records.isError && <ErrorState title={t('errors.generic')} description={errorMessage(records.error, t)} onRetry={records.refetch} />}
        {records.data && records.data.items.length === 0 && (
          <p className="rounded-xl bg-navy/[0.03] p-4 text-center font-tajawal text-sm text-navy/55">{t('attendance.noRecords')}</p>
        )}
        {records.data?.items.map((record) => (
          <RecordCard key={record.id} record={record} locale={locale} t={t} canAdjust={canAdjust} onAdjust={setEditing} />
        ))}
      </section>

      {canRules && <RulesCard t={t} />}
      {editing && <AdjustModal key={editing.id} record={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
