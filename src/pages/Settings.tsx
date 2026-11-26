import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { usePrefs } from '../lib/i18n';
import { useAiStatus } from '../lib/hooks';
import type { Language, Theme } from '../lib/types';
import { AiStatusBanner } from '../components/AiNotice';
import { Alert, Field } from '../components/ui';

export default function Settings() {
  const { t, language, theme, setLanguage, setTheme } = usePrefs();
  const { user, logout, updateProfile } = useAuth();
  const { status } = useAiStatus();

  const chooseLanguage = async (next: Language) => {
    setLanguage(next);
    if (user) {
      try {
        await updateProfile({ preferredLanguage: next });
      } catch {
        /* the choice is still stored locally */
      }
    }
  };

  const chooseTheme = async (next: Theme) => {
    setTheme(next);
    if (user) {
      try {
        await updateProfile({ theme: next });
      } catch {
        /* the choice is still stored locally */
      }
    }
  };

  const exportData = () => {
    // Cookie session is sent automatically; the response is a JSON download.
    window.location.assign('/api/account/export');
  };

  return (
    <div className="stack">
      <header className="stack-sm">
        <h1 style={{ fontSize: '1.4rem' }}>{t('settings')}</h1>
        <p className="muted">Appearance, language and what this app stores about you.</p>
      </header>

      <section className="card">
        <div className="card-head">
          <h2 style={{ fontSize: '1rem' }}>{t('language')}</h2>
        </div>
        <div className="card-body stack-sm">
          <div className="row" style={{ gap: 6 }}>
            <button
              type="button"
              className={`btn${language === 'en' ? ' btn-primary' : ''}`}
              onClick={() => void chooseLanguage('en')}
            >
              {t('english')}
            </button>
            <button
              type="button"
              className={`btn${language === 'ur' ? ' btn-primary' : ''}`}
              onClick={() => void chooseLanguage('ur')}
            >
              {t('urdu')}
            </button>
          </div>
          <p className="hint">
            Urdu switches the whole interface to a right-to-left layout. Saved results are stored as written.
          </p>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 style={{ fontSize: '1rem' }}>{t('theme')}</h2>
        </div>
        <div className="card-body stack-sm">
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {(['system', 'light', 'dark'] as Theme[]).map((option) => (
              <button
                key={option}
                type="button"
                className={`btn${theme === option ? ' btn-primary' : ''}`}
                onClick={() => void chooseTheme(option)}
              >
                {option === 'system' ? t('themeSystem') : option === 'light' ? t('themeLight') : t('themeDark')}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 style={{ fontSize: '1rem' }}>AI service</h2>
        </div>
        <div className="card-body stack-sm">
          <AiStatusBanner status={status} />
          {status?.configured ? (
            <p className="hint">
              Requests are made from this server, never from your browser, so the provider key is never exposed to
              you. Today’s allowance resets at midnight server time.
            </p>
          ) : (
            <Alert kind="warn" title="Non-AI features still work">
              Projects, tasks, saved results, exports and the finance calculators do not need an AI provider key.
            </Alert>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 style={{ fontSize: '1rem' }}>Data and privacy</h2>
        </div>
        <div className="card-body stack">
          <Field label="Your account email" htmlFor="settings-email">
            <input className="input" id="settings-email" value={user?.email ?? ''} readOnly disabled />
          </Field>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={exportData}>
              {t('exportData')}
            </button>
            <Link to="/privacy" className="btn">
              {t('privacy')}
            </Link>
            <Link to="/profile" className="btn">
              {t('profile')}
            </Link>
          </div>
          <p className="hint">
            The export contains your account, projects, tasks and saved analyses as JSON. Deleting your account is on
            the profile page and removes all of it.
          </p>
        </div>
      </section>

      <section className="card">
        <div className="card-body row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span className="small muted">{t('signOut')}</span>
          <button type="button" className="btn" onClick={() => void logout()}>
            {t('signOut')}
          </button>
        </div>
      </section>
    </div>
  );
}
