import { Router } from 'express';
import type { AnalysisRow, DB, ProjectRow, TaskRow, UserRow } from '../db';
import { ApiError, parseBody } from '../errors';
import { hashPassword, newId, publicUser, requireAuth, verifyPassword, type AuthedRequest } from '../auth';
import {
  analysisSaveSchema,
  changePasswordSchema,
  deleteAccountSchema,
  idSchema,
  profileUpdateSchema,
  projectCreateSchema,
  projectUpdateSchema,
  taskCreateSchema,
  taskUpdateSchema,
} from '../schemas';

export function mapProject(row: ProjectRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAnalysis(row: AnalysisRow, includeContent = true) {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind,
    title: row.title,
    input: safeParse(row.input_json),
    ...(includeContent ? { content: safeParse(row.content_json) } : {}),
    createdAt: row.created_at,
  };
}

export function mapTask(row: TaskRow) {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function requireUserId(req: AuthedRequest): string {
  if (!req.user) throw new ApiError(401, 'unauthenticated', 'Please sign in to continue.');
  return req.user.id;
}

/** Ownership check for a project referenced by a task or analysis. */
function assertProjectOwned(db: DB, userId: string, projectId: string | null | undefined): string | null {
  if (!projectId) return null;
  const row = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
  if (!row) throw new ApiError(404, 'not_found', 'That project does not exist.');
  return projectId;
}

export function projectRoutes(db: DB): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', (req: AuthedRequest, res) => {
    const userId = requireUserId(req);
    const rows = db
      .prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC')
      .all(userId) as ProjectRow[];
    const taskCounts = db
      .prepare(
        `SELECT project_id, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS done, COUNT(*) AS total
           FROM tasks WHERE user_id = ? AND project_id IS NOT NULL GROUP BY project_id`,
      )
      .all(userId) as { project_id: string; done: number; total: number }[];
    const analysisCounts = db
      .prepare('SELECT project_id, COUNT(*) AS total FROM saved_analyses WHERE user_id = ? AND project_id IS NOT NULL GROUP BY project_id')
      .all(userId) as { project_id: string; total: number }[];
    const taskMap = new Map(taskCounts.map((row) => [row.project_id, row]));
    const analysisMap = new Map(analysisCounts.map((row) => [row.project_id, row.total]));
    res.json({
      projects: rows.map((row) => ({
        ...mapProject(row),
        taskCount: taskMap.get(row.id)?.total ?? 0,
        completedTaskCount: taskMap.get(row.id)?.done ?? 0,
        analysisCount: analysisMap.get(row.id) ?? 0,
      })),
    });
  });

  router.post('/', (req: AuthedRequest, res) => {
    const userId = requireUserId(req);
    const body = parseBody(projectCreateSchema, req.body);
    const id = newId();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO projects (id, user_id, title, description, category, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      id,
      userId,
      body.title,
      body.description ?? '',
      body.category ?? 'general',
      body.status ?? 'active',
      now,
      now,
    );
    const row = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, userId) as ProjectRow;
    res.status(201).json({ project: mapProject(row) });
  });

  router.get('/:id', (req: AuthedRequest, res) => {
    const userId = requireUserId(req);
    const id = parseBody(idSchema, req.params.id);
    const row = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, userId) as
      | ProjectRow
      | undefined;
    if (!row) throw new ApiError(404, 'not_found', 'That project does not exist.');
    const analyses = db
      .prepare('SELECT * FROM saved_analyses WHERE user_id = ? AND project_id = ? ORDER BY created_at DESC')
      .all(userId, id) as AnalysisRow[];
    const tasks = db
      .prepare('SELECT * FROM tasks WHERE user_id = ? AND project_id = ? ORDER BY created_at DESC')
      .all(userId, id) as TaskRow[];
    res.json({
      project: mapProject(row),
      analyses: analyses.map((entry) => mapAnalysis(entry)),
      tasks: tasks.map(mapTask),
    });
  });

  router.patch('/:id', (req: AuthedRequest, res) => {
    const userId = requireUserId(req);
    const id = parseBody(idSchema, req.params.id);
    const body = parseBody(projectUpdateSchema, req.body);
    const existing = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, userId) as
      | ProjectRow
      | undefined;
    if (!existing) throw new ApiError(404, 'not_found', 'That project does not exist.');
    db.prepare(
      'UPDATE projects SET title = ?, description = ?, category = ?, status = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    ).run(
      body.title ?? existing.title,
      body.description ?? existing.description,
      body.category ?? existing.category,
      body.status ?? existing.status,
      new Date().toISOString(),
      id,
      userId,
    );
    const row = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, userId) as ProjectRow;
    res.json({ project: mapProject(row) });
  });

  router.delete('/:id', (req: AuthedRequest, res) => {
    const userId = requireUserId(req);
    const id = parseBody(idSchema, req.params.id);
    const result = db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(id, userId);
    if (result.changes === 0) throw new ApiError(404, 'not_found', 'That project does not exist.');
    res.json({ ok: true });
  });

  return router;
}

