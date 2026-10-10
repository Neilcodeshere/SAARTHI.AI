import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { actorName, SUPERVISOR } from '../data/seed.js';
import { RULES } from '../engine/engine.js';
import { rankConflicts } from '../engine/decision.js';
import AiSuitability, { ImpactBreakdown } from './AiSuitability.jsx';
import { formatIST } from '../lib/format.js';
import { Card, StatusBadge, OutcomeBadge } from './ui.jsx';

function optionsFor(c, central) {
  const part = central.inventory[c.partId];
  if (c.type === 'STATUS_CONFLICT') {
    return c.candidates.map(x => ({
      value: x.opId,
      label: `${x.status} — as submitted by ${actorName(x.actor)}${x.status === 'Completed' ? (x.signOff ? ' (sign-off captured)' : ' (no sign-off — not allowed)') : ''}`,
      disabled: x.status === 'Completed' && !x.signOff,
    }));
  }
  if (c.type === 'PARTS_OVERLAP') {
    const t = central.tickets[c.ticketId];
    return [
      { value: 'KEEP_ALL', label: `Both installed — keep all deductions (stock stays ${part.stock})` },
      ...c.entries.map(opId => {
        const e = t.partsLog.find(x => x.opId === opId);
        return { value: `REVERSE:${opId}`, label: `Only one installed — reverse ${actorName(e.actor)}'s log, return ${e.qty} to stock` };
      }),
    ];
  }
  return [
    { value: 'APPROVE', label: `Approve ${c.qty} × ${part.name} (needs stock ≥ ${c.qty}; now ${part.stock})`, disabled: part.stock < c.qty },
    { value: 'REJECT', label: 'Reject — part not issued, stock unchanged' },
  ];
}

function Explanation({ c, central }) {
  const t = central.tickets[c.ticketId];
  const opEvents = central.audit.filter(e => e.ticketId === c.ticketId && e.opId && e.outcome !== 'DUPLICATE');
  if (c.type !== 'STATUS_CONFLICT') {
    return <p className="text-xs text-slate-700">{c.why}</p>;
  }
  const base = Math.min(...c.candidates.map(x => x.baseVersion));
  return (
    <ol className="list-decimal space-y-1.5 pl-4 text-xs text-slate-700">
      <li><b>Central before sync:</b> v{base}, status <StatusBadge status={c.statusAtBase} />, both technicians worked from this copy offline.</li>
      {c.candidates.map(x => (
        <li key={x.opId}>
          <b>{actorName(x.actor)} submitted:</b> status “{x.status}”{x.signOff ? ' with customer sign-off' : ''}
          {t.notes.filter(n => n.actor === x.actor && n.baseVersion === x.baseVersion).map(n => <span key={n.opId}>; note “{n.text}”</span>)}
          {t.partsLog.filter(e => e.actor === x.actor && e.baseVersion === x.baseVersion && e.kind === 'CONSUME').map(e => <span key={e.opId}>; {e.qty} × {central.inventory[e.partId]?.name}</span>)}
        </li>
      ))}
      <li><b>Why they conflict:</b> {c.why}</li>
      <li><b>Rule applied:</b> <code className="text-indigo-700">{c.ruleId}</code> — {RULES[c.ruleId]}</li>
      <li>
        <b>Outcome per operation:</b>
        <ul className="mt-1 space-y-0.5">
          {opEvents.map(e => (
            <li key={e.id} className="flex flex-wrap items-center gap-1"><OutcomeBadge outcome={e.outcome} /> {actorName(e.actor)} · <code className="text-[11px]">{e.ruleId}</code></li>
          ))}
        </ul>
      </li>
      <li><b>Result now:</b> status <StatusBadge status={t.status} />, v{t.version}; {Object.values(central.inventory).filter(p => p.appliance === t.appliance).map(p => `${p.name}: ${p.stock}`).join(' · ')}.</li>
      <li><b>Audit:</b> {opEvents.length} operation events recorded for {t.id}; see Audit history.</li>
    </ol>
  );
}

