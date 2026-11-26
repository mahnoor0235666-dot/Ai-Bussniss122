import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

/** The concrete better-sqlite3 database instance type. */
export type DB = InstanceType<typeof Database>;

/**
 * Schema is applied idempotently on boot. Every private table carries a
 * user_id foreign key with ON DELETE CASCADE so account deletion is complete,
 * and every read/write path in the API is scoped by the authenticated user id.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  business_name TEXT NOT NULL DEFAULT '',
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en','ur')),
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system','light','dark')),
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS one_time_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('password_reset','email_verify')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ott_user ON one_time_tokens(user_id, purpose);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS saved_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('problem','plan','marketing','sales')),
  title TEXT NOT NULL,
  input_json TEXT NOT NULL,
  content_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analyses_user ON saved_analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_project ON saved_analyses(project_id);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, status, due_date);

CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id, created_at);
`;

export function openDatabase(file?: string): DB {
  const target = file ?? process.env.DATABASE_FILE ?? path.join(process.cwd(), 'data', 'bizsolve.db');
  if (target !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
  }
  const db = new Database(target);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(SCHEMA);
  return db;
}

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  business_name: string;
  preferred_language: 'en' | 'ur';
  theme: 'system' | 'light' | 'dark';
  email_verified: number;
  created_at: string;
};

export type ProjectRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'paused' | 'archived';
  created_at: string;
  updated_at: string;
};

export type AnalysisRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  kind: 'problem' | 'plan' | 'marketing' | 'sales';
  title: string;
  input_json: string;
  content_json: string;
  created_at: string;
};

export type TaskRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};
