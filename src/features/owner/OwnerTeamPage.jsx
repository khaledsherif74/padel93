import { useTranslation } from 'react-i18next';
import OwnerUsersPage from './OwnerUsersPage';
import PageHeader from '../../shared/ui/PageHeader';

export default function OwnerTeamPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <PageHeader
        eyebrow={t('owner.teamEyebrow')}
        title={t('owner.allUsersTitle')}
        description={t('owner.allUsersDescription')}
      />
      <OwnerUsersPage embedded />
    </div>
  );
}
