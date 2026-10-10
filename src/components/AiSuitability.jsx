import { useState } from 'react';
import { CornerDownRight, RefreshCw, Sparkles } from 'lucide-react';
import { buildEvidence, IMPACT_LABELS } from '../engine/decision.js';
import { requestPredictions } from '../services/aiPredictions.js';
import { formatIST } from '../lib/format.js';

/** Deterministic operational-impact score — computed by rules, never by the model. */
export function ImpactBreakdown({ impact, rank }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs ring-1 ring-slate-200">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between gap-2 text-left">
        <span><b>Review priority #{rank}</b> · deterministic impact score <b>{impact.score}/100</b></span>
        <span className="text-slate-500">{open ? 'Hide' : 'Breakdown'}</span>
      </button>
      {open && (
        <table className="mt-1.5 w-full">
          <tbody>
            {Object.entries(impact.components).map(([k, v]) => (
              <tr key={k} className="align-top">
                <td className="pr-2 text-slate-600">{IMPACT_LABELS[k]} ({Math.round(v.weight * 100)}%)</td>
                <td className="pr-2 text-right font-medium tabular-nums">{v.value}</td>
                <td className="text-slate-500">{v.factors.join('; ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const short = ref => (ref.length > 20 ? `${ref.slice(0, 8)}…` : ref);

function PredictionRow({ p, evidence, top, adopted, onAdopt }) {
  return (
    <li className={`rounded-md p-2 ring-1 ${p.eligible ? 'ring-slate-200' : 'bg-slate-50 ring-slate-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className={`font-medium ${p.eligible ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
          {top && <span className="mr-1 rounded bg-indigo-600 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-white">Top AI pick</span>}
          {p.strategy}
        </span>
        <span className="shrink-0 tabular-nums font-semibold text-indigo-700" title="AI-estimated suitability, not a probability of success">{p.suitabilityPercent}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-200">
        <div className={`h-full ${p.eligible ? 'bg-indigo-500' : 'bg-slate-400'}`} style={{ width: `${p.suitabilityPercent}%` }} />
      </div>
      {!p.eligible && (
        <p className="mt-1 font-medium text-rose-700">
          Ineligible{p.blockedBy.length ? ` — blocked by rule: ${p.blockedBy.join(' ')}` : ' — marked ineligible by the model'}
          {p.ruleOverride && ' (model rated it eligible; hard rule overrides)'}
        </p>
      )}
      <p className="mt-1 text-slate-700">{p.reason}</p>
      {p.risks.length > 0 && <p className="mt-0.5 text-slate-600"><b>Risks:</b> {p.risks.join('; ')}</p>}
      {p.missingInformation.length > 0 && <p className="mt-0.5 text-slate-600"><b>Missing:</b> {p.missingInformation.join('; ')}</p>}
      <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-slate-500">
        {p.evidenceReferences.map(r => (
          <code key={r} title={evidence.get(r) || r} className="rounded bg-slate-100 px-1">{short(r)}</code>
        ))}
        <span>{p.engineChoice ? '· matches a decision option below' : '· advisory, no engine action'}</span>
      </div>
      {p.eligible && p.engineChoice && onAdopt && (
        <button type="button" onClick={() => onAdopt(p)} disabled={adopted}
          className="mt-1.5 inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:bg-indigo-50 disabled:opacity-70">
          <CornerDownRight size={12} /> {adopted ? 'Pre-filled in decision below' : 'Pre-fill decision below'}
        </button>
      )}
    </li>
  );
}

/**
 * On-demand AI estimates. Advisory only: a supervisor can pre-fill the decision form from an
 * eligible estimate, but nothing is submitted without their reason and click. Failures leave
 * the deterministic decision form untouched.
 */
export default function AiSuitability({ conflict, central, aiStatus, adoptedChoice, onAdopt }) {
  const [state, setState] = useState({ phase: 'idle' });

  const run = async (force = false) => {
    setState({ phase: 'loading' });
    const { data, error } = await requestPredictions(central, conflict.id, force);
    setState(error ? { phase: 'error', error } : { phase: 'ok', data });
  };

  const notConfigured = aiStatus && !aiStatus.configured;
  const evidence = new Map(buildEvidence(conflict, central).map(e => [e.ref, e.text]));
  const sorted = state.data?.predictions.slice().sort((a, b) => (b.eligible - a.eligible) || (b.suitabilityPercent - a.suitabilityPercent));

  return (
    <div className="mt-3 rounded-md p-2 text-xs ring-1 ring-indigo-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 font-semibold text-indigo-900"><Sparkles size={13} /> AI-estimated suitability</span>
        {state.phase !== 'loading' && !notConfigured && (
          <button type="button" onClick={() => run(state.phase === 'ok')} className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50">
            <RefreshCw size={12} /> {state.phase === 'idle' ? 'Estimate options' : state.phase === 'error' ? 'Retry' : 'Re-run'}
          </button>
        )}
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500">Percentages are AI-estimated suitability, not calibrated probabilities of success. They are never applied automatically, and hard business rules always win.</p>

      {notConfigured && (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-amber-900 ring-1 ring-amber-200">
          AI prediction unavailable: not configured. {aiStatus.message} The deterministic review below works without it.
        </p>
      )}
      {state.phase === 'loading' && <p className="mt-2 text-slate-500">Requesting estimates…</p>}
      {state.phase === 'error' && (
        <p className="mt-2 rounded bg-slate-50 px-2 py-1.5 text-slate-700 ring-1 ring-slate-200">
          <b>AI prediction unavailable.</b> {state.error.message} You can still decide below.
        </p>
      )}
      {state.phase === 'ok' && (
        <>
          <ul className="mt-2 space-y-1.5">
            {sorted.map((p, i) => (
              <PredictionRow key={p.strategyId} p={p} evidence={evidence} top={i === 0 && p.eligible}
                adopted={!!p.engineChoice && adoptedChoice === p.engineChoice}
                onAdopt={onAdopt && (x => onAdopt(x, state.data))} />
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {state.data.model} · {formatIST(state.data.generatedAt)} · input {state.data.conflictVersion}{state.data.cached ? ' · cached (inputs unchanged)' : ''}
          </p>
        </>
      )}
    </div>
  );
}
