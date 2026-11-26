import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { formatDateTime, usePrefs } from '../lib/i18n';
import type { Analysis, Project } from '../lib/types';
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  LoadingBlock,
  analysisToText,
  useToast,
} from '../components/ui';

const KINDS = [
  { value: '', key: 'all' },
  { value: 'problem', key: 'problemSolver' },
  { value: 'plan', key: 'businessPlan' },
  { value: 'marketing', key: 'marketing' },
  { value: 'sales', key: 'sales' },
];

export default function SavedResults() {
  const { t, language } = usePrefs();
  const notify = useToast().notify;
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('id');

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [kind, setKind] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Analysis | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analysisData, projectData] = await Promise.all([
        api.get<{ analyses: Analysis[] }>('/api/analyses'),
        api.get<{ projects: Project[] }>('/api/projects'),
      ]);
      setAnalyses(analysisData.analyses);
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
    () => (kind ? analyses.filter((analysis) => analysis.kind === kind) : analyses),
    [analyses, kind],
  );

  const selected = selectedId ? analyses.find((analysis) => analysis.id === selectedId) ?? null : null;

  const projectName = (id: string | null) =>
    id ? projects.find((project) => project.id === id)?.title ?? '' : '';

  const open = (analysis: Analysis | null) => {
    setCopied(false);
    if (!analysis) setParams({});
    else setParams({ id: analysis.id });
  };

  const copy = async (analysis: Analysis) => {
    const text = analysisToText(analysis.content);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      notify(t('copied'));
    } catch {
      setError('Your browser blocked clipboard access. Select the text and copy it manually.');
    }
  };

  const download = (analysis: Analysis) => {
    const blob = new Blob([analysisToText(analysis.content)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${analysis.title.replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'analysis'}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.del(`/api/analyses/${deleting.id}`);
      setDeleting(null);
      open(null);
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
        <h1 style={{ fontSize: '1.4rem' }}>{t('savedResults')}</h1>
        <p className="muted">Everything you saved stays here after a refresh or a new sign-in.</p>
      </header>

      {error ? <Alert kind="error">{error}</Alert> : null}

      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {KINDS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`btn btn-sm${kind === option.value ? ' btn-primary' : ''}`}
            onClick={() => setKind(option.value)}
          >
            {t(option.key)}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingBlock label={t('loading')} />
      ) : analyses.length === 0 ? (
        <EmptyState
          title={t('noAnalysesYet')}
          action={
            <Link to="/solve" className="btn btn-primary">
              {t('solveProblem')}
            </Link>
          }
        />
      ) : (
        <div className="stack-sm">
          {visible.length === 0 ? (
            <EmptyState title={t('noResults')} />
          ) : (
            visible.map((analysis) => (
              <article key={analysis.id} className="card">
                <div className="card-body stack-sm">
                  <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <strong>{analysis.title}</strong>
                    <span className="badge">{analysis.kind}</span>
                  </div>
                  <div className="row small muted" style={{ gap: 10, flexWrap: 'wrap' }}>
                    <span>{formatDateTime(analysis.createdAt, language)}</span>
                    {analysis.projectId ? <span>{projectName(analysis.projectId)}</span> : null}
                  </div>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-sm" onClick={() => open(analysis)}>
                      {t('viewResult')}
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => download(analysis)}>
                      {t('download')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => setDeleting(analysis)}
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {selected ? (
        <section className="card">
          <div className="card-head">
            <div className="stack-sm">
              <h2 style={{ fontSize: '1rem' }}>{selected.title}</h2>
              <span className="small muted">{formatDateTime(selected.createdAt, language)}</span>
            </div>
            <button type="button" className="btn btn-sm" onClick={() => open(null)}>
              {t('close')}
            </button>
          </div>
          <div className="card-body stack">
            <pre
              className="small"
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0,
                fontFamily: 'inherit',
              }}
            >
              {analysisToText(selected.content)}
            </pre>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-sm btn-primary" onClick={() => void copy(selected)}>
                {copied ? t('copied') : t('copy')}
              </button>
              <button type="button" className="btn btn-sm" onClick={() => download(selected)}>
                {t('download')}
              </button>
              {selected.projectId ? (
                <Link to={`/projects/${selected.projectId}`} className="btn btn-sm">
                  {t('openProject')}
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

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
