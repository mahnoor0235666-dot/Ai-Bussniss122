import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Validate a request body, throwing a 400 with a safe, non-leaking message. */
export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path?.length ? `${issue.path.join('.')}: ` : '';
    throw new ApiError(400, 'invalid_input', `${path}${issue?.message ?? 'Invalid input.'}`);
  }
  return result.data;
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'not_found', message: 'That resource does not exist.' } });
}

/**
 * Central error handler. Internal details are never returned to the client;
 * only the error message is logged, never request bodies or secrets.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  const anyErr = err as { type?: string; status?: number; message?: string };
  if (anyErr?.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'payload_too_large', message: 'That request is too large.' } });
    return;
  }
  if (anyErr?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'invalid_json', message: 'Request body must be valid JSON.' } });
    return;
  }
  console.error('[unhandled]', anyErr?.message ?? 'unknown error');
  res
    .status(500)
    .json({ error: { code: 'internal_error', message: 'Something went wrong on our side. Please try again.' } });
}
