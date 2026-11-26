import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Language, Theme } from './types';

type Dict = Record<string, { en: string; ur: string }>;

const dict: Dict = {
  appName: { en: 'BizSolve AI', ur: 'بز سولv اے آئی' },
  tagline: {
    en: 'Business answers, not guesswork.',
    ur: 'کاروباری مشورے، اندازوں کے بجائے۔',
  },
  heroLead: {
    en: 'Describe a business problem in plain English or Urdu. Get root causes, a practical action plan, costs to expect, risks and the one step to take today.',
    ur: 'اپنا کاروباری مسئلہ آسان انگریزی یا اردو میں لکھیں۔ وجوہات، عملی منصوبہ، اخراجات، خطرات اور آج کا پہلا قدم حاصل کریں۔',
  },
  getStarted: { en: 'Get started free', ur: 'مفت شروع کریں' },
  signIn: { en: 'Sign in', ur: 'سائن اِن' },
  signOut: { en: 'Sign out', ur: 'سائن آؤٹ' },
  signUp: { en: 'Create account', ur: 'اکاؤنٹ بنائیں' },
  email: { en: 'Email', ur: 'ای میل' },
  password: { en: 'Password', ur: 'پاس ورڈ' },
  confirmPassword: { en: 'Confirm password', ur: 'پاس ورڈ دوبارہ لکھیں' },
  displayName: { en: 'Your name', ur: 'آپ کا نام' },
  businessName: { en: 'Business name (optional)', ur: 'کاروبار کا نام (اختیاری)' },
  language: { en: 'Language', ur: 'زبان' },
  english: { en: 'English', ur: 'انگریزی' },
  urdu: { en: 'Urdu', ur: 'اردو' },
  theme: { en: 'Theme', ur: 'تھیم' },
  themeSystem: { en: 'System', ur: 'سسٹم' },
  themeLight: { en: 'Light', ur: 'روشن' },
  themeDark: { en: 'Dark', ur: 'تاریک' },
  dashboard: { en: 'Dashboard', ur: 'ڈیش بورڈ' },
  solveProblem: { en: 'Solve my business problem', ur: 'میرا کاروباری مسئلہ حل کریں' },
  problemSolver: { en: 'AI Problem Solver', ur: 'اے آئی مسئلہ حل کار' },
  businessPlan: { en: 'Business Plan', ur: 'بزنس پلان' },
  marketing: { en: 'Marketing', ur: 'مارکیٹنگ' },
  sales: { en: 'Sales', ur: 'سیلز' },
  finance: { en: 'Finance', ur: 'مالیات' },
  tasks: { en: 'Tasks', ur: 'کام' },
  projects: { en: 'Projects', ur: 'منصوبے' },
  savedResults: { en: 'Saved results', ur: 'محفوظ نتائج' },
  profile: { en: 'Profile', ur: 'پروفائل' },
  settings: { en: 'Settings', ur: 'ترتیبات' },
  privacy: { en: 'Privacy', ur: 'رازداری' },
  more: { en: 'More', ur: 'مزید' },
  home: { en: 'Home', ur: 'ہوم' },
  welcome: { en: 'Welcome', ur: 'خوش آمدید' },
  activeProjects: { en: 'Active projects', ur: 'فعال منصوبے' },
  pendingTasks: { en: 'Pending tasks', ur: 'باقی کام' },
  completedTasks: { en: 'Completed tasks', ur: 'مکمل کام' },
  recentAnalyses: { en: 'Recent AI analyses', ur: 'حالیہ اے آئی تجزیے' },
  quickTools: { en: 'Quick tools', ur: 'فوری اوزار' },
  noProjectsYet: { en: 'No projects yet. Create one to group your analyses and tasks.', ur: 'ابھی کوئی منصوبہ نہیں۔ تجزیوں اور کاموں کو ایک جگہ رکھنے کے لیے منصوبہ بنائیں۔' },
  noTasksYet: { en: 'No tasks yet. Add your first action step.', ur: 'ابھی کوئی کام نہیں۔ پہلا قدم شامل کریں۔' },
  noAnalysesYet: { en: 'No saved analyses yet.', ur: 'ابھی کوئی تجزیہ محفوظ نہیں۔' },
  loading: { en: 'Loading…', ur: 'لوڈ ہو رہا ہے…' },
  save: { en: 'Save', ur: 'محفوظ کریں' },
  saving: { en: 'Saving…', ur: 'محفوظ ہو رہا ہے…' },
  cancel: { en: 'Cancel', ur: 'منسوخ' },
  delete: { en: 'Delete', ur: 'حذف کریں' },
  edit: { en: 'Edit', ur: 'ترمیم' },
  close: { en: 'Close', ur: 'بند کریں' },
  copy: { en: 'Copy', ur: 'کاپی' },
  copied: { en: 'Copied', ur: 'کاپی ہو گیا' },
  download: { en: 'Download as text', ur: 'متن میں ڈاؤن لوڈ' },
  generate: { en: 'Generate', ur: 'تیار کریں' },
  generating: { en: 'Generating…', ur: 'تیار ہو رہا ہے…' },
  tryAgain: { en: 'Try again', ur: 'دوبارہ کوشش' },
  backToDashboard: { en: 'Back to dashboard', ur: 'ڈیش بورڈ پر واپس' },
  title: { en: 'Title', ur: 'عنوان' },
  description: { en: 'Description', ur: 'تفصیل' },
  priority: { en: 'Priority', ur: 'ترجیح' },
  status: { en: 'Status', ur: 'حالت' },
  dueDate: { en: 'Due date', ur: 'آخری تاریخ' },
  project: { en: 'Project', ur: 'منصوبہ' },
  noProject: { en: 'No project', ur: 'کوئی منصوبہ نہیں' },
  low: { en: 'Low', ur: 'کم' },
  medium: { en: 'Medium', ur: 'درمیانہ' },
  high: { en: 'High', ur: 'زیادہ' },
  pending: { en: 'Pending', ur: 'باقی' },
  inProgress: { en: 'In progress', ur: 'جاری' },
  completed: { en: 'Completed', ur: 'مکمل' },
  addTask: { en: 'Add task', ur: 'کام شامل کریں' },
  newProject: { en: 'New project', ur: 'نیا منصوبہ' },
  problemLabel: { en: 'What is the problem?', ur: 'مسئلہ کیا ہے؟' },
  problemHint: {
    en: 'Example: My online clothing store gets visitors but very few orders.',
    ur: 'مثال: میری آن لائن کپڑوں کی دکان پر لوگ آتے ہیں مگر آرڈر بہت کم ہیں۔',
  },
  businessType: { en: 'Business type', ur: 'کاروبار کی قسم' },
  country: { en: 'Country / market', ur: 'ملک / مارکیٹ' },
  budget: { en: 'Budget', ur: 'بجٹ' },
  currency: { en: 'Currency', ur: 'کرنسی' },
  skills: { en: 'Skills and experience', ur: 'مہارت اور تجربہ' },
  targetCustomers: { en: 'Target customers', ur: 'ہدف صارفین' },
  availableTime: { en: 'Time you can give', ur: 'دستیاب وقت' },
  goals: { en: 'Your goal', ur: 'آپ کا ہدف' },
  idea: { en: 'Business idea', ur: 'کاروباری آئیڈیا' },
  targetAudience: { en: 'Target audience', ur: 'ہدف سامعین' },
  tone: { en: 'Tone', ur: 'لہجہ' },
  objective: { en: 'Objective', ur: 'مقصد' },
  category: { en: 'Category', ur: 'قسم' },
  contentType: { en: 'What do you need?', ur: 'آپ کو کیا چاہیے؟' },
  details: { en: 'Details', ur: 'تفصیلات' },
  customerMessage: { en: 'Customer message', ur: 'گاہک کا پیغام' },
  context: { en: 'Extra context', ur: 'مزید معلومات' },
  scenario: { en: 'Situation', ur: 'صورتحال' },
  result: { en: 'Result', ur: 'نتیجہ' },
  editableDraft: { en: 'Editable draft', ur: 'قابلِ ترمیم مسودہ' },
  draftHint: {
    en: 'Edit this text before you copy or export it. Nothing is sent or published automatically.',
    ur: 'کاپی یا ایکسپورٹ کرنے سے پہلے اس متن میں ترمیم کریں۔ کچھ بھی خودکار طور پر نہیں بھیجا جاتا۔',
  },
  saveToProject: { en: 'Save to project', ur: 'منصوبے میں محفوظ کریں' },
  saveAsNewProject: { en: 'Save as a new project', ur: 'نئے منصوبے میں محفوظ کریں' },
  saved: { en: 'Saved', ur: 'محفوظ ہو گیا' },
  deleteConfirmTitle: { en: 'Delete permanently?', ur: 'مستقل حذف کریں؟' },
  deleteConfirmBody: { en: 'This cannot be undone.', ur: 'یہ عمل واپس نہیں ہو سکتا۔' },
  aiNotConfiguredTitle: { en: 'AI is not configured on this server', ur: 'اس سرور پر اے آئی ترتیب نہیں دی گئی' },
  aiNotConfiguredBody: {
    en: 'Add an AI_API_KEY environment variable on the server (plus AI_BASE_URL and AI_MODEL if you are not using OpenAI) and restart it. Non-AI tools such as the finance calculators and task planner keep working without it. No answer is invented in the meantime.',
    ur: 'سرور پر AI_API_KEY ماحولاتی متغیر شامل کریں (اگر اوپن اے آئی استعمال نہیں کر رہے تو AI_BASE_URL اور AI_MODEL بھی) اور سرور دوبارہ چلائیں۔ مالیاتی کیلکولیٹر اور کام کی فہرست اس کے بغیر بھی کام کرتے ہیں۔ اس دوران کوئی جعلی جواب نہیں دیا جاتا۔',
  },
  aiRemaining: { en: 'AI requests left today', ur: 'آج باقی اے آئی درخواستیں' },
  revenue: { en: 'Revenue', ur: 'آمدنی' },
  profitLoss: { en: 'Profit / loss', ur: 'نفع / نقصان' },
  profitMargin: { en: 'Profit margin', ur: 'منافع کا تناسب' },
  breakEven: { en: 'Break-even', ur: 'بریک ایون' },
  calculate: { en: 'Calculate', ur: 'حساب کریں' },
  reset: { en: 'Reset', ur: 'ری سیٹ' },
  sellingPrice: { en: 'Selling price per unit', ur: 'فی یونٹ فروخت قیمت' },
  unitsSold: { en: 'Units sold', ur: 'فروخت شدہ یونٹ' },
  totalRevenue: { en: 'Total revenue', ur: 'کل آمدنی' },
  totalExpenses: { en: 'Total expenses', ur: 'کل اخراجات' },
  netProfit: { en: 'Net profit', ur: 'خالص نفع' },
  fixedCosts: { en: 'Fixed costs', ur: 'مقررہ اخراجات' },
  variableCost: { en: 'Variable cost per unit', ur: 'فی یونٹ متغیر لاگت' },
  calculation: { en: 'How this was calculated', ur: 'حساب کیسے کیا گیا' },
  glossary: { en: 'Revenue, gross profit and net profit', ur: 'آمدنی، مجموعی نفع اور خالص نفع' },
  financeNote: {
    en: 'These are planning calculations from the numbers you type. They are not accounting records.',
    ur: 'یہ آپ کے درج کردہ اعداد سے بنائے گئے منصوبہ بندی کے حساب ہیں۔ یہ اکاؤنٹنگ ریکارڈ نہیں ہیں۔',
  },
  required: { en: 'This field is required', ur: 'یہ خانہ لازمی ہے' },
  emailVerified: { en: 'Email verified', ur: 'ای میل تصدیق شدہ' },
  emailUnverified: { en: 'Email not verified', ur: 'ای میل کی تصدیق نہیں ہوئی' },
  verifyEmail: { en: 'Verify email', ur: 'ای میل کی تصدیق کریں' },
  changePassword: { en: 'Change password', ur: 'پاس ورڈ تبدیل کریں' },
  currentPassword: { en: 'Current password', ur: 'موجودہ پاس ورڈ' },
  newPassword: { en: 'New password', ur: 'نیا پاس ورڈ' },
  exportData: { en: 'Export my data', ur: 'میرا ڈیٹا ایکسپورٹ کریں' },
  deleteAccount: { en: 'Delete my account', ur: 'میرا اکاؤنٹ حذف کریں' },
  forgotPassword: { en: 'Forgot password?', ur: 'پاس ورڈ بھول گئے؟' },
  resetPassword: { en: 'Reset password', ur: 'پاس ورڈ ری سیٹ کریں' },
  sendResetLink: { en: 'Send reset link', ur: 'ری سیٹ لنک بھیجیں' },
  newPasswordSaved: { en: 'Password updated. You can sign in now.', ur: 'پاس ورڈ تبدیل ہو گیا۔ اب سائن اِن کریں۔' },
  progress: { en: 'Progress', ur: 'پیش رفت' },
  filters: { en: 'Filters', ur: 'فلٹرز' },
  all: { en: 'All', ur: 'سب' },
  projectDetails: { en: 'Project details', ur: 'منصوبے کی تفصیلات' },
  openProject: { en: 'Open project', ur: 'منصوبہ کھولیں' },
  analyses: { en: 'Analyses', ur: 'تجزیے' },
  viewResult: { en: 'View result', ur: 'نتیجہ دیکھیں' },
  emptyTasks: { en: 'Nothing here yet.', ur: 'ابھی کچھ نہیں۔' },
  aiDisclaimer: { en: 'AI output can be wrong or incomplete. Check it against your own numbers before acting.', ur: 'اے آئی کا جواب غلط یا ادھورا ہو سکتا ہے۔ عمل کرنے سے پہلے اپنے اعداد سے جانچ لیں۔' },
  signedOutNotice: { en: 'You have been signed out.', ur: 'آپ سائن آؤٹ ہو گئے ہیں۔' },
  protectedNotice: { en: 'Please sign in to continue.', ur: 'جاری رکھنے کے لیے سائن اِن کریں۔' },
  showPassword: { en: 'Show password', ur: 'پاس ورڈ دکھائیں' },
  optional: { en: 'optional', ur: 'اختیاری' },
  step: { en: 'Step', ur: 'مرحلہ' },
  noResults: { en: 'No results found.', ur: 'کوئی نتیجہ نہیں ملا۔' },
};

