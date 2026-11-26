export type Language = 'en' | 'ur';
export type Theme = 'system' | 'light' | 'dark';

export type User = {
  id: string;
  email: string;
  displayName: string;
  businessName: string;
  preferredLanguage: Language;
  theme: Theme;
  emailVerified: boolean;
  createdAt: string;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
  completedTaskCount?: number;
  analysisCount?: number;
};

export type Task = {
  id: string;
  projectId: string | null;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type AiSection = {
  id: string;
  title: string;
  type: 'text' | 'list' | 'steps' | 'rows' | 'blocks';
  text?: string;
  items?: string[];
  steps?: { title: string; detail?: string; meta?: string }[];
  rows?: { label: string; value: string; note?: string }[];
  blocks?: { heading?: string; body?: string; bullets?: string[] }[];
};

export type AiResult = {
  kind: 'problem' | 'plan' | 'marketing' | 'sales';
  title: string;
  language: Language;
  sections: AiSection[];
  disclaimer: string;
  model: string | null;
  generatedAt: string;
};

export type AiUsage = { limit: number; used: number; remaining: number };

export type Analysis = {
  id: string;
  projectId: string | null;
  kind: AiResult['kind'];
  title: string;
  input: Record<string, unknown>;
  content: AiResult;
  createdAt: string;
};

export type AiStatus = {
  configured: boolean;
  model: string | null;
  limit: number;
  used: number;
  remaining: number;
};
