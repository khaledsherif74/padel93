export function getPaymentStatus({ state, collected = 0, due = 0, free = false }) {
  if (state === 'ON_ACCOUNT') return 'ON_ACCOUNT';
  if (['PAID', 'OVERPAID'].includes(state) || free) return 'PAID';
  if (due > 0 && collected > 0) return 'PARTIAL';
  return 'UNPAID';
}

export function getAppointmentPaymentStatus(appointment) {
  const { state, expected, collected, due } = appointment.payment ?? {};
  const outstanding = Math.max(0, due ?? 0);
  const rewardHours = Number(appointment.reward?.hoursUsed ?? 0);
  const free =
    outstanding === 0 &&
    (expected === 0 || (rewardHours > 0 && appointment.reward?.courtCollectAmount === 0));
  return getPaymentStatus({
    state,
    collected: Math.max(0, collected ?? 0),
    due: outstanding,
    free,
  });
}

export function getClosingRowPaymentStatus(row) {
  const outstanding = Math.max(0, row.due ?? 0);
  const free =
    outstanding === 0 &&
    (row.expected === 0 || (row.rewardMinutesUsed > 0 && row.courtCollectAmount === 0));
  return getPaymentStatus({
    state: row.paymentState,
    collected: Math.max(0, row.collected ?? 0),
    due: outstanding,
    free,
  });
}

const STYLES = {
  PAID: { background: '#dcfce7', border: 'border-emerald-300', badgeTone: 'success' },
  PARTIAL: { background: '#fef3c7', border: 'border-amber-300', badgeTone: 'warning' },
  ON_ACCOUNT: { background: '#dbeafe', border: 'border-blue-300', badgeTone: 'info' },
  UNPAID: { background: '#ffffff', border: 'border-navy/10', badgeTone: 'danger' },
};
const UNPAID_CLOSING = { background: '#fee2e2', border: 'border-red-300', badgeTone: 'danger' };

export function paymentStatusStyle(status, { context = 'card' } = {}) {
  if (status === 'UNPAID' && context === 'closing') return UNPAID_CLOSING;
  return STYLES[status] ?? STYLES.UNPAID;
}

export const isBookingStarted = (row, now = Date.now()) => new Date(row.startsAt).getTime() <= now;

export function summarizeUnpaid(rows, now = Date.now()) {
  let total = 0;
  let unpaid = 0;
  let unpaidDue = 0;
  let upcoming = 0;
  for (const row of rows) {
    if (row.paymentState == null || row.expected == null) continue;
    if (!isBookingStarted(row, now)) {
      upcoming += 1;
      continue;
    }
    total += 1;
    const status = getClosingRowPaymentStatus(row);
    if (status === 'UNPAID' || status === 'PARTIAL') {
      unpaid += 1;
      unpaidDue += Math.max(0, row.due ?? 0);
    }
  }
  return { total, unpaid, unpaidDue, upcoming };
}
