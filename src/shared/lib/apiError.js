const ERROR_KEYS = new Set([
  'NO_OPEN_SHIFT',
  'OVERPAYMENT',
  'DUPLICATE_RECEIPT',
  'RECEIPT_ALREADY_USED',
  'INSUFFICIENT_CASH',
  'TOO_OLD',
  'SHIFT_ALREADY_OPEN',
  'ANOTHER_SHIFT_OPEN',
  'NOT_PENDING',
  'WAIVER_TOO_BIG',
  'STALE_REQUEST',
  'RATE_LIMITED',
  'BOOKLY_OFF',
  'SYNC_RUNNING',
  'MAINTENANCE',
  'APPOINTMENT_NOT_PAYABLE',
  'PRICE_MISSING',
  'FORBIDDEN',
  'BAD_CREDENTIALS',
  'VALIDATION_ERROR',
]);

function unwrapPayload(error) {
  const payload = error?.data?.error;
  if (payload && typeof payload === 'object') return payload;

  if (typeof payload === 'string') {
    return { code: 'UNKNOWN', message: payload };
  }

  if (error?.data && typeof error.data === 'object' && 'code' in error.data) {
    return error.data;
  }

  return undefined;
}

export function getApiError(error) {
  const payload = unwrapPayload(error);

  if (payload) {
    return {
      code: payload.code ?? 'UNKNOWN',
      message: payload.message ?? '',
      details: payload.details,
    };
  }

  if (error?.status === 'PARSING_ERROR') {
    return {
      code: 'BAD_RESPONSE',
      message: '',
      details: error,
    };
  }

  if (error?.status === 'FETCH_ERROR' || error?.status === 'TIMEOUT_ERROR') {
    return {
      code: 'NETWORK_ERROR',
      message: '',
      details: undefined,
    };
  }

  return {
    code: String(error?.status ?? 'UNKNOWN'),
    message: '',
    details: error,
  };
}

export function getValidationMessages(error) {
  const { code, details } = getApiError(error);
  if (code !== 'VALIDATION_ERROR' || !Array.isArray(details)) return [];

  return details
    .filter((item) => item && (Array.isArray(item.path) || typeof item.field === 'string'))
    .map((item) => ({
      path: Array.isArray(item.path) ? item.path.join('.') : item.field,
      message: String(item.message ?? ''),
    }))
    .filter((item) => item.path && item.message);
}

export function errorMessage(error, t) {
  const { code, message, details } = getApiError(error);

  if (code === 'NETWORK_ERROR' || code === 'BAD_RESPONSE') return t('errors.network');
  if (code === 'BAD_CREDENTIALS') return t('errors.badCredentials');
  if (code === 'FORBIDDEN') return t('errors.forbidden');
  if (code === 'MAINTENANCE') return t('errors.maintenance');
  if (code === 'NO_OPEN_SHIFT') return t('errors.noOpenShift');
  if (code === 'INSUFFICIENT_CASH') {
    const amount = details?.available;
    return amount != null
      ? t('errors.insufficientCashWithAmount', { amount: amount / 100 })
      : t('errors.insufficientCash');
  }
  if (code === 'OVERPAYMENT') {
    const max = details?.maxAmount;
    return max != null
      ? t('errors.overpaymentWithAmount', { amount: max / 100 })
      : t('errors.overpayment');
  }
  if (code === 'DUPLICATE_RECEIPT') return t('errors.duplicateReceipt');
  if (code === 'RECEIPT_ALREADY_USED') return t('errors.receiptAlreadyUsed');
  if (code === 'TOO_OLD') return t('errors.tooOld');
  if (code === 'SHIFT_ALREADY_OPEN') return t('errors.shiftAlreadyOpen');
  if (code === 'ANOTHER_SHIFT_OPEN') return t('errors.anotherShiftOpen');
  if (code === 'NOT_PENDING') return t('errors.notPending');
  if (code === 'WAIVER_TOO_BIG') return t('errors.waiverTooBig');
  if (code === 'STALE_REQUEST') return t('errors.staleRequest');
  if (code === 'RATE_LIMITED') return t('errors.rateLimited');
  if (code === 'APPOINTMENT_NOT_PAYABLE') return t('errors.appointmentNotPayable');
  if (code === 'PRICE_MISSING') return t('errors.priceMissing');
  if (code === 'BOOKLY_OFF') return t('errors.booklyOff');
  if (code === 'SYNC_RUNNING') return t('errors.syncRunning');
  if (ERROR_KEYS.has(code) && message) return message;

  return message || t('errors.generic');
}
