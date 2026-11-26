import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { formatDate, usePrefs } from '../lib/i18n';
import type { Analysis, Project, Task } from '../lib/types';
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Field,
  LoadingBlock,
  Modal,
  ProgressBar,
  Spinner,
  useToast,
} from '../components/ui';

type Draft = { title: string; description: string; category: string; status: Project['status'] };

const emptyDraft: Draft = { title: '', description: '', category: 'general', status: 'active' };

export default function Projects() {
  const { t, language } = usePrefs();
  const notify = useToast().notify;
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projectData, taskData, analysisData] = await Promise.all([
        api.get<{ projects: Project[] }>('/api/projects'),
        api.get<{ tasks: Task[] }>('/api/tasks'),
        api.get<{ analyses: Analysis[] }>('/api/analyses'),
      ]);
      setProjects(projectData.projects);
      setTasks(taskData.tasks);
      setAnalyses(analysisData.analyses);
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const map = new Map<string, { tasks: number; done: number; analyses: number }>();
    projects.forEach((project) => map.set(project.id, { tasks: 0, done: 0, analyses: 0 }));
    tasks.forEach((task) => {
      if (!task.projectId) return;
      const entry = map.get(task.projectId);
      if (!entry) return;
      entry.tasks += 1;
      if (task.status === 'completed') entry.done += 1;
    });
    analyses.forEach((analysis) => {
      if (!analysis.projectId) return;
      const entry = map.get(analysis.projectId);
      if (entry) entry.analyses += 1;
    });
    return map;
  }, [projects, tasks, analyses]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.title.trim().length < 2) {
      setFormError(t('required'));
      return;
    }
    setFormError(null);
    setBusy(true);
    try {
      await api.post<{ project: Project }>('/api/projects', {
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        category: draft.category.trim() || 'general',
        status: draft.status,
      });
      setDraft(emptyDraft);
      setCreating(false);
      await load();
      notify(t('saved'));
    } catch (caught) {
      setFormError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/api/projects/${deleting.id}`);
      setDeleting(null);
      await load();
      notify(t('delete'));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <header className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div className="stack-sm">
          <h1 style={{ fontSize: '1.4rem' }}>{t('projects')}</h1>
          <p className="muted">Group saved analyses and tasks under one business problem or idea.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          {t('newProject')}
        </button>
      </header>

      {error ? <Alert kind="error">{error}</Alert> : null}

      {loading ? (
        <LoadingBlock label={t('loading')} />
      ) : projects.length === 0 ? (
        <EmptyState
          title={t('noProjectsYet')}
          action={
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              {t('newProject')}
            </button>
          }
        />
      ) : (
        <div className="stack-sm">
          {projects.map((project) => {
            const entry = stats.get(project.id) ?? { tasks: 0, done: 0, analyses: 0 };
            return (
              <article key={project.id} className="card">
                <div className="card-body stack-sm">
                  <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <Link to={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
                      <strong>{project.title}</strong>
                    </Link>
                    <span className="badge">{project.status}</span>
                  </div>
                  {project.description ? <p className="small muted">{project.description}</p> : null}
                  <div className="row small muted" style={{ gap: 10, flexWrap: 'wrap' }}>
                    <span>{t('category')}: {project.category}</span>
                    <span>{t('analyses')}: {entry.analyses}</span>
                    <span>
                      {t('tasks')}: {entry.done} / {entry.tasks}
                    </span>
                    <span>{formatDate(project.updatedAt, language)}</span>
                  </div>
                  {entry.tasks > 0 ? <ProgressBar value={entry.done} max={entry.tasks} /> : null}
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    <Link to={`/projects/${project.id}`} className="btn btn-sm">
                      {t('openProject')}
                    </Link>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => setDeleting(project)}
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={creating} title={t('newProject')} onClose={() => setCreating(false)}>
        <form className="stack" onSubmit={create} noValidate>
          <Field label={t('title')} htmlFor="project-title" error={formError ?? undefined}>
            <input
              className="input"
              id="project-title"
              maxLength={200}
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="Low online sales"
            />
          </Field>
          <Field label={t('description')} htmlFor="project-description" optional>
            <textarea
              className="textarea"
              id="project-description"
              rows={3}
              maxLength={2000}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </Field>
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            }}
          >
            <Field label={t('category')} htmlFor="project-category" optional>
              <input
                className="input"
                id="project-category"
                maxLength={80}
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              />
            </Field>
            <Field label={t('status')} htmlFor="project-status">
              <select
                className="select"
                id="project-status"
                value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value as Project['status'] })}
              >
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="archived">archived</option>
              </select>
            </Field>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn" onClick={() => setCreating(false)}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <Spinner label={t('saving')} /> : t('save')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('deleteConfirmTitle')}
        body={t('deleteConfirmBody')}
        confirmLabel={t('delete')}
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