export function analysisRoutes(db: DB): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', (req: AuthedRequest, res) => {
    const userId = requireUserId(req);
    const rows = db
      .prepare('SELECT * FROM saved_analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 100')
      .all(userId) as AnalysisRow[];
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
    const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined;
    const filtered = rows.filter(
      (row) => (!projectId || row.project_id === projectId) && (!kind || row.kind === kind),
    );
    res.json({ analyses: filtered.map((row) => mapAnalysis(row)) });
  });

  router.get('/:id', (req: AuthedRequest, res) => {
    const userId = requireUserId(req);
    const id = parseBody(idSchema, req.params.id);
    const row = db.prepare('SELECT * FROM saved_analyses WHERE id = ? AND user_id = ?').get(id, userId) as
      | AnalysisRow
      | undefined;
    if (!row) throw new ApiError(404, 'not_found', 'That saved analysis does not exist.');
    res.json({ analysis: mapAnalysis(row) });
  });

  router.post('/', (req: AuthedRequest, res) => {
    const userId = requireUserId(req);
    const body = parseBody(analysisSaveSchema, req.body);
    const projectId = assertProjectOwned(db, userId, body.projectId ?? null);
    const id = newId();
    db.prepare(
      'INSERT INTO saved_analyses (id, user_id, project_id, kind, title, input_json, content_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      id,
      userId,
      projectId,
      body.kind,
      body.title,
      JSON.stringify(body.input ?? {}),
      JSON.stringify(body.content ?? {}),
      new Date().toISOString(),
    );
    if (projectId) {
      db.prepare('UPDATE projects SET updated_at = ? WHERE id = ? AND user_id = ?').run(
        new Date().toISOString(),
        projectId,
        userId,
      );
    }
    const row = db.prepare('SELECT * FROM saved_analyses WHERE id = ? AND user_id = ?').get(id, userId) as AnalysisRow;
    res.status(201).json({ analysis: mapAnalysis(row) });
  });

  router.delete('/:id', (req: AuthedRequest, res) => {
    const userId = requireUserId(req);
    const id = parseBody(idSchema, req.params.id);
    const result = db.prepare('DELETE FROM saved_analyses WHERE id = ? AND user_id = ?').run(id, userId);
    if (result.changes === 0) throw new ApiError(404, 'not_found', 'That saved analysis does not exist.');
    res.json({ ok: true });
  });

  return router;
}

