import { AlertTriangle, CloudOff, Coffee, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useGetAttendanceMeQuery, useGetMyScheduleQuery, useGetSettingsQuery } from '../../app/api';
import {
  breakAction,
  clockState,
  effectiveState,
  liveWorkedMinutes,
  nextAction,
  splitMinutes,
  weekBars,
} from '../../shared/lib/attendanceMath';
import { errorMessage } from '../../shared/lib/apiError';
import { newId } from '../../shared/lib/clientRequestId';
import { formatTime } from '../../shared/lib/date';
import { geoErrorKey, getCurrentPosition } from '../../shared/lib/geo';
import { canEnqueue, makeEntry } from '../../shared/lib/offlineQueue';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Card from '../../shared/ui/Card';
import ErrorState from '../../shared/ui/ErrorState';
import Modal from '../../shared/ui/Modal';
import PageHeader from '../../shared/ui/PageHeader';
import Skeleton from '../../shared/ui/Skeleton';
import { selectUser } from '../auth/authSelectors';
import SelfieCapture from './SelfieCapture';
import { useAttendanceSync } from './useAttendanceSync';

const consentKey = (userId) => `padel93.attendanceConsent.${userId}`;
const readConsent = (userId) => {
  try {
    return localStorage.getItem(consentKey(userId)) === '1';
  } catch {
    return false;
  }
};
const needsPhoto = (kind) => kind === 'clock-in' || kind === 'clock-out';

function Notice({ notice }) {
  if (!notice) return null;
  const tones = {
    success: 'bg-emerald-50 text-emerald-900',
    error: 'bg-red-50 text-red-800',
    info: 'bg-amber-50 text-amber-900',
  };
  return (
    <p
      className={`rounded-xl p-4 font-tajawal text-sm ${tones[notice.tone]}`}
      role={notice.tone === 'error' ? 'alert' : 'status'}
    >
      {notice.text}
    </p>
  );
}

