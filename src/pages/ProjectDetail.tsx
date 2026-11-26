import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { formatDate, formatDateTime, usePrefs } from '../lib/i18n';
import type { Analysis, Project, Task } from '../lib/types';
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Field,
  LoadingBlock,
  PriorityBadge,
  Spinner,
  StatusBadge,
  analysisToText,
  useToast,
} from '../components/ui';

export default function ProjectDetail() {
  const { t, language } = usePrefs();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useToast().notify;

  const [project, setProject] = useState<Project | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.get<{ project: Project; analyses: Analysis[]; tasks: Task[] }>(
        `/api/projects/${id}`,
      );
      setProject(data.project);
      setAnalyses(data.analyses);
      setTasks(data.tasks);
      setTitle(data.project.title);
      setDescription(data.project.description);
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || title.trim().length < 2) return;
    setBusy(true);
    try {
      await api.patch<{ project: Project }>(`/api/projects/${id}`, {
        title: title.trim(),
        description: description.trim(),
      });
      setEditing(false);
      await load();
      notify(t('saved'));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await api.delete(`/api/projects/${id}`);
      notify(t('delete'));
      navigate('/projects');
    } catch (caught) {
      setError(errorMessage(caught));
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  };

  const download = (analysis: Analysis) => {
    const text = analysisToText(analysis.content);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${analysis.title.replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'analysis'}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingBlock label={t('loading')} />;

  if (!project) {
    return (
      <div className="stack">
        <Alert kind="error">{error ?? 'That project does not exist.'}</Alert>
        <Link to="/projects" className="btn">
          {t('projects')}
        </Link>
      </div>
    );
  }

  const done = tasks.filter((task) => task.status === 'completed').length;

  return (
    <div className="stack">
      <Link to="/projects" className="small">
        ← {t('projects')}
      </Link>

      {error ? <Alert kind="error">{error}</Alert> : null}

      <header className="stack-sm">
        <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <h1 style={{ fontSize: '1.4rem' }}>{project.title}</h1>
          <span className="badge">{project.status}</span>
        </div>
        {project.description ? <p className="muted">{project.description}</p> : null}
        <div className="row small muted" style={{ gap: 10, flexWrap: 'wrap' }}>
          <span>{t('category')}: {project.category}</span>
          <span>{t('analyses')}: {analyses.length}</span>
          <span>{t('tasks')}: {done} / {tasks.length}</span>
          <span>{formatDateTime(project.updatedAt, language)}</span>
        </div>
      </header>

      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-sm" onClick={() => setEditing((value) => !value)}>
          {t('edit')}
        </button>
        <Link to={`/tasks`} className="btn btn-sm">
          {t('addTask')}
        </Link>
        <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(true)}>
          {t('delete')}
        </button>
      </div>

      {editing ? (
        <form className="card" onSubmit={save}>
          <div className="card-body stack">
            <Field label={t('title')} htmlFor="detail-title">
              <input
                className="input"
                id="detail-title"
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field label={t('description')} htmlFor="detail-description" optional>
              <textarea
                className="textarea"
                id="detail-description"
                rows={3}
                maxLength={2000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn" onClick={() => setEditing(false)}>
                {t('cancel')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? <Spinner label={t('saving')} /> : t('save')}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <section className="stack-sm">
        <h2 style={{ fontSize: '1.05rem' }}>{t('analyses')}</h2>
        {analyses.length === 0 ? (
          <EmptyState title={t('noAnalysesYet')}>
            Generate an answer, then use “{t('saveToProject')}” to attach it here.
          </EmptyState>
        ) : (
          <div className="stack-sm">
            {analyses.map((analysis) => (
              <article key={analysis.id} className="card">
                <div className="card-body stack-sm">
                  <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <Link to={`/saved?id=${analysis.id}`} style={{ textDecoration: 'none' }}>
                      <strong>{analysis.title}</strong>
                    </Link>
                    <span className="badge">{analysis.kind}</span>
                  </div>
                  <span className="small muted">{formatDateTime(analysis.createdAt, language)}</span>
                  <div className="row" style={{ gap: 6 }}>
                    <Link to={`/saved?id=${analysis.id}`} className="btn btn-sm">
                      {t('viewResult')}
                    </Link>
                    <button type="button" className="btn btn-sm" onClick={() => download(analysis)}>
                      {t('download')}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="stack-sm">
        <h2 style={{ fontSize: '1.05rem' }}>{t('tasks')}</h2>
        {tasks.length === 0 ? (
          <EmptyState title={t('emptyTasks')}>
            <Link to="/tasks">{t('addTask')}</Link>
          </EmptyState>
        ) : (
          <div className="stack-sm">
            {tasks.map((task) => (
              <div key={task.id} className="card">
                <div className="card-body stack-sm">
                  <strong style={task.status === 'completed' ? { textDecoration: 'line-through', opacity: 0.7 } : undefined}>
                    {task.title}
                  </strong>
                  <div className="row small muted" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                    {task.dueDate ? <span>{t('dueDate')}: {formatDate(task.dueDate, language)}</span> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title={t('deleteConfirmTitle')}
        body={t('deleteConfirmBody')}
        confirmLabel={t('delete')}
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
