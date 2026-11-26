import { z } from 'zod';

export const languageSchema = z.enum(['en', 'ur']);
export const idSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid identifier');

export const emailSchema = z
  .string()
  .trim()
  .min(5, 'Enter your email address')
  .max(254, 'That email address is too long')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Enter a valid email address')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(200, 'That password is too long');

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date format YYYY-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'That date is not valid');

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1, 'Add your name').max(80, 'That name is too long'),
  preferredLanguage: languageSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(200),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(20, 'That reset link is not valid').max(200),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({ token: z.string().min(20).max(200) });

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1, 'Add your name').max(80).optional(),
  businessName: z.string().trim().max(120).optional(),
  preferredLanguage: languageSchema.optional(),
  theme: z.enum(['system', 'light', 'dark']).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(200),
  newPassword: passwordSchema,
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Enter your password to confirm').max(200),
});

export const projectCreateSchema = z.object({
  title: z.string().trim().min(1, 'Add a project title').max(120, 'Keep the title under 120 characters'),
  description: z.string().trim().max(2000, 'Keep the description under 2000 characters').optional(),
  category: z.string().trim().max(60).optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, 'Add a task title').max(200, 'Keep the title under 200 characters'),
  description: z.string().trim().max(2000, 'Keep the notes under 2000 characters').optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  dueDate: z.union([dateSchema, z.literal(''), z.null()]).optional(),
  projectId: z.union([idSchema, z.null()]).optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial();

export const analysisSaveSchema = z.object({
  kind: z.enum(['problem', 'plan', 'marketing', 'sales']),
  title: z.string().trim().min(1, 'Add a title').max(200),
  projectId: z.union([idSchema, z.null()]).optional(),
  input: z.record(z.string(), z.unknown()).optional(),
  content: z.record(z.string(), z.unknown()),
});

export const aiProblemSchema = z.object({
  problem: z
    .string()
    .trim()
    .min(10, 'Describe the problem in at least 10 characters')
    .max(4000, 'Keep the problem description under 4000 characters'),
  context: z.string().trim().max(2000, 'Keep the extra context under 2000 characters').optional(),
  language: languageSchema.optional(),
  projectId: z.union([idSchema, z.null()]).optional(),
});

export const aiPlanSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(10, 'Describe the business idea in at least 10 characters')
    .max(2000, 'Keep the idea under 2000 characters'),
  country: z.string().trim().min(2, 'Add the country or market').max(80),
  targetMarket: z.string().trim().max(300).optional(),
  budget: z.string().trim().max(120).optional(),
  skills: z.string().trim().max(600).optional(),
  targetCustomers: z.string().trim().max(600).optional(),
  availableTime: z.string().trim().max(200).optional(),
  goals: z.string().trim().max(600).optional(),
  language: languageSchema.optional(),
});

export const aiMarketingSchema = z.object({
  category: z.string().trim().min(2, 'Choose your business category').max(80),
  audience: z.string().trim().min(2, 'Describe your target audience').max(300),
  outputType: z
    .enum(['social_posts', 'campaign', 'product_description', 'ad_copy', 'outreach', 'content_calendar', 'brand_positioning'])
    .default('social_posts'),
  objective: z.enum(['awareness', 'engagement', 'leads', 'sales', 'retention']).default('sales'),
  tone: z.enum(['friendly', 'professional', 'bold', 'playful', 'warm']).default('friendly'),
  platform: z.enum(['instagram', 'facebook', 'tiktok', 'whatsapp', 'linkedin', 'email', 'general']).default('general'),
  details: z.string().trim().max(1500).optional(),
  language: languageSchema.optional(),
});

export const aiSalesSchema = z.object({
  scenario: z.enum(['reply', 'followup', 'objection', 'offer', 'retention', 'script']).default('reply'),
  customerMessage: z.string().trim().max(2000).optional(),
  context: z.string().trim().max(1500).optional(),
  tone: z.enum(['friendly', 'professional', 'bold', 'playful', 'warm']).default('professional'),
  language: languageSchema.optional(),
});

export type ProblemInput = z.infer<typeof aiProblemSchema>;
export type PlanInput = z.infer<typeof aiPlanSchema>;
export type MarketingInput = z.infer<typeof aiMarketingSchema>;
export type SalesInput = z.infer<typeof aiSalesSchema>;
