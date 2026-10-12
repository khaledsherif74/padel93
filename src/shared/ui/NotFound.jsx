import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Card from './Card';
import Button from './Button';

export function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-8 text-center">
        <h1 className="font-cairo text-4xl font-black text-navy">404</h1>
        <p className="mt-2 font-tajawal text-sm leading-6 text-navy/60">{t('errors.pageNotFound')}</p>
        <Link to="/app" className="mt-5 inline-block">
          <Button>{t('common.backHome')}</Button>
        </Link>
      </Card>
    </div>
  );
}

export function Unauthorized() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-8 text-center">
        <h1 className="font-cairo text-2xl font-black text-navy">{t('errors.accessDeniedTitle')}</h1>
        <p className="mt-2 font-tajawal text-sm leading-6 text-navy/60">{t('errors.accessDeniedDescription')}</p>
        <Link to="/app" className="mt-5 inline-block">
          <Button>{t('common.backHome')}</Button>
        </Link>
      </Card>
    </div>
  );
}
