import { getAppointmentPaymentStatus } from './paymentStatus';

const CANCELLED = new Set(['CANCELLED', 'REJECTED']);

export function isCancelledBooking(appointment) {
  return Boolean(appointment.removedFromBookly) || CANCELLED.has(appointment.bookingStatus);
}

export function isPaidBooking(appointment) {
  return getAppointmentPaymentStatus(appointment) === 'PAID';
}

const byStart = (a, b) => new Date(a.startsAt) - new Date(b.startsAt);

export function groupBookings(rows, { now, isToday }) {
  const active = [];
  const paid = [];
  const cancelled = [];
  for (const row of rows) {
    if (isCancelledBooking(row)) cancelled.push(row);
    else if (isPaidBooking(row)) paid.push(row);
    else if (!isToday || new Date(row.endsAt).getTime() > now) active.push(row);
  }
  return {
    active: active.sort(byStart),
    paid: paid.sort(byStart),
    cancelled: cancelled.sort(byStart),
  };
}
