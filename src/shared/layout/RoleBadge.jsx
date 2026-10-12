import Badge from '../ui/Badge';
import { useTranslation } from 'react-i18next';

export default function RoleBadge({ role }) {
  const { t } = useTranslation();
  return (
    <Badge className="border border-white/15 bg-white/10 text-white" tone="neutral">
      {t(`role.${role}`, role)}
    </Badge>
  );
}
