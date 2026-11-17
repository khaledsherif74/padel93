import { Clock3, FileText, RefreshCw, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetFinanceStaffDailyHistoryQuery, useGetSettingsQuery } from '../../app/api';
import { businessDate, formatDateTime, formatTime } from '../../shared/lib/date';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import { errorMessage } from '../../shared/lib/apiError';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Card from '../../shared/ui/Card';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';
import PageHeader from '../../shared/ui/PageHeader';
import Skeleton from '../../shared/ui/Skeleton';

const STATUS_TONE = {
  OPEN: 'info',
  UNRECONCILED: 'neutral',
  GAP: 'danger',
  PARTIAL: 'danger',
  COVERED: 'warning',
  OK: 'success',
};

export default function StaffHistoryOverviewPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const settings = useGetSettingsQuery();
  const today = businessDate(undefined, settings.data?.closeTime ?? '04:00');
  const [date, setDate] = useState('');
  const selectedDate = date || today;
  const history = useGetFinanceStaffDailyHistoryQuery(selectedDate, {
    pollingInterval: 30_000,
    refetchOnFocus: true,
  });
  const money = (value) => formatEgpWithCurrency(value ?? 0, locale);

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-5 font-inter text-[#0E1B2B]">
      <PageHeader
        eyebrow={t('accountant.navSection')}
        title={t('accountant.staffHistoryTitle')}
        description={t('accountant.staffHistoryDailyHint')}
        actions={
          <Button variant="ghost" onClick={history.refetch}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {t('common.refresh')}
          </Button>
        }
      />

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label htmlFor="staff-history-date" className="mb-1 block font-cairo text-xs font-bold text-[#4A5A70]">
            {t('accountant.historyBusinessDate')}
          </label>
          <input
            id="staff-history-date"
            type="date"
            value={selectedDate}
            max={today}
            onChange={(event) => setDate(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-[#D5DDE7] bg-white px-3 font-inter text-sm text-[#002346] outline-none focus:border-[#01649B] focus:ring-2 focus:ring-[#01649B]/15 sm:w-auto"
          />
        </div>
        <p className="font-tajawal text-xs leading-5 text-[#64748B]">
          {t('accountant.staffHistoryNoteMeaning')}
        </p>
      </Card>

      {history.isLoading ? (
        <div className="space-y-3"><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
      ) : history.isError ? (
        <ErrorState
          title={t('errors.generic')}
          description={errorMessage(history.error, t)}
          onRetry={history.refetch}
        />
      ) : (history.data?.items ?? []).length === 0 ? (
        <EmptyState title={t('accountant.noStaff')} description={t('accountant.staffHistoryNoStaff')} />
      ) : (
        <div className="space-y-3">
          {(history.data.items ?? []).map((person) => (
            <Card key={person.id} className="overflow-hidden p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <h2 className="truncate font-cairo text-base font-extrabold text-[#002346]">{person.name}</h2>
                  <p className="mt-0.5 font-tajawal text-xs text-[#64748B]">@{person.username}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!person.isActive && <Badge>{t('owner.inactive')}</Badge>}
                  <Badge tone={person.shifts.length ? 'info' : 'neutral'}>
                    {t('accountant.historyShiftCount', { count: person.shifts.length })}
                  </Badge>
                </div>
              </div>

              {person.shifts.length === 0 ? (
                <p className="px-4 py-5 font-tajawal text-sm text-[#64748B] sm:px-5">
                  {t('accountant.staffHistoryNoShift')}
                </p>
              ) : (
                <div className="divide-y divide-[#E8EDF3]">
                  {person.shifts.map((shift) => (
                    <ShiftSummary key={shift.id} shift={shift} money={money} locale={locale} t={t} />
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ShiftSummary({ shift, money, locale, t }) {
  const statusKey = shift.reconciliationStatus;
  const variance = shift.variance;
  const amountText = (value) => money(value ?? 0);

  return (
    <section className="space-y-4 bg-white p-4 sm:p-5" aria-label={t('accountant.shiftSummary')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Clock3 className="size-4 text-[#0B3B6E]" aria-hidden="true" />
            <p className="font-cairo text-sm font-extrabold text-[#002346]">
              {t('accountant.shiftOpenedAt', { time: formatTime(shift.openedAt, locale) })}
            </p>
            <span className="text-[#A0AAB8]">·</span>
            <p className="font-cairo text-sm font-semibold text-[#4A5A70]">
              {shift.closedAt
                ? t('accountant.shiftClosedAt', { time: formatTime(shift.closedAt, locale) })
                : t('accountant.shiftStillOpen')}
            </p>
          </div>
          <p className="font-tajawal text-xs text-[#8593A6]">
            {formatDateTime(shift.openedAt, locale)}
          </p>
        </div>
        <Badge tone={STATUS_TONE[statusKey] ?? 'neutral'}>
          {t(`accountant.reconciliation.${statusKey}`)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MoneyStat icon={WalletCards} label={t('accountant.shiftMoneyTotal')} value={amountText(shift.money.total)} />
        <MoneyStat label={t('method.CASH')} value={amountText(shift.money.cash)} />
        <MoneyStat label={t('method.VISA')} value={amountText(shift.money.visa)} />
        <MoneyStat label={t('method.INSTAPAY')} value={amountText(shift.money.instapay)} />
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#F3F5F9] p-3 sm:grid-cols-4">
        <Value label={t('accountant.shiftExpected')} value={amountText(shift.expectedCash)} />
        <Value label={t('accountant.shiftCounted')} value={shift.countedCash == null ? '—' : amountText(shift.countedCash)} />
        <Value label={t('accountant.shiftVariance')} value={variance == null ? '—' : amountText(variance)} tone={variance < 0 ? 'danger' : variance > 0 ? 'success' : 'default'} />
        <Value label={t('accountant.notaEntered')} value={amountText(shift.notaAmount)} />
      </div>

      {(shift.coveredAmount > 0 || shift.uncoveredAmount > 0) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {shift.coveredAmount > 0 && (
            <div className="rounded-xl border border-[#F4D58B] bg-[#FFF8E8] px-3 py-2.5">
              <p className="text-xs font-bold text-[#8A5A00]">{t('accountant.notaCoveredGap')}</p>
              <p className="mt-1 font-cairo text-base font-extrabold tabular-nums text-[#8A5A00]">{amountText(shift.coveredAmount)}</p>
            </div>
          )}
          {shift.uncoveredAmount > 0 && (
            <div className="rounded-xl border border-[#F1B8BA] bg-[#FFF1F1] px-3 py-2.5">
              <p className="text-xs font-bold text-[#B4232C]">{t('accountant.uncoveredGap')}</p>
              <p className="mt-1 font-cairo text-base font-extrabold tabular-nums text-[#B4232C]">{amountText(shift.uncoveredAmount)}</p>
            </div>
          )}
        </div>
      )}

      {shift.notas.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#4A5A70]">
            <FileText className="size-4" aria-hidden="true" />
            <p className="font-cairo text-xs font-extrabold">{t('accountant.linkedNotas')}</p>
          </div>
          <ul className="space-y-1.5">
            {shift.notas.map((nota) => (
              <li key={nota.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#FFF8E8] px-3 py-2 text-xs text-[#75500D]">
                <span className="min-w-0">{nota.ownerName}{nota.note ? ` · ${nota.note}` : ''}</span>
                <span className="shrink-0 font-bold tabular-nums">{amountText(nota.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {shift.notaAmount > 0 && (
        <p className="font-tajawal text-[11px] leading-5 text-[#8A5A00]">
          {t('accountant.notaIsAttributionOnly')}
        </p>
      )}
    </section>
  );
}

function MoneyStat({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 py-3">
      <div className="flex items-center gap-1.5 text-[#64748B]">
        {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
        <span className="truncate font-tajawal text-[11px] font-semibold">{label}</span>
      </div>
      <p className="mt-1 break-words font-cairo text-sm font-extrabold tabular-nums text-[#002346]">{value}</p>
    </div>
  );
}

function Value({ label, value, tone = 'default' }) {
  const color = tone === 'danger' ? 'text-[#B4232C]' : tone === 'success' ? 'text-[#426B15]' : 'text-[#002346]';
  return (
    <div className="min-w-0">
      <p className="font-tajawal text-[11px] text-[#64748B]">{label}</p>
      <p className={`mt-1 break-words font-cairo text-sm font-extrabold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
