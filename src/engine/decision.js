// SAARTHI.AI deterministic decision support for open conflicts.
// Pure functions only. Shared by the browser (ranking) and the server (AI input
// construction + validation), so both sides derive the same score and strategy list.
// The AI layer may only estimate the suitability of strategies listed here; it can never
// change the impact score, eligibility, or the supervisor's decision.

import { actorName } from '../data/seed.js';
import { isTransitionAllowed, RULES } from './engine.js';

export const IMPACT_WEIGHTS = { customer: 0.30, safety: 0.25, integrity: 0.20, sla: 0.15, rework: 0.10 };

export const IMPACT_LABELS = {
  customer: 'Customer / service impact',
  safety: 'Safety impact',
  integrity: 'Inventory / data integrity',
  sla: 'SLA / urgency',
  rework: 'Rework / financial impact',
};

// Baseline hazard of working on each appliance class (mains voltage, refrigerant, high-voltage magnetron).
const APPLIANCE_HAZARD = {
  Microwave: 70, 'Air conditioner': 50, Refrigerator: 40, Television: 40, 'Washing machine': 30, 'Water purifier': 20,
};
// Extra urgency where a failure spoils food or affects comfort in Navi Mumbai heat/humidity.
const APPLIANCE_URGENCY = { Refrigerator: 20, 'Air conditioner': 10, 'Water purifier': 10 };

// Words in technician notes that signal an open safety/inspection concern.
export const SAFETY_TERMS = ['inspection', 'inspect', 'compressor', 'leak', 'spark', 'shock', 'burn', 'smoke', 'gas', 'earth', 'wiring', 'short circuit', 'overheat'];

const clamp = n => Math.max(0, Math.min(100, n));

function safetyNotes(t) {
  return t.notes.filter(n => SAFETY_TERMS.some(w => n.text.toLowerCase().includes(w)));
}

/**
 * Deterministic operational-impact score (0–100) used to rank conflicts for review.
 * Every component lists the factors that produced it so the manager can audit the number.
 */
export function computeImpact(c, central) {
  const t = central.tickets[c.ticketId];
  const comp = { customer: [], safety: [], integrity: [], sla: [], rework: [] };
  const add = (k, pts, why) => comp[k].push({ pts, why });

  const claimsCompleted = c.type === 'STATUS_CONFLICT' && c.candidates.some(x => x.status === 'Completed');
  const concerns = safetyNotes(t);

  add('safety', APPLIANCE_HAZARD[t.appliance] ?? 30, `${t.appliance} baseline hazard`);
  add('sla', APPLIANCE_URGENCY[t.appliance] ?? 0, `${t.appliance} service urgency`);

  if (c.type === 'STATUS_CONFLICT') {
    add('customer', 60, 'Ticket frozen in supervisor review');
    if (claimsCompleted) add('customer', 20, 'Customer may have been told the job is complete');
    if (claimsCompleted && concerns.length) add('safety', 30, `Completion claimed while a note flags an open concern (${concerns.length})`);
    add('integrity', 50, 'Two incompatible status observations of one job');
    if (central.conflicts.some(x => x.status === 'OPEN' && x.type === 'PARTS_OVERLAP' && x.ticketId === c.ticketId)) {
      add('integrity', 20, 'Parts logs on the same ticket are also disputed');
    }
    add('sla', 70, 'Job cannot progress until decided');
    add('rework', claimsCompleted ? 70 : 40, claimsCompleted ? 'Closing wrongly would force a repeat visit' : 'Wrong status may misroute follow-up work');
  } else if (c.type === 'PARTS_OVERLAP') {
    add('customer', 40, 'Customer may be billed for a part not installed');
    add('integrity', 90, 'Possible double deduction from depot stock');
    add('sla', 30, 'Job can proceed while parts are verified');
    add('rework', 60, 'Spare-part cost at stake');
  } else if (c.type === 'INVENTORY_SHORTAGE') {
    add('customer', 70, 'Repair blocked waiting for the part');
    add('integrity', 70, 'Consumption exceeds recorded stock');
    add('sla', 80, 'Job waits on restock');
    add('rework', 40, 'Additional visit likely after restock');
  }

  const components = {};
  let score = 0;
  for (const k of Object.keys(IMPACT_WEIGHTS)) {
    const value = clamp(comp[k].reduce((s, f) => s + f.pts, 0));
    components[k] = { value, weight: IMPACT_WEIGHTS[k], factors: comp[k].filter(f => f.pts > 0).map(f => f.why) };
    score += value * IMPACT_WEIGHTS[k];
  }
  return { score: Math.round(score), components };
}

