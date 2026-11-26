import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { usePrefs } from '../lib/i18n';
import { useAiStatus } from '../lib/hooks';
import type { Analysis, Project, Task } from '../lib/types';
import { AiStatusBanner } from '../components/AiNotice';
import { Alert, EmptyState, LoadingBlock, ProgressBar } from '../components/ui';

const TOOLS = [
  { to: '/solve', key: 'problemSolver', desc: 'Find root causes and a plan' },
  { to: '/plan', key: 'businessPlan', desc: 'Turn an idea into a plan' },
  { to: '/marketing', key: 'marketing', desc: 'Posts, campaigns, copy' },
  { to: '/sales', key: 'sales', desc: 'Replies, follow-ups, objections' },
  { to: '/finance', key: 'finance', desc: 'Revenue, profit, break-even' },
  { to: '/tasks', key: 'tasks', desc: 'Track what to do next' },
];

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

export default function Dashboard() {
  const { t } = usePrefs();
  const { user } = useAuth();
  const { status } = useAiStatus();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.get<{ projects: Project[] }>('/api/projects'),
      api.get<{ tasks: Task[] }>('/api/tasks'),
      api.get<{ analyses: Analysis[] }>('/api/analyses'),
    ])
      .then(([projectData, taskData, analysisData]) => {
        if (!active) return;
        setProjects(projectData.projects);
        setTasks(taskData.tasks);
        setAnalyses(analysisData.analyses);
        setError(null);
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const pendingTasks = tasks.filter((task) => task.status !== 'completed');
  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const activeProjects = projects.filter((project) => project.status !== 'archived');
  const recent = [...analyses]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 3);

  return (
    <div className="stack">
      <header className="stack-sm">
        <h1 style={{ fontSize: '1.5rem' }}>
          {t('welcome')}
          {user ? `, ${user.displayName}` : ''}
        </h1>
        <p className="muted">
          {user?.businessName ? `${user.businessName} · ` : ''}
          What do you want to fix today?
        </p>
      </header>

      <AiStatusBanner status={status} />
      {error ? <Alert kind="error">{error}</Alert> : null}

      <Link to="/solve" className="btn btn-primary btn-block btn-lg">
        {t('solveProblem')}
      </Link>

      {loading ? (
        <LoadingBlock label={t('loading')} />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            }}
          >
            <Link to="/projects" className="card" style={{ textDecoration: 'none' }}>
              <div className="card-body stack-sm">
                <span className="small muted">{t('activeProjects')}</span>
                <strong style={{ fontSize: '1.6rem' }}>{activeProjects.length}</strong>
              </div>
            </Link>
            <Link to="/tasks" className="card" style={{ textDecoration: 'none' }}>
              <div className="card-body stack-sm">
                <span className="small muted">{t('pendingTasks')}</span>
                <strong style={{ fontSize: '1.6rem' }}>{pendingTasks.length}</strong>
              </div>
            </Link>
            <Link to="/tasks?status=completed" className="card" style={{ textDecoration: 'none' }}>
              <div className="card-body stack-sm">
                <span className="small muted">{t('completedTasks')}</span>
                <strong style={{ fontSize: '1.6rem' }}>{completedTasks.length}</strong>
              </div>
            </Link>
          </div>

          {tasks.length > 0 ? (
            <div className="card">
              <div className="card-head">
                <h2 style={{ fontSize: '1rem' }}>{t('progress')}</h2>
                <span className="small muted">
                  {completedTasks.length} / {tasks.length}
                </span>
              </div>
              <div className="card-body">
                <ProgressBar value={completedTasks.length} max={tasks.length} />
              </div>
            </div>
          ) : null}

          <section className="stack-sm">
            <h2 style={{ fontSize: '1.05rem' }}>{t('quickTools')}</h2>
            <div
              style={{
                display: 'grid',
                gap: 12,
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              }}
            >
              {TOOLS.map((tool) => (
                <Link key={tool.to} to={tool.to} className="card" style={{ textDecoration: 'none' }}>
                  <div className="card-body stack-sm">
                    <strong>{t(tool.key)}</strong>
                    <span className="small muted">{tool.desc}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="stack-sm">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1.05rem' }}>{t('recentAnalyses')}</h2>
              <Link to="/saved" className="small">
                {t('savedResults')}
              </Link>
            </div>
            {recent.length === 0 ? (
              <EmptyState title={t('noAnalysesYet')}>
                Generate an answer in the problem solver and save it here.
              </EmptyState>
            ) : (
              <div className="stack-sm">
                {recent.map((analysis) => (
                  <Link
                    key={analysis.id}
                    to={`/saved?id=${analysis.id}`}
                    className="card"
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="card-body stack-sm">
                      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                        <strong>{analysis.title}</strong>
                        <span className="badge">{analysis.kind}</span>
                      </div>
                      <span className="small muted">{formatDate(analysis.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="stack-sm">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1.05rem' }}>{t('pendingTasks')}</h2>
              <Link to="/tasks" className="small">
                {t('tasks')}
              </Link>
            </div>
            {pendingTasks.length === 0 ? (
              <EmptyState title={t('noTasksYet')}>
                Add the first action from your plan so it does not get lost.
              </EmptyState>
            ) : (
              <div className="stack-sm">
                {pendingTasks.slice(0, 4).map((task) => (
                  <Link key={task.id} to="/tasks" className="card" style={{ textDecoration: 'none' }}>
                    <div className="card-body stack-sm">
                      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                        <strong>{task.title}</strong>
                        <span className={`badge ${task.priority === 'high' ? 'badge-danger' : ''}`}>
                          {t(task.priority)}
                        </span>
                      </div>
                      {task.dueDate ? (
                        <span className="small muted">
                          {t('dueDate')}: {task.dueDate}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
