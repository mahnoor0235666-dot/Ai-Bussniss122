import type { MarketingInput, PlanInput, ProblemInput, SalesInput } from './schemas';
import type { AiKind } from './ai';

export type AiSection = {
  id: string;
  title: string;
  type: 'text' | 'list' | 'steps' | 'rows' | 'blocks';
  text?: string;
  items?: string[];
  steps?: { title: string; detail?: string; meta?: string }[];
  rows?: { label: string; value: string; note?: string }[];
  blocks?: { label: string; content: string }[];
};

export type AiResult = {
  kind: AiKind;
  title: string;
  language: 'en' | 'ur';
  sections: AiSection[];
  disclaimer: string;
  model: string;
};

/* ------------------------------------------------------------------ */
/* Defensive normalisation of untrusted model output                   */
/* ------------------------------------------------------------------ */

export function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join('; ');
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map(asText)
      .filter(Boolean)
      .join(' — ');
  }
  return '';
}

export function asList(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(/\n+|(?:^|\s)[-*•]\s+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) return value.map(asText).filter(Boolean);
  const text = asText(value);
  return text ? [text] : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function pick(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
}

function asBlocks(value: unknown): { label: string; content: string }[] {
  if (!Array.isArray(value)) {
    const text = asText(value);
    return text ? [{ label: '', content: text }] : [];
  }
  return value
    .map((entry, index) => {
      if (typeof entry === 'string') return { label: `#${index + 1}`, content: entry.trim() };
      const record = asRecord(entry);
      const label = asText(pick(record, ['label', 'title', 'name', 'platform', 'type'])) || `#${index + 1}`;
      const content = asText(pick(record, ['content', 'text', 'copy', 'post', 'message', 'description', 'value']));
      return { label, content };
    })
    .filter((block) => block.content.length > 0);
}

function asSteps(value: unknown): { title: string; detail?: string; meta?: string }[] {
  if (!Array.isArray(value)) return asList(value).map((item) => ({ title: item }));
  return value
    .map((entry, index) => {
      if (typeof entry === 'string') return { title: entry.trim() };
      const record = asRecord(entry);
      const title =
        asText(pick(record, ['title', 'step', 'name', 'focus', 'action'])) || `Step ${index + 1}`;
      const detail = asText(pick(record, ['detail', 'description', 'why', 'actions', 'explanation']));
      const meta = asText(pick(record, ['timeframe', 'timing', 'day', 'when', 'duration']));
      return { title, detail: detail || undefined, meta: meta || undefined };
    })
    .filter((step) => step.title.length > 0);
}

function asRows(value: unknown, labelKeys: string[], valueKeys: string[]): { label: string; value: string; note?: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return { label: entry.trim(), value: '' };
      const record = asRecord(entry);
      const label = asText(pick(record, labelKeys));
      const val = asText(pick(record, valueKeys));
      const note = asText(pick(record, ['note', 'notes', 'rationale', 'why', 'basis']));
      return { label, value: val, note: note || undefined };
    })
    .filter((row) => row.label.length > 0 || row.value.length > 0);
}

function asCostRows(value: unknown): { label: string; value: string; note?: string }[] {
  const record = asRecord(value);
  const items = Array.isArray(value) ? value : pick(record, ['items', 'breakdown', 'costs']);
  const rows = asRows(items, ['item', 'label', 'name'], ['amount', 'estimate', 'cost', 'value']);
  const total = asText(pick(record, ['total', 'totalEstimate', 'summary']));
  if (total) rows.push({ label: 'Total', value: total });
  if (!rows.length) {
    const text = asText(value);
    if (text) rows.push({ label: '', value: text });
  }
  return rows;
}

