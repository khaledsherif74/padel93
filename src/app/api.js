import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  authLoggedOut,
  authPermissionsUpdated,
  authSet,
  authTokenReplaced,
} from '../features/auth/authSlice';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:9000/api/v1').replace(/\/$/, '');

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');
    return headers;
  },
});

const baseQueryWithAuth = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401 && result.error?.data?.error?.code === 'UNAUTHENTICATED') {
    api.dispatch(authLoggedOut());
    if (window.location.pathname !== '/login') {
      window.location.assign('/login?reason=session');
    }
  }
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    'Auth',
    'Settings',
    'Shift',
    'Appointment',
    'Income',
    'Expense',
    'Transfer',
    'Notification',
    'Goal',
    'Receipt',
    'Dashboard',
    'Report',
    'Bookly',
    'Users',
    'Permissions',
    'Audit',
    'PaymentFlag',
    'ClosingSummary',
    'StaffDateAccess',
    'Hub',
    'Attendance',
    'Schedule',
    'Payroll',
    'OwnerNota',
    'OwnerNotaOwners',
  ],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: (response) => ({
        token: response.token,
        user: response.user,
        permissions: response.permissions ?? response.user?.permissions ?? {},
      }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(authSet(data));
        } catch {
          /* LoginPage renders the mutation error. */
        }
      },
      invalidatesTags: ['Auth'],
    }),

    getMe: builder.query({
      query: () => '/auth/me',
      providesTags: ['Auth'],
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            authSet({
              token: sessionStorage.getItem('padel93.auth.token'),
              user: data,
              permissions: data.permissions ?? {},
            }),
          );
          dispatch(authPermissionsUpdated(data.permissions ?? {}));
        } catch {
          /* Global baseQuery handles 401. */
        }
      },
    }),

    changePassword: builder.mutation({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.token) dispatch(authTokenReplaced(data.token));
        } catch {
          /* Form renders the mutation error. */
        }
      },
      invalidatesTags: ['Auth'],
    }),

    updateMe: builder.mutation({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      invalidatesTags: ['Auth'],
      async onQueryStarted(_arg, { queryFulfilled, dispatch, getState }) {
        try {
          const { data } = await queryFulfilled;
          const current = getState().auth;
          dispatch(
            authSet({
              token: current.token,
              user: { ...current.user, ...data },
              permissions: current.permissions,
            }),
          );
        } catch {
          /* Form renders mutation error. */
        }
      },
    }),

    getUsers: builder.query({ query: () => '/users', providesTags: ['Users'] }),
    getStaffUsers: builder.query({ query: () => '/users/staff', providesTags: ['Users'] }),
    getFinanceStaffBoard: builder.query({
      query: (date) => ({ url: '/finance/staff', params: date ? { date } : undefined }),
      providesTags: ['Dashboard', 'Income', 'Transfer', 'Shift'],
    }),
    getFinanceStaffHistory: builder.query({
      query: (id) => `/finance/staff/${id}/history`,
      providesTags: ['Income', 'Transfer', 'Shift'],
    }),
    getFinanceStaffDailyHistory: builder.query({
      query: (date) => ({ url: '/finance/staff-history', params: date ? { date } : undefined }),
      providesTags: ['Income', 'Shift', 'OwnerNota'],
    }),
    getFinanceEdits: builder.query({
      query: (date) => ({ url: '/finance/edits', params: date ? { date } : undefined }),
      providesTags: ['Income'],
    }),
    verifyIncomeBatch: builder.mutation({
      query: ({ ids }) => ({
        url: '/incomes/verify-batch',
        method: 'POST',
        body: { ids, decision: 'VERIFIED' },
      }),
      invalidatesTags: ['Income', 'Dashboard', 'Report'],
    }),
    createUser: builder.mutation({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['Users', 'Audit'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Users', 'Auth', 'Audit'],
    }),
    resetUserPassword: builder.mutation({
      query: ({ id, password }) => ({
        url: `/users/${id}/reset-password`,
        method: 'POST',
        body: { password },
      }),
      invalidatesTags: ['Users', 'Audit'],
    }),
    revokeUserSessions: builder.mutation({
      query: ({ id, confirm = false }) => ({
        url: `/users/${id}/revoke-sessions`,
        method: 'POST',
        body: { confirm },
      }),
      invalidatesTags: ['Users', 'Auth', 'Audit'],
    }),

    updateSettings: builder.mutation({
      query: (body) => ({ url: '/settings', method: 'PUT', body }),
      invalidatesTags: ['Settings', 'Dashboard', 'Goal', 'Hub'],
    }),
    getPermissions: builder.query({
      query: () => '/settings/permissions',
      providesTags: ['Permissions'],
    }),
    updatePermissions: builder.mutation({
      query: (body) => ({ url: '/settings/permissions', method: 'PUT', body }),
      invalidatesTags: ['Permissions', 'Auth', 'Audit'],
    }),
    resetPermissions: builder.mutation({
      query: () => ({ url: '/settings/permissions/reset', method: 'POST' }),
      invalidatesTags: ['Permissions', 'Auth', 'Audit'],
    }),

    setGoal: builder.mutation({
      query: ({ month, goalHours }) => ({
        url: `/goals/${month}`,
        method: 'PUT',
        body: { goalHours },
      }),
      invalidatesTags: ['Goal', 'Dashboard', 'Audit'],
    }),

    createExpenseCategory: builder.mutation({
      query: (body) => ({ url: '/expenses/categories', method: 'POST', body }),
      invalidatesTags: ['Expense', 'Audit'],
    }),
    updateExpenseCategory: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/expenses/categories/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Expense', 'Audit'],
    }),

    getAudit: builder.query({
      query: (params) => ({ url: '/audit', params }),
      providesTags: ['Audit'],
    }),
    getAuditExport: builder.mutation({
      query: (params) => ({
        url: '/audit/export',
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),

    getSettings: builder.query({ query: () => '/settings', providesTags: ['Settings'] }),
    getHub: builder.query({ query: () => '/hub', providesTags: ['Hub'] }),

    getAttendanceMe: builder.query({ query: () => '/attendance/me', providesTags: ['Attendance'] }),
    getMySchedule: builder.query({ query: () => '/schedule/me', providesTags: ['Schedule'] }),
    uploadAttendancePhoto: builder.mutation({
      query: (formData) => ({ url: '/attendance/photos', method: 'POST', body: formData }),
    }),
    attendanceClock: builder.mutation({
      query: ({ action, body }) => ({ url: `/attendance/${action}`, method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),
    getAttendanceBoard: builder.query({
      query: (date) => ({ url: '/attendance/board', params: date ? { date } : {} }),
      providesTags: ['Attendance'],
    }),
    getAttendanceRecords: builder.query({
      query: (params) => ({ url: '/attendance/records', params }),
      providesTags: ['Attendance'],
    }),
    adjustAttendance: builder.mutation({
      query: ({ id, body }) => ({ url: `/attendance/records/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Attendance'],
    }),
    getAttendancePhoto: builder.query({
      query: (id) => ({
        url: `/attendance/photos/${id}/file`,
        responseHandler: (response) => response.blob(),
      }),
    }),
    getSchedule: builder.query({
      query: ({ from, days = 7 }) => ({ url: '/schedule', params: { from, days } }),
      providesTags: ['Schedule'],
    }),
    createShift: builder.mutation({
      query: (body) => ({ url: '/schedule/shifts', method: 'POST', body }),
      invalidatesTags: ['Schedule'],
    }),
    updateShift: builder.mutation({
      query: ({ id, body }) => ({ url: `/schedule/shifts/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Schedule'],
    }),
    deleteShift: builder.mutation({
      query: (id) => ({ url: `/schedule/shifts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Schedule'],
    }),
    publishSchedule: builder.mutation({
      query: (body) => ({ url: '/schedule/publish', method: 'POST', body }),
      invalidatesTags: ['Schedule'],
    }),
    copyScheduleWeek: builder.mutation({
      query: (body) => ({ url: '/schedule/copy-week', method: 'POST', body }),
      invalidatesTags: ['Schedule'],
    }),
    getPayrollRules: builder.query({ query: () => '/payroll/rules', providesTags: ['Payroll'] }),
    updatePayrollRules: builder.mutation({
      query: (body) => ({ url: '/payroll/rules', method: 'PUT', body }),
      invalidatesTags: ['Payroll'],
    }),

    getDashboardBalances: builder.query({
      query: () => '/dashboard/balances',
      providesTags: ['Dashboard', 'Shift', 'Income', 'Expense', 'Transfer', 'PaymentFlag'],
    }),
    createOwnerNota: builder.mutation({
      query: (body) => ({ url: '/owner-notas', method: 'POST', body }),
      invalidatesTags: ['Dashboard', 'Audit', 'OwnerNota', 'Shift'],
    }),
    getOwnerNotas: builder.query({
      query: ({ limit = 100, cursor } = {}) => ({
        url: '/owner-notas',
        params: { limit, ...(cursor ? { cursor } : {}) },
      }),
      providesTags: ['OwnerNota'],
    }),
    getOwnerNotaOwners: builder.query({
      query: () => '/owner-notas/owners',
      providesTags: ['OwnerNotaOwners'],
    }),
    createOwnerNotaOwner: builder.mutation({
      query: (body) => ({ url: '/owner-notas/owners', method: 'POST', body }),
      invalidatesTags: ['OwnerNotaOwners', 'OwnerNota', 'Audit'],
    }),
    updateOwnerNotaOwner: builder.mutation({
      query: ({ id, body }) => ({ url: `/owner-notas/owners/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['OwnerNotaOwners', 'OwnerNota', 'Audit'],
    }),
    updateOwnerNota: builder.mutation({
      query: ({ id, body }) => ({ url: `/owner-notas/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['OwnerNota', 'Dashboard', 'Audit'],
    }),
    getDayReport: builder.query({
      query: (date) => ({ url: '/dashboard/day', params: date ? { date } : {} }),
      providesTags: ['Report'],
    }),
    getMonthReport: builder.query({
      query: (month) => ({ url: '/dashboard/month', params: month ? { month } : {} }),
      providesTags: ['Report'],
    }),
    getYearReport: builder.query({
      query: (year) => ({ url: '/dashboard/year', params: year ? { year } : {} }),
      providesTags: ['Report'],
    }),

    getCurrentShifts: builder.query({ query: () => '/shifts/current', providesTags: ['Shift'] }),
    openShift: builder.mutation({
      query: (body) => ({ url: '/shifts/open', method: 'POST', body }),
      invalidatesTags: ['Shift', 'Goal'],
    }),
    closeShift: builder.mutation({
      query: ({ id, body }) => ({ url: `/shifts/${id}/close`, method: 'POST', body }),
      invalidatesTags: [
        'Shift',
        'Appointment',
        'Income',
        'Expense',
        'Transfer',
        'Goal',
        'PaymentFlag',
        'Dashboard',
        'ClosingSummary',
      ],
    }),
    getShifts: builder.query({
      query: (params) => ({ url: '/shifts', params }),
      providesTags: ['Shift'],
    }),
    getShift: builder.query({
      query: (id) => `/shifts/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Shift', id }],
    }),

    getAppointmentCourts: builder.query({
      query: () => '/appointments/courts',
      providesTags: ['Appointment'],
    }),
    getAppointments: builder.query({
      query: (params) => ({ url: '/appointments', params }),
      providesTags: (result) => [
        'Appointment',
        ...(result?.items ?? []).map(({ id }) => ({ type: 'Appointment', id })),
      ],
    }),
    getAppointment: builder.query({
      query: (id) => `/appointments/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Appointment', id }],
    }),

    createIncome: builder.mutation({
      query: (body) => ({ url: '/incomes', method: 'POST', body }),
      invalidatesTags: [
        'Income',
        'Appointment',
        'Shift',
        'PaymentFlag',
        'Notification',
        'Dashboard',
        'Report',
        'Audit',
        'ClosingSummary',
      ],
    }),
    createIncomeBatch: builder.mutation({
      query: (body) => ({ url: '/incomes/batch', method: 'POST', body }),
      invalidatesTags: [
        'Income',
        'Appointment',
        'Shift',
        'PaymentFlag',
        'Notification',
        'Dashboard',
        'Report',
        'Audit',
        'ClosingSummary',
      ],
    }),
    updateIncome: builder.mutation({
      query: ({ id, body }) => ({ url: `/incomes/${id}`, method: 'PATCH', body }),
      invalidatesTags: [
        'Income',
        'Appointment',
        'Shift',
        'PaymentFlag',
        'Notification',
        'Dashboard',
        'Report',
        'Audit',
        'ClosingSummary',
      ],
    }),
    getIncomes: builder.query({
      query: (params) => ({ url: '/incomes', params }),
      providesTags: ['Income'],
    }),

    createExpense: builder.mutation({
      query: (body) => ({ url: '/expenses', method: 'POST', body }),
      invalidatesTags: ['Expense', 'Shift', 'Dashboard', 'ClosingSummary'],
    }),
    getExpenses: builder.query({
      query: (params) => ({ url: '/expenses', params }),
      providesTags: ['Expense'],
    }),
    getExpenseCategories: builder.query({
      query: () => '/expenses/categories',
      providesTags: ['Expense'],
    }),

    createTransfer: builder.mutation({
      query: (body) => ({ url: '/transfers', method: 'POST', body }),
      invalidatesTags: ['Transfer', 'Shift', 'Dashboard', 'ClosingSummary'],
    }),
    getTransfers: builder.query({
      query: (params) => ({ url: '/transfers', params }),
      providesTags: ['Transfer'],
    }),
    getTransferReceivers: builder.query({
      query: () => '/transfers/receivers',
      providesTags: ['Transfer'],
    }),
    cancelTransfer: builder.mutation({
      query: (id) => ({ url: `/transfers/${id}/cancel`, method: 'POST' }),
      invalidatesTags: ['Transfer', 'Shift', 'Dashboard', 'ClosingSummary'],
    }),
    confirmTransfer: builder.mutation({
      query: ({ id, receivedAmount, note }) => ({
        url: `/transfers/${id}/confirm`,
        method: 'POST',
        body: { receivedAmount, ...(note ? { note } : {}) },
      }),
      invalidatesTags: ['Transfer', 'Shift', 'Dashboard', 'ClosingSummary'],
    }),
    resolveTransfer: builder.mutation({
      query: ({ id, settledAmount, note }) => ({
        url: `/transfers/${id}/resolve`,
        method: 'POST',
        body: { settledAmount, note },
      }),
      invalidatesTags: ['Transfer', 'Shift', 'Dashboard', 'ClosingSummary', 'Audit'],
    }),

    verifyIncome: builder.mutation({
      query: ({ id, decision, note }) => ({
        url: `/incomes/${id}/verify`,
        method: 'POST',
        body: { decision, ...(note ? { note } : {}) },
      }),
      invalidatesTags: ['Income', 'Dashboard', 'Report'],
    }),

    decideExpense: builder.mutation({
      query: ({ id, decision, note }) => ({
        url: `/expenses/${id}/decision`,
        method: 'POST',
        body: { decision, ...(note ? { note } : {}) },
      }),
      invalidatesTags: ['Expense', 'Dashboard', 'Audit'],
    }),

    voidIncome: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/incomes/${id}/void`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: [
        'Income',
        'Appointment',
        'PaymentFlag',
        'Notification',
        'Dashboard',
        'Report',
        'Audit',
      ],
    }),
    voidExpense: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/expenses/${id}/void`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Expense', 'Dashboard', 'Report', 'ClosingSummary', 'Audit'],
    }),

    getPaymentFlags: builder.query({
      query: (params) => ({ url: '/payment-flags', params }),
      providesTags: ['PaymentFlag'],
    }),
    createPaymentFlag: builder.mutation({
      query: (body) => ({ url: '/payment-flags', method: 'POST', body }),
      invalidatesTags: ['PaymentFlag', 'Notification', 'Audit'],
    }),
    decidePaymentFlag: builder.mutation({
      query: ({ id, decision, note }) => ({
        url: `/payment-flags/${id}/decision`,
        method: 'POST',
        body: { decision, ...(note ? { note } : {}) },
      }),
      invalidatesTags: ['PaymentFlag', 'Notification', 'Audit', 'Appointment'],
    }),
    getMyDrawer: builder.query({
      query: () => '/dashboard/my-drawer',
      providesTags: ['Dashboard', 'Shift', 'Income', 'Expense', 'Transfer'],
    }),
    getStaffFinancialOverview: builder.query({
      query: (params) => ({ url: '/dashboard/staff-overview', params }),
      providesTags: ['Dashboard', 'Shift', 'Income', 'Expense'],
    }),
    getShiftClosingSummary: builder.query({
      query: (id) => `/shifts/${id}/closing-summary`,
      providesTags: (_result, _error, id) => [{ type: 'ClosingSummary', id }],
    }),

    getMyStaffDateAccessRequests: builder.query({
      query: () => '/staff-date-access/mine',
      providesTags: ['StaffDateAccess'],
    }),
    createStaffDateAccessRequest: builder.mutation({
      query: (body) => ({ url: '/staff-date-access', method: 'POST', body }),
      invalidatesTags: ['StaffDateAccess', 'Notification'],
    }),
    getPendingStaffDateAccessRequests: builder.query({
      query: () => '/staff-date-access',
      providesTags: ['StaffDateAccess'],
    }),
    decideStaffDateAccessRequest: builder.mutation({
      query: ({ id, decision, note }) => ({
        url: `/staff-date-access/${id}/decision`,
        method: 'POST',
        body: { decision, ...(note ? { note } : {}) },
      }),
      invalidatesTags: ['StaffDateAccess', 'Notification', 'Audit'],
    }),

    ackBooklyChange: builder.mutation({
      query: (id) => ({ url: `/bookly/changes/${id}/ack`, method: 'POST' }),
      invalidatesTags: ['Bookly', 'Dashboard', 'Audit'],
    }),
    getBooklyStatus: builder.query({ query: () => '/bookly/status', providesTags: ['Bookly'] }),
    syncBookly: builder.mutation({
      query: (body) => ({ url: '/bookly/sync', method: 'POST', body }),
      invalidatesTags: ['Bookly', 'Appointment', 'Dashboard'],
    }),
    getBooklyChanges: builder.query({ query: () => '/bookly/changes', providesTags: ['Bookly'] }),

    uploadReceipt: builder.mutation({
      query: (formData) => ({ url: '/receipts', method: 'POST', body: formData }),
      invalidatesTags: ['Receipt'],
    }),
    getReceiptFile: builder.query({
      query: (id) => ({
        url: `/receipts/${id}/file`,
        responseHandler: (response) => response.blob(),
      }),
      providesTags: (_result, _error, id) => [{ type: 'Receipt', id }],
    }),

    getGoal: builder.query({
      query: (month) => ({ url: '/dashboard/goal', params: { month } }),
      providesTags: (_result, _error, month) => [{ type: 'Goal', id: month }],
    }),

    getNotifications: builder.query({
      query: ({ unread = 'true', limit = 20, cursor } = {}) => ({
        url: '/notifications',
        params: { unread, limit, ...(cursor ? { cursor } : {}) },
      }),
      providesTags: ['Notification'],
    }),
    markNotificationRead: builder.mutation({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({ url: '/notifications/read-all', method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetMeQuery,
  useChangePasswordMutation,
  useUpdateMeMutation,
  useGetSettingsQuery,
  useGetHubQuery,
  useGetDashboardBalancesQuery,
  useCreateOwnerNotaMutation,
  useGetOwnerNotasQuery,
  useLazyGetOwnerNotasQuery,
  useGetOwnerNotaOwnersQuery,
  useCreateOwnerNotaOwnerMutation,
  useUpdateOwnerNotaOwnerMutation,
  useUpdateOwnerNotaMutation,
  useGetDayReportQuery,
  useGetMonthReportQuery,
  useGetYearReportQuery,
  useGetCurrentShiftsQuery,
  useOpenShiftMutation,
  useCloseShiftMutation,
  useGetShiftsQuery,
  useGetShiftQuery,
  useGetAppointmentsQuery,
  useGetAppointmentQuery,
  useCreateIncomeMutation,
  useCreateIncomeBatchMutation,
  useUpdateIncomeMutation,
  useGetIncomesQuery,
  useCreateExpenseMutation,
  useGetExpensesQuery,
  useGetExpenseCategoriesQuery,
  useCreateTransferMutation,
  useGetTransfersQuery,
  useGetTransferReceiversQuery,
  useCancelTransferMutation,
  useConfirmTransferMutation,
  useVerifyIncomeMutation,
  useGetBooklyStatusQuery,
  useSyncBooklyMutation,
  useGetBooklyChangesQuery,
  useUploadReceiptMutation,
  useGetReceiptFileQuery,
  useGetGoalQuery,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetUsersQuery,
  useGetStaffUsersQuery,
  useGetFinanceStaffBoardQuery,
  useGetFinanceStaffHistoryQuery,
  useGetFinanceStaffDailyHistoryQuery,
  useGetFinanceEditsQuery,
  useGetAttendanceMeQuery,
  useGetMyScheduleQuery,
  useUploadAttendancePhotoMutation,
  useAttendanceClockMutation,
  useGetAttendanceBoardQuery,
  useGetAttendanceRecordsQuery,
  useAdjustAttendanceMutation,
  useGetAttendancePhotoQuery,
  useGetScheduleQuery,
  useCreateShiftMutation,
  useUpdateShiftMutation,
  useDeleteShiftMutation,
  usePublishScheduleMutation,
  useCopyScheduleWeekMutation,
  useGetPayrollRulesQuery,
  useUpdatePayrollRulesMutation,
  useVerifyIncomeBatchMutation,
  useCreateUserMutation,
  useUpdateUserMutation,
  useResetUserPasswordMutation,
  useRevokeUserSessionsMutation,
  useUpdateSettingsMutation,
  useGetPermissionsQuery,
  useUpdatePermissionsMutation,
  useResetPermissionsMutation,
  useSetGoalMutation,
  useCreateExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useGetAuditQuery,
  useGetAuditExportMutation,
  useDecideExpenseMutation,
  useVoidIncomeMutation,
  useVoidExpenseMutation,
  useResolveTransferMutation,
  useAckBooklyChangeMutation,
  useCreatePaymentFlagMutation,
  useGetPaymentFlagsQuery,
  useDecidePaymentFlagMutation,
  useGetMyDrawerQuery,
  useGetStaffFinancialOverviewQuery,
  useGetShiftClosingSummaryQuery,
  useGetAppointmentCourtsQuery,
  useGetMyStaffDateAccessRequestsQuery,
  useCreateStaffDateAccessRequestMutation,
  useGetPendingStaffDateAccessRequestsQuery,
  useDecideStaffDateAccessRequestMutation,
} = api;
