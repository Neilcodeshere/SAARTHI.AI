// SAARTHI.AI deterministic sync & conflict-resolution engine.
// Pure functions only: no React, no IndexedDB, no clock, no randomness.
// The same central state + the same operations always yield the same result.
// Timestamps are recorded for the audit trail but never used to pick a winner.

import { ALLOWED_TRANSITIONS, actorName } from '../data/seed.js';

export const RULES = {
  R0_INVALID_OP: 'Operation references an unknown ticket or is malformed.',
  R1_DUPLICATE_OP: 'Operation ID already processed — acknowledged again with no side effects (idempotent retry).',
  R2_NOTE_APPEND: 'Diagnostic notes are append-only: every technician note is kept, even when submitted against a stale version.',
  R3_PART_UNKNOWN: 'Part does not exist in central inventory.',
  R3_PART_INCOMPATIBLE: 'Part is not compatible with this appliance type.',
  R3_STOCK_GUARD: 'Requested quantity exceeds central stock — nothing deducted, held for supervisor (stock never goes negative).',
  R3_PART_CONSUMED: 'Distinct consumption operation validated against central stock and deducted exactly once.',
  R4_PARTS_OVERLAP: 'Two technicians logged the same part on the same ticket without seeing each other\'s log — both deductions kept, flagged for supervisor verification.',
  R5_CONCURRENT_STATUS: 'Two technicians proposed different statuses from the same base version — neither wins by timestamp; ticket held for supervisor review.',
  R5_HELD_DURING_REVIEW: 'Ticket is under supervisor review — status proposal attached to the open review instead of being applied.',
  R5_STATUS_AGREE: 'Concurrent status proposals agree — merged without conflict.',
  R6_INVALID_TRANSITION: 'Status transition is not allowed by the service workflow (e.g. a Completed job cannot be re-opened by a late offline update).',
  R6_SIGNOFF_REQUIRED: 'A job can be marked Completed only with customer sign-off captured.',
  R6_STATUS_APPLIED: 'Valid status transition from the current central status — applied.',
  S1_SUPERVISOR_DECISION: 'Explicit supervisor decision recorded with reason.',
};

export function isTransitionAllowed(from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

// Stale = another actor changed the ticket after this op's base version.
// A technician's own earlier ops in the same batch do not make later ones stale.
function changedByOthersSince(t, op) {
  return [...t.notes, ...t.partsLog, ...t.statusLog].some(e => e.actor !== op.actor && (e.appliedVersion ?? 0) > op.baseVersion);
}

function opSummary(op) {
  if (op.type === 'ADD_NOTE') return `note “${op.payload.text}”`;
  if (op.type === 'CONSUME_PART') return `consume ${op.payload.qty} × ${op.payload.partId}`;
  if (op.type === 'SET_STATUS') return `status → ${op.payload.status}${op.payload.signOff ? ' (customer sign-off)' : ''}`;
  return op.type;
}

/**
 * Applies a batch of queued operations (from one device) to the central state.
 * @returns {{ central: object, results: Array }} new central state (input is not mutated)
 */
export function applyBatch(centralIn, ops, now) {
  const central = structuredClone(centralIn);
  const processed = new Set(central.appliedOpIds);
  const results = [];

  const ordered = [...ops].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || a.opId.localeCompare(b.opId));

  for (const op of ordered) {
    const audit = (ruleId, outcome, detail, extra = {}) => {
      central.audit.push({
        id: `evt-${central.audit.length + 1}`,
        at: now, actor: op.actor, type: op.type, ticketId: op.ticketId, opId: op.opId,
        ruleId, outcome, detail, ...extra,
      });
    };
    const result = (ruleId, outcome, reason, extra = {}) => {
      const r = { opId: op.opId, actor: op.actor, ticketId: op.ticketId, type: op.type, summary: opSummary(op), baseVersion: op.baseVersion, ruleId, outcome, reason, ...extra };
      results.push(r);
      audit(ruleId, outcome, `${opSummary(op)} — ${reason}`, extra.conflictId ? { conflictId: extra.conflictId } : {});
      return r;
    };

    if (processed.has(op.opId)) {
      results.push({ opId: op.opId, actor: op.actor, ticketId: op.ticketId, type: op.type, summary: opSummary(op), baseVersion: op.baseVersion, ruleId: 'R1_DUPLICATE_OP', outcome: 'DUPLICATE', reason: RULES.R1_DUPLICATE_OP });
      audit('R1_DUPLICATE_OP', 'DUPLICATE', `${opSummary(op)} — retry ignored, no state change.`);
      continue;
    }

    const t = central.tickets[op.ticketId];
    if (!t || !op.payload) {
      result('R0_INVALID_OP', 'REJECTED', RULES.R0_INVALID_OP);
      processed.add(op.opId);
      continue;
    }
    if (op.type === 'ADD_NOTE') {
      const stale = changedByOthersSince(t, op);
      t.version += 1;
      t.notes.push({ opId: op.opId, actor: op.actor, text: op.payload.text, at: op.createdAt, baseVersion: op.baseVersion, appliedVersion: t.version });
      t.updatedAt = now;
      result('R2_NOTE_APPEND', stale ? 'MERGED' : 'APPLIED',
        stale ? `Submitted on v${op.baseVersion}; others had changed it since (central v${t.version - 1}). ${RULES.R2_NOTE_APPEND}` : RULES.R2_NOTE_APPEND);
    } else if (op.type === 'CONSUME_PART') {
      applyPart(central, t, op, result, now);
    } else if (op.type === 'SET_STATUS') {
      applyStatus(central, t, op, result, now);
    } else {
      result('R0_INVALID_OP', 'REJECTED', `Unknown operation type ${op.type}.`);
    }
    processed.add(op.opId);
  }

  central.appliedOpIds = [...processed];
  return { central, results };
}

