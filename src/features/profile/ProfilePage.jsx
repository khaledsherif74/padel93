import { CircleUserRound, KeyRound, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useChangePasswordMutation, useUpdateMeMutation } from '../../app/api';
import { selectUser } from '../auth/authSelectors';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import RoleBadge from '../../shared/layout/RoleBadge';
import PageHeader from '../../shared/ui/PageHeader';
import { errorMessage } from '../../shared/lib/apiError';

export default function ProfilePage() {
  const { t } = useTranslation();
  const user = useSelector(selectUser);
  const [updateMe, updateState] = useUpdateMeMutation();
  const [changePassword, passwordState] = useChangePasswordMutation();
  const [notice, setNotice] = useState('');

  const profile = useForm({ defaultValues: { name: '', phone: '' } });
  const password = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  useEffect(() => {
    profile.reset({ name: user?.name ?? '', phone: user?.phone ?? '' });
  }, [profile, user?.name, user?.phone]);

  async function saveProfile(values) {
    setNotice('');
    try {
      await updateMe({ name: values.name.trim(), phone: values.phone.trim() || null }).unwrap();
      setNotice(t('profile.profileSaved'));
    } catch {
      // Error rendered below.
    }
  }

  async function savePassword(values) {
    setNotice('');
    if (values.newPassword !== values.confirmPassword) {
      password.setError('confirmPassword', { message: t('profile.passwordMismatch') });
      return;
    }

    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }).unwrap();
      password.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setNotice(t('profile.passwordSaved'));
    } catch {
      // Error rendered below.
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <PageHeader eyebrow={t('common.profile')} title={t('profile.title')} description={t('profile.description')} />

      <Card className="overflow-hidden">
        <div className="bg-navy p-6 text-white sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full border border-ball text-ball">
              <CircleUserRound className="size-7" strokeWidth={1.7} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-cairo text-2xl font-black">{user?.name}</h1>
              <div className="mt-2"><RoleBadge role={user?.role} /></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 text-navy sm:p-8">
          <form className="grid gap-5 sm:grid-cols-2" onSubmit={profile.handleSubmit(saveProfile)}>
            <Input label={t('profile.name')} {...profile.register('name', { required: true })} />
            <Input label={t('profile.phone')} {...profile.register('phone')} />
            <div className="sm:col-span-2"><Info label={t('common.username')} value={user?.username} /></div>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Button type="submit" loading={updateState.isLoading}><Save className="size-4" aria-hidden="true" />{t('common.save')}</Button>
              {updateState.error && <p className="font-tajawal text-sm text-red-700" role="alert">{errorMessage(updateState.error, t)}</p>}
            </div>
          </form>
        </div>
      </Card>

      <Card className="bg-white p-6 text-navy sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
            <KeyRound className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-cairo text-xl font-extrabold text-navy">{t('profile.changePassword')}</h2>
            <p className="mt-1 font-tajawal text-sm leading-6 text-navy/55">{t('profile.changePasswordHint')}</p>
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={password.handleSubmit(savePassword)}>
          <Input type="password" label={t('profile.currentPassword')} autoComplete="current-password" {...password.register('currentPassword', { required: true })} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input type="password" label={t('profile.newPassword')} autoComplete="new-password" {...password.register('newPassword', { required: true, minLength: 8 })} />
            <Input type="password" label={t('profile.confirmPassword')} autoComplete="new-password" error={password.formState.errors.confirmPassword?.message} {...password.register('confirmPassword', { required: true })} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={passwordState.isLoading}><KeyRound className="size-4" aria-hidden="true" />{t('profile.savePassword')}</Button>
            {passwordState.error && <p className="font-tajawal text-sm text-red-700" role="alert">{errorMessage(passwordState.error, t)}</p>}
          </div>
        </form>
      </Card>

      {notice && <div className="rounded-xl border border-ball/60 bg-ball/10 px-4 py-3 font-tajawal text-sm font-semibold text-navy" role="status">{notice}</div>}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-navy/10 bg-white p-4">
      <p className="font-cairo text-xs font-semibold text-navy/45">{label}</p>
      <p className="mt-1 font-tajawal text-base font-semibold text-navy">{value || '—'}</p>
    </div>
  );
}
