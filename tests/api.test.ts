import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../server/app';
import { openDatabase, type DB } from '../server/db';

// Deterministic environment: no AI provider key, non-secure cookies over http.
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = '0';
delete process.env.AI_API_KEY;
delete process.env.OPENAI_API_KEY;

type Json = Record<string, any> | null;

class Client {
  private cookie = '';
  constructor(private readonly base: string) {}

  private async call(method: string, path: string, body?: unknown) {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.cookie) headers.cookie = this.cookie;
    const response = await fetch(`${this.base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const cookies = response.headers.getSetCookie?.() ?? [];
    for (const raw of cookies) {
      const [pair] = raw.split(';');
      if (!pair.startsWith('bs_session=')) continue;
      this.cookie = pair.slice('bs_session='.length) ? pair : '';
    }
    const text = await response.text();
    let payload: Json = null;
    if (text) {
      try {
        payload = JSON.parse(text) as Json;
      } catch {
        payload = null;
      }
    }
    return { status: response.status, ok: response.ok, body: payload };
  }

  get(path: string) {
    return this.call('GET', path);
  }
  post(path: string, body?: unknown) {
    return this.call('POST', path, body ?? {});
  }
  patch(path: string, body?: unknown) {
    return this.call('PATCH', path, body ?? {});
  }
  del(path: string, body?: unknown) {
    return this.call('DELETE', path, body);
  }
  signedIn() {
    return this.cookie !== '';
  }
}

let server: Server;
let base = '';
let db: DB;

const stamp = Date.now();
const userA = { email: `owner-a-${stamp}@example.com`, password: 'OwnerPass123!', displayName: 'Owner A' };
const userB = { email: `owner-b-${stamp}@example.com`, password: 'OtherPass123!', displayName: 'Owner B' };

const a = new Client('');
const b = new Client('');

beforeAll(async () => {
  db = openDatabase(':memory:');
  const app = createApp(db);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
  // Rebind clients to the real port.
  (a as unknown as { base: string }).base = base;
  (b as unknown as { base: string }).base = base;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  db.close();
});

describe('health and configuration reporting', () => {
  it('reports sqlite and an unconfigured AI provider', async () => {
    const response = await a.get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body?.ok).toBe(true);
    expect(response.body?.database).toBe('sqlite');
    expect(response.body?.aiConfigured).toBe(false);
  });
});

describe('authentication', () => {
  it('blocks protected endpoints for signed-out visitors', async () => {
    for (const path of ['/api/projects', '/api/tasks', '/api/analyses', '/api/ai/status']) {
      const response = await a.get(path);
      expect(response.status).toBe(401);
      expect(response.body?.error?.code).toBe('unauthenticated');
    }
  });

  it('registers a new user and returns no password material', async () => {
    const response = await a.post('/api/auth/signup', userA);
    expect(response.status).toBe(200);
    expect(response.body?.user?.email).toBe(userA.email);
    expect(response.body?.user?.displayName).toBe(userA.displayName);
    expect(JSON.stringify(response.body)).not.toContain(userA.password);
    expect(response.body?.user?.passwordHash).toBeUndefined();
    expect(a.signedIn()).toBe(true);
  });

  it('rejects duplicate emails and weak input', async () => {
    const duplicate = await b.post('/api/auth/signup', userA);
    expect(duplicate.status).toBeGreaterThanOrEqual(400);
    expect(duplicate.status).toBeLessThan(500);

    const weak = await b.post('/api/auth/signup', {
      email: `weak-${stamp}@example.com`,
      password: 'short',
      displayName: 'Weak',
    });
    expect(weak.status).toBe(400);

    const badEmail = await b.post('/api/auth/signup', {
      email: 'not-an-email',
      password: 'GoodPass123!',
      displayName: 'Bad Email',
    });
    expect(badEmail.status).toBe(400);
  });

  it('rejects a wrong password and accepts the right one', async () => {
    const wrong = await b.post('/api/auth/login', { email: userA.email, password: 'WrongPass123!' });
    expect(wrong.status).toBe(401);
    expect(wrong.body?.error?.code).toBe('invalid_credentials');

    const right = await b.post('/api/auth/login', { email: userA.email, password: userA.password });
    expect(right.status).toBe(200);
    expect(b.signedIn()).toBe(true);
  });

  it('logs out and clears the session', async () => {
    const out = await a.post('/api/auth/logout');
    expect(out.status).toBe(200);
    expect(a.signedIn()).toBe(false);
    const after = await a.get('/api/projects');
    expect(after.status).toBe(401);
  });
});

describe('projects, tasks and saved analyses', () => {
  let projectId = '';
  let analysisId = '';
  let taskId = '';

  it('creates a project for the signed-in owner', async () => {
    const response = await b.post('/api/projects', {
      title: 'Clothing store growth',
      description: 'Improve online sales',
      category: 'retail',
    });
    expect(response.status).toBeLessThan(300);
    projectId = response.body?.project?.id;
    expect(typeof projectId).toBe('string');
    expect(response.body?.project?.title).toBe('Clothing store growth');
  });

  it('creates a task linked to the project', async () => {
    const response = await b.post('/api/tasks', {
      title: 'Photograph top 10 products',
      priority: 'high',
      dueDate: '2026-12-01',
      projectId,
    });
    expect(response.status).toBeLessThan(300);
    taskId = response.body?.task?.id;
    expect(response.body?.task?.projectId).toBe(projectId);
    expect(response.body?.task?.status).toBe('pending');
  });

  it('completes a task and records the completion time', async () => {
    const response = await b.patch(`/api/tasks/${taskId}`, { status: 'completed' });
    expect(response.status).toBe(200);
    expect(response.body?.task?.status).toBe('completed');
    expect(response.body?.task?.completedAt).toBeTruthy();
  });

  it('saves an AI analysis and lists it', async () => {
    const response = await b.post('/api/analyses', {
      kind: 'problem',
      title: 'Low online sales',
      projectId,
      input: { problem: 'My online clothing store has low sales' },
      content: { kind: 'problem', title: 'Low online sales', language: 'en', sections: [], disclaimer: 'estimate' },
    });
    expect(response.status).toBeLessThan(300);
    analysisId = response.body?.analysis?.id;
    expect(typeof analysisId).toBe('string');

    const list = await b.get('/api/analyses');
    expect(list.status).toBe(200);
    expect(list.body?.analyses?.some((item: { id: string }) => item.id === analysisId)).toBe(true);
  });

  it('rejects malformed tasks and projects', async () => {
    expect((await b.post('/api/projects', { title: '' })).status).toBe(400);
    expect((await b.post('/api/projects', { title: 'x'.repeat(200) })).status).toBe(400);
    expect((await b.post('/api/tasks', { title: '' })).status).toBe(400);
    expect((await b.post('/api/tasks', { title: 'Bad date', dueDate: '2026-13-45' })).status).toBe(400);
    expect((await b.patch(`/api/tasks/${taskId}`, { status: 'nonsense' })).status).toBe(400);
  });

  it('keeps data after signing in again', async () => {
    await b.post('/api/auth/logout');
    const signIn = await b.post('/api/auth/login', { email: userA.email, password: userA.password });
    expect(signIn.status).toBe(200);

    const projects = await b.get('/api/projects');
    expect(projects.body?.projects?.some((item: { id: string }) => item.id === projectId)).toBe(true);

    const tasks = await b.get('/api/tasks');
    expect(tasks.body?.tasks?.some((item: { id: string }) => item.id === taskId)).toBe(true);
  });

  it('prevents another user from reading or changing the records', async () => {
    const signup = await a.post('/api/auth/signup', userB);
    expect(signup.status).toBe(200);

    const list = await a.get('/api/projects');
    expect(list.status).toBe(200);
    expect(list.body?.projects).toHaveLength(0);

    expect((await a.get(`/api/projects/${projectId}`)).status).toBe(404);
    expect((await a.patch(`/api/projects/${projectId}`, { title: 'Hijacked' })).status).toBe(404);
    expect((await a.del(`/api/projects/${projectId}`)).status).toBe(404);

    expect((await a.get(`/api/analyses/${analysisId}`)).status).toBe(404);
    expect((await a.del(`/api/analyses/${analysisId}`)).status).toBe(404);

    expect((await a.patch(`/api/tasks/${taskId}`, { title: 'Hijacked' })).status).toBe(404);
    expect((await a.del(`/api/tasks/${taskId}`)).status).toBe(404);

    const otherTasks = await a.get('/api/tasks');
    expect(otherTasks.body?.tasks).toHaveLength(0);

    const otherAnalyses = await a.get('/api/analyses');
    expect(otherAnalyses.body?.analyses).toHaveLength(0);
  });

  it('refuses to attach a task to a project owned by someone else', async () => {
    const response = await a.post('/api/tasks', { title: 'Sneaky task', projectId });
    expect(response.status).toBe(404);
  });

  it('deletes a project and its task link for the owner', async () => {
    const response = await b.del(`/api/projects/${projectId}`);
    expect(response.status).toBe(200);
    expect((await b.get(`/api/projects/${projectId}`)).status).toBe(404);

    const tasks = await b.get('/api/tasks');
    const task = tasks.body?.tasks?.find((item: { id: string }) => item.id === taskId);
    expect(task?.projectId).toBeNull();
  });
});

describe('AI endpoints without a provider key', () => {
  it('reports the missing configuration instead of inventing an answer', async () => {
    const status = await b.get('/api/ai/status');
    expect(status.status).toBe(200);
    expect(status.body?.configured).toBe(false);
    expect(status.body?.model).toBeNull();

    const problem = await b.post('/api/ai/problem', {
      problem: 'My business is not getting customers.',
      language: 'en',
    });
    expect(problem.status).toBe(503);
    expect(problem.body?.error?.code).toBe('ai_not_configured');
    expect(problem.body?.error?.message).toMatch(/AI_API_KEY/);
  });

  it('validates AI input before contacting a provider', async () => {
    const tooShort = await b.post('/api/ai/problem', { problem: 'help' });
    expect(tooShort.status).toBe(400);

    const noAudience = await b.post('/api/ai/marketing', { category: 'retail' });
    expect(noAudience.status).toBe(400);

    const emptySales = await b.post('/api/ai/sales', { scenario: 'reply' });
    expect(emptySales.status).toBe(400);
  });

  it('keeps non-AI features usable while AI is unconfigured', async () => {
    const project = await b.post('/api/projects', { title: 'Still works without AI' });
    expect(project.status).toBeLessThan(300);
  });
});

describe('account management', () => {
  it('exports the signed-in user data only', async () => {
    const response = await b.get('/api/account/export');
    expect(response.status).toBe(200);
    expect(response.body?.account?.email).toBe(userA.email);
    expect(Array.isArray(response.body?.projects)).toBe(true);
    expect(response.body?.tasks?.every((task: { title: string }) => task.title !== 'Sneaky task')).toBe(true);
  });

  it('changes the password and invalidates the old one', async () => {
    const wrongCurrent = await b.post('/api/account/password', {
      currentPassword: 'NotMyPassword1!',
      newPassword: 'BrandNewPass123!',
    });
    expect(wrongCurrent.status).toBe(400);

    const ok = await b.post('/api/account/password', {
      currentPassword: userA.password,
      newPassword: 'BrandNewPass123!',
    });
    expect(ok.status).toBe(200);

    const oldLogin = await new Client(base).post('/api/auth/login', {
      email: userA.email,
      password: userA.password,
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await new Client(base).post('/api/auth/login', {
      email: userA.email,
      password: 'BrandNewPass123!',
    });
    expect(newLogin.status).toBe(200);
  });

  it('deletes an account only with the correct password, then removes its data', async () => {
    const wrong = await b.del('/api/account', { password: 'WrongPass123!' });
    expect(wrong.status).toBe(400);

    const ok = await b.del('/api/account', { password: 'BrandNewPass123!' });
    expect(ok.status).toBe(200);
    expect((await b.get('/api/projects')).status).toBe(401);

    const users = db.prepare('SELECT COUNT(*) AS c FROM users WHERE email = ?').get(userA.email) as { c: number };
    expect(users.c).toBe(0);
    const orphanProjects = db
      .prepare('SELECT COUNT(*) AS c FROM projects WHERE user_id NOT IN (SELECT id FROM users)')
      .get() as { c: number };
    expect(orphanProjects.c).toBe(0);
  });
});

describe('password reset and email verification', () => {
  it('never reveals whether an email is registered', async () => {
    const known = await new Client(base).post('/api/auth/forgot-password', { email: userB.email });
    const unknown = await new Client(base).post('/api/auth/forgot-password', { email: `nobody-${stamp}@example.com` });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body?.ok).toBe(true);
    expect(unknown.body?.ok).toBe(true);
    expect(known.body?.emailConfigured).toBe(false);
  });

  it('rejects an invalid reset token', async () => {
    const response = await new Client(base).post('/api/auth/reset-password', {
      token: 'x'.repeat(40),
      password: 'AnotherPass123!',
    });
    expect(response.status).toBe(400);
    expect(response.body?.error?.code).toBe('invalid_token');
  });
});