/** Open conflicts ordered by deterministic impact (highest first), ties broken by conflict ID. */
export function rankConflicts(central) {
  return central.conflicts
    .filter(c => c.status === 'OPEN')
    .map(c => ({ conflict: c, impact: computeImpact(c, central) }))
    .sort((a, b) => b.impact.score - a.impact.score || a.conflict.id.localeCompare(b.conflict.id));
}

const advisory = [
  {
    strategyId: 'request_evidence', kind: 'request_evidence', engineChoice: null,
    strategy: 'Request additional evidence (inspection result, photos, customer sign-off) before deciding',
  },
  {
    strategyId: 'escalate_supervisor', kind: 'escalate', engineChoice: null,
    strategy: 'Escalate for senior supervisor review',
  },
];

/**
 * Resolution strategies the deterministic backend permits the AI to evaluate for this conflict.
 * `eligible` / `blockedBy` are authoritative: a model can never flip an ineligible strategy to eligible.
 * `engineChoice` maps a strategy to a resolveConflict() choice; null means advisory only.
 */
export function permittedStrategies(c, central) {
  const t = central.tickets[c.ticketId];
  const out = [];

  if (c.type === 'STATUS_CONFLICT') {
    out.push({
      strategyId: 'merge_independent', kind: 'merge', engineChoice: null,
      strategy: 'Merge independent updates and adopt a status automatically',
      blockedBy: [`R5_CONCURRENT_STATUS: ${RULES.R5_CONCURRENT_STATUS}`],
    });
    for (const x of c.candidates) {
      const others = c.candidates.filter(o => o.opId !== x.opId).map(o => `${actorName(o.actor)}'s “${o.status}”`).join(', ');
      const blockedBy = [];
      if (x.status === 'Completed' && !x.signOff) blockedBy.push(`R6_SIGNOFF_REQUIRED: ${RULES.R6_SIGNOFF_REQUIRED}`);
      if (c.statusAtBase && x.status !== c.statusAtBase && !isTransitionAllowed(c.statusAtBase, x.status)) {
        blockedBy.push(`R6_INVALID_TRANSITION: ${c.statusAtBase} → ${x.status} is not allowed.`);
      }
      out.push({
        strategyId: `approve_status:${x.opId}`, kind: 'approve_status', engineChoice: x.opId, evidenceRef: x.opId,
        strategy: `Approve ${actorName(x.actor)}'s status “${x.status}”${others ? `; reject ${others}` : ''}`,
        blockedBy,
      });
    }
  } else if (c.type === 'PARTS_OVERLAP') {
    const part = central.inventory[c.partId];
    out.push({
      strategyId: 'merge_independent', kind: 'merge', engineChoice: 'KEEP_ALL',
      strategy: `Merge independent updates: confirm all ${c.entries.length} ${part.name} logs as separate installs`,
      blockedBy: [],
    });
    for (const opId of c.entries) {
      const e = t.partsLog.find(x => x.kind === 'CONSUME' && x.opId === opId);
      const reversed = t.partsLog.some(x => x.kind === 'REVERSAL' && x.reverses === opId);
      out.push({
        strategyId: `reverse_part:${opId}`, kind: 'reject_update', engineChoice: `REVERSE:${opId}`, evidenceRef: opId,
        strategy: `Reject ${actorName(e?.actor)}'s duplicate log: return ${e?.qty} × ${part.name} to stock`,
        blockedBy: !e ? ['Parts entry not found on ticket.'] : reversed ? ['Entry already reversed.'] : [],
      });
    }
  } else if (c.type === 'INVENTORY_SHORTAGE') {
    const part = central.inventory[c.partId];
    out.push({
      strategyId: 'approve_consumption', kind: 'approve_update', engineChoice: 'APPROVE', evidenceRef: c.opId,
      strategy: `Approve consumption of ${c.qty} × ${part.name}`,
      blockedBy: part.stock < c.qty ? [`R3_STOCK_GUARD: stock is ${part.stock}, need ${c.qty}; stock may never go negative.`] : [],
    });
    out.push({
      strategyId: 'reject_consumption', kind: 'reject_update', engineChoice: 'REJECT', evidenceRef: c.opId,
      strategy: `Reject consumption of ${c.qty} × ${part.name}; stock unchanged`,
      blockedBy: [],
    });
  }

  for (const a of advisory) out.push({ ...a, blockedBy: [] });
  return out.map(s => ({ ...s, eligible: s.blockedBy.length === 0 }));
}

