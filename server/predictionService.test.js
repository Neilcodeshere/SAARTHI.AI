import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';
import Groq from 'groq-sdk';
import { DEMO_SCRIPT, initialCentral } from '../src/data/seed.js';
import { newDevice, queueOp, resolveConflict, syncDevice } from '../src/engine/engine.js';
import { computeImpact, permittedStrategies, rankConflicts, buildEvidence } from '../src/engine/decision.js';
import { createPredictionService, SYSTEM_PROMPT } from './predictionService.js';
import { createAiMiddleware } from './api.js';

const NOW = '2026-10-10T06:00:00.000Z';
const KEY = 'gsk_test_key_never_leak_0123456789';
const ENV = { GROQ_API_KEY: KEY, GROQ_MODEL: 'openai/gpt-oss-120b' };
const quiet = () => {};

function scenario() {
  let central = initialCentral();
  // Both technicians work offline from the same base version, then sync.
  const devices = ['TECH-A', 'TECH-B'].map(id => {
    const s = DEMO_SCRIPT[id];
    let d = newDevice(id, central);
    d = queueOp(d, { opId: `${id}-note`, ticketId: 'NSM-T501', type: 'ADD_NOTE', payload: { text: s.note }, createdAt: NOW });
    d = queueOp(d, { opId: `${id}-part`, ticketId: 'NSM-T501', type: 'CONSUME_PART', payload: { partId: s.partId, qty: s.qty }, createdAt: NOW });
    return queueOp(d, { opId: `${id}-status`, ticketId: 'NSM-T501', type: 'SET_STATUS', payload: { status: s.status, signOff: s.signOff }, createdAt: NOW });
  });
  for (const d of devices) central = syncDevice(d, central, NOW).central;
  let b = newDevice('TECH-B', central);
  b = queueOp(b, { opId: 'b-thermo', ticketId: 'NSM-T503', type: 'CONSUME_PART', payload: { partId: 'FR-THERMO', qty: 1 }, createdAt: NOW });
  return syncDevice(b, central, NOW).central;
}

const statusConflict = central => central.conflicts.find(c => c.type === 'STATUS_CONFLICT');

/** A well-formed model answer for whatever strategies the backend permits. */
function goodAnswer(central, conflict, overrides = {}) {
  const refs = buildEvidence(conflict, central).map(e => e.ref);
  return {
    conflictId: conflict.id,
    predictions: permittedStrategies(conflict, central).map((s, i) => ({
      strategyId: s.strategyId,
      strategy: 'model wording',
      suitabilityPercent: 90 - i * 10,
      eligible: true, // deliberately claims every strategy is eligible
      reason: `Reason ${i}`,
      evidenceReferences: [refs[0]],
      risks: ['r'],
      missingInformation: [],
      ...(overrides[s.strategyId] || {}),
    })),
  };
}

function fakeClient(answer) {
  const calls = [];
  const chatCreate = async params => {
    calls.push(params);
    const content = typeof answer === 'function' ? answer(params) : answer;
    if (content instanceof Error) throw content;
    return { choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] };
  };
  return { chatCreate, calls };
}

test('deterministic impact score: weighted, reproducible, ranks conflicts', () => {
  const central = scenario();
  const sc = statusConflict(central);
  const a = computeImpact(sc, central);
  assert.deepEqual(a, computeImpact(sc, structuredClone(central)));
  const manual = Object.values(a.components).reduce((s, c) => s + c.value * c.weight, 0);
  assert.equal(a.score, Math.round(manual));
  assert.equal(Object.values(a.components).reduce((s, c) => s + c.weight, 0).toFixed(2), '1.00');
  const ranked = rankConflicts(central);
  assert.equal(ranked.length, 3);
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].impact.score >= ranked[i].impact.score);
});

test('permitted strategies enforce hard rules deterministically', () => {
  const central = scenario();
  const merge = permittedStrategies(statusConflict(central), central).find(s => s.strategyId === 'merge_independent');
  assert.equal(merge.eligible, false, 'disagreeing statuses cannot be auto-merged');
  const shortage = central.conflicts.find(c => c.type === 'INVENTORY_SHORTAGE');
  const approve = permittedStrategies(shortage, central).find(s => s.strategyId === 'approve_consumption');
  assert.equal(approve.eligible, false, 'stock 0 → approving would go negative');
  assert.match(approve.blockedBy[0], /R3_STOCK_GUARD/);
});

test('missing or placeholder API key → not configured, no model call, no crash', async () => {
  const central = scenario();
  for (const env of [{}, { GROQ_API_KEY: 'your_groq_api_key_here' }, { GROQ_API_KEY: 'sk-wrong-provider' }]) {
    const svc = createPredictionService({ env, logger: quiet });
    assert.equal(svc.status().configured, false);
    assert.ok(svc.status().message);
    await assert.rejects(svc.predict(central, statusConflict(central).id), e => e.code === 'NOT_CONFIGURED' && e.httpStatus === 503);
  }
});

