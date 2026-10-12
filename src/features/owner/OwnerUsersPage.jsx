import { Pencil, Plus, RefreshCcw, ShieldCheck, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCreateUserMutation,
  useGetUsersQuery,
  useUpdateUserMutation,
  useResetUserPasswordMutation,
  useRevokeUserSessionsMutation,
} from '../../app/api';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import Select from '../../shared/ui/Select';
import Badge from '../../shared/ui/Badge';
import Modal from '../../shared/ui/Modal';
import ErrorState from '../../shared/ui/ErrorState';
import Skeleton from '../../shared/ui/Skeleton';
import { formatDateTime } from '../../shared/lib/date';
import { errorMessage } from '../../shared/lib/apiError';
import { selectUser } from '../auth/authSelectors';
import { useSelector } from 'react-redux';

const EMPTY_FORM = { username: '', name: '', phone: '', password: '', role: 'STAFF' };

export default function OwnerUsersPage() {
  const { t, i18n } = useTranslation();
  const currentUser = useSelector(selectUser);
  const users = useGetUsersQuery();
  const [createUser, createState] = useCreateUserMutation();
  const [updateUser, updateState] = useUpdateUserMutation();
  const [resetPassword, resetState] = useResetUserPasswordMutation();
  const [revokeSessions, revokeState] = useRevokeUserSessionsMutation();
  const [mode, setMode] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [note, setNote] = useState('');

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

  const sortedUsers = useMemo(
    () =>
      [...(users.data?.items ?? [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [users.data],
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setMode({ type: 'create' });
  }

  function openEdit(user) {
    setForm({
      name: user.name ?? '',
      phone: user.phone ?? '',
      role: user.role,
      isActive: user.isActive,
    });
    setMode({ type: 'edit', user });
  }

  function openReset(user) {
    setForm({ password: '' });
    setMode({ type: 'reset', user });
  }

  function openRevoke(user) {
    setNote('');
    setMode({ type: 'revoke', user });
  }

  async function submit() {
    try {
      if (mode.type === 'create') {
        await createUser(form).unwrap();
      }
      if (mode.type === 'edit') {
        await updateUser({ id: mode.user.id, ...form }).unwrap();
      }
      if (mode.type === 'reset') {
        await resetPassword({ id: mode.user.id, password: form.password }).unwrap();
      }
      if (mode.type === 'revoke') {
        await revokeSessions({
          id: mode.user.id,
          confirm: Boolean(mode.user.id === currentUser?.id),
        }).unwrap();
      }
      setMode(null);
    } catch {
      // Mutation state is displayed below.
    }
  }

  const mutationState =
    createState.isLoading || updateState.isLoading || resetState.isLoading || revokeState.isLoading;
  const mutationError =
    createState.error || updateState.error || resetState.error || revokeState.error;

  return (
    <div className="mx-auto max-w-[1400px] space-y-7">
      <PageHeader
        eyebrow={t('owner.usersEyebrow')}
        title={t('owner.usersTitle')}
        description={t('owner.usersDescription')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" />
            {t('owner.createUser')}
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          {users.isLoading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : users.isError ? (
            <div className="p-6">
              <ErrorState title={t('owner.usersLoadError')} onRetry={users.refetch} />
            </div>
          ) : (
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-navy/10 bg-white">
                  <Th>{t('owner.name')}</Th>
                  <Th>{t('common.username')}</Th>
                  <Th>{t('owner.role')}</Th>
                  <Th>{t('owner.status')}</Th>
                  <Th>{t('owner.lastSignIn')}</Th>
                  <Th>{t('owner.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => (
                  <tr key={user.id} className="border-b border-navy/8 last:border-0">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full border border-ball text-ball">
                          <UserRound className="size-4" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="font-cairo text-sm font-bold text-navy">{user.name}</p>
                          <p className="font-tajawal text-xs text-navy/45">
                            {user.phone || t('common.unavailable')}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>{user.username}</Td>
                    <Td>
                      <RoleBadge role={user.role} t={t} />
                    </Td>
                    <Td>
                      <Badge tone={user.isActive ? 'success' : 'neutral'}>
                        {user.isActive ? t('owner.active') : t('owner.inactive')}
                      </Badge>
                    </Td>
                    <Td>
                      {user.lastLoginAt
                        ? formatDateTime(user.lastLoginAt, locale)
                        : t('owner.neverSignedIn')}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          className="min-h-9 px-3"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                          {t('owner.edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          className="min-h-9 px-3"
                          onClick={() => openReset(user)}
                        >
                          {t('owner.resetPassword')}
                        </Button>
                        <Button
                          variant="ghost"
                          className="min-h-9 px-3"
                          onClick={() => openRevoke(user)}
                        >
                          <ShieldCheck className="size-4" aria-hidden="true" />
                          {t('owner.revokeSessions')}
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="divide-y divide-navy/8 md:hidden">
          {users.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
          ) : users.isError ? (
            <div className="p-5">
              <ErrorState title={t('owner.usersLoadError')} onRetry={users.refetch} />
            </div>
          ) : sortedUsers.length === 0 ? (
            <p className="p-6 font-tajawal text-sm text-navy/55">{t('owner.noUsers')}</p>
          ) : (
            sortedUsers.map((user) => (
              <div key={user.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ball text-ball">
                      <UserRound className="size-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-cairo text-sm font-bold text-navy">{user.name}</p>
                      <p className="truncate font-tajawal text-xs text-navy/45">@{user.username}</p>
                    </div>
                  </div>
                  <RoleBadge role={user.role} t={t} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Info
                    label={t('owner.status')}
                    value={user.isActive ? t('owner.active') : t('owner.inactive')}
                  />
                  <Info
                    label={t('owner.lastSignIn')}
                    value={
                      user.lastLoginAt
                        ? formatDateTime(user.lastLoginAt, locale)
                        : t('owner.neverSignedIn')
                    }
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="ghost" className="min-h-10 px-3" onClick={() => openEdit(user)}>
                    <Pencil className="size-4" aria-hidden="true" />
                    {t('owner.edit')}
                  </Button>
                  <Button variant="ghost" className="min-h-10 px-3" onClick={() => openReset(user)}>
                    {t('owner.resetPassword')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-10 px-3"
                    onClick={() => openRevoke(user)}
                  >
                    <RefreshCcw className="size-4" aria-hidden="true" />
                    {t('owner.revokeSessions')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal
        open={Boolean(mode)}
        onClose={() => !mutationState && setMode(null)}
        title={mode ? modalTitle(mode, t) : ''}
      >
        {mode && (
          <div className="space-y-5">
            {mode.type === 'create' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label={t('common.username')}
                    value={form.username ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    autoCapitalize="none"
                  />
                  <Input
                    label={t('owner.name')}
                    value={form.name ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label={t('owner.phone')}
                    value={form.phone ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        phone: e.target.value.replace(/\D/g, '').slice(0, 11),
                      }))
                    }
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="01xxxxxxxxx"
                  />
                  <Select
                    label={t('owner.role')}
                    value={form.role ?? 'STAFF'}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    options={roleOptions(t)}
                  />
                </div>
                <Input
                  type="password"
                  label={t('common.password')}
                  value={form.password ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  autoComplete="new-password"
                />
              </>
            )}

            {mode.type === 'edit' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label={t('owner.name')}
                    value={form.name ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <Input
                    label={t('owner.phone')}
                    value={form.phone ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        phone: e.target.value.replace(/\D/g, '').slice(0, 11),
                      }))
                    }
                    inputMode="numeric"
                    minLength={11}
                    maxLength={11}
                    placeholder="01xxxxxxxxx"
                  />
                </div>
                <Select
                  label={t('owner.role')}
                  value={form.role ?? 'STAFF'}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  options={roleOptions(t)}
                />
                <label className="flex min-h-12 items-center gap-3 rounded-xl border border-navy/10 bg-white px-4 py-3 font-cairo text-sm font-semibold text-navy">
                  <input
                    type="checkbox"
                    checked={Boolean(form.isActive)}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="size-4 accent-[var(--ball)]"
                  />
                  {t('owner.activeAccount')}
                </label>
                {mode.user.id === currentUser?.id && (
                  <p className="font-tajawal text-xs text-navy/55">{t('owner.selfEditHint')}</p>
                )}
              </>
            )}

            {mode.type === 'reset' && (
              <>
                <p className="font-tajawal text-sm leading-7 text-navy/65">
                  {t('owner.resetPasswordHint', { name: mode.user.name })}
                </p>
                <Input
                  type="password"
                  label={t('owner.newPassword')}
                  value={form.password ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  autoComplete="new-password"
                />
              </>
            )}

            {mode.type === 'revoke' && (
              <>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-cairo text-sm font-bold text-amber-900">
                    {t('owner.revokeWarning')}
                  </p>
                  <p className="mt-1 font-tajawal text-sm leading-6 text-amber-900/75">
                    {t('owner.revokeHint', { name: mode.user.name })}
                  </p>
                </div>
                <Input
                  label={t('owner.confirmation')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  hint={
                    mode.user.id === currentUser?.id
                      ? t('owner.selfRevokeConfirmHint')
                      : t('owner.revokeConfirmHint')
                  }
                />
              </>
            )}

            {mutationError && (
              <p className="font-tajawal text-sm text-red-700" role="alert">
                {errorMessage(mutationError, t)}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                loading={mutationState}
                onClick={submit}
                disabled={!canSubmit(mode, form, note, currentUser)}
              >
                {t('common.save')}
              </Button>
              <Button variant="ghost" onClick={() => setMode(null)} disabled={mutationState}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-5 py-4 text-start font-cairo text-xs font-bold uppercase tracking-wide text-navy/45">
      {children}
    </th>
  );
}

function Td({ children }) {
  return <td className="px-5 py-4 font-tajawal text-sm text-navy/75">{children}</td>;
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-navy/10 p-3">
      <p className="font-cairo text-[11px] font-semibold text-navy/45">{label}</p>
      <p className="mt-1 font-tajawal text-xs font-semibold text-navy">{value}</p>
    </div>
  );
}

function RoleBadge({ role, t }) {
  return (
    <Badge tone={role === 'OWNER' ? 'success' : role === 'ACCOUNTANT' ? 'info' : 'neutral'}>
      {t(`role.${role}`, role)}
    </Badge>
  );
}

function roleOptions(t) {
  return ['STAFF', 'ACCOUNTANT', 'OWNER'].map((role) => ({
    value: role,
    label: t(`role.${role}`, role),
  }));
}

function modalTitle(mode, t) {
  if (mode.type === 'create') return t('owner.createUser');
  if (mode.type === 'edit') return t('owner.editUser');
  if (mode.type === 'reset') return t('owner.resetPassword');
  return t('owner.revokeSessions');
}

function canSubmit(mode, form, note, currentUser) {
  if (mode.type === 'create')
    return form.username?.trim() && form.name?.trim() && form.password?.length >= 8 && form.role;
  if (mode.type === 'edit') return Boolean(form.name?.trim());
  if (mode.type === 'reset') return form.password?.length >= 8;
  if (mode.type === 'revoke') return mode.user.id !== currentUser?.id || Boolean(note.trim());
  return false;
}