function applyPart(central, t, op, result, now) {
  const { partId } = op.payload;
  const qty = Number(op.payload.qty);
  const part = central.inventory[partId];
  if (!part) return result('R3_PART_UNKNOWN', 'REJECTED', `${RULES.R3_PART_UNKNOWN} (${partId})`);
  if (part.appliance !== t.appliance) return result('R3_PART_INCOMPATIBLE', 'REJECTED', `${part.name} is for ${part.appliance}, ticket is ${t.appliance}.`);
  if (!Number.isInteger(qty) || qty <= 0) return result('R0_INVALID_OP', 'REJECTED', 'Quantity must be a positive whole number.');

  if (qty > part.stock) {
    const conflictId = openConflict(central, {
      type: 'INVENTORY_SHORTAGE', ticketId: t.id, ruleId: 'R3_STOCK_GUARD',
      why: `${actorName(op.actor)} logged ${qty} × ${part.name} but central stock is ${part.stock}.`,
      partId, qty, opId: op.opId, actor: op.actor, stockAtDetection: part.stock,
    });
    return result('R3_STOCK_GUARD', 'HELD_FOR_REVIEW', `Stock ${part.stock}, requested ${qty}. ${RULES.R3_STOCK_GUARD}`, { conflictId });
  }

  // Detect overlapping logs before recording this one (concurrent = applied after this op's base version).
  const overlap = t.partsLog.find(e => e.kind === 'CONSUME' && e.partId === partId && e.actor !== op.actor && e.appliedVersion > op.baseVersion);

  const before = part.stock;
  part.stock -= qty;
  t.version += 1;
  t.partsLog.push({ kind: 'CONSUME', opId: op.opId, actor: op.actor, partId, qty, baseVersion: op.baseVersion, appliedVersion: t.version, at: op.createdAt });
  t.updatedAt = now;

  if (overlap) {
    const conflictId = openConflict(central, {
      type: 'PARTS_OVERLAP', ticketId: t.id, ruleId: 'R4_PARTS_OVERLAP',
      why: `${actorName(overlap.actor)} and ${actorName(op.actor)} each logged ${part.name} for ${t.id} from base v${Math.min(overlap.baseVersion, op.baseVersion)}; neither saw the other's log.`,
      partId, entries: [overlap.opId, op.opId], stockAfter: part.stock,
    });
    return result('R4_PARTS_OVERLAP', 'FLAGGED', `Deducted ${qty} (stock ${before} → ${part.stock}). ${RULES.R4_PARTS_OVERLAP}`, { conflictId });
  }
  return result('R3_PART_CONSUMED', 'APPLIED', `Stock ${before} → ${part.stock}. ${RULES.R3_PART_CONSUMED}`);
}

