import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectAuth } from './authSelectors';
import Skeleton from '../../shared/ui/Skeleton';

export default function RequireAuth() {
  const auth = useSelector(selectAuth);
  const location = useLocation();
  const { t } = useTranslation();

  if (!auth.token && auth.initialized) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!auth.initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm space-y-3" aria-busy="true">
          <p className="sr-only" role="status" aria-live="polite">
            {t('common.loading')}
          </p>
          <Skeleton className="mx-auto h-16 w-16 rounded-2xl" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return <Outlet />;
}
