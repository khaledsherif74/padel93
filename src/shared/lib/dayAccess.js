export function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const active = (request, kinds) =>
  Boolean(request) &&
  request.status === 'APPROVED' &&
  request.isActive === true &&
  kinds.includes(request.kind ?? 'EDIT');

export function canEditDay({ date, today, shiftBusinessDate, request }) {
  return date >= today || date === shiftBusinessDate || active(request, ['EDIT']);
}

export function canViewDay({ date, today, viewDays = 3, shiftBusinessDate, request }) {
  if (canEditDay({ date, today, shiftBusinessDate, request })) return true;
  if (date >= addDays(today, -viewDays)) return true;
  return active(request, ['VIEW', 'EDIT']);
}
