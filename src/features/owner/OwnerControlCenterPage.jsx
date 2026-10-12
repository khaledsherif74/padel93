import { Download, LockKeyhole, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetPermissionsQuery,
  useUpdatePermissionsMutation,
  useResetPermissionsMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetAuditQuery,
  useGetAuditExportMutation,
  useGetUsersQuery,
} from '../../app/api';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import Select from '../../shared/ui/Select';
import Badge from '../../shared/ui/Badge';
import Skeleton from '../../shared/ui/Skeleton';
import ErrorState from '../../shared/ui/ErrorState';

const STAFF_KEYS = [
  'income.create',
  'income.createCard',
  'expense.create',
  'transfer.create',
  'transfer.cancel',
  'appointment.seeCustomerPhone',
  'appointment.viewOtherDays',
  'goal.view',
];

const ACCOUNTANT_KEYS = [
  'income.verify',
  'expense.create',
  'transfer.confirm',
  'transfer.cancel',
  'payout.create',
  'bookly.sync',
  'reports.view',
  'balances.view',
  'shifts.list',
  'appointment.seeCustomerPhone',
  'appointment.viewOtherDays',
  'goal.view',
];

const ACTION_KEYS = [
  'user.login',
  'user.login_failed',
  'settings.permissions.update',
  'settings.update',
  'user.update',
  'user.reset_password',
  'user.revoke_sessions',
];

export default function OwnerControlCenterPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('permissions');
  const permissionsQuery = useGetPermissionsQuery();
  const settingsQuery = useGetSettingsQuery();
  const [updatePermissions, permissionsState] = useUpdatePermissionsMutation();
  const [resetPermissions, resetState] = useResetPermissionsMutation();
  const [updateSettings, settingsState] = useUpdateSettingsMutation();
  const [permissions, setPermissions] = useState(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    if (permissionsQuery.data) setPermissions(structuredClone(permissionsQuery.data.permissions));
  }, [permissionsQuery.data]);

  useEffect(() => {
    if (settingsQuery.data) setMaintenanceMode(Boolean(settingsQuery.data.maintenanceMode));
  }, [settingsQuery.data]);

  async function savePermissions() {
    if (!permissions) return;
    await updatePermissions(permissions).unwrap();
  }

  async function restoreDefaults() {
    const data = await resetPermissions().unwrap();
    setPermissions(data.permissions);
  }

  async function saveMaintenance() {
    await updateSettings({ maintenanceMode }).unwrap();
  }

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

  return (
    <div className="mx-auto max-w-[1400px] space-y-7">
      <PageHeader
        eyebrow={t('owner.controlEyebrow')}
        title={t('owner.controlTitle')}
        description={t('owner.controlDescription')}
      />

      <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl bg-navy p-1.5">
        <TabButton active={tab === 'permissions'} onClick={() => setTab('permissions')}>
          {t('owner.permissionsTab')}
        </TabButton>
        <TabButton active={tab === 'activity'} onClick={() => setTab('activity')}>
          {t('owner.activityTab')}
        </TabButton>
        <TabButton active={tab === 'maintenance'} onClick={() => setTab('maintenance')}>
          {t('owner.maintenanceTab')}
        </TabButton>
      </div>

      {tab === 'permissions' && (
        <PermissionsPanel
          data={permissions}
          isLoading={permissionsQuery.isLoading}
          error={permissionsQuery.error}
          saving={permissionsState.isLoading}
          resetting={resetState.isLoading}
          onRetry={permissionsQuery.refetch}
          onChange={setPermissions}
          onSave={savePermissions}
          onReset={restoreDefaults}
          t={t}
        />
      )}

      {tab === 'activity' && <ActivityPanel locale={locale} t={t} />}

      {tab === 'maintenance' && (
        <MaintenancePanel
          enabled={maintenanceMode}
          onChange={setMaintenanceMode}
          onSave={saveMaintenance}
          saving={settingsState.isLoading}
          t={t}
        />
      )}
    </div>
  );
}

