import fs from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { DB } from './db';
import { attachUser } from './auth';
import { errorHandler, notFoundHandler } from './errors';
import { authRoutes } from './routes/auth';
import { accountRoutes, analysisRoutes, projectRoutes, taskRoutes } from './routes/data';
import { aiRoutes } from './routes/ai';
import { aiSettings } from './ai';
import { emailConfigured } from './email';

export function createApp(db: DB): Express {
  const app = express();

  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'no-referrer' },
      hsts: process.env.NODE_ENV === 'production' ? { maxAge: 15552000, includeSubDomains: true } : false,
    }),
  );

  app.use(express.json({ limit: '64kb' }));
  app.use(cookieParser());
  app.use(attachUser(db));

  /**
   * CSRF defence for a cookie session API: the session cookie is SameSite=Lax,
   * and any state-changing request with a foreign Origin header is rejected.
   */
  app.use((req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    const origin = req.get('origin');
    if (!origin) return next();
    const host = req.get('host');
    try {
      const parsed = new URL(origin);
      if (parsed.host === host) return next();
    } catch {
      /* fallthrough */
    }
    res.status(403).json({ error: { code: 'bad_origin', message: 'Request blocked: cross-site request.' } });
  });

  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1200,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'rate_limited', message: 'Too many requests. Please slow down.' } },
  });
  app.use('/api', generalLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      database: 'sqlite',
      aiConfigured: aiSettings().configured,
      emailConfigured: emailConfigured(),
      time: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes(db));
  app.use('/api/account', accountRoutes(db));
  app.use('/api/projects', projectRoutes(db));
  app.use('/api/analyses', analysisRoutes(db));
  app.use('/api/tasks', taskRoutes(db));
  app.use('/api/ai', aiRoutes(db));

  app.use('/api', notFoundHandler);

  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res
        .status(200)
        .type('text/plain')
        .send('BizSolve AI API is running. Build the client with "npm run build" to serve the web app.');
    });
  }

  app.use(errorHandler);
  return app;
}