export function taskRoutes(db: DB): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', (req: AuthedRequest, res) => {
    const userId = requireUserId(req);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
    let sql = 'SELECT * FROM tasks WHERE user_id = ?';
    const params: unknown[] = [userId];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (projectId) {
      sql += ' AND project_id = ?';
      params.push(projectId);
    }
    sql += " ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, due_date IS NULL, due_date, created_at DESC";
    const rows = db.prepare(sql).all(...params) as TaskRow[];
    res.json({ tasks: rows.map(mapTask) });
  });

  router.post('/', (req: AuthedRequest, res) => {
    const userId = requireUserId(req);
    const body = parseBody(taskCreateSchema, req.body);
    const projectId = assertProjectOwned(db, userId, body.projectId ?? null);
    const id = newId();
    const now = new Date().toISOString();
    const status = body.status ?? 'pending';
    db.prepare(
      `INSERT INTO tasks (id, user_id, project_id, title, description, priority, status, due_date, created_at, updated_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      userId,
      projectId,
      body.title,
      body.description ?? '',
      body.priority ?? 'medium',
      status,
      body.dueDate ? body.dueDate : null,
      now,
      now,
      status === 'completed' ? now : null,
    );
    const row = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId) as TaskRow;
    res.status(201).json({ task: mapTask(row) });
  });

  router.patch('/:id', (req: AuthedRequest, res) => {
    const userId = requireUserId(req);
    const id = parseBody(idSchema, req.params.id);
    const body = parseBody(taskUpdateSchema, req.body);
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId) as
      | TaskRow
      | undefined;
    if (!existing) throw new ApiError(404, 'not_found', 'That task does not exist.');

    const projectId =
      body.projectId === undefined ? existing.project_id : assertProjectOwned(db, userId, body.projectId ?? null);
    const status = body.status ?? existing.status;
    const now = new Date().toISOString();
    const completedAt = status === 'completed' ? existing.completed_at ?? now : null;

    db.prepare(
      `UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, due_date = ?, project_id = ?, updated_at = ?, completed_at = ?
        WHERE id = ? AND user_id = ?`,
    ).run(
      body.title ?? existing.title,
      body.description ?? existing.description,
      body.priority ?? existing.priority,
      status,
      body.dueDate === undefined ? existing.due_date : body.dueDate ? body.dueDate : null,
      projectId,
      now,
      completedAt,
      id,
      userId,
    );
    const row = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId) as TaskRow;
    res.json({ task: mapTask(row) });
  });

  router.delete('/:id', (req: AuthedRequest, res) => {
    const userId = requireUserId(req);
    const id = parseBody(idSchema, req.params.id);
    const result = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, userId);
    if (result.changes === 0) throw new ApiError(404, 'not_found', 'That task does not exist.');
    res.json({ ok: true });
  });

  return router;
}

export function accountRoutes(db: DB): Router {
  const router = Router();
  router.use(requireAuth);

  router.patch('/', (req: AuthedRequest, res) => {
    const user = req.user as UserRow;
    const body = parseBody(profileUpdateSchema, req.body);
    db.prepare(
      'UPDATE users SET display_name = ?, business_name = ?, preferred_language = ?, theme = ? WHERE id = ?',
    ).run(
      body.displayName ?? user.display_name,
      body.businessName ?? user.business_name,
      body.preferredLanguage ?? user.preferred_language,
      body.theme ?? user.theme,
      user.id,
    );
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as UserRow;
    res.json({ user: publicUser(updated) });
  });

  router.post('/password', (req: AuthedRequest, res) => {
    const user = req.user as UserRow;
    const body = parseBody(changePasswordSchema, req.body);
    if (!verifyPassword(body.currentPassword, user.password_hash)) {
      throw new ApiError(400, 'invalid_credentials', 'Your current password is not correct.');
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(body.newPassword), user.id);
    // Drop other sessions but keep the one making this request signed in.
    const currentToken = (req.cookies?.[SESSION_COOKIE] as string | undefined) ?? '';
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').run(user.id, sha256(currentToken));
    res.json({ ok: true });
  });

  router.delete('/', (req: AuthedRequest, res) => {
    const user = req.user as UserRow;
    const body = parseBody(deleteAccountSchema, req.body);
    if (!verifyPassword(body.password, user.password_hash)) {
      throw new ApiError(400, 'invalid_credentials', 'Your password is not correct.');
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    res.json({ ok: true });
  });

  router.get('/export', (req: AuthedRequest, res) => {
    const user = req.user as UserRow;
    const projects = db.prepare('SELECT * FROM projects WHERE user_id = ?').all(user.id) as ProjectRow[];
    const analyses = db.prepare('SELECT * FROM saved_analyses WHERE user_id = ?').all(user.id) as AnalysisRow[];
    const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(user.id) as TaskRow[];
    res.setHeader('content-disposition', 'attachment; filename="bizsolve-export.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      account: publicUser(user),
      projects: projects.map(mapProject),
      analyses: analyses.map((row) => mapAnalysis(row)),
      tasks: tasks.map(mapTask),
    });
  });

  return router;
}