const SECTION_TITLES: Record<string, { en: string; ur: string }> = {
  summary: { en: 'Problem Summary', ur: 'مسئلے کا خلاصہ' },
  rootCauses: { en: 'Possible Root Causes', ur: 'ممکنہ بنیادی وجوہات' },
  infoNeeded: { en: 'Additional Information Needed', ur: 'مزید معلومات درکار ہیں' },
  solution: { en: 'Recommended Solution', ur: 'تجویز کردہ حل' },
  actionPlan: { en: 'Step-by-Step Action Plan', ur: 'مرحلہ وار ایکشن پلان' },
  cost: { en: 'Estimated Cost', ur: 'تخمینی لاگت' },
  risks: { en: 'Risks and Limitations', ur: 'خطرات اور حدود' },
  metrics: { en: 'Success Metrics', ur: 'کامیابی کے پیمانے' },
  firstAction: { en: 'First Action Today', ur: 'آج کا پہلا قدم' },
  targetCustomer: { en: 'Target Customer', ur: 'ہدف گاہک' },
  customerProblem: { en: 'Customer Problem', ur: 'گاہک کا مسئلہ' },
  proposedSolution: { en: 'Proposed Solution', ur: 'تجویز کردہ حل' },
  competitorResearch: { en: 'Competitor Research Requirements', ur: 'حریف تحقیق کی ضروریات' },
  revenueModel: { en: 'Revenue Model', ur: 'آمدنی کا ماڈل' },
  pricing: { en: 'Pricing Hypotheses', ur: 'قیمت کے مفروضے' },
  startupCosts: { en: 'Startup Costs', ur: 'شروعاتی اخراجات' },
  marketing: { en: 'Marketing Strategy', ur: 'مارکیٹنگ حکمت عملی' },
  validation: { en: 'Customer Validation', ur: 'گاہک سے تصدیق' },
  first7Days: { en: 'First 7-Day Action Plan', ur: 'پہلے سات دن کا ایکشن پلان' },
  assumptions: { en: 'Assumptions and Labels', ur: 'مفروضے اور وضاحتیں' },
  content: { en: 'Generated Content', ur: 'تیار کردہ مواد' },
  calendar: { en: 'Content Calendar', ur: 'کانٹینٹ کیلنڈر' },
  positioning: { en: 'Brand Positioning', ur: 'برانڈ پوزیشننگ' },
  followUps: { en: 'Follow-Up Sequence', ur: 'فالو اپ ترتیب' },
  objections: { en: 'Objection Handling', ur: 'اعتراضات کا جواب' },
  retention: { en: 'Customer Retention Ideas', ur: 'گاہک برقرار رکھنے کے خیالات' },
  notes: { en: 'Notes', ur: 'نوٹس' },
};

function title(key: string, language: 'en' | 'ur'): string {
  const entry = SECTION_TITLES[key];
  if (!entry) return key;
  return language === 'ur' ? entry.ur : entry.en;
}

const DISCLAIMER = {
  en: 'This is AI-generated guidance based only on the information you provided. It is not financial, legal or accounting advice, and no market research has been verified. Check costs and demand yourself before spending money.',
  ur: 'یہ صرف آپ کی دی گئی معلومات پر مبنی AI مشورہ ہے۔ یہ مالی، قانونی یا اکاؤنٹنگ مشورہ نہیں ہے اور مارکیٹ ریسرچ کی تصدیق نہیں کی گئی۔ پیسے خرچ کرنے سے پہلے اخراجات اور طلب خود تصدیق کریں۔',
};

/* ------------------------------------------------------------------ */
/* Prompts                                                             */
/* ------------------------------------------------------------------ */

const SYSTEM_PREAMBLE = `You are BizSolve AI, a pragmatic business advisor for small and micro business owners, often working with very limited budgets.
Hard rules:
- Return ONLY a single valid JSON object. No markdown, no commentary outside the JSON.
- NEVER invent statistics, market sizes, customer counts, competitor names, conversion rates, or financial results.
- When a number requires data you do not have, give a clearly labelled estimate or assumption instead of a fact.
- Separate known facts from assumptions wherever you make a claim.
- Be concrete, short and practical. Use the user's currency wording when given; otherwise say "local currency".
- Total length: under about 700 words.`;

function languageLine(language: 'en' | 'ur'): string {
  return language === 'ur'
    ? 'Write all human-readable values in natural Urdu (اردو). Keep JSON keys exactly as specified in English.'
    : 'Write all human-readable values in clear English.';
}

