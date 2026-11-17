import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CalendarClock,
  ClipboardCheck,
  Home,
  Inbox,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  UsersRound,
  WalletCards,
  Users,
  Clock3,
  FileText,
} from 'lucide-react';

export const ownerDashboardLink = {
  to: '/app/owner',
  key: 'owner.navDashboard',
  icon: Home,
  end: true,
};
export const ownerProfileLink = { to: '/app/profile', key: 'common.profile', icon: UsersRound };

export const ownerNavigationGroups = [
  {
    key: 'owner.navOperations',
    items: [
      { to: '/app/owner/bookings', key: 'owner.navAppointments', icon: CalendarDays },
      { to: '/app/accountant/bookly', key: 'owner.navBookly', icon: RefreshCw },
    ],
  },
  {
    key: 'owner.navFinance',
    items: [
      { to: '/app/owner/inbox', key: 'owner.navInbox', icon: ClipboardCheck },
      { to: '/app/owner/payment-flags', key: 'owner.paymentFlags', icon: AlertTriangle },
      { to: '/app/accountant/verification', key: 'owner.navVerification', icon: ShieldCheck },
      { to: '/app/accountant/handovers', key: 'owner.navHandovers', icon: Send },
      { to: '/app/accountant/inbox', key: 'owner.navFinanceRequests', icon: Inbox },
      { to: '/app/accountant/shifts', key: 'owner.navShifts', icon: WalletCards },
      { to: '/app/accountant/reports', key: 'owner.navReports', icon: BarChart3 },
      { to: '/app/owner/corrections', key: 'owner.navCorrections', icon: ShieldCheck },
      { to: '/app/owner/notas', key: 'owner.notaManagementTitle', icon: FileText },
    ],
  },
  {
    key: 'owner.navTeam',
    items: [
      { to: '/app/owner/team', key: 'owner.navTeam', icon: UsersRound },
      { to: '/app/accountant/staff', key: 'owner.navStaffMoney', icon: Users },
      { to: '/app/accountant/attendance', key: 'owner.navAttendance', icon: Clock3 },
      { to: '/app/accountant/schedule', key: 'owner.navSchedule', icon: CalendarClock },
    ],
  },
  {
    key: 'owner.navSystem',
    items: [
      { to: '/app/owner/settings', key: 'owner.navSettings', icon: Settings2 },
      { to: '/app/owner/control', key: 'owner.navControl', icon: ShieldCheck },
    ],
  },
];