test('valid prediction: system prompt, strict schema, hard rules override model eligibility', async () => {
  const central = scenario();
  const sc = statusConflict(central);
  const { chatCreate, calls } = fakeClient(goodAnswer(central, sc));
  const svc = createPredictionService({ env: ENV, chatCreate, logger: quiet });
  const r = await svc.predict(central, sc.id);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].messages[0].role, 'system');
  assert.equal(calls[0].messages[0].content, SYSTEM_PROMPT);
  assert.equal(calls[0].response_format.type, 'json_schema');
  assert.equal(calls[0].response_format.json_schema.strict, true);
  assert.equal(calls[0].model, 'openai/gpt-oss-120b');

  const merge = r.predictions.find(p => p.strategyId === 'merge_independent');
  assert.equal(merge.eligible, false, 'model said eligible; rule R5 wins');
  assert.equal(merge.ruleOverride, true);
  assert.notEqual(merge.strategy, 'model wording', 'labels come from the server');
  assert.equal(r.impactScore, computeImpact(sc, central).score, 'model cannot alter impact score');
  assert.equal(r.conflictVersion, `NSM-T501@v${central.tickets['NSM-T501'].version}`);
  assert.ok(r.label.includes('not a calibrated probability'));
});

test('model call never carries the key in its payload; logs never contain it', async () => {
  const central = scenario();
  const sc = statusConflict(central);
  const lines = [];
  const { chatCreate, calls } = fakeClient(goodAnswer(central, sc));
  const svc = createPredictionService({ env: ENV, chatCreate, logger: l => lines.push(l) });
  const r = await svc.predict(central, sc.id);
  assert.ok(!JSON.stringify(calls).includes(KEY));
  assert.ok(!JSON.stringify(r).includes(KEY));
  assert.ok(!lines.join('\n').includes(KEY));
  assert.ok(!JSON.stringify(svc.log()).includes(KEY));
  assert.ok(!JSON.stringify(svc.status()).includes(KEY));
});

test('malformed model output is rejected, not displayed', async () => {
  const central = scenario();
  const sc = statusConflict(central);
  const ids = permittedStrategies(sc, central).map(s => s.strategyId);
  const good = goodAnswer(central, sc);
  const cases = {
    'not json': '```json\n{}\n```',
    'wrong conflict': { ...good, conflictId: 'CF-999' },
    'unknown strategy': { ...good, predictions: [...good.predictions.slice(1), { ...good.predictions[0], strategyId: 'auto_complete' }] },
    'missing strategy': { ...good, predictions: good.predictions.slice(1) },
    'duplicate strategy': { ...good, predictions: [...good.predictions, good.predictions[0]] },
    'percent > 100': goodAnswer(central, sc, { [ids[0]]: { suitabilityPercent: 140 } }),
    'percent as string': goodAnswer(central, sc, { [ids[0]]: { suitabilityPercent: '80' } }),
    'invented evidence': goodAnswer(central, sc, { [ids[0]]: { evidenceReferences: ['OP-FAKE'] } }),
    'eligible not boolean': goodAnswer(central, sc, { [ids[0]]: { eligible: 'yes' } }),
    'empty reason': goodAnswer(central, sc, { [ids[0]]: { reason: ' ' } }),
    'empty content': '',
  };
  for (const [name, answer] of Object.entries(cases)) {
    const svc = createPredictionService({ env: ENV, chatCreate: fakeClient(answer).chatCreate, logger: quiet });
    await assert.rejects(svc.predict(central, sc.id), e => e.code === 'AI_MALFORMED', name);
  }
});

test('Groq API failures map to safe error codes without leaking upstream messages', async () => {
  const central = scenario();
  const sc = statusConflict(central);
  const leak = (status) => Object.assign(new Error(`upstream said Bearer ${KEY}`), { status });
  const cases = [
    [new Groq.APIConnectionTimeoutError(), 'AI_TIMEOUT'],
    [new Groq.APIConnectionError({ message: 'down' }), 'AI_UNREACHABLE'],
    [leak(401), 'AI_AUTH'],
    [leak(429), 'AI_RATE_LIMIT'],
    [leak(500), 'AI_UPSTREAM'],
  ];
  for (const [err, code] of cases) {
    const svc = createPredictionService({ env: ENV, chatCreate: fakeClient(err).chatCreate, logger: quiet });
    await assert.rejects(svc.predict(central, sc.id), e => e.code === code && !e.message.includes(KEY), code);
  }
});

