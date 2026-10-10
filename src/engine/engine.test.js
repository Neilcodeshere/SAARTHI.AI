import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialCentral, DEMO_SCRIPT } from '../data/seed.js';
import { applyBatch, newDevice, queueOp, syncDevice, resolveConflict, isTransitionAllowed } from './engine.js';

const T = 'NSM-T501';
const NOW = '2026-10-10T06:00:00.000Z';

function scriptedDevice(techId, central) {
  const s = DEMO_SCRIPT[techId];
  let d = newDevice(techId, central);
  d = queueOp(d, { opId: `${techId}-note`, ticketId: T, type: 'ADD_NOTE', payload: { text: s.note }, createdAt: NOW });
  d = queueOp(d, { opId: `${techId}-part`, ticketId: T, type: 'CONSUME_PART', payload: { partId: s.partId, qty: s.qty }, createdAt: NOW });
  d = queueOp(d, { opId: `${techId}-status`, ticketId: T, type: 'SET_STATUS', payload: { status: s.status, signOff: s.signOff }, createdAt: NOW });
  return d;
}

function runScenario(first, second) {
  let central = initialCentral();
  const devices = { 'TECH-A': scriptedDevice('TECH-A', central), 'TECH-B': scriptedDevice('TECH-B', central) };
  for (const id of [first, second]) {
    const r = syncDevice(devices[id], central, NOW);
    central = r.central;
    devices[id] = r.device;
  }
  return { central, devices };
}

test('both technicians queue offline ops against the same base version 12', () => {
  const central = initialCentral();
  const a = scriptedDevice('TECH-A', central);
  const b = scriptedDevice('TECH-B', central);
  assert.equal(a.queue.length, 3);
  assert.equal(b.queue.length, 3);
  assert.ok([...a.queue, ...b.queue].every(op => op.baseVersion === 12));
  assert.equal(central.tickets[T].status, 'In Progress', 'queuing does not touch central');
  assert.equal(central.inventory['AC-CAP-45'].stock, 5);
});

for (const [first, second] of [['TECH-A', 'TECH-B'], ['TECH-B', 'TECH-A']]) {
  test(`scenario outcome is identical regardless of sync order (${first} first)`, () => {
    const { central } = runScenario(first, second);
    const t = central.tickets[T];
    assert.equal(central.inventory['AC-CAP-45'].stock, 3, 'two distinct capacitor ops → 5 to 3');
    assert.equal(t.notes.filter(n => n.actor === 'TECH-A' || n.actor === 'TECH-B').length, 3, 'seed note + both new notes kept');
    assert.ok(t.notes.some(n => n.text === DEMO_SCRIPT['TECH-A'].note));
    assert.ok(t.notes.some(n => n.text === DEMO_SCRIPT['TECH-B'].note));
    assert.equal(t.status, 'Requires Supervisor Review', 'not decided by timestamp');
    const sc = central.conflicts.find(c => c.type === 'STATUS_CONFLICT');
    assert.equal(sc.status, 'OPEN');
    assert.deepEqual(sc.candidates.map(c => c.status).sort(), ['Completed', 'In Progress']);
    assert.ok(central.conflicts.some(c => c.type === 'PARTS_OVERLAP'), 'overlapping capacitor logs flagged');
  });
}

test('retrying a sync (lost acknowledgement) does not duplicate notes or deductions', () => {
  let central = initialCentral();
  let a = { ...scriptedDevice('TECH-A', central), dropAck: true };
  let r = syncDevice(a, central, NOW);
  central = r.central;
  assert.equal(r.device.queue.length, 3, 'ack lost → ops stay queued');
  assert.equal(central.inventory['AC-CAP-45'].stock, 4);
  const notesAfterFirst = central.tickets[T].notes.length;
  const versionAfterFirst = central.tickets[T].version;

  a = { ...r.device, dropAck: false };
  r = syncDevice(a, central, NOW);
  central = r.central;
  assert.ok(r.results.every(x => x.outcome === 'DUPLICATE' && x.ruleId === 'R1_DUPLICATE_OP'));
  assert.equal(central.inventory['AC-CAP-45'].stock, 4);
  assert.equal(central.tickets[T].notes.length, notesAfterFirst);
  assert.equal(central.tickets[T].version, versionAfterFirst);
  assert.equal(r.device.queue.length, 0);
});

test('stock guard: consumption above stock is held, never goes negative', () => {
  let central = initialCentral();
  let b = newDevice('TECH-B', central);
  b = queueOp(b, { opId: 'b-thermo', ticketId: 'NSM-T503', type: 'CONSUME_PART', payload: { partId: 'FR-THERMO', qty: 1 }, createdAt: NOW });
  const r = syncDevice(b, central, NOW);
  assert.equal(r.results[0].ruleId, 'R3_STOCK_GUARD');
  assert.equal(r.results[0].outcome, 'HELD_FOR_REVIEW');
  assert.equal(r.central.inventory['FR-THERMO'].stock, 0);
  assert.equal(r.central.conflicts[0].type, 'INVENTORY_SHORTAGE');
});

