import { describe, expect, it } from 'vitest';
import { errorMessage, getApiError, getValidationMessages } from './apiError';

const t = (key, values) => `${key}${values ? `:${JSON.stringify(values)}` : ''}`;

describe('attendance errors', () => {
  const err = (code, details) => ({ status: 422, data: { error: { code, message: 'server text', details } } });
  it('uses the translated text for attendance codes and passes the numbers along', () => {
    expect(errorMessage(err('OUT_OF_RANGE', { distanceM: 240, radiusM: 100 }), t)).toBe('attendance.errors.OUT_OF_RANGE:{"distanceM":240,"radiusM":100}');
    expect(errorMessage(err('ALREADY_CLOCKED_IN'), t)).toBe('attendance.errors.ALREADY_CLOCKED_IN');
  });
  it('unknown codes still fall back to the server message', () => {
    expect(errorMessage(err('SOMETHING_NEW'), t)).toBe('server text');
  });
});

describe('API error helpers', () => {
  it('reads the backend error envelope', () => {
    expect(getApiError({
      status: 400,
      data: { error: { code: 'OVERPAYMENT', message: 'no', details: { maxAmount: 1200 } } },
    })).toEqual({ code: 'OVERPAYMENT', message: 'no', details: { maxAmount: 1200 } });
  });

  it('maps network and timeout failures to a localized network message', () => {
    expect(errorMessage({ status: 'TIMEOUT_ERROR' }, t)).toBe('errors.network');
    expect(errorMessage({ status: 'FETCH_ERROR' }, t)).toBe('errors.network');
  });

  it('extracts validation field paths for react-hook-form adapters', () => {
    expect(getValidationMessages({
      data: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'invalid',
          details: [
            { path: ['phone'], message: 'Invalid phone' },
            { field: 'name', message: 'Required' },
          ],
        },
      },
    })).toEqual([
      { path: 'phone', message: 'Invalid phone' },
      { path: 'name', message: 'Required' },
    ]);
  });
});
