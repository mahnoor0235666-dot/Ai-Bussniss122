import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, usePrefs } from '../lib/i18n';
import { Alert, ConfirmDialog, Field, Spinner } from '../components/ui';

export default function Profile() {
  const { t, language } = usePrefs();
  const { user, updateProfile, setUser } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [businessName, setBusinessName] = useState(user?.businessName ?? '');
  const [profileMsg, setProfileMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const [verifyMsg, setVerifyMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [sendingVerify, setSendingVerify] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        businessName: businessName.trim(),
      });
      setProfileMsg({ kind: 'ok', text: 'Profile updated.' });
    } catch (error) {
      setProfileMsg({ kind: 'err', text: errorMessage(error) });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg({ kind: 'err', text: 'The new passwords do not match.' });
      return;
    }
    setSavingPw(true);
    try {
      await api.post('/api/account/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwMsg({ kind: 'ok', text: 'Password changed. Other devices were signed out.' });
    } catch (error) {
      setPwMsg({ kind: 'err', text: errorMessage(error) });
    } finally {
      setSavingPw(false);
    }
  };

  const resendVerification = async () => {
    setSendingVerify(true);
    setVerifyMsg(null);
    try {
      const data = await api.post<{ alreadyVerified?: boolean; emailConfigured?: boolean; sent?: boolean }>(
        '/api/auth/resend-verification',
      );
      if (data.alreadyVerified) {
        setVerifyMsg({ kind: 'ok', text: 'Your email is already confirmed.' });
      } else if (data.sent) {
        setVerifyMsg({ kind: 'ok', text: 'Confirmation email sent. Check your inbox.' });
      } else {
        setVerifyMsg({
          kind: 'err',
          text: 'Email delivery is not configured on this server, so the message could not be sent. Set the SMTP variables described in the README.',
        });
      }
    } catch (error) {
      setVerifyMsg({ kind: 'err', text: errorMessage(error) });
    } finally {
      setSendingVerify(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.del('/api/account', { password: deletePassword });
      setUser(null);
      setDeleteOpen(false);
      navigate('/', { replace: true });
    } catch (error) {
      setDeleteError(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="stack">
      <header className="stack-sm">
        <h1 style={{ fontSize: '1.4rem' }}>{t('profile')}</h1>
        <p className="muted">
          {user.email} · member since {formatDate(user.createdAt, language)}
        </p>
      </header>

      <section className="card">
        <div className="card-head">
          <h2 style={{ fontSize: '1rem' }}>Account details</h2>
          <span className={`badge ${user.emailVerified ? 'badge-ok' : 'badge-warn'}`}>
            {user.emailVerified ? 'Email confirmed' : 'Email not confirmed'}
          </span>
        </div>
        <form className="card-body stack" onSubmit={saveProfile}>
          {profileMsg ? <Alert kind={profileMsg.kind === 'ok' ? 'success' : 'error'}>{profileMsg.text}</Alert> : null}
          <Field label="Display name" htmlFor="profile-name">
            <input
              className="input"
              id="profile-name"
              value={displayName}
              maxLength={80}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </Field>
          <Field label="Business name (optional)" htmlFor="profile-business" hint="Used in the header and in generated content.">
            <input
              className="input"
              id="profile-business"
              value={businessName}
              maxLength={120}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="profile-email" hint="Email changes are not supported yet.">
            <input className="input" id="profile-email" value={user.email} readOnly disabled />
          </Field>
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? <Spinner /> : null} Save changes
            </button>
          </div>
        </form>
        {!user.emailVerified ? (
          <div className="card-body stack-sm" style={{ borderTop: '1px solid var(--border)' }}>
            {verifyMsg ? <Alert kind={verifyMsg.kind === 'ok' ? 'success' : 'warn'}>{verifyMsg.text}</Alert> : null}
            <button type="button" className="btn" onClick={() => void resendVerification()} disabled={sendingVerify}>
              {sendingVerify ? <Spinner /> : null} Resend confirmation email
            </button>
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="card-head">
          <h2 style={{ fontSize: '1rem' }}>Change password</h2>
        </div>
        <form className="card-body stack" onSubmit={changePassword}>
          {pwMsg ? <Alert kind={pwMsg.kind === 'ok' ? 'success' : 'error'}>{pwMsg.text}</Alert> : null}
          <Field label="Current password" htmlFor="pw-current">
            <input
              className="input"
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Field>
          <Field label="New password" htmlFor="pw-new" hint="At least 8 characters.">
            <input
              className="input"
              id="pw-new"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </Field>
          <Field label="Confirm new password" htmlFor="pw-confirm">
            <input
              className="input"
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Field>
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={savingPw}>
              {savingPw ? <Spinner /> : null} Update password
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 style={{ fontSize: '1rem' }}>Delete account</h2>
        </div>
        <div className="card-body stack-sm">
          <p className="small muted">
            Deleting your account permanently removes your projects, tasks and saved analyses. This cannot be undone.
          </p>
          {deleteError ? <Alert kind="error">{deleteError}</Alert> : null}
          <Field label="Password" htmlFor="delete-password" hint="Required to confirm account deletion.">
            <input
              className="input"
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
          </Field>
          <div className="row">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setDeleteOpen(true)}
              disabled={deletePassword.length === 0}
            >
              Delete my account
            </button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete your account?"
        body="All projects, tasks and saved analyses are removed immediately. This cannot be undone."
        confirmLabel="Delete everything"
        busy={deleting}
        onCancel={() => {
          setDeleteOpen(false);
          setDeletePassword('');
          setDeleteError(null);
        }}
        onConfirm={() => void deleteAccount()}
      />
    </div>
  );
}
