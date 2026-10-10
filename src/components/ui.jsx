import { STATUS_STYLE, OUTCOME_STYLE } from '../lib/format.js';

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLE[status]?.badge || 'bg-slate-100 ring-slate-200'}`}>
      {status}
    </span>
  );
}

export function OutcomeBadge({ outcome }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${OUTCOME_STYLE[outcome] || OUTCOME_STYLE.INFO}`}>
      {outcome.replaceAll('_', ' ')}
    </span>
  );
}

export function Card({ title, subtitle, children, className = '', actions }) {
  return (
    <section className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${className}`}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
