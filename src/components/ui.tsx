import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import type { AiResult, AiSection, Task } from '../lib/types';
import { usePrefs } from '../lib/i18n';

/* ------------------------------------------------------------------ basics */

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="row" style={{ gap: 8 }} role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label ? <span className="small muted">{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}

export function LoadingBlock({ label }: { label?: string }) {
  const { t } = usePrefs();
  return (
    <div className="loading-block">
      <span className="spinner" aria-hidden="true" />
      <span>{label ?? t('loading')}</span>
    </div>
  );
}

export function Alert({
  kind = 'info',
  title,
  children,
}: {
  kind?: 'info' | 'warn' | 'error' | 'success';
  title?: string;
  children?: React.ReactNode;
}) {
  const role = kind === 'error' ? 'alert' : 'status';
  return (
    <div className={`alert alert-${kind}`} role={role}>
      <div>
        {title ? <strong className="alert-title">{title}</strong> : null}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-title">{title}</span>
      {children ? <p className="small">{children}</p> : null}
      {action}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const { t } = usePrefs();
  const describedBy = useId();
  return (
    <div className="field">
      <label className="label" htmlFor={htmlFor}>
        {label}
        {optional ? <span className="label-optional">({t('optional')})</span> : null}
      </label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id: htmlFor,
            'aria-describedby': hint || error ? describedBy : undefined,
            'aria-invalid': error ? 'true' : undefined,
          })
        : children}
      {error ? (
        <span className="error-text" id={describedBy} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="hint" id={describedBy}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`${value} of ${max} complete`}
    >
      <div className="progress-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  const { t } = usePrefs();
  const cls = priority === 'high' ? 'badge-danger' : priority === 'medium' ? 'badge-warn' : 'badge';
  return <span className={`badge ${cls}`}>{t(priority)}</span>;
}

export function StatusBadge({ status }: { status: Task['status'] }) {
  const { t } = usePrefs();
  const cls = status === 'completed' ? 'badge-ok' : status === 'in_progress' ? 'badge-info' : 'badge';
  const label = status === 'in_progress' ? t('inProgress') : status === 'completed' ? t('completed') : t('pending');
  return <span className={`badge ${cls}`}>{label}</span>;
}

/* ------------------------------------------------------------------ modal */

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head">
          <h2 id={titleId} style={{ fontSize: '1.05rem' }}>
            {title}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const { t } = usePrefs();
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            {t('cancel')}
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? <Spinner /> : confirmLabel}
          </button>
        </>
      }
    >
      <p>{body}</p>
    </Modal>
  );
}

/* ------------------------------------------------------------------ toast */