function applyStatus(central, t, op, result, now) {
  const { status, signOff } = op.payload;
  const proposal = { opId: op.opId, actor: op.actor, status, signOff: !!signOff, baseVersion: op.baseVersion };
  const wasStale = changedByOthersSince(t, op);

  const openReview = central.conflicts.find(c => c.status === 'OPEN' && c.type === 'STATUS_CONFLICT' && c.ticketId === t.id);
  if (openReview) {
    openReview.candidates.push(proposal);
    return result('R5_HELD_DURING_REVIEW', 'HELD_FOR_REVIEW', `${RULES.R5_HELD_DURING_REVIEW} (${openReview.id})`, { conflictId: openReview.id });
  }

  const concurrent = t.statusLog.filter(e => e.actor !== op.actor && e.appliedVersion > op.baseVersion && e.kind === 'PROPOSAL');
  const disagreeing = concurrent.filter(e => e.status !== status);

  if (disagreeing.length > 0) {
    const rival = disagreeing[disagreeing.length - 1];
    const conflictId = openConflict(central, {
      type: 'STATUS_CONFLICT', ticketId: t.id, ruleId: 'R5_CONCURRENT_STATUS',
      why: `${actorName(rival.actor)} proposed “${rival.status}” and ${actorName(op.actor)} proposed “${status}”, both from base v${Math.min(rival.baseVersion, op.baseVersion)}. The two observations of the same job are incompatible.`,
      statusAtBase: rival.prevStatus, statusBeforeReview: t.status,
      candidates: [
        { opId: rival.opId, actor: rival.actor, status: rival.status, signOff: rival.signOff, baseVersion: rival.baseVersion },
        proposal,
      ],
    });
    t.statusLog.push({ kind: 'SYSTEM_HOLD', opId: op.opId, actor: 'SYSTEM', status: 'Requires Supervisor Review', prevStatus: t.status, appliedVersion: t.version + 1 });
    t.status = 'Requires Supervisor Review';
    t.version += 1;
    return result('R5_CONCURRENT_STATUS', 'HELD_FOR_REVIEW', RULES.R5_CONCURRENT_STATUS, { conflictId });
  }

  if (concurrent.length > 0 && concurrent.every(e => e.status === status) && t.status === status) {
    t.statusLog.push({ kind: 'PROPOSAL', ...proposal, prevStatus: t.status, appliedVersion: t.version });
    return result('R5_STATUS_AGREE', 'MERGED', RULES.R5_STATUS_AGREE);
  }

  if (!isTransitionAllowed(t.status, status)) {
    return result('R6_INVALID_TRANSITION', 'REJECTED', `${t.status} → ${status} is not allowed. ${RULES.R6_INVALID_TRANSITION}`);
  }
  if (status === 'Completed' && !signOff) {
    return result('R6_SIGNOFF_REQUIRED', 'REJECTED', RULES.R6_SIGNOFF_REQUIRED);
  }

  const prev = t.status;
  t.version += 1;
  t.status = status;
  if (status === 'Completed') t.signOff = true;
  t.statusLog.push({ kind: 'PROPOSAL', ...proposal, prevStatus: prev, appliedVersion: t.version });
  t.updatedAt = now;
  return result('R6_STATUS_APPLIED', wasStale ? 'MERGED' : 'APPLIED', `${prev} → ${status}. ${RULES.R6_STATUS_APPLIED}`);
}

function openConflict(central, data) {
  const id = `CF-${String(central.conflicts.length + 1).padStart(3, '0')}`;
  central.conflicts.push({ id, status: 'OPEN', ...data });
  return id;
}

/**
 * Applies an explicit supervisor decision to an open conflict.
 * choice: STATUS_CONFLICT → candidate opId; PARTS_OVERLAP → 'KEEP_ALL' | 'REVERSE:<opId>';
 *         INVENTORY_SHORTAGE → 'APPROVE' | 'REJECT'
 */