function WeekBars({ days, locale, t }) {
  const bars = weekBars(days);
  return (
    <div
      className="flex items-end justify-between gap-1.5"
      role="img"
      aria-label={t('attendance.weekTitle')}
    >
      {bars.map((bar) => {
        const { hours, minutes } = splitMinutes(bar.minutes);
        const day = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
          new Date(`${bar.date}T00:00:00Z`),
        );
        return (
          <div key={bar.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="font-tajawal text-[11px] text-navy/55">
              {bar.minutes ? t('attendance.hm', { h: hours, m: minutes }) : ''}
            </span>
            <div className="flex h-24 w-full items-end rounded-lg bg-navy/[0.04]">
              <div
                className="w-full rounded-lg bg-edge"
                style={{ height: `${Math.max(bar.ratio * 100, bar.minutes ? 6 : 0)}%` }}
              />
            </div>
            <span className="font-cairo text-xs font-bold text-navy/70">{day}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AttendancePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const user = useSelector(selectUser);
  const userId = user?.id;

  const me = useGetAttendanceMeQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
    pollingInterval: 60_000,
  });
  const schedule = useGetMyScheduleQuery();
  const settings = useGetSettingsQuery();
  const sync = useAttendanceSync(userId);

  const [now, setNow] = useState(() => Date.now());
  const [flow, setFlow] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(timer);
  }, []);

  if (me.isLoading) return <Skeleton className="mx-auto h-80 max-w-xl" />;
  if (me.isError && !me.data) {
    return (
      <ErrorState
        title={t('errors.generic')}
        description={errorMessage(me.error, t)}
        onRetry={me.refetch}
      />
    );
  }

  const serverState = clockState(me.data);
  const state = effectiveState(
    serverState,
    sync.pending.map((e) => e.kind),
  );
  const worked = liveWorkedMinutes(me.data, me.fulfilledTimeStamp ?? now, now);
  const { hours, minutes } = splitMinutes(worked);
  const busy = flow !== null;
  const action = nextAction(state);
  const breakKind = breakAction(state);
  const open = me.data?.open;

  async function finish(kind, payload, photo) {
    setFlow({ kind, step: 'saving' });
    if (!canEnqueue([...sync.pending, ...sync.failed], userId)) {
      setFlow(null);
      setNotice({ tone: 'error', text: t('attendance.queueWaiting', { n: sync.pending.length }) });
      return;
    }
    const entry = makeEntry({ userId, kind, payload, photo, id: newId() });
    const result = await sync.enqueue(entry);
    setFlow(null);
    if (!result) {
      setNotice({ tone: 'success', text: t(`attendance.done.${kind}`) });
    } else if (result.state === 'failed') {
      setNotice({
        tone: 'error',
        text: errorMessage({ status: 422, data: { error: result.error } }, t),
      });
      await sync.dismiss(entry.id);
    } else {
      setNotice({ tone: 'info', text: t('attendance.savedOffline') });
    }
  }

  async function begin(kind) {
    setFlow({ kind, step: 'locating' });
    try {
      const position = await getCurrentPosition();
      setFlow({ kind, step: 'selfie', position });
    } catch (err) {
      setFlow(null);
      setNotice({ tone: 'error', text: t(geoErrorKey(err)) });
    }
  }

  async function tap(kind) {
    setNotice(null);
    if (!needsPhoto(kind)) {
      await finish(kind, {}, null);
    } else if (readConsent(userId)) {
      await begin(kind);
    } else {
      setFlow({ kind, step: 'consent' });
    }
  }

  function acceptConsent() {
    try {
      localStorage.setItem(consentKey(userId), '1');
    } catch {
      // Without storage the notice simply shows again next time.
    }
    begin(flow.kind);
  }

  const stateLabel = { OUT: 'stateOut', IN: 'stateIn', ON_BREAK: 'stateBreak' }[state];
  const shifts = schedule.data?.items ?? [];

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader title={t('attendance.title')} description={t('attendance.subtitle')} />
      <Notice notice={notice} />

      {(sync.pending.length > 0 || sync.failed.length > 0) && (
        <Card className="space-y-3 p-4">
          {sync.pending.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 font-cairo text-sm font-bold text-amber-900">
                <CloudOff className="size-4" aria-hidden="true" />
                {t('attendance.queueWaiting', { n: sync.pending.length })}
              </p>
              <Button variant="ghost" loading={sync.syncing} onClick={sync.sync}>
                <RefreshCw className="size-4" aria-hidden="true" />
                {sync.syncing ? t('attendance.syncing') : t('attendance.syncNow')}
              </Button>
            </div>
          )}
          {sync.stopped === 'auth' && (
            <p className="font-tajawal text-sm text-amber-900">{t('attendance.signInToSync')}</p>
          )}
          {sync.failed.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 font-cairo text-sm font-bold text-red-800">
                <AlertTriangle className="size-4" aria-hidden="true" />
                {t('attendance.failedTitle')}
              </p>
              {sync.failed.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-red-50 p-3"
                >
                  <p className="font-tajawal text-sm text-red-900">
                    {t('attendance.failedItem', {
                      kind: t(`attendance.kind.${entry.kind}`),
                      time: formatTime(entry.createdAt, locale),
                      reason: errorMessage({ status: 422, data: { error: entry.error } }, t),
                    })}
                  </p>
                  <Button
                    variant="ghost"
                    className="min-h-9 px-3 py-1"
                    onClick={() => sync.dismiss(entry.id)}
                  >
                    {t('attendance.dismiss')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-cairo text-xl font-black text-navy">
              {t(`attendance.${stateLabel}`)}
            </p>
            {open && (
              <p className="mt-1 font-tajawal text-sm text-navy/60">
                {t('attendance.since', { time: formatTime(open.clockInAt, locale) })}
              </p>
            )}
          </div>
          {open?.lateMinutes > 0 && (
            <Badge tone="warning">{t('attendance.late', { n: open.lateMinutes })}</Badge>
          )}
        </div>

        {open && (
          <div>
            <p className="font-tajawal text-xs text-navy/55">{t('attendance.worked')}</p>
            <p className="font-cairo text-4xl font-black tabular-nums text-navy">
              {t('attendance.hm', { h: hours, m: minutes })}
            </p>
          </div>
        )}

        {flow?.step === 'locating' && (
          <p className="font-tajawal text-sm text-navy/65" role="status">
            {t('attendance.locating')}
          </p>
        )}
        {flow?.step === 'saving' && (
          <p className="font-tajawal text-sm text-navy/65" role="status">
            {t('attendance.saving')}
          </p>
        )}

        <div className="space-y-2">
          <Button
            className="min-h-16 w-full text-lg"
            variant={action === 'clock-in' ? 'primary' : 'secondary'}
            disabled={busy}
            onClick={() => tap(action)}
          >
            {action === 'clock-in' ? (
              <LogIn className="size-5" aria-hidden="true" />
            ) : (
              <LogOut className="size-5" aria-hidden="true" />
            )}
            {t(action === 'clock-in' ? 'attendance.clockIn' : 'attendance.clockOut')}
          </Button>
          {breakKind && (
            <Button
              className="w-full"
              variant="ghost"
              disabled={busy}
              onClick={() => tap(breakKind)}
            >
              <Coffee className="size-4" aria-hidden="true" />
              {t(breakKind === 'break/start' ? 'attendance.startBreak' : 'attendance.endBreak')}
            </Button>
          )}
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-cairo text-base font-extrabold text-navy">
          {t('attendance.weekTitle')}
        </h2>
        {me.data?.week && <WeekBars days={me.data.week.days} locale={locale} t={t} />}
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-cairo text-base font-extrabold text-navy">
          {t('attendance.myShifts')}
        </h2>
        {shifts.length === 0 ? (
          <p className="font-tajawal text-sm text-navy/55">{t('attendance.noShifts')}</p>
        ) : (
          <ul className="space-y-2">
            {shifts.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl bg-navy/[0.03] px-4 py-3"
              >
                <span className="font-cairo text-sm font-bold text-navy">
                  {new Intl.DateTimeFormat(locale, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    timeZone: 'UTC',
                  }).format(new Date(`${s.date}T00:00:00Z`))}
                </span>
                <span className="font-tajawal text-sm tabular-nums text-navy/70" dir="ltr">
                  {s.startTime} - {s.endTime}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={flow?.step === 'consent'}
        onClose={() => setFlow(null)}
        title={t('attendance.consentTitle')}
      >
        <div className="space-y-4">
          <p className="font-tajawal text-sm leading-7 text-navy/75">
            {t('attendance.consentBody', { days: settings.data?.selfieRetentionDays ?? 90 })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFlow(null)}>
              {t('attendance.cancel')}
            </Button>
            <Button onClick={acceptConsent}>{t('attendance.consentAccept')}</Button>
          </div>
        </div>
      </Modal>

      <SelfieCapture
        open={flow?.step === 'selfie'}
        onCancel={() => setFlow(null)}
        onCapture={(blob) => finish(flow.kind, flow.position, blob)}
      />
    </div>
  );
}