export function buildPrompt(kind: AiKind, input: unknown): { system: string; user: string } {
  const language = ((input as { language?: 'en' | 'ur' })?.language ?? 'en') as 'en' | 'ur';
  const system = `${SYSTEM_PREAMBLE}\n${languageLine(language)}`;

  if (kind === 'problem') {
    const data = input as ProblemInput;
    const user = `A business owner describes this problem:
"""${data.problem}"""
${data.context ? `Extra context they shared:\n"""${data.context}"""` : 'No extra context was provided.'}

Return JSON with exactly these keys:
{
 "problemSummary": string,
 "rootCauses": [{"cause": string, "basis": "known_fact" | "assumption", "why": string}],
 "additionalInformationNeeded": string[],
 "recommendedSolution": string,
 "actionPlan": [{"step": string, "title": string, "detail": string, "timeframe": string}],
 "estimatedCost": {"items": [{"item": string, "amount": string, "note": string}], "total": string},
 "risks": string[],
 "successMetrics": string[],
 "firstActionToday": string
}
Rules: 3-5 root causes; 4-6 action steps ordered by priority; 3-5 success metrics that the owner can actually measure; "firstActionToday" must be one thing doable today with little or no money. If you lack information for costs, say what is missing in "total" rather than inventing a number.`;
    return { system, user };
  }

  if (kind === 'plan') {
    const data = input as PlanInput;
    const user = `Create a realistic, low-budget business plan from these inputs:
Idea: """${data.idea}"""
Country / market: ${data.country}
Target market: ${data.targetMarket || 'not specified'}
Available budget: ${data.budget || 'not specified'}
Skills and experience: ${data.skills || 'not specified'}
Target customers: ${data.targetCustomers || 'not specified'}
Available time: ${data.availableTime || 'not specified'}
Goals: ${data.goals || 'not specified'}

Return JSON with exactly these keys:
{
 "targetCustomer": string,
 "customerProblem": string,
 "proposedSolution": string,
 "competitorResearchPlan": string[],
 "revenueModel": string,
 "pricingHypotheses": [{"option": string, "price": string, "rationale": string}],
 "startupCosts": [{"item": string, "estimate": string, "note": string}],
 "marketingStrategy": string[],
 "risks": string[],
 "customerValidation": string[],
 "first7Days": [{"day": string, "focus": string, "actions": string}],
 "assumptions": string[]
}
Rules: prices and costs are hypotheses, clearly labelled. competitorResearchPlan must describe how to research competitors, not invent competitor facts. first7Days must have 7 entries, each doable with the stated budget and time.`;
    return { system, user };
  }

  if (kind === 'marketing') {
    const data = input as MarketingInput;
    const user = `Create marketing content.
Business category: ${data.category}
Target audience: ${data.audience}
Content type: ${data.outputType}
Objective: ${data.objective}
Tone: ${data.tone}
Platform: ${data.platform}
Extra details: ${data.details || 'none provided'}

Return JSON with exactly these keys:
{
 "summary": string,
 "items": [{"label": string, "content": string}],
 "contentCalendar": [{"day": string, "channel": string, "idea": string}],
 "brandPositioning": string,
 "notes": string[]
}
Rules: 3-5 ready-to-use items for the chosen content type. No fake testimonials, no invented customer numbers, no unverifiable claims like "best in the city". Keep each item copy-paste ready. If a content calendar does not fit the requested type, return 5 practical ideas instead.`;
    return { system, user };
  }

  const data = input as SalesInput;
  const user = `Help a small business owner with a sales conversation.
Scenario: ${data.scenario}
Tone: ${data.tone}
Customer message / situation: """${data.customerMessage || 'not provided'}"""
Business context: ${data.context || 'not provided'}

Return JSON with exactly these keys:
{
 "summary": string,
 "items": [{"label": string, "content": string}],
 "followUps": [{"step": string, "timing": string, "message": string}],
 "objections": [{"objection": string, "response": string}],
 "retentionIdeas": string[],
 "notes": string[]
}
Rules: messages must be honest and non-pushy, ready to send after the owner reviews them. Never promise discounts or guarantees the owner did not mention. Do not claim the messages were sent.`;
  return { system, user };
}

/* ------------------------------------------------------------------ */
/* Normalisation into the UI contract                                  */
/* ------------------------------------------------------------------ */

