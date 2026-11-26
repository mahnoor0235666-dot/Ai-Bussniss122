import { useState } from 'react';
import { usePrefs } from '../lib/i18n';
import {
  FINANCE_GLOSSARY,
  computeBreakEven,
  computeMargin,
  computeProfit,
  computeRevenue,
  formatMoney,
  formatNumber,
  type Calc,
} from '../lib/finance';
import { Alert, Field } from '../components/ui';

type CalcState<T> = { result: Calc<T> | null; currency: string };

function ResultBox<T>({
  state,
  children,
}: {
  state: CalcState<T>;
  children: (value: T) => React.ReactNode;
}) {
  const { t } = usePrefs();
  const result = state.result;
  if (!result) return null;
  if (!result.ok) return <Alert kind="error">{result.error}</Alert>;
  return (
    <div className="stack-sm">
      <div className="card" style={{ background: 'var(--surface-2, transparent)' }}>
        <div className="card-body stack-sm">
          <strong style={{ fontSize: '1.25rem' }}>{children(result.value)}</strong>
        </div>
      </div>
      <details>
        <summary className="small">{t('calculation')}</summary>
        <ol className="small" style={{ marginInlineStart: 18 }}>
          {result.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </details>
    </div>
  );
}

export default function Finance() {
  const { t } = usePrefs();

  const [currency, setCurrency] = useState('');

  const [price, setPrice] = useState('');
  const [units, setUnits] = useState('');
  const [revenueState, setRevenueState] = useState<CalcState<{ revenue: number }>>({
    result: null,
    currency: '',
  });

  const [totalRevenue, setTotalRevenue] = useState('');
  const [totalExpenses, setTotalExpenses] = useState('');
  const [profitState, setProfitState] = useState<
    CalcState<{ profit: number; isLoss: boolean; margin: number | null; marginNote?: string }>
  >({ result: null, currency: '' });

  const [netProfit, setNetProfit] = useState('');
  const [marginRevenue, setMarginRevenue] = useState('');
  const [marginState, setMarginState] = useState<CalcState<{ margin: number }>>({
    result: null,
    currency: '',
  });

  const [fixedCosts, setFixedCosts] = useState('');
  const [bePrice, setBePrice] = useState('');
  const [variableCost, setVariableCost] = useState('');
  const [breakEvenState, setBreakEvenState] = useState<
    CalcState<{ breakEvenUnits: number; exactUnits: number; contribution: number }>
  >({ result: null, currency: '' });

  return (
    <div className="stack">
      <header className="stack-sm">
        <h1 style={{ fontSize: '1.4rem' }}>{t('finance')}</h1>
        <p className="muted">
          These calculators show every step. They are planning tools, not accounting records, and they do not replace
          a bookkeeper or tax advice.
        </p>
      </header>

      <Field label={t('currency')} htmlFor="currency" optional hint="Optional label, e.g. PKR, ₹, $, AED.">
        <input
          className="input"
          id="currency"
          maxLength={8}
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
        />
      </Field>

      {/* 1. Revenue */}
      <section className="card">
        <div className="card-head">
          <h2 style={{ fontSize: '1rem' }}>{t('revenue')}</h2>
          <span className="small muted">Revenue = price × units</span>
        </div>
        <div className="card-body stack">
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <Field label={t('sellingPrice')} htmlFor="rev-price">
              <input
                className="input"
                id="rev-price"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </Field>
            <Field label={t('unitsSold')} htmlFor="rev-units">
              <input
                className="input"
                id="rev-units"
                inputMode="decimal"
                value={units}
                onChange={(event) => setUnits(event.target.value)}
              />
            </Field>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                setRevenueState({
                  result: computeRevenue(price, units, currency),
                  currency,
                })
              }
            >
              {t('calculate')}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setPrice('');
                setUnits('');
                setRevenueState({ result: null, currency });
              }}
            >
              {t('reset')}
            </button>
          </div>
          <ResultBox state={revenueState}>
            {(value) => <span>{formatMoney(value.revenue, revenueState.currency)}</span>}
          </ResultBox>
        </div>
      </section>

      {/* 2. Profit / loss */}
      <section className="card">
        <div className="card-head">
          <h2 style={{ fontSize: '1rem' }}>{t('profitLoss')}</h2>
          <span className="small muted">Profit = revenue − expenses</span>
        </div>
        <div className="card-body stack">
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <Field label={t('totalRevenue')} htmlFor="profit-revenue">
              <input
                className="input"
                id="profit-revenue"
                inputMode="decimal"
                value={totalRevenue}
                onChange={(event) => setTotalRevenue(event.target.value)}
              />
            </Field>
            <Field label={t('totalExpenses')} htmlFor="profit-expenses">
              <input
                className="input"
                id="profit-expenses"
                inputMode="decimal"
                value={totalExpenses}
                onChange={(event) => setTotalExpenses(event.target.value)}
              />
            </Field>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                setProfitState({
                  result: computeProfit(totalRevenue, totalExpenses, currency),
                  currency,
                })
              }
            >
              {t('calculate')}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setTotalRevenue('');
                setTotalExpenses('');
                setProfitState({ result: null, currency });
              }}
            >
              {t('reset')}
            </button>
          </div>
          <ResultBox state={profitState}>
            {(value) => (
              <div className="stack-sm">
                <span>
                  {value.isLoss ? 'Loss: ' : 'Profit: '}
                  {formatMoney(Math.abs(value.profit), profitState.currency)}
                </span>
                {value.margin !== null ? (
                  <span className="small muted">
                    {t('profitMargin')}: {formatNumber(value.margin)}%
                  </span>
                ) : (
                  <span className="small muted">{value.marginNote}</span>
                )}
              </div>
            )}
          </ResultBox>
        </div>
      </section>

      {/* 3. Margin */}
      <section className="card">
        <div className="card-head">
          <h2 style={{ fontSize: '1rem' }}>{t('profitMargin')}</h2>
          <span className="small muted">Net profit ÷ revenue × 100</span>
        </div>
        <div className="card-body stack">
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <Field label={t('netProfit')} htmlFor="margin-profit">
              <input
                className="input"
                id="margin-profit"
                inputMode="decimal"
                value={netProfit}
                onChange={(event) => setNetProfit(event.target.value)}
              />
            </Field>
            <Field label={t('revenue')} htmlFor="margin-revenue">
              <input
                className="input"
                id="margin-revenue"
                inputMode="decimal"
                value={marginRevenue}
                onChange={(event) => setMarginRevenue(event.target.value)}
              />
            </Field>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                setMarginState({
                  result: computeMargin(netProfit, marginRevenue, currency),
                  currency,
                })
              }
            >
              {t('calculate')}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setNetProfit('');
                setMarginRevenue('');
                setMarginState({ result: null, currency });
              }}
            >
              {t('reset')}
            </button>
          </div>
          <ResultBox state={marginState}>
            {(value) => <span>{formatNumber(value.margin)}%</span>}
          </ResultBox>
        </div>
      </section>

      {/* 4. Break-even */}
      <section className="card">
        <div className="card-head">
          <h2 style={{ fontSize: '1rem' }}>{t('breakEven')}</h2>
          <span className="small muted">Fixed costs ÷ (price − variable cost)</span>
        </div>
        <div className="card-body stack">
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <Field label={t('fixedCosts')} htmlFor="be-fixed">
              <input
                className="input"
                id="be-fixed"
                inputMode="decimal"
                value={fixedCosts}
                onChange={(event) => setFixedCosts(event.target.value)}
              />
            </Field>
            <Field label={t('sellingPrice')} htmlFor="be-price">
              <input
                className="input"
                id="be-price"
                inputMode="decimal"
                value={bePrice}
                onChange={(event) => setBePrice(event.target.value)}
              />
            </Field>
            <Field label={t('variableCost')} htmlFor="be-variable">
              <input
                className="input"
                id="be-variable"
                inputMode="decimal"
                value={variableCost}
                onChange={(event) => setVariableCost(event.target.value)}
              />
            </Field>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                setBreakEvenState({
                  result: computeBreakEven(fixedCosts, bePrice, variableCost, currency),
                  currency,
                })
              }
            >
              {t('calculate')}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setFixedCosts('');
                setBePrice('');
                setVariableCost('');
                setBreakEvenState({ result: null, currency });
              }}
            >
              {t('reset')}
            </button>
          </div>
          <ResultBox state={breakEvenState}>
            {(value) => (
              <div className="stack-sm">
                <span>
                  {formatNumber(value.breakEvenUnits)} units to break even
                </span>
                <span className="small muted">
                  Contribution per unit: {formatMoney(value.contribution, breakEvenState.currency)}
                </span>
              </div>
            )}
          </ResultBox>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 style={{ fontSize: '1rem' }}>{t('glossary')}</h2>
        </div>
        <div className="card-body stack-sm">
          {FINANCE_GLOSSARY.map((entry) => (
            <div key={entry.term}>
              <strong>{entry.term}</strong>
              <p className="small muted">{entry.definition}</p>
            </div>
          ))}
          <p className="hint">
            Gross profit uses direct costs only; net profit subtracts every expense. Revenue is not profit — money
            coming in is not money kept.
          </p>
        </div>
      </section>
    </div>
  );
}
