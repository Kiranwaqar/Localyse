const pkrFormatter = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** All monetary amounts in the app are in Pakistani Rupees (PKR). */
export const APP_CURRENCY = 'PKR' as const;
export type AppCurrency = typeof APP_CURRENCY;

/** Formats a number as PKR (e.g. Rs 1,234.50). */
export const formatPkr = (value: number | undefined | null, empty = '—'): string => {
  if (value === undefined || value === null) return empty;
  const n = Number(value);
  if (!Number.isFinite(n)) return empty;
  return pkrFormatter.format(n);
};

/** Rounded to whole rupees for compact UI. */
export const formatPkrInteger = (value: number | undefined | null, empty = '—'): string => {
  if (value === undefined || value === null) return empty;
  const n = Number(value);
  if (!Number.isFinite(n)) return empty;
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
};
