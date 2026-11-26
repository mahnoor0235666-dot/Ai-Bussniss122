import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { DB } from '../db';
import { ApiError, parseBody } from '../errors';
import { requireAuth, type AuthedRequest } from '../auth';
import { AiError, aiSettings, callModelJson, recordUsage, usedInWindow, type AiKind } from '../ai';
import { buildPrompt, normalizeResult } from '../prompts';
import { aiMarketingSchema, aiPlanSchema, aiProblemSchema, aiSalesSchema } from '../schemas';

function shorten(value: string, max = 90): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

export function aiRoutes(db: DB): Router {
  const router = Router();
  router.use(requireAuth);

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 8,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => (req as AuthedRequest).user?.id ?? 'anonymous',
    message: { error: { code: 'rate_limited', message: 'You are sending requests too quickly. Wait a minute and try again.' } },
  });

  router.get('/status', (req: AuthedRequest, res) => {
    const settings = aiSettings();
    const used = usedInWindow(db, req.user!.id);
    res.json({
      configured: settings.configured,
      model: settings.configured ? settings.model : null,
      limit: settings.dailyLimit,
      used,
      remaining: Math.max(0, settings.dailyLimit - used),
    });
  });

  async function run(kind: AiKind, req: AuthedRequest, input: unknown, titleSeed: string) {
    const settings = aiSettings();
    if (!settings.configured) {
      throw new AiError(
        'ai_not_configured',
        'AI is not configured on this server yet. An administrator must set the AI_API_KEY environment variable.',
        503,
      );
    }
    const used = usedInWindow(db, req.user!.id);
    if (used >= settings.dailyLimit) {
      throw new AiError(
        'ai_quota_exceeded',
        `You have used all ${settings.dailyLimit} AI requests for the last 24 hours. Non-AI tools still work.`,
        429,
      );
    }

    const language = ((input as { language?: 'en' | 'ur' }).language ?? 'en') as 'en' | 'ur';
    const { system, user } = buildPrompt(kind, input);
    const raw = await callModelJson(system, user);
    const result = normalizeResult(kind, raw, {
      language,
      model: settings.model,
      fallbackTitle: shorten(titleSeed),
    });
    if (result.sections.length === 0) {
      throw new AiError('ai_invalid_output', 'The AI service returned an answer we could not read. Please try again.', 502);
    }
    recordUsage(db, req.user!.id, kind);
    return {
      result,
      suggestedTitle: shorten(titleSeed),
      usage: {
        limit: settings.dailyLimit,
        used: usedInWindow(db, req.user!.id),
        remaining: Math.max(0, settings.dailyLimit - usedInWindow(db, req.user!.id)),
      },
    };
  }

  router.post('/problem', aiLimiter, async (req: AuthedRequest, res) => {
    const body = parseBody(aiProblemSchema, req.body);
    const payload = await run('problem', req, body, body.problem);
    res.json(payload);
  });

  router.post('/plan', aiLimiter, async (req: AuthedRequest, res) => {
    const body = parseBody(aiPlanSchema, req.body);
    const payload = await run('plan', req, body, `Business plan: ${body.idea}`);
    res.json(payload);
  });

  router.post('/marketing', aiLimiter, async (req: AuthedRequest, res) => {
    const body = parseBody(aiMarketingSchema, req.body);
    const payload = await run('marketing', req, body, `${body.outputType.replace(/_/g, ' ')} for ${body.category}`);
    res.json(payload);
  });

  router.post('/sales', aiLimiter, async (req: AuthedRequest, res) => {
    const body = parseBody(aiSalesSchema, req.body);
    if (!body.customerMessage && !body.context) {
      throw new ApiError(400, 'invalid_input', 'Add the customer message or some context so the reply is useful.');
    }
    const payload = await run('sales', req, body, `Sales help: ${body.scenario}`);
    res.json(payload);
  });

  return router;
}