export function normalizeResult(
  kind: AiKind,
  raw: unknown,
  opts: { language: 'en' | 'ur'; model: string; fallbackTitle: string },
): AiResult {
  const record = asRecord(raw);
  const language = opts.language;
  const sections: AiSection[] = [];
  const push = (id: string, section: Omit<AiSection, 'id' | 'title'>) => {
    sections.push({ id, title: title(id, language), ...section });
  };

  if (kind === 'problem') {
    const summary = asText(pick(record, ['problemSummary', 'summary']));
    if (summary) push('summary', { type: 'text', text: summary });
    const causes = Array.isArray(record.rootCauses) ? record.rootCauses : [];
    const causeRows = causes
      .map((entry) => {
        const item = asRecord(entry);
        const cause = asText(pick(item, ['cause', 'title', 'name'])) || asText(entry);
        const basis = asText(pick(item, ['basis', 'type'])).toLowerCase();
        const why = asText(pick(item, ['why', 'explanation', 'detail']));
        const label = basis.includes('assum') ? `${cause} (assumption)` : basis.includes('fact') ? `${cause} (known fact)` : cause;
        return { label, value: why };
      })
      .filter((row) => row.label);
    if (causeRows.length) push('rootCauses', { type: 'rows', rows: causeRows });
    const info = asList(record.additionalInformationNeeded);
    if (info.length) push('infoNeeded', { type: 'list', items: info });
    const solution = asText(pick(record, ['recommendedSolution', 'solution']));
    if (solution) push('solution', { type: 'text', text: solution });
    const plan = asSteps(record.actionPlan);
    if (plan.length) push('actionPlan', { type: 'steps', steps: plan });
    const cost = asCostRows(record.estimatedCost);
    if (cost.length) push('cost', { type: 'rows', rows: cost });
    const risks = asList(record.risks);
    if (risks.length) push('risks', { type: 'list', items: risks });
    const metrics = asList(record.successMetrics);
    if (metrics.length) push('metrics', { type: 'list', items: metrics });
    const first = asText(pick(record, ['firstActionToday', 'firstAction']));
    if (first) push('firstAction', { type: 'text', text: first });
    return {
      kind,
      title: opts.fallbackTitle,
      language,
      sections,
      disclaimer: DISCLAIMER[language],
      model: opts.model,
    };
  }

  if (kind === 'plan') {
    const simple: [string, string[]][] = [
      ['targetCustomer', ['targetCustomer', 'targetCustomers']],
      ['customerProblem', ['customerProblem', 'problem']],
      ['proposedSolution', ['proposedSolution', 'solution']],
    ];
    for (const [id, keys] of simple) {
      const value = asText(pick(record, keys));
      if (value) push(id, { type: 'text', text: value });
    }
    const research = asList(pick(record, ['competitorResearchPlan', 'competitorResearch']));
    if (research.length) push('competitorResearch', { type: 'list', items: research });
    const revenue = asText(pick(record, ['revenueModel', 'revenue']));
    if (revenue) push('revenueModel', { type: 'text', text: revenue });
    const pricing = asRows(record.pricingHypotheses, ['option', 'name', 'label'], ['price', 'value']);
    if (pricing.length) push('pricing', { type: 'rows', rows: pricing });
    const costs = asCostRows(record.startupCosts);
    if (costs.length) push('startupCosts', { type: 'rows', rows: costs });
    const marketing = asList(record.marketingStrategy);
    if (marketing.length) push('marketing', { type: 'list', items: marketing });
    const risks = asList(record.risks);
    if (risks.length) push('risks', { type: 'list', items: risks });
    const validation = asList(record.customerValidation);
    if (validation.length) push('validation', { type: 'list', items: validation });
    const days = asSteps(record.first7Days);
    if (days.length) push('first7Days', { type: 'steps', steps: days });
    const assumptions = asList(record.assumptions);
    if (assumptions.length) push('assumptions', { type: 'list', items: assumptions });
    return { kind, title: opts.fallbackTitle, language, sections, disclaimer: DISCLAIMER[language], model: opts.model };
  }

  if (kind === 'marketing') {
    const summary = asText(pick(record, ['summary']));
    if (summary) push('summary', { type: 'text', text: summary });
    const blocks = asBlocks(record.items);
    if (blocks.length) push('content', { type: 'blocks', blocks });
    const calendar = Array.isArray(record.contentCalendar)
      ? record.contentCalendar
          .map((entry) => {
            const item = asRecord(entry);
            const day = asText(pick(item, ['day', 'date', 'timing']));
            const channel = asText(pick(item, ['channel', 'platform']));
            const idea = asText(pick(item, ['idea', 'content', 'post', 'topic']));
            return { title: `${day}${day && channel ? ' · ' : ''}${channel}` || 'Idea', detail: idea };
          })
          .filter((step) => step.detail)
      : [];
    if (calendar.length) push('calendar', { type: 'steps', steps: calendar });
    const positioning = asText(pick(record, ['brandPositioning', 'positioning']));
    if (positioning) push('positioning', { type: 'text', text: positioning });
    const notes = asList(record.notes);
    if (notes.length) push('notes', { type: 'list', items: notes });
    return { kind, title: opts.fallbackTitle, language, sections, disclaimer: DISCLAIMER[language], model: opts.model };
  }

  const summary = asText(pick(record, ['summary']));
  if (summary) push('summary', { type: 'text', text: summary });
  const blocks = asBlocks(record.items);
  if (blocks.length) push('content', { type: 'blocks', blocks });
  const followUps = Array.isArray(record.followUps)
    ? record.followUps
        .map((entry) => {
          const item = asRecord(entry);
          const step = asText(pick(item, ['step', 'title', 'name']));
          const timing = asText(pick(item, ['timing', 'when', 'day']));
          const message = asText(pick(item, ['message', 'content', 'text']));
          return { title: step || 'Follow-up', detail: message, meta: timing || undefined };
        })
        .filter((step) => step.detail)
    : [];
  if (followUps.length) push('followUps', { type: 'steps', steps: followUps });
  const objections = asRows(record.objections, ['objection', 'label', 'question'], ['response', 'answer', 'value']);
  if (objections.length) push('objections', { type: 'rows', rows: objections });
  const retention = asList(record.retentionIdeas);
  if (retention.length) push('retention', { type: 'list', items: retention });
  const notes = asList(record.notes);
  if (notes.length) push('notes', { type: 'list', items: notes });
  return { kind, title: opts.fallbackTitle, language, sections, disclaimer: DISCLAIMER[language], model: opts.model };
}
