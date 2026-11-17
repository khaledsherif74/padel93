import { RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetPermissionsQuery,
  useUpdatePermissionsMutation,
  useResetPermissionsMutation,
} from '../../app/api';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import Badge from '../../shared/ui/Badge';
import Skeleton from '../../shared/ui/Skeleton';
import ErrorState from '../../shared/ui/ErrorState';

const CAPABILITIES = [
  'income.create',
  'income.createCard',
  'income.verify',
  'expense.create',
  'transfer.create',
  'transfer.confirm',
  'transfer.cancel',
  'appointment.seeCustomerPhone',
  'appointment.viewOtherDays',
  'goal.view',
  'goal.set',
  'attendance.clock',
  'attendance.view',
  'attendance.adjust',
  'schedule.manage',
  'payroll.manage',
  'payout.create',
  'bookly.sync',
  'reports.view',
  'balances.view',
  'shifts.list',
  'app.finance',
  'app.attendance',
  'app.bookings',
  'app.loyalty',
  'app.whatsappBot',
];

const ASSIGNMENTS = ['NONE', 'STAFF', 'ACCOUNTANT', 'BOTH'];

function assignmentFor(data, key) {
  const staff = Boolean(data?.STAFF?.[key]);
  const accountant = Boolean(data?.ACCOUNTANT?.[key]);
  if (staff && accountant) return 'BOTH';
  if (staff) return 'STAFF';
  if (accountant) return 'ACCOUNTANT';
  return 'NONE';
}

function applyAssignment(current, key, assignment) {
  return {
    STAFF: {
      ...current.STAFF,
      [key]: assignment === 'STAFF' || assignment === 'BOTH',
    },
    ACCOUNTANT: {
      ...current.ACCOUNTANT,
      [key]: assignment === 'ACCOUNTANT' || assignment === 'BOTH',
    },
  };
}

