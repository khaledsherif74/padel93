import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { ArrowLeft } from 'lucide-react';
import { selectRole } from '../auth/authSelectors';

export default function FinanceSubLayout() {
  const { t } = useTranslation();
  const role = useSelector(selectRole);
  return (
    <div className="space-y-4">
      {role === 'ACCOUNTANT' && (
        <Link
          to="/app/accountant"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-1 font-cairo text-sm font-bold text-edge outline-none focus-visible:ring-2 focus-visible:ring-edge"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t('accountant.backToDashboard')}
        </Link>
      )}
      <Outlet />
    </div>
  );
}