function PermissionsPanel({
  data,
  isLoading,
  error,
  saving,
  resetting,
  onRetry,
  onChange,
  onSave,
  onReset,
  t,
}) {
  if (isLoading) return <Skeleton className="h-[560px] w-full" />;
  if (error) return <ErrorState title={t('owner.permissionsLoadError')} onRetry={onRetry} />;

  const update = (role, key, value) => {
    onChange((current) => ({ ...current, [role]: { ...current[role], [key]: value } }));
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-navy/10 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-cairo text-xs font-bold uppercase tracking-[0.15em] text-ball">
              {t('owner.permissionsEyebrow')}
            </p>
            <h2 className="mt-1 font-cairo text-2xl font-black text-navy">
              {t('owner.permissionsTitle')}
            </h2>
            <p className="mt-2 max-w-2xl font-tajawal text-sm leading-7 text-navy/55">
              {t('owner.permissionsDescription')}
            </p>
          </div>
          <Badge tone="success">{t('owner.ownerAlwaysFull')}</Badge>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
        <PermissionGroup
          role="STAFF"
          keys={STAFF_KEYS}
          data={data?.STAFF}
          onChange={update}
          t={t}
        />
        <PermissionGroup
          role="ACCOUNTANT"
          keys={ACCOUNTANT_KEYS}
          data={data?.ACCOUNTANT}
          onChange={update}
          t={t}
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-navy/10 p-5 sm:flex-row sm:justify-end sm:p-6">
        <Button variant="ghost" onClick={onReset} loading={resetting}>
          <RotateCcw className="size-4" aria-hidden="true" />
          {t('owner.backToDefault')}
        </Button>
        <Button onClick={onSave} loading={saving}>
          <Save className="size-4" aria-hidden="true" />
          {t('owner.savePermissions')}
        </Button>
      </div>
    </Card>
  );
}

