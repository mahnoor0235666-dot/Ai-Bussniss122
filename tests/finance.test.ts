import { describe, expect, it } from 'vitest';
import {
  computeBreakEven,
  computeMargin,
  computeProfit,
  computeRevenue,
  formatMoney,
  formatNumber,
} from '../src/lib/finance';

describe('revenue calculator', () => {
  it('multiplies price by units', () => {
    const result = computeRevenue('250', '40');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.revenue).toBe(10000);
    expect(result.steps).toHaveLength(3);
  });

  it('accepts thousands separators and decimals', () => {
    const result = computeRevenue('1,250.50', '4');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.revenue).toBeCloseTo(5002, 5);
  });

  it('allows zero units but rejects empty, negative and non-numeric input', () => {
    const zero = computeRevenue('100', '0');
    expect(zero.ok && zero.value.revenue === 0).toBe(true);

    for (const [price, units] of [
      ['', '5'],
      ['abc', '5'],
      ['-10', '5'],
      ['10', ''],
      ['10', '-1'],
    ]) {
      const result = computeRevenue(price, units);
      expect(result.ok).toBe(false);
    }
  });
});

describe('profit and loss calculator', () => {
  it('computes profit and margin', () => {
    const result = computeProfit('10000', '6500');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profit).toBe(3500);
    expect(result.value.isLoss).toBe(false);
    expect(result.value.margin).toBeCloseTo(35, 6);
  });

  it('reports a loss with a negative margin', () => {
    const result = computeProfit('500', '900');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profit).toBe(-400);
    expect(result.value.isLoss).toBe(true);
    expect(result.value.margin).toBeCloseTo(-80, 6);
  });

  it('does not divide by zero when revenue is zero', () => {
    const result = computeProfit('0', '250');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profit).toBe(-250);
    expect(result.value.margin).toBeNull();
    expect(result.value.marginNote).toMatch(/division by zero/i);
  });
});

describe('profit margin calculator', () => {
  it('converts profit to a percentage of revenue', () => {
    const result = computeMargin('3500', '10000');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.margin).toBeCloseTo(35, 6);
  });

  it('rejects zero revenue instead of dividing by zero', () => {
    const result = computeMargin('100', '0');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/division by zero/i);
  });

  it('rejects non-numeric input', () => {
    expect(computeMargin('profit', '100').ok).toBe(false);
  });
});

describe('break-even calculator', () => {
  it('divides fixed costs by contribution per unit', () => {
    const result = computeBreakEven('50000', '500', '300');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.contribution).toBe(200);
    expect(result.value.exactUnits).toBe(250);
    expect(result.value.breakEvenUnits).toBe(250);
  });

  it('rounds partial units up so the fixed cost is covered', () => {
    const result = computeBreakEven('1000', '33', '20');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.exactUnits).toBeCloseTo(76.923, 3);
    expect(result.value.breakEvenUnits).toBe(77);
  });

  it('explains why break-even is impossible when price does not exceed variable cost', () => {
    const equal = computeBreakEven('1000', '100', '100');
    expect(equal.ok).toBe(false);
    if (equal.ok) return;
    expect(equal.error).toMatch(/greater than variable cost/i);

    expect(computeBreakEven('1000', '80', '100').ok).toBe(false);
  });

  it('rejects malformed numbers', () => {
    expect(computeBreakEven('', '100', '50').ok).toBe(false);
    expect(computeBreakEven('1000', 'abc', '50').ok).toBe(false);
  });
});

describe('number formatting', () => {
  it('groups thousands and prefixes the currency', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatMoney(1234.5, 'PKR')).toBe('PKR 1,234.5');
    expect(formatMoney(1234.5)).toBe('1,234.5');
  });
});
