import { usePrefs } from '../lib/i18n';
import type { AiStatus } from '../lib/types';
import type { AiErrorState } from '../lib/hooks';
import { Alert } from './ui';

/** Shows remaining daily AI allowance, or an explicit "not configured" state. */
export function AiStatusBanner({ status }: { status: AiStatus | null }) {
  const { t } = usePrefs();
  if (!status) return null;

  if (!status.configured) {
    return (
      <Alert kind="warn" title={t('aiNotConfiguredTitle')}>
        <p className="small">
          The server has no AI provider key, so no AI answer can be generated here. Everything else — projects,
          tasks, saved results and the finance calculators — works normally.
        </p>
        <p className="small">
          To enable AI: set <code>AI_API_KEY</code> (and optionally <code>AI_BASE_URL</code>, <code>AI_MODEL</code>) in
          the server environment, then restart. See <code>README.md</code> → “AI provider configuration”.
        </p>
      </Alert>
    );
  }

  return (
    <div className="row small muted" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
      <span>
        {t('aiRemaining')}: <strong>{status.remaining}</strong> / {status.limit}
      </span>
      {status.model ? <span>Model: {status.model}</span> : null}
    </div>
  );
}

export function AiErrorAlert({ error }: { error: AiErrorState }) {
  if (!error) return null;

  if (error.code === 'ai_not_configured') {
    return (
      <Alert kind="warn" title="AI is not configured">
        <p className="small">{error.message}</p>
        <p className="small">
          Ask the person running this server to add <code>AI_API_KEY</code> to the environment. Nothing was generated,
          and no answer has been invented for you.
        </p>
      </Alert>
    );
  }

  if (error.code === 'ai_quota_exceeded') {
    return (
      <Alert kind="warn" title="Daily AI limit reached">
        <p className="small">{error.message}</p>
      </Alert>
    );
  }

  return (
    <Alert kind="error" title="The AI request did not complete">
      <p className="small">{error.message}</p>
      <p className="small">Your inputs are still here, so you can try again. Nothing was saved.</p>
    </Alert>
  );
}
