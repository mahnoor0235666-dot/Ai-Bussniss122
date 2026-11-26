import { usePrefs } from '../lib/i18n';

export default function Privacy() {
  const { t } = usePrefs();
  return (
    <div className="stack" style={{ paddingTop: 24, maxWidth: 760 }}>
      <h1 style={{ fontSize: '1.5rem' }}>{t('privacy')}</h1>
      <p className="muted">
        This page explains, in plain language, what BizSolve AI stores and what it does not. It is a description of the
        application's actual behaviour — not a claim of compliance with any specific privacy law.
      </p>

      <section className="card">
        <div className="card-body stack-sm">
          <h2 style={{ fontSize: '1.05rem' }}>What we store</h2>
          <ul className="bullet-list">
            <li>Your email address, display name, optional business name and language/theme preference.</li>
            <li>A hashed password (scrypt with a per-user salt). The plain password is never stored or logged.</li>
            <li>Session records so you stay signed in. The session token lives in an HttpOnly cookie.</li>
            <li>Projects, saved analyses, and tasks that you create, including the text you typed into AI tools.</li>
            <li>A count of AI requests per day, used to enforce usage limits.</li>
          </ul>
        </div>
      </section>

      <section className="card">
        <div className="card-body stack-sm">
          <h2 style={{ fontSize: '1.05rem' }}>What we do not store</h2>
          <ul className="bullet-list">
            <li>No payment or card information — there is no payment feature.</li>
            <li>No passwords in plaintext, and no password reset tokens in readable form (only a hash).</li>
            <li>No third-party advertising or analytics trackers.</li>
          </ul>
        </div>
      </section>

      <section className="card">
        <div className="card-body stack-sm">
          <h2 style={{ fontSize: '1.05rem' }}>AI processing</h2>
          <p className="small">
            When you use an AI tool, the text you enter is sent from our server to the configured AI provider so it can
            generate an answer. The request is made server-side; the provider API key is never sent to your browser. If
            no provider is configured, the app tells you instead of inventing an answer.
          </p>
          <p className="small">
            Treat AI output as a draft. It can be wrong, incomplete, or out of date, and it is displayed as text — never
            rendered as HTML.
          </p>
        </div>
      </section>

      <section className="card">
        <div className="card-body stack-sm">
          <h2 style={{ fontSize: '1.05rem' }}>Your controls</h2>
          <ul className="bullet-list">
            <li>Delete any project, saved analysis or task from inside the app.</li>
            <li>Export all of your data as JSON from Settings.</li>
            <li>Delete your account in Settings; this removes your projects, analyses, tasks and sessions.</li>
          </ul>
        </div>
      </section>

      <section className="card">
        <div className="card-body stack-sm">
          <h2 style={{ fontSize: '1.05rem' }}>Security, honestly</h2>
          <p className="small">
            The app uses hashed passwords, HttpOnly session cookies, server-side ownership checks on every record,
            strict security headers and rate limits. It has not been penetration tested, and no system is completely
            secure. If you handle regulated or highly sensitive data, get a professional review before relying on it.
          </p>
        </div>
      </section>
    </div>
  );
}
