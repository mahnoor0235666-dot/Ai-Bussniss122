import { useEffect, useState } from 'react';
import { usePrefs } from '../lib/i18n';
import { useAiRun, useAiStatus } from '../lib/hooks';
import { AiErrorAlert, AiStatusBanner } from '../components/AiNotice';
import { AnalysisResultView, EditableDraft, Field, LoadingBlock, Spinner, analysisToText } from '../components/ui';
import { SaveResult } from '../components/SaveResult';

const OUTPUT_TYPES = [
  { value: 'social_posts', label: 'Social media posts' },
  { value: 'campaign', label: 'Marketing campaign' },
  { value: 'product_description', label: 'Product description' },
  { value: 'ad_copy', label: 'Advertising copy' },
  { value: 'outreach', label: 'Customer outreach messages' },
  { value: 'content_calendar', label: 'Content calendar' },
  { value: 'brand_positioning', label: 'Brand positioning' },
];

const OBJECTIVES = [
  { value: 'awareness', label: 'Awareness' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'leads', label: 'Leads / enquiries' },
  { value: 'sales', label: 'Sales' },
  { value: 'retention', label: 'Repeat customers' },
];

const TONES = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'bold', label: 'Bold' },
  { value: 'playful', label: 'Playful' },
  { value: 'warm', label: 'Warm' },
];

const PLATFORMS = [
  { value: 'general', label: 'General' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: 'Email' },
];

export default function Marketing() {
  const { t, language } = usePrefs();
  const { status } = useAiStatus();
  const { busy, error, result, suggestedTitle, lastInput, run } = useAiRun();
  const [category, setCategory] = useState('');
  const [audience, setAudience] = useState('');
  const [outputType, setOutputType] = useState('social_posts');
  const [objective, setObjective] = useState('sales');
  const [tone, setTone] = useState('friendly');
  const [platform, setPlatform] = useState('general');
  const [details, setDetails] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (result) setDraft(analysisToText(result));
  }, [result]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (category.trim().length < 2) {
      setFormError('Add your business category, e.g. bakery, clothing, tutoring.');
      return;
    }
    if (audience.trim().length < 2) {
      setFormError('Describe who you want to reach.');
      return;
    }
    setFormError(null);
    await run('/api/ai/marketing', {
      category: category.trim(),
      audience: audience.trim(),
      outputType,
      objective,
      tone,
      platform,
      details: details.trim() || undefined,
      language,
    });
  };

  return (
    <div className="stack">
      <header className="stack-sm">
        <h1 style={{ fontSize: '1.4rem' }}>{t('marketing')}</h1>
        <p className="muted">
          Draft posts, campaigns, product descriptions, ad copy, outreach messages and content calendars. Everything
          below is editable before you copy or export it — nothing is published automatically.
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
            <Field label={t('category')} htmlFor="mkt-category" error={formError ?? undefined}>
              <input
                className="input"
                id="mkt-category"
                maxLength={80}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Home bakery"
              />
            </Field>
            <Field label={t('targetAudience')} htmlFor="mkt-audience">
              <input
                className="input"
                id="mkt-audience"
                maxLength={300}
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder="Parents aged 25–40 in Lahore"
              />
            </Field>
            <Field label={t('contentType')} htmlFor="mkt-output">
              <select
                className="select"
                id="mkt-output"
                value={outputType}
                onChange={(event) => setOutputType(event.target.value)}
              >
                {OUTPUT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('objective')} htmlFor="mkt-objective">
              <select
                className="select"
                id="mkt-objective"
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
              >
                {OBJECTIVES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('tone')} htmlFor="mkt-tone">
              <select
                className="select"
                id="mkt-tone"
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
            <Field label="Platform" htmlFor="mkt-platform">
              <select
                className="select"
                id="mkt-platform"
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
              >
                {PLATFORMS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label={t('details')}
            htmlFor="mkt-details"
            optional
            hint="Product, price range, offer, what makes you different."
          >
            <textarea
              className="textarea"
              id="mkt-details"
              rows={4}
              maxLength={1500}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
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
