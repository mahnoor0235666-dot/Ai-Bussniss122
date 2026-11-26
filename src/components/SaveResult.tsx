import { useState } from 'react';
import { api, errorMessage } from '../lib/api';
import { usePrefs } from '../lib/i18n';
import { useProjects } from '../lib/hooks';
import type { AiResult, Project } from '../lib/types';
import { Alert, Field, Spinner, useToast } from './ui';

/**
 * Saves an AI result to a project (or with no project). The server re-checks
 * project ownership, so a tampered projectId cannot attach to another account.
 */
export function SaveResult({
  result,
  input,
  suggestedTitle,
  onSaved,
}: {
  result: AiResult;
  input: Record<string, unknown> | null;
  suggestedTitle: string;
  onSaved?: () => void;
}) {
  const { t } = usePrefs();
  const { notify } = useToast();
  const { projects, refresh } = useProjects();
  const [projectId, setProjectId] = useState<string>('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [title, setTitle] = useState(suggestedTitle || result.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      let targetProject: Project | null = projects.find((project) => project.id === projectId) ?? null;

      if (!targetProject && newProjectTitle.trim()) {
        const created = await api.post<{ project: Project }>('/api/projects', {
          title: newProjectTitle.trim(),
        });
        targetProject = created.project;
        setProjectId(created.project.id);
        setNewProjectTitle('');
        await refresh();
      }

      await api.post('/api/analyses', {
        kind: result.kind,
        title: title.trim() || result.title,
        projectId: targetProject ? targetProject.id : null,
        input: input ?? {},
        content: result,
      });
      setSaved(true);
      notify(t('saved'), 'success');
      onSaved?.();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="card-head">
        <h2 style={{ fontSize: '1rem' }}>{t('saveToProject')}</h2>
      </div>
      <div className="card-body stack-sm">
        {error ? <Alert kind="error">{error}</Alert> : null}
        {saved ? <Alert kind="success">Saved. Find it under Saved results.</Alert> : null}
        <Field label={t('title')} htmlFor="save-title">
          <input
            className="input"
            id="save-title"
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field label={t('project')} htmlFor="save-project">
          <select
            className="select"
            id="save-project"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">{t('noProject')}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('saveAsNewProject')} htmlFor="save-new-project" optional>
          <input
            className="input"
            id="save-new-project"
            value={newProjectTitle}
            maxLength={120}
            placeholder="e.g. Clothing store relaunch"
            onChange={(event) => setNewProjectTitle(event.target.value)}
          />
        </Field>
        <div>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? <Spinner label={t('saving')} /> : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
