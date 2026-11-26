import crypto from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { DB, UserRow } from '../db';
import { ApiError, parseBody } from '../errors';
import {
  clearSessionCookie,
  createSession,
  destroySession,
  hashPassword,
  newId,
  publicUser,
  requireAuth,
  setSessionCookie,
  sha256,
  verifyPassword,
  type AuthedRequest,
} from '../auth';
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from '../schemas';
import { appBaseUrl, emailConfigured, sendEmail } from '../email';

const RESET_TTL_MS = 60 * 60 * 1000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

function createOneTimeToken(
  db: DB,
  userId: string,
  purpose: 'password_reset' | 'email_verify',
  ttlMs: number,
): string {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  db.prepare(
    'INSERT INTO one_time_tokens (token_hash, user_id, purpose, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
  ).run(sha256(token), userId, purpose, now.toISOString(), new Date(now.getTime() + ttlMs).toISOString());
  return token;
}

function consumeOneTimeToken(
  db: DB,
  token: string,
  purpose: 'password_reset' | 'email_verify',
): { user_id: string } | undefined {
  const row = db
    .prepare(
      `SELECT user_id FROM one_time_tokens
        WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?`,
    )
    .get(sha256(token), purpose, new Date().toISOString()) as { user_id: string } | undefined;
  if (!row) return undefined;
  db.prepare('UPDATE one_time_tokens SET used_at = ? WHERE token_hash = ?').run(
    new Date().toISOString(),
    sha256(token),
  );
  return row;
}

function devLinkAllowed(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/** Dummy hash keeps login timing similar for unknown accounts (no enumeration). */
const DUMMY_HASH = hashPassword('not-a-real-password-1a2b3c');

export function authRoutes(db: DB): Router {
  const router = Router();

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'rate_limited', message: 'Too many attempts. Please wait a few minutes.' } },
  });

  router.post('/signup', authLimiter, (req, res) => {
    const body = parseBody(signupSchema, req.body);
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(body.email) as { id: string } | undefined;
    if (existing) {
      throw new ApiError(409, 'email_taken', 'An account with that email already exists. Try signing in instead.');
    }
    const id = newId();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, display_name, business_name, preferred_language, theme, email_verified, created_at)
       VALUES (?, ?, ?, ?, '', ?, 'system', 0, ?)`,
    ).run(id, body.email, hashPassword(body.password), body.displayName, body.preferredLanguage ?? 'en', now);

    const { token } = createSession(db, id);
    setSessionCookie(res, token);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
    res.status(201).json({ user: publicUser(user) });
  });

  router.post('/login', authLimiter, (req, res) => {
    const body = parseBody(loginSchema, req.body);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(body.email) as UserRow | undefined;
    const ok = verifyPassword(body.password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) {
      throw new ApiError(401, 'invalid_credentials', 'Email or password is incorrect.');
    }
    const { token } = createSession(db, user.id);
    setSessionCookie(res, token);
    res.json({ user: publicUser(user) });
  });

  router.post('/logout', (req: AuthedRequest, res) => {
    if (req.sessionToken) destroySession(db, req.sessionToken);
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  router.get('/me', (req: AuthedRequest, res) => {
    res.json({ user: req.user ? publicUser(req.user) : null });
  });

  router.post('/forgot-password', authLimiter, async (req, res) => {
    const body = parseBody(forgotPasswordSchema, req.body);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(body.email) as UserRow | undefined;

    let devResetUrl: string | undefined;
    if (user) {
      const token = createOneTimeToken(db, user.id, 'password_reset', RESET_TTL_MS);
      const url = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      const delivery = await sendEmail({
        to: user.email,
        subject: 'Reset your BizSolve AI password',
        text: `Reset your password with this link (valid for 1 hour): ${url}\n\nIf you did not request this, you can ignore this email.`,
      });
      if (!delivery.sent && devLinkAllowed()) devResetUrl = url;
    }
    // Always the same response shape: no account enumeration.
    res.json({
      ok: true,
      emailConfigured: emailConfigured(),
      message: emailConfigured()
        ? 'If that email has an account, a reset link is on its way.'
        : 'Email delivery is not configured on this server yet, so no email was sent.',
      devResetUrl,
    });
  });

  router.post('/reset-password', authLimiter, (req, res) => {
    const body = parseBody(resetPasswordSchema, req.body);
    const row = consumeOneTimeToken(db, body.token, 'password_reset');
    if (!row) {
      throw new ApiError(400, 'invalid_token', 'That reset link is invalid or has expired. Request a new one.');
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(body.password), row.user_id);
    // Invalidate every existing session for this account.
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
    res.json({ ok: true });
  });

  router.post('/resend-verification', requireAuth, async (req: AuthedRequest, res) => {
    const user = req.user as UserRow;
    if (user.email_verified === 1) {
      res.json({ ok: true, alreadyVerified: true, emailConfigured: emailConfigured() });
      return;
    }
    const token = createOneTimeToken(db, user.id, 'email_verify', VERIFY_TTL_MS);
    const url = `${appBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    const delivery = await sendEmail({
      to: user.email,
      subject: 'Confirm your BizSolve AI email',
      text: `Confirm your email address with this link (valid for 24 hours): ${url}`,
    });
    res.json({
      ok: true,
      emailConfigured: emailConfigured(),
      sent: delivery.sent,
      devVerifyUrl: !delivery.sent && devLinkAllowed() ? url : undefined,
    });
  });

  router.post('/verify-email', authLimiter, (req, res) => {
    const body = parseBody(verifyEmailSchema, req.body);
    const row = consumeOneTimeToken(db, body.token, 'email_verify');
    if (!row) throw new ApiError(400, 'invalid_token', 'That confirmation link is invalid or has expired.');
    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(row.user_id);
    res.json({ ok: true });
  });

  return router;
}