export function resolveConflict(centralIn, conflictId, choice, supervisor, reason, now) {
  const central = structuredClone(centralIn);
  const c = central.conflicts.find(x => x.id === conflictId);
  if (!c) throw new Error(`Conflict ${conflictId} not found`);
  if (c.status !== 'OPEN') throw new Error(`Conflict ${conflictId} is already resolved`);
  if (!reason || !reason.trim()) throw new Error('Supervisor reason is required');

  const t = central.tickets[c.ticketId];
  let detail;

  if (c.type === 'STATUS_CONFLICT') {
    const chosen = c.candidates.find(x => x.opId === choice);
    if (!chosen) throw new Error('Choose one of the submitted statuses');
    if (chosen.status === 'Completed' && !chosen.signOff) throw new Error('Completed requires customer sign-off on the chosen submission');
    t.version += 1;
    t.statusLog.push({ kind: 'SUPERVISOR', opId: `${c.id}-decision`, actor: supervisor, status: chosen.status, prevStatus: t.status, appliedVersion: t.version });
    t.status = chosen.status;
    if (chosen.status === 'Completed') t.signOff = true;
    const others = c.candidates.filter(x => x.opId !== choice).map(x => `${actorName(x.actor)}: ${x.status}`).join(', ');
    detail = `Final status “${chosen.status}” (submitted by ${actorName(chosen.actor)}). Not adopted: ${others}. Both submissions remain in history.`;
  } else if (c.type === 'PARTS_OVERLAP') {
    const part = central.inventory[c.partId];
    if (choice === 'KEEP_ALL') {
      detail = `Confirmed all ${c.entries.length} ${part.name} logs as physically installed. Stock stays ${part.stock}.`;
    } else if (choice?.startsWith('REVERSE:')) {
      const target = choice.slice(8);
      const entry = t.partsLog.find(e => e.kind === 'CONSUME' && e.opId === target);
      if (!entry || !c.entries.includes(target)) throw new Error('Unknown parts entry');
      const before = part.stock;
      part.stock += entry.qty;
      t.version += 1;
      // Compensating entry — the original log is never edited or deleted.
      t.partsLog.push({ kind: 'REVERSAL', opId: `${c.id}-reversal`, reverses: target, actor: supervisor, partId: c.partId, qty: entry.qty, appliedVersion: t.version, at: now });
      detail = `Reversed ${actorName(entry.actor)}'s log of ${entry.qty} × ${part.name}: returned to stock (${before} → ${part.stock}).`;
    } else throw new Error('Invalid choice');
  } else if (c.type === 'INVENTORY_SHORTAGE') {
    const part = central.inventory[c.partId];
    if (choice === 'APPROVE') {
      if (part.stock < c.qty) throw new Error(`Cannot approve: stock is ${part.stock}, need ${c.qty}`);
      part.stock -= c.qty;
      t.version += 1;
      t.partsLog.push({ kind: 'CONSUME', opId: c.opId, actor: c.actor, partId: c.partId, qty: c.qty, appliedVersion: t.version, at: now, approvedBy: supervisor });
      detail = `Approved ${c.qty} × ${part.name} after restock (stock now ${part.stock}).`;
    } else if (choice === 'REJECT') {
      detail = `Rejected consumption of ${c.qty} × ${part.name}; stock unchanged at ${part.stock}.`;
    } else throw new Error('Invalid choice');
  }

  c.status = 'RESOLVED';
  c.resolution = { choice, by: supervisor, reason: reason.trim(), at: now, detail };
  t.updatedAt = now;
  central.audit.push({
    id: `evt-${central.audit.length + 1}`, at: now, actor: supervisor, type: 'SUPERVISOR_DECISION',
    ticketId: c.ticketId, opId: null, conflictId: c.id, ruleId: 'S1_SUPERVISOR_DECISION', outcome: 'RESOLVED',
    detail: `${c.id}: ${detail} Reason: ${reason.trim()}`,
  });
  return central;
}

// ---------- Technician device (offline client) ----------

export function newDevice(techId, central) {
  return pull({ techId, online: false, seq: 0, queue: [], acked: [], lastSync: null, dropAck: false }, central);
}

/** Refresh the device's local snapshot of its assigned tickets from central. */
export function pull(device, central) {
  const snapshot = {};
  for (const t of Object.values(central.tickets)) {
    if (t.assigned.includes(device.techId)) snapshot[t.id] = structuredClone(t);
  }
  const stock = {};
  for (const p of Object.values(central.inventory)) stock[p.partId] = p.stock;
  return { ...device, snapshot, stock };
}

/** Record an operation locally. baseVersion = the version this device last saw. */
export function queueOp(device, { opId, ticketId, type, payload, createdAt }) {
  const base = device.snapshot[ticketId];
  if (!base) throw new Error(`${ticketId} is not on this device`);
  const op = { opId, seq: device.seq + 1, actor: device.techId, ticketId, type, payload, baseVersion: base.version, createdAt };
  return { ...device, seq: device.seq + 1, queue: [...device.queue, op] };
}

/**
 * Push the device queue to central. With dropAck the server applies the batch but the
 * acknowledgement is "lost", so the ops stay queued and the next sync re-sends them.
 */
export function syncDevice(device, central, now) {
  if (device.queue.length === 0) return { device: pull({ ...device, lastSync: now }, central), central, results: [] };
  const { central: next, results } = applyBatch(central, device.queue, now);
  next.lastSyncResults = [{ techId: device.techId, at: now, ackLost: device.dropAck, results }, ...(central.lastSyncResults || [])].slice(0, 6);
  if (device.dropAck) {
    return { device: { ...device, lastSync: now }, central: next, results };
  }
  const acked = [...device.acked, ...device.queue.map(op => ({ ...op, result: results.find(r => r.opId === op.opId) }))];
  return { device: pull({ ...device, queue: [], acked, lastSync: now }, next), central: next, results };
}
