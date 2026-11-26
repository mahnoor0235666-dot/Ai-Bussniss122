import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { formatDate, usePrefs } from '../lib/i18n';
import type { Project, Task } from '../lib/types';
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Field,
  LoadingBlock,
  Modal,
  PriorityBadge,
  ProgressBar,
  Spinner,
  StatusBadge,
  useToast,
} from '../components/ui';

type Draft = {
  title: string;
  description: string;
  priority: Task['priority'];
  status: Task['status'];
  dueDate: string;
  projectId: string;
};

const emptyDraft: Draft = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'pending',
  dueDate: '',
  projectId: '',
};

const FILTERS: { value: string; key: string }[] = [
  { value: '', key: 'all' },
  { value: 'pending', key: 'pending' },
  { value: 'in_progress', key: 'inProgress' },
  { value: 'completed', key: 'completed' },
];

export default function Tasks() {
  const { t, language } = usePrefs();
  const notify = useToast().notify;
  const [params, setParams] = useSearchParams();
  const filter = params.get('status') ?? '';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<Task | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [taskData, projectData] = await Promise.all([
        api.get<{ tasks: Task[] }>('/api/tasks'),
        api.get<{ projects: Project[] }>('/api/projects'),
      ]);
      setTasks(taskData.tasks);
      setProjects(projectData.projects);
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

  const visible = useMemo(
    () => (filter ? tasks.filter((task) => task.status === filter) : tasks),
    [tasks, filter],
  );

  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const projectName = (id: string | null) =>
    id ? projects.find((project) => project.id === id)?.title ?? '' : '';

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.title.trim().length < 2) {
      setFormError(t('required'));
      return;
    }
    setFormError(null);
    setBusy(true);
    try {
      await api.post<{ task: Task }>('/api/tasks', {
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        priority: draft.priority,
        status: draft.status,
        dueDate: draft.dueDate || null,
        projectId: draft.projectId || null,
      });
      setDraft({ ...emptyDraft, projectId: draft.projectId });
      await load();
      notify(t('saved'));
    } catch (caught) {
      setFormError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const patch = async (task: Task, changes: Partial<Draft>) => {
    setBusy(true);
    try {
      await api.patch<{ task: Task }>(`/api/tasks/${task.id}`, changes);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    if (editDraft.title.trim().length < 2) return;
    await patch(editing, {
      title: editDraft.title.trim(),
      description: editDraft.description.trim(),
      priority: editDraft.priority,
      status: editDraft.status,
      dueDate: editDraft.dueDate,
      projectId: editDraft.projectId,
    });
    setEditing(null);
    notify(t('saved'));
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/api/tasks/${deleting.id}`);
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
      <header className="stack-sm">
        <h1 style={{ fontSize: '1.4rem' }}>{t('tasks')}</h1>
        <p className="muted">Turn your plan into concrete actions with dates and priorities.</p>
      </header>

      {error ? <Alert kind="error">{error}</Alert> : null}

      <form className="card" onSubmit={create} noValidate>
        <div className="card-head">
          <h2 style={{ fontSize: '1rem' }}>{t('addTask')}</h2>
        </div>
        <div className="card-body stack">
          <Field label={t('title')} htmlFor="task-title" error={formError ?? undefined}>
            <input
              className="input"
              id="task-title"
              maxLength={200}
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="Call 5 past customers about the new offer"
            />
          </Field>
          <Field label={t('description')} htmlFor="task-description" optional>
            <textarea
              className="textarea"
              id="task-description"
              rows={2}
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
            <Field label={t('priority')} htmlFor="task-priority">
              <select
                className="select"
                id="task-priority"
                value={draft.priority}
                onChange={(event) => setDraft({ ...draft, priority: event.target.value as Task['priority'] })}
              >
                <option value="low">{t('low')}</option>
                <option value="medium">{t('medium')}</option>
                <option value="high">{t('high')}</option>
              </select>
            </Field>
            <Field label={t('dueDate')} htmlFor="task-due" optional>
              <input
                className="input"
                id="task-due"
                type="date"
                value={draft.dueDate}
                onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
              />
            </Field>
            <Field label={t('project')} htmlFor="task-project" optional>
              <select
                className="select"
                id="task-project"
                value={draft.projectId}
                onChange={(event) => setDraft({ ...draft, projectId: event.target.value })}
              >
                <option value="">{t('noProject')}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <Spinner label={t('saving')} /> : t('addTask')}
            </button>
          </div>
        </div>
      </form>

      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`btn btn-sm${filter === option.value ? ' btn-primary' : ''}`}
            onClick={() => {
              if (option.value) setParams({ status: option.value });
              else setParams({});
            }}
          >
            {t(option.key)}
          </button>
        ))}
      </div>

      {tasks.length > 0 ? (
        <div className="card">
          <div className="card-body stack-sm">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="small muted">{t('progress')}</span>
              <span className="small muted">
                {completedCount} / {tasks.length}
              </span>
            </div>
            <ProgressBar value={completedCount} max={tasks.length} />
          </div>
        </div>
      ) : null}

      {loading ? (
        <LoadingBlock label={t('loading')} />
      ) : visible.length === 0 ? (
        <EmptyState title={t('emptyTasks')}>{t('noTasksYet')}</EmptyState>
      ) : (
        <div className="stack-sm">
          {visible.map((task) => (
            <article key={task.id} className="card">
              <div className="card-body stack-sm">
                <div className="row" style={{ justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div className="stack-sm" style={{ flex: 1 }}>
                    <strong style={task.status === 'completed' ? { textDecoration: 'line-through', opacity: 0.7 } : undefined}>
                      {task.title}
                    </strong>
                    {task.description ? <p className="small muted">{task.description}</p> : null}
                    <div className="row small muted" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                      {task.dueDate ? <span>{t('dueDate')}: {formatDate(task.dueDate, language)}</span> : null}
                      {task.projectId ? (
                        <Link to={`/projects/${task.projectId}`} className="small">
                          {projectName(task.projectId)}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={busy}
                    onClick={() =>
                      void patch(task, {
                        status: task.status === 'completed' ? 'pending' : 'completed',
                      })
                    }
                  >
                    {task.status === 'completed' ? t('pending') : t('completed')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      setEditing(task);
                      setEditDraft({
                        title: task.title,
                        description: task.description,
                        priority: task.priority,
                        status: task.status,
                        dueDate: task.dueDate ?? '',
                        projectId: task.projectId ?? '',
                      });
                    }}
                  >
                    {t('edit')}
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleting(task)}>
                    {t('delete')}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={Boolean(editing)} title={t('edit')} onClose={() => setEditing(null)}>
        <form className="stack" onSubmit={saveEdit}>
          <Field label={t('title')} htmlFor="edit-title">
            <input
              className="input"
              id="edit-title"
              maxLength={200}
              value={editDraft.title}
              onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })}
            />
          </Field>
          <Field label={t('description')} htmlFor="edit-description" optional>
            <textarea
              className="textarea"
              id="edit-description"
              rows={3}
              maxLength={2000}
              value={editDraft.description}
              onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })}
            />
          </Field>
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            }}
          >
            <Field label={t('priority')} htmlFor="edit-priority">
              <select
                className="select"
                id="edit-priority"
                value={editDraft.priority}
                onChange={(event) =>
                  setEditDraft({ ...editDraft, priority: event.target.value as Task['priority'] })
                }
              >
                <option value="low">{t('low')}</option>
                <option value="medium">{t('medium')}</option>
                <option value="high">{t('high')}</option>
              </select>
            </Field>
            <Field label={t('status')} htmlFor="edit-status">
              <select
                className="select"
                id="edit-status"
                value={editDraft.status}
                onChange={(event) => setEditDraft({ ...editDraft, status: event.target.value as Task['status'] })}
              >
                <option value="pending">{t('pending')}</option>
                <option value="in_progress">{t('inProgress')}</option>
                <option value="completed">{t('completed')}</option>
              </select>
            </Field>
            <Field label={t('dueDate')} htmlFor="edit-due" optional>
              <input
                className="input"
                id="edit-due"
                type="date"
                value={editDraft.dueDate}
                onChange={(event) => setEditDraft({ ...editDraft, dueDate: event.target.value })}
              />
            </Field>
            <Field label={t('project')} htmlFor="edit-project" optional>
              <select
                className="select"
                id="edit-project"
                value={editDraft.projectId}
                onChange={(event) => setEditDraft({ ...editDraft, projectId: event.target.value })}
              >
                <option value="">{t('noProject')}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn" onClick={() => setEditing(null)}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {t('save')}
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