test('cache: unchanged inputs reuse the result; changed inputs and force re-query', async () => {
  let central = scenario();
  const sc = statusConflict(central);
  const shortage = central.conflicts.find(c => c.type === 'INVENTORY_SHORTAGE');
  const { chatCreate, calls } = fakeClient(params => {
    const input = JSON.parse(params.messages[1].content.split('\n').at(-1));
    const conflict = central.conflicts.find(c => c.id === input.conflictId);
    return goodAnswer(central, conflict);
  });
  const svc = createPredictionService({ env: ENV, chatCreate, logger: quiet });
  await svc.predict(central, sc.id);
  const again = await svc.predict(structuredClone(central), sc.id);
  assert.equal(calls.length, 1);
  assert.equal(again.cached, true);
  await svc.predict(central, sc.id, { force: true });
  assert.equal(calls.length, 2);

  // Restock changes the shortage conflict's input (approve becomes eligible) → new call.
  await svc.predict(central, shortage.id);
  central = structuredClone(central);
  central.inventory['FR-THERMO'].stock = 4;
  await svc.predict(central, shortage.id);
  assert.equal(calls.length, 4);
});

test('conflict ID is validated against the submitted state; tampered conflicts are refused', async () => {
  const central = scenario();
  const sc = statusConflict(central);
  const { chatCreate, calls } = fakeClient(goodAnswer(central, sc));
  const svc = createPredictionService({ env: ENV, chatCreate, logger: quiet });

  await assert.rejects(svc.predict(central, 'CF-999'), e => e.code === 'CONFLICT_NOT_FOUND');
  await assert.rejects(svc.predict(central, '../../etc'), e => e.code === 'INVALID_REQUEST');
  await assert.rejects(svc.predict({ conflicts: [] }, sc.id), e => e.code === 'INVALID_REQUEST');

  const tampered = structuredClone(central);
  statusConflict(tampered).candidates.push({ opId: 'forged-op', actor: 'TECH-A', status: 'Completed', signOff: true, baseVersion: 12 });
  await assert.rejects(svc.predict(tampered, sc.id), e => e.code === 'INCONSISTENT_STATE');

  const resolved = resolveConflict(central, sc.id, sc.candidates[1].opId, 'SUP-1', 'Inspection pending', NOW);
  await assert.rejects(svc.predict(resolved, sc.id), e => e.code === 'CONFLICT_NOT_OPEN');
  assert.equal(calls.length, 0, 'no model call for invalid requests');
});

test('AI predictions never change central state; supervisor decision still works without AI', async () => {
  const central = scenario();
  const sc = statusConflict(central);
  const snapshot = JSON.stringify(central);
  const svc = createPredictionService({ env: ENV, chatCreate: fakeClient(new Groq.APIConnectionTimeoutError()).chatCreate, logger: quiet });
  await assert.rejects(svc.predict(central, sc.id));
  assert.equal(JSON.stringify(central), snapshot);
  const next = resolveConflict(central, sc.id, sc.candidates[1].opId, 'SUP-1', 'Compressor inspection outstanding', NOW);
  assert.equal(next.tickets['NSM-T501'].status, 'In Progress');
});

test('HTTP middleware: status and prediction endpoints, no key in any response', async () => {
  const central = scenario();
  const sc = statusConflict(central);
  const mw = createAiMiddleware({ env: ENV, chatCreate: fakeClient(goodAnswer(central, sc)).chatCreate, logger: quiet });
  const server = http.createServer((req, res) => mw(req, res, () => { res.statusCode = 404; res.end('static'); }));
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const st = await fetch(`${base}/api/ai/status`);
    const stText = await st.text();
    assert.equal(st.status, 200);
    assert.equal(JSON.parse(stText).configured, true);
    assert.ok(!stText.includes(KEY));

    const ok = await fetch(`${base}/api/conflicts/${sc.id}/predictions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ central }) });
    const okText = await ok.text();
    assert.equal(ok.status, 200);
    assert.equal(JSON.parse(okText).predictions.length, permittedStrategies(sc, central).length);
    assert.ok(!okText.includes(KEY));

    const bad = await fetch(`${base}/api/conflicts/CF-404/predictions`, { method: 'POST', body: JSON.stringify({ central }) });
    assert.equal(bad.status, 404);
    const notJson = await fetch(`${base}/api/conflicts/${sc.id}/predictions`, { method: 'POST', body: 'nope' });
    assert.equal(notJson.status, 400);
    const logText = await (await fetch(`${base}/api/ai/log`)).text();
    assert.ok(!logText.includes(KEY));
    assert.ok(JSON.parse(logText).entries.some(e => e.status === 'ok' && e.model && e.conflictVersion && e.at));
    assert.equal((await fetch(`${base}/`)).status, 404, 'non-API routes fall through to Vite');
  } finally {
    server.close();
  }
});
