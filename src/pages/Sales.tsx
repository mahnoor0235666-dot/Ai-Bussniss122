import { useEffect, useState } from 'react';
import { usePrefs } from '../lib/i18n';
import { useAiRun, useAiStatus } from '../lib/hooks';
import { AiErrorAlert, AiStatusBanner } from '../components/AiNotice';
import { AnalysisResultView, EditableDraft, Field, LoadingBlock, Spinner, analysisToText } from '../components/ui';
import { SaveResult } from '../components/SaveResult';

const SCENARIOS = [
  { value: 'reply', label: 'Reply to a customer' },
  { value: 'followup', label: 'Follow-up message' },
  { value: 'objection', label: 'Handle an objection' },
  { value: 'offer', label: 'Improve my offer' },
  { value: 'retention', label: 'Keep customers coming back' },
  { value: 'script', label: 'Sales conversation script' },
];

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'warm', label: 'Warm' },
  { value: 'bold', label: 'Bold' },
  { value: 'playful', label: 'Playful' },
];

export default function Sales() {
  const { t, language } = usePrefs();
  const { status } = useAiStatus();
  const { busy, error, result, suggestedTitle, lastInput, run } = useAiRun();
  const [scenario, setScenario] = useState('reply');
  const [customerMessage, setCustomerMessage] = useState('');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState('professional');
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (result) setDraft(analysisToText(result));
  }, [result]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (scenario === 'reply' && customerMessage.trim().length < 3) {
      setFormError('Paste the customer message you want to answer.');
      return;
    }
    setFormError(null);
    await run('/api/ai/sales', {
      scenario,
      customerMessage: customerMessage.trim() || undefined,
      context: context.trim() || undefined,
      tone,
      language,
    });
  };

  return (
    <div className="stack">
      <header className="stack-sm">
        <h1 style={{ fontSize: '1.4rem' }}>{t('sales')}</h1>
        <p className="muted">
          Prepare replies, follow-ups, objection answers and scripts. You copy and send them yourself — BizSolve AI
          never messages a customer.
        </p>
      </header>

      <AiStatusBanner status={status} />
      <AiErrorAlert error={error} />

      <form className="card" onSubmit={submit} noValidate>
        <div className="card-body stack">
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            }}
          >
            <Field label={t('scenario')} htmlFor="sales-scenario">
              <select
                className="select"
                id="sales-scenario"
                value={scenario}
                onChange={(event) => setScenario(event.target.value)}
              >
                {SCENARIOS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('tone')} htmlFor="sales-tone">
              <select
                className="select"
                id="sales-tone"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
              >
                {TONES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label={t('customerMessage')}
            htmlFor="sales-message"
            optional={scenario !== 'reply'}
            hint="Paste exactly what the customer said. Do not include card numbers or other sensitive data."
            error={formError ?? undefined}
          >
            <textarea
              className="textarea"
              id="sales-message"
              rows={4}
              maxLength={2000}
              value={customerMessage}
              onChange={(event) => setCustomerMessage(event.target.value)}
              placeholder="How much is it? That is too expensive for me."
            />
          </Field>

          <Field label={t('context')} htmlFor="sales-context" optional hint="Your product, price, and what you already tried.">
            <textarea
              className="textarea"
              id="sales-context"
              rows={3}
              maxLength={1500}
              value={context}
              onChange={(event) => setContext(event.target.value)}
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
          <EditableDraft value={draft} onChange={setDraft} label={t('editableDraft')} rows={14} />
          <SaveResult result={result} input={lastInput} suggestedTitle={suggestedTitle} />
        </>
      ) : null}
    </div>
  );
}
