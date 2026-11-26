# BizSolve AI

A mobile-first AI business assistant for small business owners: describe a problem in
English or Urdu, get root causes and a prioritized action plan, generate a business plan
or marketing copy, draft sales replies, run finance calculations, and keep the resulting
tasks and projects saved per user.

This is a working full-stack application, not a mockup. Every button in the UI calls a
real API route; data is stored in a database and scoped to the signed-in user.

---

## 1. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React 19 + TypeScript + Vite 6, hand-written CSS | No component-library lock-in, small bundle, full control of RTL |
| Backend | Node 20+ / Express 5 (TypeScript) | One process serves both the SPA and the JSON API |
| Database | SQLite via `better-sqlite3`, schema applied on boot | Zero-cost, single-file, transactional; no external service needed |
| Auth | Email + password, `scrypt` hashing, server-side sessions in SQLite, `HttpOnly` cookies | No plaintext passwords, no custom JWT signing, revocable sessions |
| Validation | `zod` schemas on every mutating route | Rejects malformed input before it reaches SQL |
| AI | OpenAI-compatible Chat Completions API, called **server-side only** | The key never reaches the browser; swap providers via `AI_BASE_URL` |
| Email | Optional Resend HTTP API (no extra dependency) | Password reset / verification only when configured |
| Tests | Vitest 4 (unit + real HTTP integration against an in-memory DB) | 37 automated tests |

## 2. Features

**AI Business Problem Solver** — free-text problem in English or Urdu. Returns a fixed
structure: Problem Summary, Possible Root Causes, Additional Information Needed,
Recommended Solution, Step-by-Step Action Plan, Estimated Cost, Risks and Limitations,
Success Metrics, First Action Today. The system prompt forbids inventing statistics.

**Business Plan Generator** — idea, country/market, budget, skills, customers, time and
goals → target customer, customer problem, solution, competitor-research checklist,
revenue model, pricing hypotheses, startup costs, marketing plan, risks, validation plan,
7-day action plan. Estimates are labelled as estimates.

**Marketing Assistant** — social posts, campaigns, product descriptions, ad copy, outreach
messages, content calendars and brand positioning, with category / audience / language /
tone / objective selectors. Output is editable before copy or export.

**Sales Assistant** — replies, follow-ups, objection handling, offer improvements,
retention ideas and scripts. Nothing is ever sent automatically; the user copies the text.

**Finance Calculators** — Revenue, Profit/Loss, Profit Margin %, Break-Even Units.
Every input is validated, division by zero is handled explicitly, each result shows its
formula and substitution steps, and a glossary explains revenue vs gross vs net profit.

**Task Planner** — create/edit/delete, priority, status, due date, project association,
progress bar, filters.

**Saved Projects & Results** — projects with categories, saved AI analyses linked to a
project, reopen, edit, delete, and text export of any saved analysis.

**Dashboard** — greeting, real counts of active projects / open / completed tasks, recent
analyses, quick tool links and a prominent "Solve my business problem" action. No invented
metrics.

**Profile & Settings** — display name, business name, preferred language, theme
(system/light/dark), password change, email verification, account deletion, data export.

**Bilingual UI** — full English/Urdu dictionary with automatic `dir="rtl"` and Urdu
numerals/date formatting for Urdu.

## 3. Quick start (local)

```bash
npm install
cp .env.example .env          # optional: add AI_API_KEY to enable AI features
npm run dev:api               # API on http://127.0.0.1:3000
npm run dev:web               # Vite dev server on http://127.0.0.1:5173 (proxies /api)
```

Open http://127.0.0.1:5173, sign up with any email + an 8-character password (one number,
one letter). No email provider is needed to register.

Production-style run:

```bash
npm run build                 # builds dist/ (SPA) and dist-server/index.js (API)
npm start                     # serves both on http://0.0.0.0:$PORT
```

## 4. Environment variables

All values are optional for local development; the app degrades honestly when a service is
not configured.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port (the server binds `0.0.0.0`) |
| `NODE_ENV` | `development` | `production` enables `Secure` cookies and hides dev reset links |
| `DATABASE_FILE` | `./data/bizsolve.db` | SQLite file; created automatically with its schema |
| `TRUST_PROXY` | `0` | Set to `1` behind Render/Fly/Nginx so rate limits see the real client IP |
| `COOKIE_SECURE` | auto | Force the `Secure` cookie flag |
| `AI_API_KEY` | *(empty)* | **Required for AI features.** Server-side only |
| `AI_BASE_URL` | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint |
| `AI_MODEL` | `gpt-4o-mini` | Model name |
| `AI_TIMEOUT_MS` | `45000` | Upstream request timeout |
| `AI_MAX_OUTPUT_TOKENS` | `1800` | Caps response size (and cost) |
| `AI_DAILY_LIMIT` | `25` | Per-user rolling 24-hour AI request quota |
| `RESEND_API_KEY` | *(empty)* | Optional transactional email (password reset, verification) |
| `EMAIL_FROM` | *(empty)* | Sender identity, required with `RESEND_API_KEY` |
| `APP_BASE_URL` | `http://localhost:$PORT` | Base URL used in email links |

