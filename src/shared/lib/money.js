export function toPiasters(value) {
  const normalized = String(value ?? '').trim().replace(/,/g, '');
  if (!normalized) return 0;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    throw new Error('Invalid EGP amount');
  }
  const [whole, fraction = ''] = normalized.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function formatEgp(piasters, locale = 'ar-EG') {
  const value = Number(piasters ?? 0);
  if (!Number.isInteger(value)) throw new Error('Money must be integer piasters');
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function formatEgpWithCurrency(piasters, locale = 'ar-EG') {
  const value = Number(piasters ?? 0);
  if (!Number.isInteger(value)) throw new Error('Money must be integer piasters');
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