export type Prefs = {
  language: Language;
  theme: Theme;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
};

const PrefsContext = createContext<Prefs | null>(null);

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    if (value && (allowed as readonly string[]).includes(value)) return value as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readStored('bs_lang', ['en', 'ur'] as const, 'en'));
  const [theme, setThemeState] = useState<Theme>(() =>
    readStored('bs_theme', ['system', 'light', 'dark'] as const, 'system'),
  );

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem('bs_lang', next);
    } catch {
      /* ignore */
    }
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem('bs_theme', next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = language === 'ur' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (resolved: 'light' | 'dark') => root.setAttribute('data-theme', resolved);
    if (theme === 'system') {
      const query = window.matchMedia('(prefers-color-scheme: dark)');
      apply(query.matches ? 'dark' : 'light');
      const listener = (event: MediaQueryListEvent) => apply(event.matches ? 'dark' : 'light');
      query.addEventListener('change', listener);
      return () => query.removeEventListener('change', listener);
    }
    apply(theme);
    return undefined;
  }, [theme]);

  const t = useCallback(
    (key: string) => {
      const entry = dict[key];
      if (!entry) return key;
      return language === 'ur' ? entry.ur : entry.en;
    },
    [language],
  );

  const value = useMemo<Prefs>(
    () => ({ language, theme, setLanguage, setTheme, t, dir: language === 'ur' ? 'rtl' : 'ltr' }),
    [language, theme, setLanguage, setTheme, t],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Prefs {
  const context = useContext(PrefsContext);
  if (!context) throw new Error('usePrefs must be used inside PrefsProvider');
  return context;
}

export function formatDate(value: string | null, language: Language): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(language === 'ur' ? 'ur-PK' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatDateTime(value: string | null, language: Language): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(language === 'ur' ? 'ur-PK' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}
