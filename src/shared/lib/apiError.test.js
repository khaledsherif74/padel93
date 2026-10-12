import { describe, expect, it } from 'vitest';
import { errorMessage, getApiError, getValidationMessages } from './apiError';

const t = (key, values) => `${key}${values ? `:${JSON.stringify(values)}` : ''}`;

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
