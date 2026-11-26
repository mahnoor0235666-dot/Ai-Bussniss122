import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { usePrefs } from '../lib/i18n';
import type { Theme } from '../lib/types';
import { useToast } from './ui';

type NavItem = { to: string; label: string; icon: string; group: 'main' | 'tools' | 'account' };

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'dashboard', icon: '◎', group: 'main' },
  { to: '/problem', label: 'problemSolver', icon: '✧', group: 'main' },
  { to: '/projects', label: 'projects', icon: '▤', group: 'main' },
  { to: '/tasks', label: 'tasks', icon: '☑', group: 'main' },
  { to: '/saved', label: 'savedResults', icon: '❏', group: 'main' },
  { to: '/plan', label: 'businessPlan', icon: '◈', group: 'tools' },
  { to: '/marketing', label: 'marketing', icon: '◉', group: 'tools' },
  { to: '/sales', label: 'sales', icon: '◍', group: 'tools' },
  { to: '/finance', label: 'finance', icon: '▦', group: 'tools' },
  { to: '/profile', label: 'profile', icon: '☺', group: 'account' },
  { to: '/settings', label: 'settings', icon: '⚙', group: 'account' },
];

const MOBILE_NAV: NavItem[] = [
  { to: '/dashboard', label: 'home', icon: '◎', group: 'main' },
  { to: '/problem', label: 'problemSolver', icon: '✧', group: 'main' },
  { to: '/projects', label: 'projects', icon: '▤', group: 'main' },
  { to: '/tasks', label: 'tasks', icon: '☑', group: 'main' },
  { to: '/settings', label: 'more', icon: '⋯', group: 'account' },
];

export function Brand({ compact }: { compact?: boolean }) {
  const { t } = usePrefs();
  return (
    <Link to="/dashboard" className="brand" aria-label={`${t('appName')} — ${t('dashboard')}`}>
      <span className="brand-mark" aria-hidden="true">
        B
      </span>
      {compact ? null : <span>{t('appName')}</span>}
    </Link>
  );
}

export function ThemeLanguageToggles() {
  const { theme, setTheme, language, setLanguage, t } = usePrefs();
  const { user, updateProfile } = useAuth();
  const { notify } = useToast();

  const cycleTheme = async () => {
    const order: Theme[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    if (user) {
      try {
        await updateProfile({ theme: next });
      } catch {
        notify('Theme saved on this device only.', 'error');
      }
    }
  };

  const toggleLanguage = async () => {
    const next = language === 'en' ? 'ur' : 'en';
    setLanguage(next);
    if (user) {
      try {
        await updateProfile({ preferredLanguage: next });
      } catch {
        notify('Language saved on this device only.', 'error');
      }
    }
  };

  const themeLabel = theme === 'system' ? t('themeSystem') : theme === 'light' ? t('themeLight') : t('themeDark');

  return (
    <div className="row" style={{ gap: 6 }}>
      <button
        type="button"
        className="icon-btn"
        onClick={cycleTheme}
        aria-label={`${t('theme')}: ${themeLabel}`}
        title={`${t('theme')}: ${themeLabel}`}
      >
        {theme === 'dark' ? '☾' : theme === 'light' ? '☀' : '◐'}
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={toggleLanguage}
        aria-label={`${t('language')}: ${language === 'en' ? t('english') : t('urdu')}`}
        title={`${t('language')}: ${language === 'en' ? t('english') : t('urdu')}`}
      >
        {language === 'en' ? 'EN' : 'اردو'}
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = usePrefs();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setBusy(true);
    await logout();
    setBusy(false);
    notify(t('signedOutNotice'), 'success');
    navigate('/login', { replace: true });
  };

  const groups: { title: string; items: NavItem[] }[] = [
    { title: t('dashboard'), items: NAV.filter((item) => item.group === 'main') },
    { title: t('quickTools'), items: NAV.filter((item) => item.group === 'tools') },
    { title: t('profile'), items: NAV.filter((item) => item.group === 'account') },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <div className="topbar-spacer" />
        <ThemeLanguageToggles />
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="icon-btn"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={user ? `${t('profile')}: ${user.displayName}` : t('profile')}
          >
            {user ? user.displayName.slice(0, 1).toUpperCase() : '☺'}
          </button>
          {menuOpen ? (
            <div
              role="menu"
              style={{
                position: 'absolute',
                insetInlineEnd: 0,
                top: 48,
                minWidth: 210,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                boxShadow: 'var(--shadow-md)',
                padding: 8,
                zIndex: 60,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <div style={{ padding: '8px 10px' }}>
                <div className="strong small">{user?.displayName}</div>
                <div className="hint">{user?.email}</div>
              </div>
              <hr className="divider" />
              <Link className="nav-link" role="menuitem" to="/profile">
                ☺ {t('profile')}
              </Link>
              <Link className="nav-link" role="menuitem" to="/settings">
                ⚙ {t('settings')}
              </Link>
              <Link className="nav-link" role="menuitem" to="/privacy">
                ⓘ {t('privacy')}
              </Link>
              <button
                type="button"
                className="nav-link"
                role="menuitem"
                onClick={handleLogout}
                disabled={busy}
                style={{ background: 'none', border: 0, cursor: 'pointer', textAlign: 'start', font: 'inherit' }}
              >
                ⏻ {t('signOut')}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="shell-body">
        <nav className="sidebar" aria-label="Main navigation">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="nav-group-title">{group.title}</div>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} className="nav-link">
                  <span aria-hidden="true" style={{ width: 18, display: 'inline-block' }}>
                    {item.icon}
                  </span>
                  {t(item.label)}
                </NavLink>
              ))}
            </div>
          ))}
          <div className="nav-group-title">{t('privacy')}</div>
          <NavLink to="/privacy" className="nav-link">
            <span aria-hidden="true" style={{ width: 18, display: 'inline-block' }}>
              ⓘ
            </span>
            {t('privacy')}
          </NavLink>
        </nav>

        <main className="page" id="main-content">
          {children}
        </main>
      </div>

      <nav className="bottomnav" aria-label="Mobile navigation">
        {MOBILE_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className="bottomnav-item">
            <span className="bottomnav-icon" aria-hidden="true">
              {item.icon}
            </span>
            {t(item.label)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { t } = usePrefs();
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            B
          </span>
          <span>{t('appName')}</span>
        </Link>
        <div className="topbar-spacer" />
        <ThemeLanguageToggles />
        <Link to="/login" className="btn btn-sm">
          {t('signIn')}
        </Link>
      </header>
      <main style={{ flex: 1, width: '100%', maxWidth: 'var(--maxw)', marginInline: 'auto', padding: '0 16px 40px' }}>
        {children}
      </main>
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '18px 16px 26px',
          color: 'var(--muted)',
          fontSize: '0.82rem',
        }}
      >
        <div style={{ maxWidth: 'var(--maxw)', marginInline: 'auto', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span>© {new Date().getFullYear()} BizSolve AI</span>
          <Link to="/privacy">{t('privacy')}</Link>
          <Link to="/login">{t('signIn')}</Link>
          <Link to="/signup">{t('signUp')}</Link>
        </div>
      </footer>
    </div>
  );
}