type Toast = { id: number; message: string; kind: 'info' | 'success' | 'error' };
type ToastApi = { notify: (message: string, kind?: Toast['kind']) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-wrap" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${toast.kind === 'error' ? 'toast-error' : toast.kind === 'success' ? 'toast-success' : ''}`}
            role={toast.kind === 'error' ? 'alert' : 'status'}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

/* --------------------------------------------------------------- analysis */

export function analysisToText(result: AiResult): string {
  const lines: string[] = [result.title, ''];
  for (const section of result.sections) {
    lines.push(section.title.toUpperCase(), '');
    if (section.type === 'text' && section.text) lines.push(section.text, '');
    if (section.type === 'list' && section.items) {
      section.items.forEach((item) => lines.push(`- ${item}`));
      lines.push('');
    }
    if (section.type === 'steps' && section.steps) {
      section.steps.forEach((step, index) => {
        lines.push(`${index + 1}. ${step.title}${step.detail ? ` — ${step.detail}` : ''}${step.meta ? ` (${step.meta})` : ''}`);
      });
      lines.push('');
    }
    if (section.type === 'rows' && section.rows) {
      section.rows.forEach((row) => lines.push(`${row.label}: ${row.value}${row.note ? ` — ${row.note}` : ''}`));
      lines.push('');
    }
    if (section.type === 'blocks' && section.blocks) {
      section.blocks.forEach((block) => {
        if (block.heading) lines.push(block.heading);
        if (block.body) lines.push(block.body);
        (block.bullets ?? []).forEach((bullet) => lines.push(`- ${bullet}`));
        lines.push('');
      });
    }
  }
  if (result.disclaimer) lines.push(result.disclaimer);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function SectionBody({ section }: { section: AiSection }) {
  if (section.type === 'text') return <p className="analysis-text">{section.text}</p>;
  if (section.type === 'list') {
    return (
      <ul className="bullet-list">
        {(section.items ?? []).map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }
  if (section.type === 'steps') {
    return (
      <ol className="steps">
        {(section.steps ?? []).map((step, index) => (
          <li className="step-item" key={index}>
            <div className="step-body">
              <span className="step-title">{step.title}</span>
              {step.detail ? <span className="analysis-text small">{step.detail}</span> : null}
              {step.meta ? <span className="hint">{step.meta}</span> : null}
            </div>
          </li>
        ))}
      </ol>
    );
  }
  if (section.type === 'rows') {
    return (
      <div>
        {(section.rows ?? []).map((row, index) => (
          <div className="kv-row" key={index}>
            <span className="kv-label">{row.label}</span>
            <span className="kv-value">
              {row.value}
              {row.note ? <span className="hint"> · {row.note}</span> : null}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="stack">
      {(section.blocks ?? []).map((block, index) => (
        <div className="stack-sm" key={index}>
          {block.heading ? <strong>{block.heading}</strong> : null}
          {block.body ? <p className="analysis-text">{block.body}</p> : null}
          {block.bullets?.length ? (
            <ul className="bullet-list">
              {block.bullets.map((bullet, bulletIndex) => (
                <li key={bulletIndex}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function AnalysisResultView({ result, actions }: { result: AiResult; actions?: React.ReactNode }) {
  const { t, language } = usePrefs();
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = analysisToText(result);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement('textarea');
        area.value = text;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      setCopied(true);
      notify(t('copied'), 'success');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('Copy failed. Select the text and copy it manually.', 'error');
    }
  };

  const download = () => {
    const blob = new Blob([analysisToText(result)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bizsolve-${result.kind}-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div className="card-head">
        <div className="stack-sm">
          <h2 style={{ fontSize: '1.05rem' }}>{result.title}</h2>
          <span className="list-meta">
            <span className="badge badge-info">{result.kind}</span>
            <span className="badge">{result.language === 'ur' ? t('urdu') : t('english')}</span>
            {result.model ? <span className="badge">{result.model}</span> : null}
          </span>
        </div>
        <div className="row no-print" style={{ gap: 6 }}>
          <button type="button" className="btn btn-sm" onClick={copy}>
            {copied ? t('copied') : t('copy')}
          </button>
          <button type="button" className="btn btn-sm" onClick={download}>
            {t('download')}
          </button>
        </div>
      </div>
      <div className="card-body">
        <div dir={result.language === 'ur' ? 'rtl' : undefined} lang={result.language}>
          {result.sections.map((section) => (
            <section className="analysis-section" key={section.id}>
              <h3 className="analysis-title">{section.title}</h3>
              <SectionBody section={section} />
            </section>
          ))}
        </div>
        <Alert kind="warn">{result.disclaimer}</Alert>
        <div className="row no-print" style={{ gap: 8 }}>
          {actions}
        </div>
        <p className="hint">
          {language === 'ur' ? '' : 'AI output is untrusted content: review it before you act on it.'}
        </p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- editable */

export function EditableDraft({
  value,
  onChange,
  rows = 12,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  label?: string;
}) {
  const { t } = usePrefs();
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      notify(t('copied'), 'success');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('Copy failed. Select the text and copy it manually.', 'error');
    }
  };

  const download = () => {
    const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bizsolve-draft-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div className="card-head">
        <h2 style={{ fontSize: '1rem' }}>{label ?? t('editableDraft')}</h2>
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="btn btn-sm" onClick={copy}>
            {copied ? t('copied') : t('copy')}
          </button>
          <button type="button" className="btn btn-sm" onClick={download}>
            {t('download')}
          </button>
        </div>
      </div>
      <div className="card-body">
        <p className="hint">{t('draftHint')}</p>
        <textarea
          className="textarea"
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label ?? t('editableDraft')}
        />
      </div>
    </div>
  );
}
