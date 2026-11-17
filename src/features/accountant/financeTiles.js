import {
  Banknote,
  CalendarDays,
  Clock3,
  ReceiptText,
  RefreshCw,
  UserPlus,
  BarChart3,
} from 'lucide-react';
import { FEATURES } from '../../shared/config/features';

const TILES = [
  { to: '/app/accountant/team', key: 'accountant.navTeam', icon: UserPlus },
  { to: '/app/accountant/reports', key: 'accountant.navReports', icon: BarChart3 },
  {
    to: '/app/accountant/expenses',
    key: 'accountant.navExpenses',
    icon: ReceiptText,
    roles: ['ACCOUNTANT'],
  },
  { to: '/app/accountant/bookly', key: 'accountant.navBookly', icon: RefreshCw },
  { to: '/app/accountant/schedule', key: 'accountant.navSchedule', icon: CalendarDays },
  { to: '/app/accountant/attendance', key: 'accountant.navAttendance', icon: Clock3 },
  {
    to: '/app/accountant/salaries',
    key: 'accountant.navSalaries',
    icon: Banknote,
    flag: 'salaries',
  },
];

export function getManageTiles(role, features = FEATURES) {
  return TILES.filter(
    (tile) => (!tile.flag || features[tile.flag]) && (!tile.roles || tile.roles.includes(role)),
  );
}
