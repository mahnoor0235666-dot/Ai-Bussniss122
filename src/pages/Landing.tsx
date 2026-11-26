import { Link } from 'react-router-dom';
import { usePrefs } from '../lib/i18n';

const FEATURES = [
  {
    title: 'AI Business Problem Solver',
    body: 'Describe a problem in plain English or Urdu. Get root causes, a prioritised plan, costs, risks and the first action to take today.',
  },
  {
    title: 'Business Plan Generator',
    body: 'Turn an idea into a realistic plan: target customer, revenue model, pricing hypotheses, startup costs and a 7-day validation plan.',
  },
  {
    title: 'Marketing Assistant',
    body: 'Social posts, campaigns, product descriptions and content calendars — editable before you copy or export them.',
  },
  {
    title: 'Sales Assistant',
    body: 'Replies, follow-ups, objection handling and scripts. Nothing is ever sent automatically.',
  },
  {
    title: 'Finance Calculator',
    body: 'Revenue, profit, margin and break-even with the arithmetic shown, plus input validation and divide-by-zero handling.',
  },
  {
    title: 'Tasks & Projects',
    body: 'Every analysis can be saved to a project, and every plan becomes tasks with priority and deadlines.',
  },
];

const STEPS = [
  'Create a free account — your data is tied to your login only.',
  'Describe the problem or idea in your own words.',
  'Review the answer, save it to a project, and turn it into tasks.',
  'Track what you finished and come back to saved results any time.',
];

export default function Landing() {
  const { t } = usePrefs();
  return (
    <div className="stack" style={{ paddingTop: 28 }}>
      <section className="hero">
        <span className="badge badge-info">{t('appName')}</span>
        <h1 className="hero-title">
          Business problems in.
          <br />
          Practical steps out.
        </h1>
        <p className="hero-sub">{t('tagline')} {t('heroLead')}</p>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn btn-primary btn-lg" to="/signup">
            {t('getStarted')}
          </Link>
          <Link className="btn btn-lg" to="/login">
            {t('signIn')}
          </Link>
        </div>
        <p className="hint" style={{ maxWidth: 520 }}>
          Free to start. No card required. AI features need a server-side API key; the finance calculator, task planner
          and saved projects work without one.
        </p>
      </section>

      <section className="grid grid-3">
        {FEATURES.map((feature) => (
          <article className="card" key={feature.title}>
            <div className="card-body stack-sm">
              <h2 style={{ fontSize: '1rem' }}>{feature.title}</h2>
              <p className="small muted">{feature.body}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="card">
        <div className="card-body stack">
          <h2 style={{ fontSize: '1.1rem' }}>How it works</h2>
          <ol className="steps">
            {STEPS.map((step, index) => (
              <li className="step-item" key={step}>
                <div className="step-body">
                  <span className="step-title">{step}</span>
                </div>
              </li>
            ))}
          </ol>
          <p className="small muted">
            BizSolve AI does not invent market research, customer data or financial results. Estimates are labelled as
            estimates, and you should verify anything before spending money on it.
          </p>
          <div>
            <Link className="btn btn-primary" to="/signup">
              {t('getStarted')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