**Without `AI_API_KEY`** the AI screens show a clear "AI is not configured" notice with the
exact missing variable, and every non-AI feature keeps working. No answer is ever
fabricated. AI usage is billed by the provider you point `AI_BASE_URL` at — it is **not**
free by default.

## 5. Database schema

Applied idempotently at boot (`server/db.ts`):

- `users` — id, email (unique), password_hash (scrypt), display_name, business_name,
  preferred_language, theme, email_verified, created_at
- `sessions` — token_hash (unique), user_id → users, expires_at
- `one_time_tokens` — token_hash, user_id, purpose (`password_reset` / `email_verify`),
  expires_at, used_at
- `projects` — user_id → users, title, description, category, status, timestamps
- `saved_analyses` — user_id, project_id (nullable), kind, title, problem_description,
  content (JSON), created_at
- `tasks` — user_id, project_id (nullable), title, description, priority, status, due_date,
  timestamps
- `ai_usage` — user_id, kind, created_at (drives the per-user quota)

All private tables carry `user_id` with `ON DELETE CASCADE`, so account deletion removes
every row. Indexes exist on the ownership/listing columns used by the API.

SQLite has no row-level security, so ownership is enforced in **every** query: each handler
resolves the authenticated user id from the session and filters by it. A record that
belongs to someone else returns `404` rather than `403`, so ids cannot be probed.

## 6. API surface

```
POST   /api/auth/signup            POST /api/auth/login      POST /api/auth/logout
GET    /api/auth/me                POST /api/auth/forgot-password
POST   /api/auth/reset-password    POST /api/auth/resend-verification
POST   /api/auth/verify-email

PATCH  /api/account                POST /api/account/password
DELETE /api/account                GET  /api/account/export

GET    /api/projects               POST /api/projects
GET    /api/projects/:id           PATCH /api/projects/:id     DELETE /api/projects/:id

GET    /api/analyses               POST /api/analyses
GET    /api/analyses/:id           DELETE /api/analyses/:id

GET    /api/tasks                  POST /api/tasks
PATCH  /api/tasks/:id              DELETE /api/tasks/:id

GET    /api/ai/status
POST   /api/ai/problem             POST /api/ai/plan
POST   /api/ai/marketing           POST /api/ai/sales
```

Errors always use `{ "error": { "code", "message" } }` with a safe, user-readable message —
no stack traces, SQL or secrets.

## 7. Security controls implemented

- **Passwords**: `scrypt` (N=16384) with a 16-byte random salt, constant-time comparison.
  Unknown-email logins still run a dummy hash so response timing does not reveal accounts.
- **Sessions**: 256-bit random tokens, stored only as SHA-256 hashes, `HttpOnly` +
  `SameSite=Lax` + `Secure` in production, 30-day expiry, revoked on logout, password
  change revokes *other* sessions.
- **Authorization**: every data route requires a session; every query is scoped to the
  session's user id. Cross-user access is covered by tests.
- **Input validation**: `zod` schemas bound every string length, enum, id format and numeric
  field; the JSON body limit is 1 MB; malformed JSON is rejected with a safe message.
- **AI safety**: key stays server-side; request timeouts; output size caps; strict JSON
  parsing with a graceful "unreadable answer" error; per-user daily quota plus an
  IP/user rate limit; prompts instruct the model not to invent market data.
- **XSS**: React escapes all user and AI content; no `dangerouslySetInnerHTML` anywhere.
- **Web hardening**: `helmet` security headers, explicit CSP, `trust proxy` support,
  rate limits on auth and AI routes, generic 500 responses.
- **CSRF posture**: session cookie is `SameSite=Lax` and all mutations require a JSON
  `content-type` (which cross-site form posts cannot set), so state changes are not
  reachable from a third-party page. No token endpoint is exposed to `GET`.
- **Privacy**: minimal data collection, no payment data, per-item delete, full JSON export,
  and account deletion that cascades.

**Not implemented / not claimed**: no 2FA, no OAuth providers, no admin console, no audit
log, no email delivery unless `RESEND_API_KEY` is set, no CSRF token (relies on the
`SameSite` + JSON content-type posture above), and no penetration test has been performed.
A dependency scan is not a security audit of the application.

## 8. Tests