function ConflictCard({ c, central, onResolve, busy, impact, rank, aiStatus }) {
  const opts = optionsFor(c, central);
  const [choice, setChoice] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [aiPick, setAiPick] = useState(null); // { choice, percent } once an AI estimate pre-filled the form
  const label = { STATUS_CONFLICT: 'Status conflict', PARTS_OVERLAP: 'Overlapping parts logs', INVENTORY_SHORTAGE: 'Inventory shortage' }[c.type];

  // Pre-fills only; the supervisor still edits the reason and clicks Resolve. The AI note is kept
  // in the reason so the audit trail records that the decision was AI-assisted.
  const adoptAi = (p, data) => {
    if (opts.find(o => o.value === p.engineChoice)?.disabled) return;
    setChoice(p.engineChoice);
    setAiPick({ choice: p.engineChoice, percent: p.suitabilityPercent });
    setReason(r => r.trim() ? r : `AI-assisted (${data.model}, ${p.suitabilityPercent}% est. suitability, input ${data.conflictVersion}): ${p.reason}`);
  };

  const submit = async () => {
    setError(null);
    try {
      await onResolve(c.id, choice, reason);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="rounded-lg p-3 ring-1 ring-rose-200">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-rose-800">{c.id} · {label} · {c.ticketId}</span>
        <code className="text-[11px] text-indigo-700">{c.ruleId}</code>
      </div>
      <ImpactBreakdown impact={impact} rank={rank} />
      <Explanation c={c} central={central} />
      <AiSuitability
        key={`${c.id}-${central.tickets[c.ticketId].version}-${c.candidates?.length ?? 0}`}
        conflict={c}
        central={central}
        aiStatus={aiStatus}
        adoptedChoice={choice}
        onAdopt={adoptAi}
      />
      <fieldset className="mt-3 space-y-1 text-xs">
        <legend className="mb-1 font-semibold text-slate-800">Decision</legend>
        {opts.map(o => (
          <label key={o.value} className={`flex items-start gap-1.5 ${o.disabled ? 'text-slate-400' : ''}`}>
            <input type="radio" name={c.id} value={o.value} checked={choice === o.value} disabled={o.disabled} onChange={() => setChoice(o.value)} className="mt-0.5" />
            <span>
              {o.label}
              {aiPick?.choice === o.value && <span className="ml-1 rounded bg-indigo-50 px-1 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-200">AI {aiPick.percent}%</span>}
            </span>
          </label>
        ))}
      </fieldset>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        rows={2}
        placeholder="Reason (required, stored in audit)"
        className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
      />
      {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
      <button
        type="button"
        disabled={!choice || !reason.trim() || busy}
        onClick={submit}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-800 disabled:opacity-40"
      >
        <ShieldCheck size={14} /> Resolve as {SUPERVISOR.name}
      </button>
    </div>
  );
}

export default function SupervisorPanel({ central, onResolve, busy, aiStatus }) {
  const open = rankConflicts(central);
  const resolved = central.conflicts.filter(c => c.status === 'RESOLVED');
  return (
    <Card title={`Supervisor review — ${SUPERVISOR.name}`} subtitle={`${open.length} open · ${resolved.length} resolved · ranked by deterministic impact score; these need a human decision`}>
      {open.length === 0 && <p className="text-sm text-slate-500">No open conflicts.</p>}
      <div className="space-y-3">
        {open.map(({ conflict: c, impact }, i) => <ConflictCard key={c.id} c={c} central={central} onResolve={onResolve} busy={busy} impact={impact} rank={i + 1} aiStatus={aiStatus} />)}
      </div>
      {resolved.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <h3 className="text-xs font-semibold text-slate-700">Resolved</h3>
          {resolved.map(c => (
            <div key={c.id} className="rounded-md bg-slate-50 px-2 py-1.5 text-xs">
              <b>{c.id}</b> · {c.ticketId}: {c.resolution.detail}
              <div className="text-slate-500">{actorName(c.resolution.by)} · {formatIST(c.resolution.at)} · “{c.resolution.reason}”</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
