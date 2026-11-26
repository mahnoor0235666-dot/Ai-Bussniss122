import type { DB } from './db';
import { ApiError } from './errors';

export type AiKind = 'problem' | 'plan' | 'marketing' | 'sales';

export type AiErrorCode =
  | 'ai_not_configured'
  | 'ai_timeout'
  | 'ai_upstream_error'
  | 'ai_rate_limited'
  | 'ai_invalid_output'
  | 'ai_quota_exceeded';

export class AiError extends ApiError {
  constructor(
    public code: AiErrorCode,
    message: string,
    public status = 503,
  ) {
    super(status, code, message);
    this.name = 'AiError';
  }
}

function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export type AiSettings = {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxOutputTokens: number;
  dailyLimit: number;
  configured: boolean;
};

/** Server-side only. The API key is never sent to the browser. */
export function aiSettings(): AiSettings {
  const apiKey = (process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '').trim();
  const baseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  const model = (process.env.AI_MODEL || 'gpt-4o-mini').trim();
  return {
    apiKey,
    baseUrl,
    model,
    timeoutMs: clampInt(process.env.AI_TIMEOUT_MS, 45_000, 5_000, 120_000),
    maxOutputTokens: clampInt(process.env.AI_MAX_OUTPUT_TOKENS, 1800, 200, 4000),
    dailyLimit: clampInt(process.env.AI_DAILY_LIMIT, 25, 1, 1000),
    configured: apiKey.length > 0,
  };
}

export function usedInWindow(db: DB, userId: string): number {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const row = db.prepare('SELECT COUNT(*) AS c FROM ai_usage WHERE user_id = ? AND created_at > ?').get(userId, since) as {
    c: number;
  };
  return row?.c ?? 0;
}

export function recordUsage(db: DB, userId: string, kind: AiKind): void {
  db.prepare('INSERT INTO ai_usage (user_id, kind, created_at) VALUES (?, ?, ?)').run(userId, kind, new Date().toISOString());
}

function parseJsonLoose(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  const candidate = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    throw new AiError('ai_invalid_output', 'The AI service returned an answer we could not read. Please try again.', 502);
  }
}

/**
 * Calls an OpenAI-compatible Chat Completions endpoint from the server.
 * Secrets stay server-side; requests are time-bounded and responses are
 * parsed defensively because model output is untrusted content.
 */
export async function callModelJson(system: string, user: string): Promise<unknown> {
  const settings = aiSettings();
  if (!settings.configured) {
    throw new AiError(
      'ai_not_configured',
      'AI is not configured on this server yet. Add an AI_API_KEY environment variable to enable AI features.',
      503,
    );
  }

  const payloadBase = {
    model: settings.model,
    temperature: 0.4,
    max_tokens: settings.maxOutputTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };

  // Some OpenAI-compatible providers reject response_format; retry once without it.
  const attempts: Record<string, unknown>[] = [
    { ...payloadBase, response_format: { type: 'json_object' } },
    payloadBase,
  ];

  let lastStatus = 0;
  for (const payload of attempts) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), settings.timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${settings.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        throw new AiError('ai_timeout', 'The AI service took too long to respond. Please try again.', 504);
      }
      throw new AiError('ai_upstream_error', 'We could not reach the AI service. Please try again shortly.', 502);
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 429) {
      throw new AiError(
        'ai_rate_limited',
        'The AI provider is rate limiting requests right now. Please try again in a minute.',
        429,
      );
    }
    if (response.status === 400 && attempts.indexOf(payload) === 0) {
      lastStatus = 400;
      continue; // retry without response_format
    }
    if (!response.ok) {
      // Never surface provider response bodies (they can echo request details).
      throw new AiError(
        'ai_upstream_error',
        `The AI service returned an error (status ${response.status}). Please try again.`,
        502,
      );
    }

    const data = (await response.json().catch(() => null)) as
      | { choices?: { message?: { content?: unknown } }[] }
      | null;
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new AiError('ai_invalid_output', 'The AI service returned an empty answer. Please try again.', 502);
    }
    return parseJsonLoose(content);
  }

  throw new AiError(
    'ai_upstream_error',
    `The AI service rejected the request (status ${lastStatus || 400}). Check the model name in AI_MODEL.`,
    502,
  );
}
