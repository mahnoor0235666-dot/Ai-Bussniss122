/**
 * Pure finance calculations. Kept free of React so they can be unit tested
 * directly (see tests/finance.test.ts) and reused by the UI.
 */

export type CalcOk<T> = { ok: true; value: T; steps: string[] };
export type CalcErr = { ok: false; error: string };
export type Calc<T> = CalcOk<T> | CalcErr;

const MAX_VALUE = 1e12;

function parseNumber(raw: string, label: string, opts: { allowZero?: boolean } = {}): number | string {
  const trimmed = raw.trim();
  if (!trimmed) return `${label} is required.`;
  const normalised = trimmed.replace(/,/g, '');
  if (!/^-?\d*\.?\d+$/.test(normalised)) return `${label} must be a number.`;
  const value = Number(normalised);
  if (!Number.isFinite(value)) return `${label} must be a number.`;
  if (value < 0) return `${label} cannot be negative.`;
  if (value > MAX_VALUE) return `${label} is too large.`;
  if (!opts.allowZero && value === 0) return `${label} must be greater than zero.`;
  return value;
}

export function formatNumber(value: number, maxDecimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

export function formatMoney(value: number, currency = ''): string {
  const formatted = formatNumber(value, 2);
  return currency ? `${currency.trim()} ${formatted}` : formatted;
}

/** Revenue = Selling price per unit × Units sold */
export function computeRevenue(
  priceRaw: string,
  unitsRaw: string,
  currency = '',
): Calc<{ revenue: number }> {
  const price = parseNumber(priceRaw, 'Selling price', { allowZero: true });
  if (typeof price === 'string') return { ok: false, error: price };
  const units = parseNumber(unitsRaw, 'Units sold', { allowZero: true });
  if (typeof units === 'string') return { ok: false, error: units };

  const revenue = price * units;
  return {
    ok: true,
    value: { revenue },
    steps: [
      `Revenue = selling price × units sold`,
      `Revenue = ${formatMoney(price, currency)} × ${formatNumber(units)}`,
      `Revenue = ${formatMoney(revenue, currency)}`,
    ],
  };
}

/** Profit / loss = Total revenue − Total expenses */
export function computeProfit(
  revenueRaw: string,
  expensesRaw: string,
  currency = '',
): Calc<{ profit: number; isLoss: boolean; margin: number | null; marginNote?: string }> {
  const revenue = parseNumber(revenueRaw, 'Total revenue', { allowZero: true });
  if (typeof revenue === 'string') return { ok: false, error: revenue };
  const expenses = parseNumber(expensesRaw, 'Total expenses', { allowZero: true });
  if (typeof expenses === 'string') return { ok: false, error: expenses };

  const profit = revenue - expenses;
  const steps = [
    'Profit or loss = total revenue − total expenses',
    `Profit or loss = ${formatMoney(revenue, currency)} − ${formatMoney(expenses, currency)}`,
    `Profit or loss = ${formatMoney(profit, currency)}`,
  ];

  if (revenue === 0) {
    return {
      ok: true,
      value: { profit, isLoss: profit < 0, margin: null, marginNote: 'Revenue is zero, so profit margin cannot be calculated (division by zero).' },
      steps,
    };
  }
  const margin = (profit / revenue) * 100;
  steps.push(`Profit margin = profit ÷ revenue × 100 = ${formatNumber(margin)}%`);
  return { ok: true, value: { profit, isLoss: profit < 0, margin }, steps };
}

/** Profit margin (%) = Net profit ÷ Revenue × 100 */
export function computeMargin(
  profitRaw: string,
  revenueRaw: string,
  currency = '',
): Calc<{ margin: number }> {
  const profit = parseNumber(profitRaw, 'Net profit', { allowZero: true });
  if (typeof profit === 'string') return { ok: false, error: profit };
  const revenue = parseNumber(revenueRaw, 'Revenue', { allowZero: true });
  if (typeof revenue === 'string') return { ok: false, error: revenue };
  if (revenue === 0) {
    return { ok: false, error: 'Revenue is zero, so profit margin is undefined (division by zero).' };
  }
  const margin = (profit / revenue) * 100;
  return {
    ok: true,
    value: { margin },
    steps: [
      'Profit margin (%) = net profit ÷ revenue × 100',
      `Profit margin (%) = ${formatMoney(profit, currency)} ÷ ${formatMoney(revenue, currency)} × 100`,
      `Profit margin (%) = ${formatNumber(margin)}%`,
    ],
  };
}

/** Break-even units = Fixed costs ÷ (Selling price per unit − Variable cost per unit) */
export function computeBreakEven(
  fixedCostsRaw: string,
  priceRaw: string,
  variableCostRaw: string,
  currency = '',
): Calc<{ breakEvenUnits: number; exactUnits: number; contribution: number }> {
  const fixed = parseNumber(fixedCostsRaw, 'Fixed costs', { allowZero: true });
  if (typeof fixed === 'string') return { ok: false, error: fixed };
  const price = parseNumber(priceRaw, 'Selling price per unit', { allowZero: true });
  if (typeof price === 'string') return { ok: false, error: price };
  const variable = parseNumber(variableCostRaw, 'Variable cost per unit', { allowZero: true });
  if (typeof variable === 'string') return { ok: false, error: variable };

  const contribution = price - variable;
  if (contribution <= 0) {
    return {
      ok: false,
      error:
        'Selling price must be greater than variable cost per unit. Otherwise every sale loses money and break-even is impossible.',
    };
  }

  const exactUnits = fixed / contribution;
  const breakEvenUnits = Math.ceil(exactUnits);
  return {
    ok: true,
    value: { breakEvenUnits, exactUnits, contribution },
    steps: [
      'Break-even units = fixed costs ÷ (selling price per unit − variable cost per unit)',
      `Contribution per unit = ${formatMoney(price, currency)} − ${formatMoney(variable, currency)} = ${formatMoney(contribution, currency)}`,
      `Break-even units = ${formatMoney(fixed, currency)} ÷ ${formatMoney(contribution, currency)} = ${formatNumber(exactUnits)}`,
      `You must sell at least ${formatNumber(breakEvenUnits)} units to cover fixed costs.`,
    ],
  };
}

export const FINANCE_GLOSSARY: { term: string; definition: string }[] = [
  {
    term: 'Revenue',
    definition:
      'All money received from selling your product or service, before any cost is subtracted. Also called sales or turnover.',
  },
  {
    term: 'Gross profit',
    definition:
      'Revenue minus the direct cost of the goods or services you sold (materials, stock, delivery). It ignores rent, salaries and other fixed costs.',
  },
  {
    term: 'Net profit',
    definition:
      'What remains after subtracting all expenses from revenue — direct costs, fixed costs, taxes and any other business expense. A negative net profit is a loss.',
  },
  {
    term: 'Profit margin',
    definition:
      'Net profit as a percentage of revenue. It shows how much of every 100 in sales you keep after all expenses.',
  },
];
