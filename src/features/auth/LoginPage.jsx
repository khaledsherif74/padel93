import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLoginMutation } from '../../app/api';
import { selectAuth } from './authSelectors';
import Input from '../../shared/ui/Input';
import Button from '../../shared/ui/Button';
import Logo from '../../shared/ui/Logo';
import LanguageSwitcher from '../../shared/layout/LanguageSwitcher';
import { getApiError } from '../../shared/lib/apiError';
import { authSet } from './authSlice';

const schema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const auth = useSelector(selectAuth);
  const [login, { isLoading, error: loginError }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (auth.token && auth.user) {
      navigate('/app', { replace: true });
    }
  }, [auth.token, auth.user, navigate]);

  async function onSubmit(values) {
    try {
      const data = await login(values).unwrap();
      dispatch(authSet(data));
      const from = location.state?.from;
      navigate(from && from.startsWith('/app') ? from : '/app', { replace: true });
    } catch {
      // Error is read from mutation state below.
    }
  }

  const apiError = getApiError(loginError);
  const visibleMessage =
    apiError.code === 'BAD_CREDENTIALS'
      ? t('auth.invalidCredentials')
      : apiError.code === 'NETWORK_ERROR'
        ? t('errors.network')
        : apiError.code !== 'UNKNOWN' && apiError.code !== '200' && apiError.message
          ? apiError.message
          : null;

  return (
    <div className="min-h-screen bg-white dark:bg-navy">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-navy px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div
            className="absolute inset-y-0 end-0 w-[18%] bg-court/35 diagonal-cut"
            aria-hidden="true"
          />
          <div className="relative z-10">
            <Logo priority className="w-52 rounded-xl p-2" />
            <div className="mt-14 max-w-xl">
              <h1 className="mt-4 font-cairo text-5xl font-black leading-[1.05] xl:text-6xl">
                {t('auth.welcome')}
              </h1>
              <p className="mt-6 max-w-lg font-tajawal text-lg leading-8 text-white/75">
                {t('auth.subtitle')}
              </p>
            </div>
          </div>
          <div className="relative z-10 max-w-lg border-s-2 border-ball ps-5">
            <p className="font-tajawal text-sm leading-7 text-white/70">{t('auth.secure')}</p>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center bg-white px-5 py-8 dark:bg-night sm:px-8">
          <div className="absolute end-4 top-4 sm:end-7 sm:top-7">
            <LanguageSwitcher />
          </div>
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Logo className="w-44 rounded-xl bg-white p-1 shadow-sm" />
            </div>
            <div className="mb-8">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full border border-ball text-ball">
                <ShieldCheck className="size-6" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <h2 className="font-cairo text-4xl font-black leading-tight text-navy dark:text-white">
                {t('auth.welcome')}
              </h2>
              <p className="mt-3 font-tajawal text-base text-navy/60 dark:text-white/60">
                {t('auth.signInHint')}
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Input
                label={t('common.username')}
                placeholder={t('auth.usernamePlaceholder')}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                error={errors.username ? t('auth.required') : undefined}
                {...register('username')}
              />
              <Input
                label={t('common.password')}
                type="password"
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete="current-password"
                error={errors.password ? t('auth.required') : undefined}
                {...register('password')}
              />

              {location.search.includes('reason=session') && (
                <div className="rounded-xl border border-edge/20 bg-court/5 px-4 py-3 font-tajawal text-sm text-navy dark:text-white">
                  {t('auth.sessionExpired')}
                </div>
              )}

              {visibleMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-tajawal text-sm text-red-800">
                  {visibleMessage}
                </div>
              )}

              <Button type="submit" className="w-full" loading={isLoading}>
                {isLoading ? t('auth.signingIn') : t('common.login')}
              </Button>
            </form>

            <p className="mt-8 font-tajawal text-xs leading-6 text-navy/45 dark:text-white/40">
              {t('brand.tagline')}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
