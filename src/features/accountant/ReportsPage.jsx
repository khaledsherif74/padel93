import { BarChart3, Download, RefreshCw, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  useGetDayReportQuery,
  useGetMonthReportQuery,
  useGetYearReportQuery,
} from '../../app/api';
import { businessDate, currentMonth } from '../../shared/lib/date';
import { formatEgp, formatEgpWithCurrency } from '../../shared/lib/money';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import KpiCard from '../../shared/ui/KpiCard';
import Skeleton from '../../shared/ui/Skeleton';
import ErrorState from '../../shared/ui/ErrorState';
import { downloadCsv } from '../../shared/lib/csv';

const REPORTS = ['day', 'month', 'year'];

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const today = businessDate();
  const [tab, setTab] = useState('day');
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(currentMonth());
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const day = useGetDayReportQuery(date, { skip: tab !== 'day' });
  const monthly = useGetMonthReportQuery(month, { skip: tab !== 'month' });
  const yearly = useGetYearReportQuery(year, { skip: tab !== 'year' });

  const activeQuery = tab === 'day' ? day : tab === 'month' ? monthly : yearly;
  const activeData = activeQuery.data;

  function exportCurrent() {
    if (!activeData) return;
    const rows = buildExportRows(tab, activeData);
    downloadCsv(`padel93-${tab}-${tab === 'day' ? date : tab === 'month' ? month : year}.csv`, rows);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={t('accountant.reportsEyebrow')}
        title={t('accountant.reportsTitle')}
        description={t('accountant.reportsDescription')}
        actions={<Button variant="ghost" disabled={!activeData} onClick={exportCurrent}><Download className="size-4" aria-hidden="true" />{t('accountant.exportCsv')}</Button>}
      />

      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-navy p-1.5">
        {REPORTS.map((value) => <button key={value} type="button" onClick={() => setTab(value)} className={`min-h-11 rounded-xl px-4 font-cairo text-sm font-bold ${tab === value ? 'bg-ball text-navy' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>{t(`accountant.reportTabs.${value}`)}</button>)}
      </div>

      <Card className="p-5">
        {tab === 'day' && <FilterInput type="date" value={date} onChange={setDate} label={t('accountant.reportDate')} />}
        {tab === 'month' && <FilterInput type="month" value={month} onChange={setMonth} label={t('accountant.reportMonth')} />}
        {tab === 'year' && <FilterInput type="number" value={year} onChange={setYear} label={t('accountant.reportYear')} min="2020" max="2100" />}
      </Card>

      {activeQuery.isLoading ? <ReportSkeleton /> : activeQuery.isError ? <ErrorState title={t('errors.generic')} description={t('accountant.reportLoadError')} onRetry={activeQuery.refetch} /> : activeData ? <ReportContent tab={tab} data={activeData} locale={locale} t={t} /> : null}
    </div>
  );
}

function FilterInput({ type, value, onChange, label, min, max }) {
  return (
    <label className="block max-w-xs">
      <span className="mb-2 block font-cairo text-sm font-semibold text-navy">{label}</span>
      <input type={type} value={value} min={min} max={max} onChange={(event) => onChange(event.target.value)} className="min-h-12 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-base text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15" />
    </label>
  );
}

function ReportContent({ tab, data, locale, t }) {
  if (tab === 'day') return <DayReport data={data} locale={locale} t={t} />;
  if (tab === 'month') return <MonthReport data={data} locale={locale} t={t} />;
  return <YearReport data={data} locale={locale} t={t} />;
}

function DayReport({ data, locale, t }) {
  const chart = [
    { label: t('accountant.income'), value: data.incomeTotal ?? 0 },
    { label: t('accountant.expenses'), value: data.expensesTotal ?? 0 },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label={t('accountant.income')} value={formatEgpWithCurrency(data.incomeTotal ?? 0, locale)} icon={TrendingUp} />
        <KpiCard label={t('accountant.expenses')} value={formatEgpWithCurrency(data.expensesTotal ?? 0, locale)} icon={BarChart3} />
        <KpiCard label={t('accountant.booklyGap')} value={formatEgpWithCurrency(data.bookly?.gap ?? 0, locale)} icon={RefreshCw} />
      </div>
      <Card className="p-5 sm:p-6">
        <h2 className="font-cairo text-lg font-extrabold text-navy">{t('accountant.dayChart')}</h2>
        <div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ top: 10, right: 8, left: 8, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis tickFormatter={(v) => formatEgp(v, locale)} /><Tooltip formatter={(value) => formatEgpWithCurrency(value, locale)} /><Bar dataKey="value" fill="currentColor" className="text-court" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </Card>
      <ReportTable title={t('accountant.staffCollection')} rows={(data.incomeByStaff ?? []).map((row) => ({ label: row.name, value: row.total }))} locale={locale} t={t} />
    </div>
  );
}

function MonthReport({ data, locale, t }) {
  const chart = [
    { label: t('accountant.income'), value: data.income?.total ?? 0 },
    { label: t('accountant.expenses'), value: data.expenses?.total ?? 0 },
    { label: t('accountant.net'), value: data.net ?? 0 },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label={t('accountant.income')} value={formatEgpWithCurrency(data.income?.total ?? 0, locale)} icon={TrendingUp} />
        <KpiCard label={t('accountant.expenses')} value={formatEgpWithCurrency(data.expenses?.total ?? 0, locale)} icon={BarChart3} />
        <KpiCard label={t('accountant.net')} value={formatEgpWithCurrency(data.net ?? 0, locale)} icon={TrendingUp} />
      </div>
      <Card className="p-5 sm:p-6">
        <h2 className="font-cairo text-lg font-extrabold text-navy">{t('accountant.monthChart')}</h2>
        <div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ top: 10, right: 8, left: 8, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis tickFormatter={(v) => formatEgp(v, locale)} /><Tooltip formatter={(value) => formatEgpWithCurrency(value, locale)} /><Legend /><Bar dataKey="value" fill="currentColor" className="text-court" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2"><ReportTable title={t('accountant.incomeByMethod')} rows={Object.entries(data.income?.byMethod ?? {}).map(([label, value]) => ({ label: t(`method.${label}`), value }))} locale={locale} t={t} /><ReportTable title={t('accountant.expensesByCategory')} rows={(data.expenses?.byCategory ?? []).map((row) => ({ label: row.category || t('common.unavailable'), value: row.total }))} locale={locale} t={t} /></div>
    </div>
  );
}

function YearReport({ data, locale, t }) {
  const chart = (data.byMonth ?? []).map((row) => ({ label: row.month.slice(5), income: row.income ?? 0, expenses: row.expenses ?? 0, net: row.net ?? 0 }));
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3"><KpiCard label={t('accountant.income')} value={formatEgpWithCurrency(data.totals?.income ?? 0, locale)} icon={TrendingUp} /><KpiCard label={t('accountant.expenses')} value={formatEgpWithCurrency(data.totals?.expenses ?? 0, locale)} icon={BarChart3} /><KpiCard label={t('accountant.net')} value={formatEgpWithCurrency(data.totals?.net ?? 0, locale)} icon={TrendingUp} /></div>
      <Card className="p-5 sm:p-6">
        <h2 className="font-cairo text-lg font-extrabold text-navy">{t('accountant.yearChart')}</h2>
        <div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ top: 10, right: 8, left: 8, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis tickFormatter={(v) => formatEgp(v, locale)} /><Tooltip formatter={(value) => formatEgpWithCurrency(value, locale)} /><Legend /><Bar dataKey="income" name={t('accountant.income')} fill="currentColor" className="text-court" radius={[6, 6, 0, 0]} /><Bar dataKey="expenses" name={t('accountant.expenses')} fill="currentColor" className="text-edge" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </Card>
      <ReportTable title={t('accountant.monthBreakdown')} rows={chart.map((row) => ({ label: row.label, value: row.net }))} locale={locale} t={t} />
    </div>
  );
}

function ReportTable({ title, rows, locale, t }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-navy/10 px-5 py-4"><h2 className="font-cairo text-lg font-extrabold text-navy">{title}</h2></div>
      {rows.length === 0 ? <div className="p-5 font-tajawal text-sm text-navy/55">{t('accountant.noReportRows')}</div> : rows.map((row, index) => <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-4 border-b border-navy/7 px-5 py-3 last:border-b-0"><span className="font-tajawal text-sm text-navy/65">{row.label}</span><strong className="font-cairo text-sm text-navy">{formatEgpWithCurrency(row.value ?? 0, locale)}</strong></div>)}
    </Card>
  );
}

function ReportSkeleton() {
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div><Skeleton className="h-80" /></div>;
}

function buildExportRows(tab, data) {
  if (tab === 'day') return [{ metric: 'incomeTotal', value: data.incomeTotal ?? 0 }, { metric: 'expensesTotal', value: data.expensesTotal ?? 0 }, { metric: 'booklyGap', value: data.bookly?.gap ?? 0 }];
  if (tab === 'month') return [{ metric: 'incomeTotal', value: data.income?.total ?? 0 }, { metric: 'expensesTotal', value: data.expenses?.total ?? 0 }, { metric: 'net', value: data.net ?? 0 }, ...(data.expenses?.byCategory ?? []).map((row) => ({ metric: `expense:${row.category}`, value: row.total }))];
  return (data.byMonth ?? []).map((row) => ({ month: row.month, income: row.income ?? 0, expenses: row.expenses ?? 0, net: row.net ?? 0 }));
}
