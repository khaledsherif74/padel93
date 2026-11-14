import {
  Check,
  FolderCog,
  Goal,
  LayoutGrid,
  MapPin,
  Plus,
  Save,
  Settings2,
  TimerReset,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetGoalQuery,
  useSetGoalMutation,
  useGetExpenseCategoriesQuery,
  useCreateExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
} from '../../app/api';
import { currentMonth } from '../../shared/lib/date';
import { geoErrorKey, getCurrentPosition } from '../../shared/lib/geo';
import { validateHubUrl } from '../hub/hubTile';
import { errorMessage } from '../../shared/lib/apiError';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import Badge from '../../shared/ui/Badge';
import Skeleton from '../../shared/ui/Skeleton';
import Modal from '../../shared/ui/Modal';

export default function OwnerSettingsPage() {
  const { t } = useTranslation();
  const settings = useGetSettingsQuery();
  const [updateSettings, updateState] = useUpdateSettingsMutation();
  const month = currentMonth();
  const goal = useGetGoalQuery(month);
  const [setGoal, goalState] = useSetGoalMutation();
  const categories = useGetExpenseCategoriesQuery();
  const [createCategory, createCategoryState] = useCreateExpenseCategoryMutation();
  const [updateCategory, updateCategoryState] = useUpdateExpenseCategoryMutation();
  const [business, setBusiness] = useState({
    openTime: '16:00',
    closeTime: '04:00',
    courts: 2,
    countedBookingStatuses: ['APPROVED', 'DONE'],
  });
  const [shifts, setShifts] = useState({
    allowConcurrentShifts: false,
    staffBackdateDays: 1,
    staffViewDays: 3,
  });
  const [approvals, setApprovals] = useState({ expenseApprovalThreshold: 0 });
  const [hub, setHub] = useState({
    hubLoyaltyUrl: '',
    hubBotPanelUrl: '',
    hubBotRemindersUrl: '',
    hubShowComingSoon: false,
  });
  const [attendance, setAttendance] = useState({
    attendanceLat: '',
    attendanceLng: '',
    attendanceRadiusM: '100',
    attendanceMaxAccuracyM: '50',
    selfieRetentionDays: '90',
    missedClockOutHours: '14',
    offlineMaxAgeHours: '12',
  });
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [goalHours, setGoalHours] = useState('0');
  const [newCategory, setNewCategory] = useState({ name: '', nameAr: '' });
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    if (!settings.data) return;
    setBusiness({
      openTime: settings.data.openTime ?? '16:00',
      closeTime: settings.data.closeTime ?? '04:00',
      courts: settings.data.courts ?? 2,
      countedBookingStatuses: settings.data.countedBookingStatuses ?? ['APPROVED', 'DONE'],
    });
    setShifts({
      allowConcurrentShifts: Boolean(settings.data.allowConcurrentShifts),
      staffBackdateDays: settings.data.staffBackdateDays ?? 1,
      staffViewDays: settings.data.staffViewDays ?? 3,
    });
    setApprovals({
      expenseApprovalThreshold: settings.data.expenseApprovalThreshold ?? 0,
    });
    setAttendance({
      attendanceLat: settings.data.attendanceLat == null ? '' : String(settings.data.attendanceLat),
      attendanceLng: settings.data.attendanceLng == null ? '' : String(settings.data.attendanceLng),
      attendanceRadiusM: String(settings.data.attendanceRadiusM ?? 100),
      attendanceMaxAccuracyM: String(settings.data.attendanceMaxAccuracyM ?? 50),
      selfieRetentionDays: String(settings.data.selfieRetentionDays ?? 90),
      missedClockOutHours: String(settings.data.missedClockOutHours ?? 14),
      offlineMaxAgeHours: String(settings.data.offlineMaxAgeHours ?? 12),
    });
    setHub({
      hubLoyaltyUrl: settings.data.hubLoyaltyUrl ?? '',
      hubBotPanelUrl: settings.data.hubBotPanelUrl ?? '',
      hubBotRemindersUrl: settings.data.hubBotRemindersUrl ?? '',
      hubShowComingSoon: Boolean(settings.data.hubShowComingSoon),
    });
  }, [settings.data]);

  useEffect(() => {
    if (goal.data?.goalHours != null) setGoalHours(String(goal.data.goalHours));
  }, [goal.data]);

  const saving =
    updateState.isLoading ||
    goalState.isLoading ||
    createCategoryState.isLoading ||
    updateCategoryState.isLoading;
  const error =
    updateState.error || goalState.error || createCategoryState.error || updateCategoryState.error;

  async function saveBusiness() {
    await updateSettings({ ...business }).unwrap();
  }

  async function saveShifts() {
    await updateSettings({ ...shifts }).unwrap();
  }

  async function saveApprovals() {
    await updateSettings({
      expenseApprovalThreshold: Number(approvals.expenseApprovalThreshold || 0),
    }).unwrap();
  }

  const inRange = (value, min, max, integer = true) => {
    const n = Number(value);
    return (
      value !== '' &&
      Number.isFinite(n) &&
      n >= min &&
      n <= max &&
      (!integer || Number.isInteger(n))
    );
  };
  const coordsBlank = attendance.attendanceLat === '' && attendance.attendanceLng === '';
  const attendanceValid =
    (coordsBlank ||
      (inRange(attendance.attendanceLat, -90, 90, false) &&
        inRange(attendance.attendanceLng, -180, 180, false))) &&
    inRange(attendance.attendanceRadiusM, 20, 1000) &&
    inRange(attendance.attendanceMaxAccuracyM, 10, 500) &&
    inRange(attendance.selfieRetentionDays, 7, 3650) &&
    inRange(attendance.missedClockOutHours, 4, 48) &&
    inRange(attendance.offlineMaxAgeHours, 1, 48);

  async function saveAttendance() {
    if (!attendanceValid) return;
    await updateSettings({
      attendanceLat: coordsBlank ? null : Number(attendance.attendanceLat),
      attendanceLng: coordsBlank ? null : Number(attendance.attendanceLng),
      attendanceRadiusM: Number(attendance.attendanceRadiusM),
      attendanceMaxAccuracyM: Number(attendance.attendanceMaxAccuracyM),
      selfieRetentionDays: Number(attendance.selfieRetentionDays),
      missedClockOutHours: Number(attendance.missedClockOutHours),
      offlineMaxAgeHours: Number(attendance.offlineMaxAgeHours),
    }).unwrap();
  }

  async function useMyLocation() {
    setLocating(true);
    setLocationError(null);
    try {
      const pos = await getCurrentPosition();
      setAttendance((v) => ({
        ...v,
        attendanceLat: String(pos.lat),
        attendanceLng: String(pos.lng),
      }));
    } catch (err) {
      setLocationError(t(geoErrorKey(err)));
    } finally {
      setLocating(false);
    }
  }

  const hubUrlKeys = ['hubLoyaltyUrl', 'hubBotPanelUrl', 'hubBotRemindersUrl'];
  const hubInvalid = hubUrlKeys.some((key) => validateHubUrl(hub[key]) !== null);

  async function saveHub() {
    if (hubInvalid) return;
    await updateSettings({
      hubLoyaltyUrl: hub.hubLoyaltyUrl.trim(),
      hubBotPanelUrl: hub.hubBotPanelUrl.trim(),
      hubBotRemindersUrl: hub.hubBotRemindersUrl.trim(),
      hubShowComingSoon: hub.hubShowComingSoon,
    }).unwrap();
  }

  async function saveGoal() {
    await setGoal({ month, goalHours: Number(goalHours) }).unwrap();
  }

  async function saveCategory() {
    if (!newCategory.name.trim()) return;
    await createCategory({
      name: newCategory.name.trim(),
      ...(newCategory.nameAr.trim() ? { nameAr: newCategory.nameAr.trim() } : {}),
    }).unwrap();
    setNewCategory({ name: '', nameAr: '' });
  }

  async function saveEditingCategory() {
    if (!editingCategory?.name?.trim()) return;
    await updateCategory({
      id: editingCategory.id,
      name: editingCategory.name.trim(),
      nameAr: editingCategory.nameAr?.trim() || null,
      isActive: Boolean(editingCategory.isActive),
    }).unwrap();
    setEditingCategory(null);
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-7">
      <PageHeader
        eyebrow={t('owner.settingsEyebrow')}
        title={t('owner.settingsTitle')}
        description={t('owner.settingsDescription')}
      />

      {error && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-tajawal text-sm text-red-800"
          role="alert"
        >
          {errorMessage(error, t)}
        </p>
      )}

      <SettingsCard
        icon={Settings2}
        title={t('owner.businessHoursTitle')}
        description={t('owner.businessHoursDescription')}
        saving={saving}
        onSave={saveBusiness}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label={t('owner.openTime')}
            type="time"
            value={business.openTime}
            onChange={(e) => setBusiness((v) => ({ ...v, openTime: e.target.value }))}
          />
          <Input
            label={t('owner.closeTime')}
            type="time"
            value={business.closeTime}
            onChange={(e) => setBusiness((v) => ({ ...v, closeTime: e.target.value }))}
          />
          <Input
            label={t('owner.courts')}
            type="number"
            min="1"
            max="20"
            value={business.courts}
            onChange={(e) => setBusiness((v) => ({ ...v, courts: Number(e.target.value) }))}
          />
        </div>

        <div className="mt-5">
          <p className="font-cairo text-sm font-semibold text-navy">
            {t('owner.countedBookingStatuses')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['PENDING', 'APPROVED', 'DONE'].map((status) => {
              const selected = business.countedBookingStatuses.includes(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    setBusiness((value) => {
                      if (selected && value.countedBookingStatuses.length === 1) return value;
                      return {
                        ...value,
                        countedBookingStatuses: selected
                          ? value.countedBookingStatuses.filter((item) => item !== status)
                          : [...value.countedBookingStatuses, status],
                      };
                    })
                  }
                  className={`min-h-11 rounded-xl border px-4 font-cairo text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-edge ${selected ? 'border-ball bg-ball text-navy' : 'border-navy/10 bg-white text-navy/65 hover:bg-navy/5'}`}
                >
                  {t(`booklyStatus.${status}`, status)}
                </button>
              );
            })}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={TimerReset}
        title={t('owner.shiftSettingsTitle')}
        description={t('owner.shiftSettingsDescription')}
        saving={saving}
        onSave={saveShifts}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('owner.staffBackdateDays')}
            type="number"
            min="0"
            max="7"
            value={shifts.staffBackdateDays}
            onChange={(e) =>
              setShifts((v) => ({ ...v, staffBackdateDays: Number(e.target.value) }))
            }
            hint={t('owner.staffBackdateHint')}
          />
          <Input
            label={t('owner.staffViewDays')}
            type="number"
            min="0"
            max="30"
            inputMode="numeric"
            value={shifts.staffViewDays}
            onChange={(e) => setShifts((v) => ({ ...v, staffViewDays: Number(e.target.value) }))}
            hint={t('owner.staffViewDaysHint')}
          />
          <label className="flex min-h-12 items-center gap-3 self-end rounded-xl border border-navy/10 bg-white px-4 py-3 font-cairo text-sm font-semibold text-navy">
            <input
              type="checkbox"
              checked={shifts.allowConcurrentShifts}
              onChange={(e) =>
                setShifts((v) => ({ ...v, allowConcurrentShifts: e.target.checked }))
              }
              className="size-4 accent-[var(--ball)]"
            />
            {t('owner.allowConcurrentShifts')}
          </label>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={WalletCards}
        title={t('owner.approvalSettingsTitle')}
        description={t('owner.approvalSettingsDescription')}
        saving={saving}
        onSave={saveApprovals}
      >
        <Input
          label={t('owner.expenseApprovalThreshold')}
          type="number"
          min="0"
          inputMode="numeric"
          value={approvals.expenseApprovalThreshold}
          onChange={(e) =>
            setApprovals((v) => ({ ...v, expenseApprovalThreshold: e.target.value }))
          }
          hint={t('owner.thresholdHint')}
        />
      </SettingsCard>

      <SettingsCard
        icon={MapPin}
        title={t('attendance.settingsTitle')}
        description={t('attendance.settingsHint')}
        saving={saving}
        onSave={attendanceValid && settings.data ? saveAttendance : null}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <p
            className={`sm:col-span-2 rounded-xl p-3 font-tajawal text-sm ${settings.data?.attendanceLat == null ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}
            role="status"
          >
            {settings.data?.attendanceLat == null
              ? t('attendance.courtNotSet')
              : t('attendance.courtSet')}
          </p>
          <Input
            label={t('attendance.lat')}
            type="number"
            step="any"
            inputMode="decimal"
            dir="ltr"
            value={attendance.attendanceLat}
            onChange={(e) => setAttendance((v) => ({ ...v, attendanceLat: e.target.value }))}
          />
          <Input
            label={t('attendance.lng')}
            type="number"
            step="any"
            inputMode="decimal"
            dir="ltr"
            value={attendance.attendanceLng}
            onChange={(e) => setAttendance((v) => ({ ...v, attendanceLng: e.target.value }))}
          />
          <div className="sm:col-span-2">
            <Button variant="ghost" loading={locating} onClick={useMyLocation}>
              <MapPin className="size-4" aria-hidden="true" />
              {t('attendance.useMyLocation')}
            </Button>
            {locationError && (
              <p className="mt-2 font-tajawal text-sm text-red-700" role="alert">
                {locationError}
              </p>
            )}
          </div>
          <Input
            label={t('attendance.radius')}
            type="number"
            min="20"
            max="1000"
            inputMode="numeric"
            value={attendance.attendanceRadiusM}
            onChange={(e) => setAttendance((v) => ({ ...v, attendanceRadiusM: e.target.value }))}
          />
          <Input
            label={t('attendance.accuracy')}
            type="number"
            min="10"
            max="500"
            inputMode="numeric"
            value={attendance.attendanceMaxAccuracyM}
            onChange={(e) =>
              setAttendance((v) => ({ ...v, attendanceMaxAccuracyM: e.target.value }))
            }
          />
          <Input
            label={t('attendance.retention')}
            type="number"
            min="7"
            max="3650"
            inputMode="numeric"
            value={attendance.selfieRetentionDays}
            onChange={(e) => setAttendance((v) => ({ ...v, selfieRetentionDays: e.target.value }))}
          />
          <Input
            label={t('attendance.missedHours')}
            type="number"
            min="4"
            max="48"
            inputMode="numeric"
            value={attendance.missedClockOutHours}
            onChange={(e) => setAttendance((v) => ({ ...v, missedClockOutHours: e.target.value }))}
          />
          <Input
            label={t('attendance.offlineHours')}
            type="number"
            min="1"
            max="48"
            inputMode="numeric"
            value={attendance.offlineMaxAgeHours}
            onChange={(e) => setAttendance((v) => ({ ...v, offlineMaxAgeHours: e.target.value }))}
          />
        </div>
      </SettingsCard>

      <SettingsCard
        icon={LayoutGrid}
        title={t('hub.settingsTitle')}
        description={t('hub.settingsDescription')}
        saving={saving}
        onSave={hubInvalid || !settings.data ? null : saveHub}
      >
        <div className="grid gap-4">
          {[
            ['hubLoyaltyUrl', 'hub.loyaltyUrl'],
            ['hubBotPanelUrl', 'hub.botPanelUrl'],
            ['hubBotRemindersUrl', 'hub.botRemindersUrl'],
          ].map(([key, labelKey]) => (
            <Input
              key={key}
              label={t(labelKey)}
              type="url"
              inputMode="url"
              dir="ltr"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://"
              value={hub[key]}
              onChange={(e) => setHub((v) => ({ ...v, [key]: e.target.value }))}
              error={validateHubUrl(hub[key]) ? t('hub.urlInvalid') : undefined}
              hint={t('hub.urlHint')}
            />
          ))}
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-navy/10 bg-white px-4 py-3 font-cairo text-sm font-semibold text-navy">
            <input
              type="checkbox"
              checked={hub.hubShowComingSoon}
              onChange={(e) => setHub((v) => ({ ...v, hubShowComingSoon: e.target.checked }))}
              className="size-4 accent-[var(--ball)]"
            />
            {t('hub.showComingSoon')}
          </label>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={Goal}
        title={t('owner.goalSettingsTitle')}
        description={t('owner.goalSettingsDescription')}
        saving={saving}
        onSave={Number(goalHours) > 0 ? saveGoal : null}
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Input
            label={t('owner.goalHours')}
            type="number"
            min="0.01"
            step="0.25"
            value={goalHours}
            onChange={(e) => setGoalHours(e.target.value)}
          />
          <Badge tone="info">{month}</Badge>
        </div>
        {goal.data?.goalHours != null && (
          <p className="mt-4 font-tajawal text-sm text-navy/55">
            {t('owner.currentGoalValue', { value: goal.data.goalHours ?? 0 })}
          </p>
        )}
      </SettingsCard>

      <SettingsCard
        icon={FolderCog}
        title={t('owner.expenseCategoriesTitle')}
        description={t('owner.expenseCategoriesDescription')}
        saving={false}
        onSave={null}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label={t('owner.categoryName')}
            value={newCategory.name}
            onChange={(e) => setNewCategory((v) => ({ ...v, name: e.target.value }))}
          />
          <Input
            label={t('owner.categoryNameAr')}
            value={newCategory.nameAr}
            onChange={(e) => setNewCategory((v) => ({ ...v, nameAr: e.target.value }))}
          />
          <Button
            className="self-end"
            onClick={saveCategory}
            loading={createCategoryState.isLoading}
            disabled={!newCategory.name.trim()}
          >
            <Plus className="size-4" aria-hidden="true" />
            {t('owner.addCategory')}
          </Button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-navy/10">
          {categories.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (categories.data?.items ?? []).length === 0 ? (
            <p className="p-5 font-tajawal text-sm text-navy/55">{t('owner.noCategories')}</p>
          ) : (
            <div className="divide-y divide-navy/8">
              {categories.data.items.map((category) => (
                <div
                  key={category.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-cairo text-sm font-bold text-navy">{category.name}</p>
                    {category.nameAr && (
                      <p className="font-tajawal text-xs text-navy/45">{category.nameAr}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    className="min-h-10 px-3"
                    onClick={() => setEditingCategory({ ...category })}
                  >
                    {t('owner.edit')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SettingsCard>

      <Modal
        open={Boolean(editingCategory)}
        onClose={() => !updateCategoryState.isLoading && setEditingCategory(null)}
        title={t('owner.editCategory')}
      >
        {editingCategory && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-navy/10 p-4">
              <div>
                <p className="font-cairo text-sm font-bold text-navy">{editingCategory.name}</p>
                {editingCategory.nameAr && (
                  <p className="font-tajawal text-xs text-navy/55">{editingCategory.nameAr}</p>
                )}
              </div>
              <Badge tone={editingCategory.isActive ? 'success' : 'neutral'}>
                {editingCategory.isActive ? t('owner.active') : t('owner.inactive')}
              </Badge>
            </div>

            <Input
              label={t('owner.categoryName')}
              value={editingCategory.name}
              onChange={(e) => setEditingCategory((v) => ({ ...v, name: e.target.value }))}
            />
            <Input
              label={t('owner.categoryNameAr')}
              value={editingCategory.nameAr ?? ''}
              onChange={(e) => setEditingCategory((v) => ({ ...v, nameAr: e.target.value }))}
            />
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-navy/10 bg-white px-4 py-3 font-cairo text-sm font-semibold text-navy">
              <input
                type="checkbox"
                checked={Boolean(editingCategory.isActive)}
                onChange={(e) => setEditingCategory((v) => ({ ...v, isActive: e.target.checked }))}
                className="size-4 accent-[var(--ball)]"
              />
              {t('owner.activeAccount')}
            </label>

            <div className="flex flex-wrap justify-between gap-2 border-t border-navy/10 pt-4">
              <Button
                variant="ghost"
                className="text-red-800 hover:bg-red-50"
                disabled={updateCategoryState.isLoading}
                onClick={async () => {
                  await updateCategory({
                    id: editingCategory.id,
                    isActive: false,
                  }).unwrap();
                  setEditingCategory(null);
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {t('owner.deleteCategory')}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setEditingCategory(null)}
                  disabled={updateCategoryState.isLoading}
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={saveEditingCategory} loading={updateCategoryState.isLoading}>
                  <Save className="size-4" aria-hidden="true" />
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <div className="rounded-2xl border border-navy/10 bg-navy p-5 text-white sm:p-6">
        <div className="flex items-start gap-3">
          <Check className="mt-1 size-5 shrink-0 text-ball" aria-hidden="true" />
          <div>
            <h2 className="font-cairo text-base font-extrabold">{t('owner.settingsAuditTitle')}</h2>
            <p className="mt-1 font-tajawal text-sm leading-7 text-white/70">
              {t('owner.settingsAuditHint')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({ icon: Icon, title, description, saving, onSave, children }) {
  const { t } = useTranslation();
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ball text-ball">
            <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-cairo text-lg font-extrabold text-navy">{title}</h2>
            <p className="mt-1 max-w-2xl font-tajawal text-sm leading-6 text-navy/55">
              {description}
            </p>
          </div>
        </div>
        {onSave && (
          <Button variant="secondary" onClick={onSave} loading={saving} className="sm:min-w-28">
            <Save className="size-4" aria-hidden="true" />
            {t('common.save')}
          </Button>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </Card>
  );
}
