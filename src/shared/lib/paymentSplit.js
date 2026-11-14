import { toPiasters } from './money';

export function amountToPiasters(text) {
  try {
    return text ? toPiasters(text) : 0;
  } catch {
    return 0;
  }
}

export function computeSplit({ lines, outstanding, expected, alreadyCollected, note }) {
  const amounts = lines.map((line) => amountToPiasters(line.amountText));
  const total = amounts.reduce((sum, n) => sum + n, 0);
  const projected = alreadyCollected + total;
  const overpaid = total > outstanding;
  const willBeUnderpaid = expected > 0 && total > 0 && projected < expected;
  const noteRequired = willBeUnderpaid && !String(note ?? '').trim();
  const linesValid = lines.every(
    (line, i) => amounts[i] > 0 && (line.method === 'CASH' || Boolean(line.receiptId)),
  );
  return {
    amounts,
    total,
    projected,
    remaining: outstanding - total,
    overpaid,
    willBeUnderpaid,
    noteRequired,
    linesValid,
    canSubmit: linesValid && !overpaid && !noteRequired,
  };
}

export function buildBatchBody({ clientRequestId, appointmentId, note, lines }) {
  const trimmed = String(note ?? '').trim();
  return {
    clientRequestId,
    appointmentId,
    ...(trimmed ? { note: trimmed } : {}),
    lines: lines.map((line) => ({
      method: line.method,
      amount: amountToPiasters(line.amountText),
      ...(line.receiptId ? { receiptId: line.receiptId } : {}),
    })),
  };
}