function PermissionGroup({ role, keys, data, onChange, t }) {
  return (
    <section className="rounded-2xl border border-navy/10 overflow-hidden">
      <div className="bg-navy p-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-cairo text-xs font-bold uppercase tracking-[0.13em] text-ball">
              {t(`role.${role}`)}
            </p>
            <h3 className="mt-1 font-cairo text-lg font-extrabold">
              {t('owner.permissionGroupTitle', { role: t(`role.${role}`) })}
            </h3>
          </div>
          <ShieldCheck className="size-6 text-ball" aria-hidden="true" />
        </div>
      </div>

      <div className="divide-y divide-navy/8 bg-white">
        {keys.map((key) => (
          <label
            key={key}
            className="flex min-h-14 items-center justify-between gap-4 px-5 py-3 text-navy hover:bg-navy/[0.02]"
          >
            <span className="min-w-0">
              <span className="block font-cairo text-sm font-semibold text-navy">
                {permissionLabel(key, t)}
              </span>
              <span className="mt-0.5 block font-tajawal text-xs leading-5 text-navy/50">
                {permissionDescription(key, t)}
              </span>
            </span>
            <input
              type="checkbox"
              checked={Boolean(data?.[key])}
              onChange={(event) => onChange(role, key, event.target.checked)}
              className="size-5 shrink-0 accent-[var(--ball)]"
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function ActivityPanel({ locale, t }) {
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    from: '',
    to: '',
    actorId: '',
  });
  const query = useMemo(
    () => ({
      ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
      limit: 40,
    }),
    [filters],
  );
  const audit = useGetAuditQuery(query);
  const [exportAudit, exportState] = useGetAuditExportMutation();
  const users = useGetUsersQuery();

  async function downloadCsv() {
    const exportQuery = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    const blob = await exportAudit(exportQuery).unwrap();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `padel93-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-navy/10 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-cairo text-xs font-bold uppercase tracking-[0.15em] text-ball">
              {t('owner.activityEyebrow')}
            </p>
            <h2 className="mt-1 font-cairo text-2xl font-black text-navy">
              {t('owner.activityTitle')}
            </h2>
            <p className="mt-2 max-w-2xl font-tajawal text-sm leading-7 text-navy/55">
              {t('owner.activityDescription')}
            </p>
          </div>
          <Button variant="secondary" onClick={downloadCsv} loading={exportState.isLoading}>
            <Download className="size-4" aria-hidden="true" />
            {t('owner.downloadCsv')}
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Select
            label={t('owner.actor')}
            value={filters.actorId}
            onChange={(e) => setFilters((v) => ({ ...v, actorId: e.target.value }))}
            options={(users.data?.items ?? []).map((user) => ({
              value: user.id,
              label: `${user.name} · @${user.username}`,
            }))}
            placeholder={t('common.all')}
          />
          <Select
            label={t('owner.action')}
            value={filters.action}
            onChange={(e) => setFilters((v) => ({ ...v, action: e.target.value }))}
            options={ACTION_KEYS.map((action) => ({ value: action, label: action }))}
            placeholder={t('common.all')}
          />
          <Input
            label={t('owner.entityType')}
            value={filters.entityType}
            onChange={(e) => setFilters((v) => ({ ...v, entityType: e.target.value }))}
          />
          <Input
            label={t('owner.from')}
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((v) => ({ ...v, from: e.target.value }))}
          />
          <Input
            label={t('owner.to')}
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((v) => ({ ...v, to: e.target.value }))}
          />
        </div>
      </div>

      {audit.isLoading ? (
        <div className="space-y-3 p-5 sm:p-6">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : audit.isError ? (
        <div className="p-5 sm:p-6">
          <ErrorState title={t('owner.activityLoadError')} onRetry={audit.refetch} />
        </div>
      ) : (audit.data?.items?.length ?? 0) === 0 ? (
        <p className="p-6 font-tajawal text-sm text-navy/55">{t('owner.noActivity')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="border-b border-navy/10 bg-white">
                {['actorName', 'action', 'entityType', 'entityId', 'ip', 'createdAt'].map((key) => (
                  <th
                    key={key}
                    className="px-5 py-4 text-start font-cairo text-xs font-bold uppercase tracking-wide text-navy/45"
                  >
                    {t(`owner.auditColumns.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audit.data.items.map((row) => (
                <tr key={row.id} className="border-b border-navy/8 last:border-0">
                  <td className="px-5 py-4 font-tajawal text-sm font-semibold text-navy">
                    {row.actorName ?? t('owner.system')}
                  </td>
                  <td className="px-5 py-4 font-tajawal text-sm text-navy/75">{row.action}</td>
                  <td className="px-5 py-4 font-tajawal text-sm text-navy/75">{row.entityType}</td>
                  <td className="px-5 py-4 font-mono text-xs text-navy/65">{row.entityId}</td>
                  <td className="px-5 py-4 font-mono text-xs text-navy/65">{row.ip ?? '—'}</td>
                  <td className="px-5 py-4 font-tajawal text-xs text-navy/55">
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(row.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function MaintenancePanel({ enabled, onChange, onSave, saving, t }) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-navy p-6 text-white sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-ball text-ball">
            <LockKeyhole className="size-6" strokeWidth={1.7} aria-hidden="true" />
          </div>
          <div>
            <p className="font-cairo text-xs font-bold uppercase tracking-[0.15em] text-ball">
              {t('owner.maintenanceEyebrow')}
            </p>
            <h2 className="mt-1 font-cairo text-2xl font-black">{t('owner.maintenanceTitle')}</h2>
            <p className="mt-2 max-w-2xl font-tajawal text-sm leading-7 text-white/70">
              {t('owner.maintenanceDescription')}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <div
          className={`rounded-2xl border p-5 ${enabled ? 'border-amber-200 bg-amber-50' : 'border-navy/10 bg-white'}`}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-cairo text-lg font-extrabold text-navy">
                {enabled ? t('owner.maintenanceOn') : t('owner.maintenanceOff')}
              </p>
              <p className="mt-1 font-tajawal text-sm leading-6 text-navy/55">
                {t('owner.maintenanceRule')}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => onChange(!enabled)}
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border p-1 outline-none transition focus-visible:ring-2 focus-visible:ring-edge ${enabled ? 'border-ball bg-ball' : 'border-navy/15 bg-navy/8'}`}
            >
              <span
                className={`size-6 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6 rtl:-translate-x-6' : ''}`}
              />
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-navy/10 p-4">
          <p className="font-tajawal text-sm leading-6 text-navy/65">
            {t('owner.maintenanceAuditHint')}
          </p>
          <Button onClick={onSave} loading={saving}>
            <Save className="size-4" aria-hidden="true" />
            {t('common.save')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 whitespace-nowrap rounded-xl px-4 font-cairo text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-ball ${active ? 'bg-ball text-navy' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
    >
      {children}
    </button>
  );
}

function permissionLabel(key, t) {
  const labels = {
    'income.create': 'incomeCreate',
    'income.createCard': 'incomeCreateCard',
    'income.verify': 'incomeVerify',
    'expense.create': 'expenseCreate',
    'transfer.create': 'transferCreate',
    'transfer.confirm': 'transferConfirm',
    'transfer.cancel': 'transferCancel',
    'payout.create': 'payoutCreate',
    'bookly.sync': 'booklySync',
    'reports.view': 'reportsView',
    'balances.view': 'balancesView',
    'shifts.list': 'shiftsList',
    'appointment.seeCustomerPhone': 'seeCustomerPhone',
    'appointment.viewOtherDays': 'viewOtherDays',
    'goal.view': 'goalView',
  };
  return t(`owner.permission.${labels[key] ?? key}`, key);
}

function permissionDescription(key, t) {
  const hints = {
    'income.create': 'incomeCreate',
    'income.createCard': 'incomeCreateCard',
    'income.verify': 'incomeVerify',
    'expense.create': 'expenseCreate',
    'transfer.create': 'transferCreate',
    'transfer.confirm': 'transferConfirm',
    'transfer.cancel': 'transferCancel',
    'payout.create': 'payoutCreate',
    'bookly.sync': 'booklySync',
    'reports.view': 'reportsView',
    'balances.view': 'balancesView',
    'shifts.list': 'shiftsList',
    'appointment.seeCustomerPhone': 'seeCustomerPhone',
    'appointment.viewOtherDays': 'viewOtherDays',
    'goal.view': 'goalView',
  };
  return t(`owner.permissionHint.${hints[key] ?? key}`, t('owner.permissionDescriptionFallback'));
}