// oxlint-disable-next-line no-control-regex -- strips control characters from technician text
const clip = (s, n = 400) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, n);

/**
 * Evidence the model may cite. Each item has a stable `ref`; responses citing anything else are rejected.
 * Only operations the audit trail recorded for this ticket are included.
 */
export function buildEvidence(c, central) {
  const t = central.tickets[c.ticketId];
  const ev = [];
  const push = (ref, kind, text) => { if (!ev.some(e => e.ref === ref)) ev.push({ ref, kind, text: clip(text) }); };

  push(c.id, 'conflict', `${c.type} detected by ${c.ruleId}: ${c.why}`);
  push(c.ruleId, 'rule', RULES[c.ruleId]);
  push(t.id, 'ticket', `${t.appliance} (${t.model}) in ${t.area}. Reported: ${t.problem} Current status: ${t.status}, v${t.version}. Customer sign-off: ${t.signOff ? 'captured' : 'not captured'}.`);
  for (const n of t.notes) push(n.opId, 'technician_note', `${actorName(n.actor)} (base v${n.baseVersion ?? '—'}): ${n.text}`);
  for (const e of t.partsLog) {
    const name = central.inventory[e.partId]?.name ?? e.partId;
    push(e.opId, e.kind === 'REVERSAL' ? 'parts_reversal' : 'parts_consumption',
      `${actorName(e.actor)} ${e.kind === 'REVERSAL' ? 'returned' : 'consumed'} ${e.qty} × ${name}${e.baseVersion != null ? ` (base v${e.baseVersion})` : ''}`);
  }
  if (c.type === 'STATUS_CONFLICT') {
    for (const x of c.candidates) {
      push(x.opId, 'status_proposal', `${actorName(x.actor)} proposed “${x.status}” from base v${x.baseVersion}; customer sign-off ${x.signOff ? 'captured' : 'not captured'}.`);
    }
  }
  if (c.partId) {
    const p = central.inventory[c.partId];
    push(c.partId, 'inventory', `${p.name}: central stock ${p.stock}, compatible with ${p.appliance}.`);
  }
  if (c.type === 'INVENTORY_SHORTAGE') {
    push(c.opId, 'parts_request', `${actorName(c.actor)} requested ${c.qty} × ${central.inventory[c.partId].name}; stock at detection ${c.stockAtDetection}.`);
  }
  return ev;
}

/** Every op the conflict references must exist in the audit trail for its ticket. */
export function conflictConsistencyErrors(c, central) {
  const errs = [];
  const t = central.tickets?.[c.ticketId];
  if (!t) return [`Ticket ${c.ticketId} not found`];
  const audited = new Set(central.audit.filter(e => e.ticketId === c.ticketId && e.opId).map(e => e.opId));
  const refs = c.type === 'STATUS_CONFLICT' ? c.candidates.map(x => x.opId)
    : c.type === 'PARTS_OVERLAP' ? c.entries
      : c.type === 'INVENTORY_SHORTAGE' ? [c.opId] : null;
  if (!refs) return [`Unsupported conflict type ${c.type}`];
  for (const r of refs) if (!audited.has(r)) errs.push(`Operation ${r} is not in the audit trail for ${c.ticketId}`);
  if (c.partId && !central.inventory[c.partId]) errs.push(`Part ${c.partId} not in inventory`);
  return errs;
}
