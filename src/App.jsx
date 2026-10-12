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
import AppShell from './shared/layout/AppShell';
import { NotFound, Unauthorized } from './shared/ui/NotFound';
import AppointmentsPage from './features/staff/AppointmentsPage';
import AppointmentDetailPage from './features/staff/AppointmentDetailPage';
import QuickAddPage from './features/staff/QuickAddPage';
import StaffExpensesPage from './features/staff/ExpensesPage';
import HandoverPage from './features/staff/HandoverPage';
import CloseShiftPage from './features/staff/CloseShiftPage';
import RecordsPage from './features/staff/RecordsPage';
import NotificationsPage from './features/staff/NotificationsPage';
import StaffHomePage from './features/staff/StaffHomePage';
import AccountantDashboardPage from './features/accountant/AccountantDashboardPage';
import VerificationQueuePage from './features/accountant/VerificationQueuePage';
import HandoverInboxPage from './features/accountant/HandoverInboxPage';
import AccountantShiftsPage from './features/accountant/ShiftsPage';
import ReportsPage from './features/accountant/ReportsPage';
import BooklyPage from './features/accountant/BooklyPage';
import AccountantExpensesPage from './features/accountant/ExpensesPage';
import OwnerDashboardPage from './features/owner/OwnerDashboardPage';
import OwnerInboxPage from './features/owner/OwnerInboxPage';
import OwnerUsersPage from './features/owner/OwnerUsersPage';
import OwnerSettingsPage from './features/owner/OwnerSettingsPage';
import OwnerControlCenterPage from './features/owner/OwnerControlCenterPage';
import OwnerCorrectionsPage from './features/owner/OwnerCorrectionsPage';
import OwnerBookingsPage from './features/owner/OwnerBookingsPage';
import OwnerBookingDetailPage from './features/owner/OwnerBookingDetailPage';
import PaymentFlagsPage from './features/paymentFlags/PaymentFlagsPage';

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

function RoleHomeRedirect() {
  const role = useSelector(selectRole);
  if (role === 'STAFF') return <Navigate to="/app/staff" replace />;
  if (role === 'ACCOUNTANT') return <Navigate to="/app/accountant" replace />;
  return <Navigate to="/app/owner" replace />;
}

export default function App() {
  return (
    <>
      <SessionBootstrap />

      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/app" element={<RoleHomeRedirect />} />
            <Route path="/app/profile" element={<ProfilePage />} />
            <Route path="/app/unauthorized" element={<Unauthorized />} />
            <Route path="/app/notifications" element={<NotificationsPage />} />

            <Route element={<RoleRoute roles={['STAFF']} />}>
              <Route path="/app/staff" element={<StaffHomePage />} />
              <Route path="/app/staff/appointments" element={<AppointmentsPage />} />
              <Route path="/app/staff/appointments/:id" element={<AppointmentDetailPage />} />
              <Route path="/app/staff/quick-add" element={<QuickAddPage />} />
              <Route path="/app/staff/expenses" element={<StaffExpensesPage />} />
              <Route path="/app/staff/records" element={<RecordsPage />} />
              <Route path="/app/staff/payment-flags" element={<PaymentFlagsPage />} />
              <Route path="/app/staff/handover" element={<HandoverPage />} />
              <Route path="/app/staff/shifts/:id/close" element={<CloseShiftPage />} />
              <Route path="/app/staff/notifications" element={<NotificationsPage />} />
            </Route>

            <Route element={<RoleRoute roles={['ACCOUNTANT', 'OWNER']} />}>
              <Route path="/app/accountant" element={<AccountantDashboardPage />} />
              <Route path="/app/accountant/verification" element={<VerificationQueuePage />} />
              <Route path="/app/accountant/handovers" element={<HandoverInboxPage />} />
              <Route path="/app/accountant/shifts" element={<AccountantShiftsPage />} />
              <Route path="/app/accountant/reports" element={<ReportsPage />} />
              <Route path="/app/accountant/bookly" element={<BooklyPage />} />
            </Route>

            <Route element={<RoleRoute roles={['ACCOUNTANT']} />}>
              <Route path="/app/accountant/expenses" element={<AccountantExpensesPage />} />
            </Route>

            <Route element={<RoleRoute roles={['OWNER']} />}>
              <Route path="/app/owner" element={<OwnerDashboardPage />} />
              <Route path="/app/owner/inbox" element={<OwnerInboxPage />} />
              <Route path="/app/owner/bookings" element={<OwnerBookingsPage />} />
              <Route path="/app/owner/bookings/:id" element={<OwnerBookingDetailPage />} />
              <Route path="/app/owner/payment-flags" element={<PaymentFlagsPage />} />
              <Route path="/app/owner/users" element={<OwnerUsersPage />} />
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
