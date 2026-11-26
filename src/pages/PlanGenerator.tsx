import { useState } from 'react';
import { usePrefs } from '../lib/i18n';
import { useAiRun, useAiStatus } from '../lib/hooks';
import { AiErrorAlert, AiStatusBanner } from '../components/AiNotice';
import { AnalysisResultView, Field, LoadingBlock, Spinner } from '../components/ui';
import { SaveResult } from '../components/SaveResult';

export default function PlanGenerator() {
  const { t, language } = usePrefs();
  const { status } = useAiStatus();
  const { busy, error, result, suggestedTitle, lastInput, run } = useAiRun();
  const [idea, setIdea] = useState('');
  const [country, setCountry] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [budget, setBudget] = useState('');
  const [skills, setSkills] = useState('');
  const [targetCustomers, setTargetCustomers] = useState('');
  const [availableTime, setAvailableTime] = useState('');
  const [goals, setGoals] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (idea.trim().length < 10) {
      setFormError('Describe the business idea in at least 10 characters.');
      return;
    }
    if (country.trim().length < 2) {
      setFormError('Add the country or city you will sell in.');
      return;
    }
    setFormError(null);
    await run('/api/ai/plan', {
      idea: idea.trim(),
      country: country.trim(),
      targetMarket: targetMarket.trim() || undefined,
      budget: budget.trim() || undefined,
      skills: skills.trim() || undefined,
      targetCustomers: targetCustomers.trim() || undefined,
      availableTime: availableTime.trim() || undefined,
      goals: goals.trim() || undefined,
      language,
    });
  };

  return (
    <div className="stack">
      <header className="stack-sm">
        <h1 style={{ fontSize: '1.4rem' }}>{t('businessPlan')}</h1>
        <p className="muted">
          A realistic starting plan — customer, problem, offer, pricing hypotheses, costs, marketing and the first
          seven days. Estimates are labelled as estimates; market demand is not claimed as verified.
        </p>
      </header>

      <AiStatusBanner status={status} />
      <AiErrorAlert error={error} />

      <form className="card" onSubmit={submit} noValidate>
        <div className="card-body stack">
          <Field
            label={t('idea')}
            htmlFor="plan-idea"
            hint="What you want to sell, and to whom."
            error={formError ?? undefined}
          >
            <textarea
              className="textarea"
              id="plan-idea"
              rows={4}
              maxLength={2000}
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              placeholder="A small home-based bakery selling custom birthday cakes"
            />
          </Field>

          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            }}
          >
            <Field label={t('country')} htmlFor="plan-country">
              <input
                className="input"
                id="plan-country"
                maxLength={80}
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                placeholder="Pakistan"
              />
            </Field>
            <Field label={t('targetAudience')} htmlFor="plan-market" optional>
              <input
                className="input"
                id="plan-market"
                maxLength={300}
                value={targetMarket}
                onChange={(event) => setTargetMarket(event.target.value)}
                placeholder="Lahore, families with young children"
              />
            </Field>
            <Field label={t('budget')} htmlFor="plan-budget" optional hint="Amount and currency, e.g. PKR 150,000">
              <input
                className="input"
                id="plan-budget"
                maxLength={120}
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
              />
            </Field>
            <Field label={t('availableTime')} htmlFor="plan-time" optional>
              <input
                className="input"
                id="plan-time"
                maxLength={200}
                value={availableTime}
                onChange={(event) => setAvailableTime(event.target.value)}
                placeholder="10 hours a week, evenings"
              />
            </Field>
          </div>

          <Field label={t('targetCustomers')} htmlFor="plan-customers" optional>
            <textarea
              className="textarea"
              id="plan-customers"
              rows={2}
              maxLength={600}
              value={targetCustomers}
              onChange={(event) => setTargetCustomers(event.target.value)}
              placeholder="Parents ordering birthday cakes within 5 km"
            />
          </Field>

          <Field label={t('skills')} htmlFor="plan-skills" optional>
            <textarea
              className="textarea"
              id="plan-skills"
              rows={2}
              maxLength={600}
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
              placeholder="5 years of home baking, no formal marketing experience"
            />
          </Field>

          <Field label={t('goals')} htmlFor="plan-goals" optional>
            <textarea
              className="textarea"
              id="plan-goals"
              rows={2}
              maxLength={600}
              value={goals}
              onChange={(event) => setGoals(event.target.value)}
              placeholder="Replace my salary within 12 months"
            />
          </Field>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <Spinner label={t('generating')} /> : t('generate')}
            </button>
          </div>
        </div>
      </form>

      {busy ? <LoadingBlock label={t('generating')} /> : null}

      {result ? (
        <>
          <AnalysisResultView result={result} />
          <SaveResult result={result} input={lastInput} suggestedTitle={suggestedTitle} />
        </>
      ) : null}
    </div>
  );
}
