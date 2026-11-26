import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { DB, UserRow } from './db';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const MAX_MEM = 64 * 1024 * 1024;

export const SESSION_COOKIE = 'bs_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Passwords are hashed with scrypt (a memory-hard KDF from Node's crypto
 * module) using a per-password random salt. Plaintext passwords are never
 * stored, logged or returned.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEM,
  });
  return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('base64url'), derived.toString('base64url')].join('$');
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64url');
    const expected = Buffer.from(hashB64, 'base64url');
    const actual = crypto.scryptSync(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAX_MEM,
    });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function newId(): string {
  return crypto.randomUUID();
}

export function createSession(db: DB, userId: string): { token: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    sha256(token),
    userId,
    now.toISOString(),
    expiresAt,
  );
  // opportunistic cleanup of expired sessions
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString());
  return { token, expiresAt };
}

export function destroySession(db: DB, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

export function userForSession(db: DB, token: string): UserRow | undefined {
  return db
    .prepare(
      `SELECT u.* FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(sha256(token), new Date().toISOString()) as UserRow | undefined;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookie(),
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: isSecureCookie(), path: '/' });
}

function isSecureCookie(): boolean {
  if (process.env.COOKIE_SECURE === '1') return true;
  if (process.env.COOKIE_SECURE === '0') return false;
  return process.env.NODE_ENV === 'production';
}

export type AuthedRequest = Request & { user?: UserRow; sessionToken?: string };

/** Attaches the authenticated user (if any) to the request. */
export function attachUser(db: DB) {
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    const token = (req.cookies?.[SESSION_COOKIE] as string | undefined) ?? '';
    if (token) {
      const user = userForSession(db, token);
      if (user) {
        req.user = user;
        req.sessionToken = token;
      }
    }
    next();
  };
}

/** Server-side authorization gate: never rely on hidden UI. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: { code: 'unauthenticated', message: 'Please sign in to continue.' } });
    return;
  }
  next();
}

export function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    businessName: user.business_name,
    preferredLanguage: user.preferred_language,
    theme: user.theme,
    emailVerified: user.email_verified === 1,
    createdAt: user.created_at,
  };
}