```bash
npm test            # 37 tests
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

`tests/finance.test.ts` (14) — revenue, profit/loss, margin, break-even, zero and negative
inputs, division by zero, non-numeric input, rounding/formatting.

`tests/api.test.ts` (23) — boots the real Express app on an ephemeral port against an
in-memory SQLite database and asserts over HTTP:

- protected routes reject anonymous requests (401)
- signup (201) returns no password material; duplicate email and weak password rejected
- login/logout, wrong password rejected, `me` reflects the session
- user B cannot read, update or delete user A's project, analysis or task (404)
- invalid ids and oversized/invalid bodies rejected with 400
- AI endpoints return `503 ai_not_configured` when no key is set (never a fabricated answer)
- project/task/analysis create, list, update and delete round-trips
- password change keeps the current session and rejects the old password
- password reset consumes a single-use token
- data export includes only the caller's records
- account deletion requires the correct password and removes the user's data

**Not covered by automated tests**: real AI-provider responses (no key in CI), email
delivery, and visual/mobile rendering. Those are described honestly in section 10.

## 9. Deploying

The app is a single Node service: build the SPA and the server bundle, then run
`node dist-server/index.js`. It binds `0.0.0.0` and honours `PORT`.

**Render / Railway / Fly.io (single service, free tier)**

1. Create a Node web service from this repository, branch `appjet`.
2. Build command: `npm ci && npm run build`
3. Start command: `npm start`
4. Environment variables: `NODE_ENV=production`, `TRUST_PROXY=1`,
   `APP_BASE_URL=https://your-domain`, `AI_API_KEY` (if you want AI features),
   optionally `RESEND_API_KEY` + `EMAIL_FROM`, and `DATABASE_FILE=/data/bizsolve.db`.
5. **Attach a persistent disk mounted at `/data`.** Free instances have ephemeral
   filesystems — without a volume, SQLite data (including accounts) is lost on every
   deploy or restart. A disk requires a paid instance on most providers, or swap
   `server/db.ts` for a managed Postgres instance.
6. Ensure HTTPS is enabled by the platform (required for `Secure` cookies) and that the
   health path `/` responds.

**Checklist before exposing to real users**

- [ ] `NODE_ENV=production` (enables `Secure` cookies and hides dev reset links)
- [ ] `TRUST_PROXY=1` behind a proxy, so rate limiting keys on the real client IP
- [ ] `APP_BASE_URL` matches the public HTTPS origin, so email links resolve
- [ ] `AI_API_KEY` set server-side only (never in the client bundle or the repo)
- [ ] Persistent volume for `DATABASE_FILE`, or a managed database
- [ ] Back up the SQLite file (or managed DB) on a schedule
- [ ] Confirm `/api/auth/me` returns 401 when signed out

## 10. Honest limitations

- **AI needs credentials and money.** Without `AI_API_KEY` the four AI screens show a
  configuration notice instead of answers. Provider usage is billed per token; the
  per-user daily quota (`AI_DAILY_LIMIT`) and `AI_MAX_OUTPUT_TOKENS` bound cost but do not
  make it free.
- **Email needs a provider.** Without `RESEND_API_KEY`/`EMAIL_FROM`, reset and verification
  emails are not delivered. In non-production the reset link is returned to the browser so
  the flow stays testable; in production the API reports that email is not configured.
- **SQLite is single-instance.** Fine for a pilot; it does not scale horizontally and needs
  a persistent disk (see deployment notes).
- **Urdu is UI-level.** The interface, RTL layout and AI output support Urdu; AI answer
  quality in Urdu depends on the configured model.
- **No live AI verification in this environment.** Tests prove the missing-credential path
  and error handling; they cannot prove live provider output without a key.
- **Not audited.** No penetration test, no compliance certification (GDPR/PCI/etc.) is
  claimed. The app collects no payment data.

## 11. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| "AI is not configured" | `AI_API_KEY` missing on the server; set it and restart |
| AI returns 502 `ai_invalid_output` | Model replied with unparseable JSON; retry or pick a more capable model |
| 429 `rate_limited` | Auth/AI rate limit hit; wait a minute or raise the per-user quota |
| Logged out after deploy | Ephemeral filesystem wiped the SQLite file; attach a persistent disk |
| Reset link goes to `localhost` | Set `APP_BASE_URL` to the public HTTPS origin |
| Cookies not set over HTTPS | `NODE_ENV=production` plus `TRUST_PROXY=1` behind the proxy |

## 12. Project layout

```
server/            Express app: index.ts, app.ts, db.ts, auth.ts, ai.ts, prompts.ts,
                   schemas.ts, errors.ts, email.ts, routes/{auth,data,ai}.ts
src/               React SPA: pages/, components/, lib/ (api, auth, i18n, finance, hooks)
tests/             Vitest unit + HTTP integration tests
```