test('incompatible part is rejected', () => {
  const central = initialCentral();
  const { results } = applyBatch(central, [{ opId: 'x', seq: 1, actor: 'TECH-A', ticketId: T, type: 'CONSUME_PART', payload: { partId: 'RO-FILTER', qty: 1 }, baseVersion: 12 }], NOW);
  assert.equal(results[0].ruleId, 'R3_PART_INCOMPATIBLE');
});

test('Completed is terminal: a non-concurrent late update cannot reopen it', () => {
  assert.equal(isTransitionAllowed('Completed', 'In Progress'), false);
  const central = initialCentral();
  const t = central.tickets['NSM-T507'];
  const { results, central: next } = applyBatch(central, [{ opId: 'late', seq: 1, actor: 'TECH-A', ticketId: 'NSM-T507', type: 'SET_STATUS', payload: { status: 'In Progress' }, baseVersion: t.version }], NOW);
  assert.equal(results[0].ruleId, 'R6_INVALID_TRANSITION');
  assert.equal(next.tickets['NSM-T507'].status, 'Completed');
});

test('Completed requires customer sign-off', () => {
  const central = initialCentral();
  const { results } = applyBatch(central, [{ opId: 's', seq: 1, actor: 'TECH-A', ticketId: T, type: 'SET_STATUS', payload: { status: 'Completed', signOff: false }, baseVersion: 12 }], NOW);
  assert.equal(results[0].ruleId, 'R6_SIGNOFF_REQUIRED');
});

test('supervisor resolves status conflict; decision is audited and both submissions kept', () => {
  let { central } = runScenario('TECH-A', 'TECH-B');
  const sc = central.conflicts.find(c => c.type === 'STATUS_CONFLICT');
  const priya = sc.candidates.find(c => c.actor === 'TECH-B');
  assert.throws(() => resolveConflict(central, sc.id, priya.opId, 'SUP-1', '', NOW), /reason/);
  central = resolveConflict(central, sc.id, priya.opId, 'SUP-1', 'Compressor inspection outstanding', NOW);
  assert.equal(central.tickets[T].status, 'In Progress');
  assert.equal(central.conflicts.find(c => c.id === sc.id).status, 'RESOLVED');
  assert.ok(central.audit.some(e => e.type === 'SUPERVISOR_DECISION' && e.conflictId === sc.id));
  assert.equal(central.tickets[T].notes.length, 3);
  assert.throws(() => resolveConflict(central, sc.id, priya.opId, 'SUP-1', 'again', NOW), /already resolved/);
});

test('supervisor reversal of an overlapping part log returns stock via a compensating entry', () => {
  let { central } = runScenario('TECH-A', 'TECH-B');
  const po = central.conflicts.find(c => c.type === 'PARTS_OVERLAP');
  central = resolveConflict(central, po.id, `REVERSE:${po.entries[1]}`, 'SUP-1', 'Only one capacitor installed', NOW);
  assert.equal(central.inventory['AC-CAP-45'].stock, 4);
  const log = central.tickets[T].partsLog;
  assert.equal(log.filter(e => e.kind === 'CONSUME').length, 2, 'original logs preserved');
  assert.equal(log.filter(e => e.kind === 'REVERSAL').length, 1);
});

test('status proposals arriving during review are attached to the open review', () => {
  let { central } = runScenario('TECH-A', 'TECH-B');
  const { results, central: next } = applyBatch(central, [{ opId: 'extra', seq: 1, actor: 'TECH-B', ticketId: T, type: 'SET_STATUS', payload: { status: 'Awaiting Parts' }, baseVersion: central.tickets[T].version }], NOW);
  assert.equal(results[0].ruleId, 'R5_HELD_DURING_REVIEW');
  assert.equal(next.conflicts.find(c => c.type === 'STATUS_CONFLICT').candidates.length, 3);
});

test('engine does not mutate its input', () => {
  const central = initialCentral();
  const snapshot = JSON.stringify(central);
  runScenario('TECH-A', 'TECH-B');
  applyBatch(central, scriptedDevice('TECH-A', central).queue, NOW);
  assert.equal(JSON.stringify(central), snapshot);
});

test("a technician's own earlier ops in the same batch do not make later ops stale", () => {
  const central = initialCentral();
  const r = syncDevice(scriptedDevice('TECH-A', central), central, NOW);
  assert.deepEqual(r.results.map(x => x.outcome), ['APPLIED', 'APPLIED', 'APPLIED']);
  assert.equal(r.central.tickets[T].status, 'Completed');
  assert.equal(r.central.tickets[T].version, 15);
});
