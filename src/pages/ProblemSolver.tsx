import { useState } from 'react';
import { usePrefs } from '../lib/i18n';
import { useAiRun, useAiStatus } from '../lib/hooks';
import { AiErrorAlert, AiStatusBanner } from '../components/AiNotice';
import { AnalysisResultView, Field, LoadingBlock, Spinner } from '../components/ui';
import { SaveResult } from '../components/SaveResult';

const EXAMPLES = [
  'My business is not getting customers.',
  'People ask about prices but do not buy.',
  'My online clothing store has low sales.',
  'I have no marketing budget.',
  'I do not know which business to start.',
  'My business expenses are higher than my income.',
  'Customers contact me but do not complete purchases.',
];

export default function ProblemSolver() {
  const { t, language } = usePrefs();
  const { status } = useAiStatus();
  const { busy, error, result, usage, suggestedTitle, lastInput, run } = useAiRun();
  const [problem, setProblem] = useState('');
  const [context, setContext] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (problem.trim().length < 10) {
      setFormError('Describe the problem in at least 10 characters so the answer can be specific.');
      return;
    }
    setFormError(null);
    await run('/api/ai/problem', {
      problem: problem.trim(),
      context: context.trim() || undefined,
      language,
    });
  };

  return (
    <div className="stack">
      <header className="stack-sm">
        <h1 style={{ fontSize: '1.4rem' }}>{t('problemSolver')}</h1>
        <p className="muted">
          Describe the problem in your own words — English or Urdu. You will get root causes, a prioritised plan,
          costs, risks and the one action to take today.
        </p>
      </header>

      <AiStatusBanner status={status} />
      <AiErrorAlert error={error} />

      <form className="card" onSubmit={submit} noValidate>
        <div className="card-body stack">
          <Field
            label={t('problemLabel')}
            htmlFor="problem"
            hint="Example: “People message me about prices but never order.”"
            error={formError ?? undefined}
          >
            <textarea
              className="textarea"
              id="problem"
              rows={5}
              maxLength={4000}
              value={problem}
              onChange={(event) => setProblem(event.target.value)}
              placeholder={EXAMPLES[0]}
            />
          </Field>

          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="btn btn-sm"
                onClick={() => setProblem(example)}
              >
                {example}
              </button>
            ))}
          </div>

          <Field
            label={t('context')}
            htmlFor="problem-context"
            optional
            hint="What you sell, your city, your prices, what you have already tried."
          >
            <textarea
              className="textarea"
              id="problem-context"
              rows={4}
              maxLength={2000}
              value={context}
              onChange={(event) => setContext(event.target.value)}
            />
          </Field>

          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span className="small muted">
              {problem.trim().length} / 4000
              {usage ? ` · ${usage.remaining} ${t('aiRemaining').toLowerCase()}` : ''}
            </span>
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
