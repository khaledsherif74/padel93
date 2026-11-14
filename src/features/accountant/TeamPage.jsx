import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCreateUserMutation,
  useGetStaffUsersQuery,
  useResetUserPasswordMutation,
  useUpdateUserMutation,
} from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Card from '../../shared/ui/Card';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';
import Input from '../../shared/ui/Input';
import PageHeader from '../../shared/ui/PageHeader';
import Skeleton from '../../shared/ui/Skeleton';

const emptyForm = { name: '', username: '', phone: '', password: '' };
const validPhone = (value) => value === '' || /^\d{11}$/.test(value);
const validForm = (f) =>
  f.name.trim().length >= 2 &&
  /^[a-z0-9._-]{3,32}$/.test(f.username.trim().toLowerCase()) &&
  validPhone(f.phone) &&
  f.password.length >= 8;

function ResetPassword({ person, t }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [reset, state] = useResetUserPasswordMutation();

  async function submit(event) {
    event.preventDefault();
    if (password.length < 8) return;
    try {
      await reset({ id: person.id, password }).unwrap();
      setDone(true);
      setOpen(false);
      setPassword('');
    } catch {
      // The error is shown below the field.
    }
  }

  if (!open) {
    return (
      <>
        <Button variant="ghost" onClick={() => { setOpen(true); setDone(false); }}>
          {t('accountant.resetPassword')}
        </Button>
        {done && <span className="font-tajawal text-xs text-emerald-800">{t('accountant.passwordReset')}</span>}
      </>
    );
  }
  return (
    <form className="w-full space-y-2" onSubmit={submit}>
      <Input
        label={t('accountant.newPassword')}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        hint={t('accountant.passwordHint')}
      />
      {state.error && <p className="font-tajawal text-sm text-red-700" role="alert">{errorMessage(state.error, t)}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={state.isLoading} disabled={password.length < 8}>
          {t('accountant.resetPassword')}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
      </div>
    </form>
  );
}

export default function TeamPage() {
  const { t } = useTranslation();
  const staff = useGetStaffUsersQuery();
  const [createUser, createState] = useCreateUserMutation();
  const [updateUser, updateState] = useUpdateUserMutation();
  const [form, setForm] = useState(emptyForm);
  const [adding, setAdding] = useState(false);
  const patch = (changes) => setForm((f) => ({ ...f, ...changes }));

  async function submit(event) {
    event.preventDefault();
    if (!validForm(form)) return;
    try {
      await createUser({
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        ...(form.phone ? { phone: form.phone } : {}),
        password: form.password,
        role: 'STAFF',
      }).unwrap();
      setForm(emptyForm);
      setAdding(false);
    } catch {
      // The error is shown below the form.
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={t('accountant.navSection')}
        title={t('accountant.teamTitle')}
        description={t('accountant.teamHint')}
        actions={
          !adding && <Button onClick={() => setAdding(true)}>{t('accountant.addStaff')}</Button>
        }
      />

      {adding && (
        <Card className="p-4 sm:p-5">
          <form className="space-y-3" onSubmit={submit}>
            <Input label={t('accountant.fullName')} value={form.name} onChange={(e) => patch({ name: e.target.value })} />
            <Input
              label={t('accountant.username')}
              autoCapitalize="none"
              value={form.username}
              onChange={(e) => patch({ username: e.target.value })}
              hint={t('accountant.usernameHint')}
            />
            <Input
              label={t('accountant.phoneOptional')}
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => patch({ phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
            />
            <Input
              label={t('accountant.newPassword')}
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => patch({ password: e.target.value })}
              hint={t('accountant.passwordHint')}
            />
            {createState.error && (
              <p className="font-tajawal text-sm text-red-700" role="alert">{errorMessage(createState.error, t)}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" loading={createState.isLoading} disabled={!validForm(form)}>
                {t('accountant.createStaff')}
              </Button>
              <Button variant="ghost" onClick={() => { setAdding(false); setForm(emptyForm); }}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {staff.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : staff.isError ? (
        <ErrorState title={t('errors.generic')} description={errorMessage(staff.error, t)} onRetry={staff.refetch} />
      ) : staff.data.items.length === 0 ? (
        <EmptyState title={t('accountant.noStaff')} description={t('accountant.teamHint')} />
      ) : (
        <ul className="space-y-3">
          {staff.data.items.map((person) => (
            <li key={person.id}>
              <Card className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-cairo text-base font-extrabold text-navy">{person.name}</p>
                    <p className="font-tajawal text-xs text-navy/55">@{person.username}</p>
                  </div>
                  <Badge tone={person.isActive ? 'success' : 'neutral'}>
                    {person.isActive ? t('accountant.active') : t('accountant.inactive')}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => updateUser({ id: person.id, isActive: !person.isActive })}
                    disabled={updateState.isLoading}
                  >
                    {person.isActive ? t('accountant.deactivate') : t('accountant.activate')}
                  </Button>
                  <ResetPassword person={person} t={t} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {updateState.error && (
        <p className="font-tajawal text-sm text-red-700" role="alert">{errorMessage(updateState.error, t)}</p>
      )}
    </div>
  );
}
