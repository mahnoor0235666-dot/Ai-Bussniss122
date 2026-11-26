import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { usePrefs } from '../lib/i18n';
import { Alert, Field, Spinner, useToast } from '../components/ui';

function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div style={{ maxWidth: 440, marginInline: 'auto', paddingTop: 24 }}>
      <div className="card">
        <div className="card-body stack">
          <div className="stack-sm">
            <h1 style={{ fontSize: '1.35rem' }}>{title}</h1>
            {subtitle ? <p className="small muted">{subtitle}</p> : null}
          </div>
          {children}
          {footer ? <div className="small muted">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const { t } = usePrefs();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const state = location.state as { from?: string; protected?: boolean } | null;
  const next = state?.from && state.from !== '/login' ? state.from : '/dashboard';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      notify(t('welcome'), 'success');
      navigate(next, { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t('signIn')}
      subtitle={t('tagline')}
      footer={
        <div className="stack-sm">
          <Link to="/forgot-password">{t('forgotPassword')}</Link>
          <span>
            No account? <Link to="/signup">{t('signUp')}</Link>
          </span>
        </div>
      }
    >
      {state?.protected ? <Alert kind="info">{t('protectedNotice')}</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}
      <form className="stack" onSubmit={submit} noValidate>
        <Field label={t('email')} htmlFor="login-email">
          <input
            className="input"
            id="login-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label={t('password')} htmlFor="login-password">
          <input
            className="input"
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            maxLength={200}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <label className="row small" style={{ gap: 8 }}>
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
          />
          {t('showPassword')}
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Spinner label={t('loading')} /> : t('signIn')}
        </button>
      </form>
    </AuthCard>
  );
}

export function Signup() {
  const { t, language } = usePrefs();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!displayName.trim()) nextErrors.displayName = 'Add your name';
    if (!email.trim()) nextErrors.email = 'Enter your email address';
    if (password.length < 8) nextErrors.password = 'Use at least 8 characters';
    if (password !== confirmPassword) nextErrors.confirmPassword = 'Passwords do not match';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    setError(null);
    try {
      await signup({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        preferredLanguage: language,
      });
      notify(t('welcome'), 'success');
      navigate('/dashboard', { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t('signUp')}
      subtitle="Free account. Your projects and analyses stay private to you."
      footer={
        <span>
          Already have an account? <Link to="/login">{t('signIn')}</Link>
        </span>
      }
    >
      {error ? <Alert kind="error">{error}</Alert> : null}
      <form className="stack" onSubmit={submit} noValidate>
        <Field label={t('displayName')} htmlFor="signup-name" error={fieldErrors.displayName}>
          <input
            className="input"
            id="signup-name"
            autoComplete="name"
            maxLength={80}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </Field>
        <Field label={t('email')} htmlFor="signup-email" error={fieldErrors.email}>
          <input
            className="input"
            id="signup-email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field
          label={t('password')}
          htmlFor="signup-password"
          hint="At least 8 characters."
          error={fieldErrors.password}
        >
          <input
            className="input"
            id="signup-password"
            type="password"
            autoComplete="new-password"
            maxLength={200}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Field label={t('confirmPassword')} htmlFor="signup-confirm" error={fieldErrors.confirmPassword}>
          <input
            className="input"
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            maxLength={200}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Spinner label={t('loading')} /> : t('signUp')}
        </button>
        <p className="hint">
          By creating an account you agree to keep your own data safe. Read the{' '}
          <Link to="/privacy">{t('privacy')}</Link> page for what is stored.
        </p>
      </form>
    </AuthCard>
  );
}

export function ForgotPassword() {
  const { t } = usePrefs();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    setDevUrl(null);
    try {
      const data = await api.post<{
        ok: boolean;
        message: string;
        emailConfigured: boolean;
        devResetUrl?: string;
      }>('/api/auth/forgot-password', { email: email.trim() });
      setMessage(data.message);
      if (data.devResetUrl) setDevUrl(data.devResetUrl);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={t('forgotPassword')}
      subtitle="We will email you a link that works once, for one hour."
      footer={
        <Link to="/login">
          ← {t('signIn')}
        </Link>
      }
    >
      {error ? <Alert kind="error">{error}</Alert> : null}
      {message ? (
        <Alert kind={devUrl ? 'warn' : 'info'}>
          <p>{message}</p>
          {devUrl ? (
            <p className="small">
              Development mode: email delivery is not configured, so use this one-time link directly:{' '}
              <a href={devUrl}>reset your password</a>
            </p>
          ) : null}
        </Alert>
      ) : null}
      <form className="stack" onSubmit={submit} noValidate>
        <Field label={t('email')} htmlFor="forgot-email">
          <input
            className="input"
            id="forgot-email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Spinner label={t('loading')} /> : t('sendResetLink')}
        </button>
      </form>
    </AuthCard>
  );
}

export function ResetPassword() {
  const { t } = usePrefs();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError('Use at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setDone(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title={t('resetPassword')}>
        <Alert kind="error">
          This link is missing its token. Request a new reset link from the{' '}
          <Link to="/forgot-password">{t('forgotPassword')}</Link> page.
        </Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('resetPassword')} footer={<Link to="/login">← {t('signIn')}</Link>}>
      {done ? (
        <Alert kind="success" title={t('newPasswordSaved')}>
          <Link to="/login">{t('signIn')}</Link>
        </Alert>
      ) : (
        <>
          {error ? <Alert kind="error">{error}</Alert> : null}
          <form className="stack" onSubmit={submit} noValidate>
            <Field label={t('newPassword')} htmlFor="reset-password" hint="At least 8 characters.">
              <input
                className="input"
                id="reset-password"
                type="password"
                autoComplete="new-password"
                maxLength={200}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Field label={t('confirmPassword')} htmlFor="reset-confirm">
              <input
                className="input"
                id="reset-confirm"
                type="password"
                autoComplete="new-password"
                maxLength={200}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </Field>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? <Spinner label={t('saving')} /> : t('save')}
            </button>
          </form>
        </>
      )}
    </AuthCard>
  );
}

export function VerifyEmail() {
  const { t } = usePrefs();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('This confirmation link is missing its token.');
      return;
    }
    let active = true;
    setState('busy');
    api
      .post('/api/auth/verify-email', { token })
      .then(() => {
        if (active) setState('done');
      })
      .catch((error) => {
        if (active) {
          setState('error');
          setMessage(errorMessage(error));
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <AuthCard title={t('verifyEmail')} footer={<Link to="/dashboard">{t('backToDashboard')}</Link>}>
      {state === 'busy' ? <Spinner label={t('loading')} /> : null}
      {state === 'done' ? <Alert kind="success">{t('emailVerified')}</Alert> : null}
      {state === 'error' ? <Alert kind="error">{message}</Alert> : null}
    </AuthCard>
  );
}
