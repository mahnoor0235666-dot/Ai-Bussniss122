import React, { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { usePrefs } from './lib/i18n';
import { AppShell, PublicShell } from './components/Layout';
import { LoadingBlock, ToastProvider } from './components/ui';
import Landing from './pages/Landing';
import { ForgotPassword, Login, ResetPassword, Signup, VerifyEmail } from './pages/AuthPages';
import Dashboard from './pages/Dashboard';
import ProblemSolver from './pages/ProblemSolver';
import PlanGenerator from './pages/PlanGenerator';
import Marketing from './pages/Marketing';
import Sales from './pages/Sales';
import Finance from './pages/Finance';
import Tasks from './pages/Tasks';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import SavedResults from './pages/SavedResults';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Privacy from './pages/Privacy';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        <LoadingBlock />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname, protected: true }} />;
  return <AppShell>{children}</AppShell>;
}

function RedirectIfSignedIn({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        <LoadingBlock />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <PublicShell>{children}</PublicShell>;
}

function NotFound() {
  const { t } = usePrefs();
  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="card-body stack">
        <h1 style={{ fontSize: '1.3rem' }}>404</h1>
        <p className="muted">That page does not exist.</p>
        <Link className="btn btn-primary" to="/dashboard">
          {t('backToDashboard')}
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <PublicShell>
              <Landing />
            </PublicShell>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectIfSignedIn>
              <Signup />
            </RedirectIfSignedIn>
          }
        />
        <Route
          path="/login"
          element={
            <RedirectIfSignedIn>
              <Login />
            </RedirectIfSignedIn>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <RedirectIfSignedIn>
              <ForgotPassword />
            </RedirectIfSignedIn>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicShell>
              <ResetPassword />
            </PublicShell>
          }
        />
        <Route
          path="/verify-email"
          element={
            <PublicShell>
              <VerifyEmail />
            </PublicShell>
          }
        />
        <Route
          path="/privacy"
          element={
            <PublicShell>
              <Privacy />
            </PublicShell>
          }
        />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/problem" element={<RequireAuth><ProblemSolver /></RequireAuth>} />
        <Route path="/plan" element={<RequireAuth><PlanGenerator /></RequireAuth>} />
        <Route path="/marketing" element={<RequireAuth><Marketing /></RequireAuth>} />
        <Route path="/sales" element={<RequireAuth><Sales /></RequireAuth>} />
        <Route path="/finance" element={<RequireAuth><Finance /></RequireAuth>} />
        <Route path="/tasks" element={<RequireAuth><Tasks /></RequireAuth>} />
        <Route path="/projects" element={<RequireAuth><Projects /></RequireAuth>} />
        <Route path="/projects/:id" element={<RequireAuth><ProjectDetail /></RequireAuth>} />
        <Route path="/saved" element={<RequireAuth><SavedResults /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="*" element={<PublicShell><NotFound /></PublicShell>} />
      </Routes>
    </ToastProvider>
  );
}
