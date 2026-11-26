import { useCallback, useEffect, useState } from 'react';
import { api, ApiRequestError, errorMessage } from './api';
import type { AiResult, AiStatus, AiUsage, Project } from './types';

export type AiErrorState = { code: string; message: string } | null;

export function toAiError(error: unknown): AiErrorState {
  if (error instanceof ApiRequestError) return { code: error.code, message: error.message };
  return { code: 'unknown', message: errorMessage(error) };
}

/** AI configuration + remaining daily allowance for the signed-in user. */
export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<AiStatus>('/api/ai/status');
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, refresh };
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ projects: Project[] }>('/api/projects');
      setProjects(data.projects);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { projects, loading, refresh, setProjects };
}

type AiRunPath = '/api/ai/problem' | '/api/ai/plan' | '/api/ai/marketing' | '/api/ai/sales';

type AiRunResponse = { result: AiResult; suggestedTitle: string; usage: AiUsage };

/** Shared generate → error → result lifecycle for the four AI tools. */
export function useAiRun() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AiErrorState>(null);
  const [result, setResult] = useState<AiResult | null>(null);
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [lastInput, setLastInput] = useState<Record<string, unknown> | null>(null);

  const run = useCallback(async (path: AiRunPath, payload: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.post<AiRunResponse>(path, payload);
      setResult(data.result);
      setUsage(data.usage);
      setSuggestedTitle(data.suggestedTitle);
      setLastInput(payload);
      return data.result;
    } catch (caught) {
      setError(toAiError(caught));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLastInput(null);
    setSuggestedTitle('');
  }, []);

  return { busy, error, result, usage, suggestedTitle, lastInput, run, reset };
}
