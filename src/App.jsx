import { Navigate, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { useGetMeQuery } from './app/api';
import { authInitialized } from './features/auth/authSlice';
import { selectAuth, selectRole } from './features/auth/authSelectors';
import RequireAuth from './features/auth/RequireAuth';
import RoleRoute from './features/auth/RoleRoute';
import LoginPage from './features/auth/LoginPage';
import ProfilePage from './features/profile/ProfilePage';
import StaffProfilePage from './features/profile/StaffProfilePage';
import AppShell from './shared/layout/AppShell';
import { NotFound, Unauthorized } from './shared/ui/NotFound';
import NotificationsPage from './features/staff/NotificationsPage';
import FinanceSubLayout from './features/accountant/FinanceSubLayout';
import DateAccessRequestsPage from './features/accountant/DateAccessRequestsPage';
import RequestsInboxPage from './features/accountant/RequestsInboxPage';
import StaffHistoryOverviewPage from './features/accountant/StaffHistoryOverviewPage';
import TeamPage from './features/accountant/TeamPage';
import HandoverPage from './features/staff/HandoverPage';
import StaffHomePage from './features/staff/StaffHomePage';
import AccountantDashboardPage from './features/accountant/AccountantDashboardPage';
import VerificationQueuePage from './features/accountant/VerificationQueuePage';
import HandoverInboxPage from './features/accountant/HandoverInboxPage';
import ReportsPage from './features/accountant/ReportsPage';
import BooklyPage from './features/accountant/BooklyPage';
import AccountantExpensesPage from './features/accountant/ExpensesPage';
import OwnerDashboardPage from './features/owner/OwnerDashboardPage';
import OwnerInboxPage from './features/owner/OwnerInboxPage';
import OwnerSettingsPage from './features/owner/OwnerSettingsPage';
import OwnerControlCenterPage from './features/owner/OwnerControlCenterPage';
import OwnerCorrectionsPage from './features/owner/OwnerCorrectionsPage';
import OwnerBookingsPage from './features/owner/OwnerBookingsPage';
import OwnerTeamPage from './features/owner/OwnerTeamPage';
import OwnerNotaManagementPage from './features/owner/OwnerNotaManagementPage';
import OwnerBookingDetailPage from './features/owner/OwnerBookingDetailPage';
import PaymentFlagsPage from './features/paymentFlags/PaymentFlagsPage';
import HubPage from './features/hub/HubPage';
import AttendanceBoardPage from './features/attendance/AttendanceBoardPage';
import SchedulePage from './features/schedule/SchedulePage';

function SessionBootstrap() {
  const dispatch = useDispatch();
  const auth = useSelector(selectAuth);
  const hasToken = Boolean(auth.token);
  const query = useGetMeQuery(undefined, { skip: !hasToken });
  useEffect(() => {
    if (!hasToken) dispatch(authInitialized());
  }, [dispatch, hasToken]);
  useEffect(() => {
    if (hasToken && (query.isSuccess || query.isError)) dispatch(authInitialized());
  }, [dispatch, hasToken, query.isSuccess, query.isError]);
  return null;
}

function NotificationsRoute() {
  const role = useSelector(selectRole);
  return role === 'STAFF' ? <Navigate to="/app/staff" replace /> : <NotificationsPage />;
}

function AppIndexRedirect() {
  const role = useSelector(selectRole);
  return role === 'STAFF' ? (
    <Navigate to="/app/staff" replace />
  ) : (
    <Navigate to="/app/hub" replace />
  );
}

function HubRoute() {
  return <HubPage />;
}

function StaffBlocked({ to = '/app/staff' }) {
  return <Navigate to={to} replace />;
}

export default function App() {
  return (
    <>
      <SessionBootstrap />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/app" element={<AppIndexRedirect />} />
            <Route path="/app/hub" element={<HubRoute />} />
            <Route path="/app/unauthorized" element={<Unauthorized />} />
            <Route path="/app/notifications" element={<NotificationsRoute />} />

            <Route element={<RoleRoute roles={['STAFF']} />}>
              <Route path="/app/staff" element={<StaffHomePage />} />
              <Route path="/app/staff/handover" element={<HandoverPage />} />
              <Route path="/app/staff/profile" element={<StaffProfilePage />} />
              <Route path="/app/staff/*" element={<Navigate to="/app/staff" replace />} />

              <Route path="/app/attendance" element={<StaffBlocked />} />
              <Route path="/app/schedule" element={<StaffBlocked />} />
            </Route>

            <Route element={<RoleRoute roles={['ACCOUNTANT', 'OWNER']} />}>
              <Route path="/app/accountant" element={<AccountantDashboardPage />} />
              <Route path="/app/accountant/profile" element={<StaffProfilePage />} />
              <Route
                path="/app/accountant/notas"
                element={<Navigate to="/app/accountant/staff-history" replace />}
              />
              <Route element={<FinanceSubLayout />}>
                <Route path="/app/accountant/verification" element={<VerificationQueuePage />} />
                <Route path="/app/accountant/handovers" element={<HandoverInboxPage />} />
                <Route
                  path="/app/accountant/shifts"
                  element={<Navigate to="/app/accountant/staff-history" replace />}
                />
                <Route
                  path="/app/accountant/staff-history"
                  element={<StaffHistoryOverviewPage />}
                />
                <Route path="/app/accountant/reports" element={<ReportsPage />} />
                <Route path="/app/accountant/bookly" element={<BooklyPage />} />
                <Route path="/app/accountant/requests" element={<DateAccessRequestsPage />} />
                <Route path="/app/accountant/inbox" element={<RequestsInboxPage />} />
                <Route
                  path="/app/accountant/staff/:id"
                  element={<Navigate to="/app/accountant/staff-history" replace />}
                />
                <Route
                  path="/app/accountant/staff"
                  element={<Navigate to="/app/accountant/staff-history" replace />}
                />
                <Route path="/app/accountant/team" element={<TeamPage />} />
                <Route path="/app/accountant/attendance" element={<AttendanceBoardPage />} />
                <Route path="/app/accountant/schedule" element={<SchedulePage />} />
              </Route>
            </Route>

            <Route element={<RoleRoute roles={['ACCOUNTANT']} />}>
              <Route element={<FinanceSubLayout />}>
                <Route path="/app/accountant/expenses" element={<AccountantExpensesPage />} />
              </Route>
            </Route>

            <Route element={<RoleRoute roles={['OWNER']} />}>
              <Route path="/app/profile" element={<ProfilePage />} />
              <Route path="/app/owner" element={<OwnerDashboardPage />} />
              <Route path="/app/owner/inbox" element={<OwnerInboxPage />} />
              <Route path="/app/owner/bookings" element={<OwnerBookingsPage />} />
              <Route path="/app/owner/bookings/:id" element={<OwnerBookingDetailPage />} />
              <Route path="/app/owner/payment-flags" element={<PaymentFlagsPage />} />
              <Route path="/app/owner/team" element={<OwnerTeamPage />} />
              <Route
                path="/app/owner/users"
                element={<Navigate to="/app/owner/team?tab=users" replace />}
              />
              <Route path="/app/owner/notas" element={<OwnerNotaManagementPage />} />
              <Route path="/app/owner/settings" element={<OwnerSettingsPage />} />
              <Route path="/app/owner/corrections" element={<OwnerCorrectionsPage />} />
              <Route path="/app/owner/control" element={<OwnerControlCenterPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
