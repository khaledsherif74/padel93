import { amountToPiasters } from './paymentSplit';

export function canEditIncome(income, { isToday }) {
  if (!isToday) return false;
  if (income.status !== 'ACTIVE') return false;
  return income.verification !== 'VERIFIED' && income.verification !== 'REJECTED';
}

export function buildEditBody(income, draft) {
  const body = {};
  const amount = amountToPiasters(draft.amountText);
  if (amount !== income.amount) body.amount = amount;
  if (draft.method !== income.method) body.method = draft.method;
  if (draft.receiptId && draft.receiptId !== income.receiptId) body.receiptId = draft.receiptId;
  const note = String(draft.note ?? '').trim();
  if (note !== String(income.note ?? '').trim() && note) body.note = note;
  if (Object.keys(body).length === 0) return null;
  return { ...body, reason: String(draft.reason ?? '').trim() };
}

export function validateEdit(income, draft) {
  if (amountToPiasters(draft.amountText) <= 0) return { ok: false, error: 'amount' };
  if (draft.method !== 'CASH' && !draft.receiptId && !income.receiptId) {
    return { ok: false, error: 'receipt' };
  }
  if (String(draft.reason ?? '').trim().length < 5) return { ok: false, error: 'reason' };
  if (!buildEditBody(income, draft)) return { ok: false, error: 'nochange' };
  return { ok: true };
}

export function canEditIncomeLine(income, { userId, canEditDay }) {
  if (!userId || income.recordedById !== userId) return false;
  return canEditIncome(income, { isToday: canEditDay });
}