export default function OwnerPermissionsPanel() {
  const { t } = useTranslation();
  const query = useGetPermissionsQuery();
  const [updatePermissions, updateState] = useUpdatePermissionsMutation();
  const [resetPermissions, resetState] = useResetPermissionsMutation();
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (query.data?.permissions) {
      setData(structuredClone(query.data.permissions));
    }
  }, [query.data]);

  const rows = useMemo(() => {
    const needle = filter.trim().toLocaleLowerCase();
    return CAPABILITIES.filter((key) => {
      if (!needle) return true;
      return `${t(`owner.permission.${keyToLabel(key)}`)} ${t(`owner.permissionHint.${keyToLabel(key)}`)}`
        .toLocaleLowerCase()
        .includes(needle);
    });
  }, [filter, t]);

  async function save() {
    if (!data) return;
    try {
      const result = await updatePermissions(data).unwrap();
      setData(result.permissions);
      setNotice(t('owner.permissionsSaved'));
    } catch {
      setNotice(t('owner.permissionsSaveError'));
    }
  }

  async function restoreDefaults() {
    try {
      const result = await resetPermissions().unwrap();
      setData(result.permissions);
      setNotice(t('owner.permissionsReset'));
    } catch {
      setNotice(t('owner.permissionsSaveError'));
    }
  }

  if (query.isLoading || !data) return <Skeleton className="h-[520px] w-full" />;
  if (query.isError) {
    return <ErrorState title={t('owner.permissionsLoadError')} onRetry={query.refetch} />;
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-navy/10 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF4D9] text-[#426B15]">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-cairo text-xs font-bold uppercase tracking-[0.15em] text-ball">
                {t('owner.permissionsEyebrow')}
              </p>
              <h2 className="mt-1 font-cairo text-xl font-black text-navy sm:text-2xl">
                {t('owner.permissionsTitle')}
              </h2>
              <p className="mt-2 max-w-3xl font-tajawal text-sm leading-7 text-navy/55">
                {t('owner.permissionsDescription')}
              </p>
            </div>
          </div>
          <Badge tone="success">{t('owner.ownerAlwaysFull')}</Badge>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="block w-full sm:max-w-sm">
            <span className="sr-only">{t('owner.searchCapabilities')}</span>
            <input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={t('owner.searchCapabilities')}
              className="min-h-11 w-full rounded-xl border border-navy/15 bg-white px-3 font-tajawal text-sm text-navy outline-none placeholder:text-navy/35 focus:border-edge focus:ring-2 focus:ring-edge/15"
            />
          </label>
          <p className="font-tajawal text-xs text-navy/45">
            {t('owner.capabilityCount', { count: CAPABILITIES.length })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 divide-y divide-navy/8 bg-white">
        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(190px,250px)] items-center gap-4 bg-[#F5F7FA] px-5 py-3 sm:grid">
          <span className="font-cairo text-[11px] font-extrabold uppercase tracking-wide text-navy/50">
            {t('owner.capabilityColumn')}
          </span>
          <span className="font-cairo text-[11px] font-extrabold uppercase tracking-wide text-navy/50">
            {t('owner.accessColumn')}
          </span>
        </div>
        {rows.map((key) => {
          const appCapability = key.startsWith('app.');
          return (
            <div
              key={key}
              className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(190px,250px)] sm:items-center sm:gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-cairo text-sm font-bold text-navy">
                    {t(`owner.permission.${keyToLabel(key)}`)}
                  </p>
                  {appCapability && <Badge>{t('owner.appCapability')}</Badge>}
                </div>
                <p className="mt-1 font-tajawal text-xs leading-5 text-navy/50">
                  {t(`owner.permissionHint.${keyToLabel(key)}`)}
                </p>
              </div>
              <label className="block">
                <span className="mb-1 block font-cairo text-[11px] font-bold text-navy/50 sm:hidden">
                  {t('owner.accessColumn')}
                </span>
                <select
                  aria-label={t('owner.capabilityAssignment', {
                    capability: t(`owner.permission.${keyToLabel(key)}`),
                  })}
                  value={assignmentFor(data, key)}
                  onChange={(event) => {
                    setData((current) => applyAssignment(current, key, event.target.value));
                    setNotice('');
                  }}
                  className="min-h-11 w-full rounded-xl border border-navy/15 bg-white px-3 font-cairo text-sm font-semibold text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
                >
                  {ASSIGNMENTS.map((assignment) => (
                    <option key={assignment} value={assignment}>
                      {t(`owner.assignment.${assignment.toLowerCase()}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="px-5 py-10 text-center font-tajawal text-sm text-navy/50">
            {t('owner.noCapabilitiesFound')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-navy/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <p className="min-h-5 font-tajawal text-sm text-navy/55" role="status">
          {notice}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={restoreDefaults} loading={resetState.isLoading}>
            <RotateCcw className="size-4" aria-hidden="true" />
            {t('owner.backToDefault')}
          </Button>
          <Button onClick={save} loading={updateState.isLoading} disabled={!data}>
            <Save className="size-4" aria-hidden="true" />
            {t('owner.savePermissions')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function keyToLabel(key) {
  const names = {
    'income.create': 'incomeCreate',
    'income.createCard': 'incomeCreateCard',
    'income.verify': 'incomeVerify',
    'expense.create': 'expenseCreate',
    'transfer.create': 'transferCreate',
    'transfer.confirm': 'transferConfirm',
    'transfer.cancel': 'transferCancel',
    'appointment.seeCustomerPhone': 'seeCustomerPhone',
    'appointment.viewOtherDays': 'viewOtherDays',
    'goal.view': 'goalView',
    'goal.set': 'goalSet',
    'attendance.clock': 'attendanceClock',
    'attendance.view': 'attendanceView',
    'attendance.adjust': 'attendanceAdjust',
    'schedule.manage': 'scheduleManage',
    'payroll.manage': 'payrollManage',
    'payout.create': 'payoutCreate',
    'bookly.sync': 'booklySync',
    'reports.view': 'reportsView',
    'balances.view': 'balancesView',
    'shifts.list': 'shiftsList',
    'app.finance': 'appFinance',
    'app.attendance': 'appAttendance',
    'app.bookings': 'appBookings',
    'app.loyalty': 'appLoyalty',
    'app.whatsappBot': 'appWhatsappBot',
  };
  return names[key] ?? key;
}
