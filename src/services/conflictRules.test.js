import assert from 'node:assert';
import { test } from 'node:test';
import { evaluateOperation, validateStatusTransition } from './conflictRules.js';

test('Rule E: Duplicate Submission returns ALREADY_PROCESSED and does not duplicate side effects', () => {
  const op = {
    operationId: 'op-100',
    ticketId: 'WO-101',
    entityType: 'workOrder',
    operationType: 'FIELD_UPDATE',
    baseVersion: 1,
    fieldChanges: [{ field: 'status', newValue: 'In Progress' }],
  };

  const serverState = {
    processedOperationIds: new Set(['op-100']),
    workOrders: { 'WO-101': { id: 'WO-101', version: 1, status: 'In Progress' } },
  };

  const result = evaluateOperation(op, serverState);
  assert.strictEqual(result.ruleId, 'RULE_E_DUPLICATE_SUBMISSION');
  assert.strictEqual(result.outcome, 'APPLIED');
  assert.strictEqual(result.needsReview, false);
});

test('Rule D: Inventory Discrepancy flags shortage when cumulative consumption exceeds stock of 5', () => {
  // Scenario: Stock is 5. Tech A already consumed 4. Tech B requests 3.
  const serverState = {
    inventory: {
      'SENSOR-S20': { partId: 'SENSOR-S20', authoritativeStock: 5 },
    },
    acceptedConsumption: {
      'SENSOR-S20': 4, // Tech A's 4 units accepted
    },
    processedOperationIds: new Set(['op-tech-a']),
  };

  const techBOperation = {
    operationId: 'op-tech-b',
    ticketId: 'WO-101',
    entityType: 'inventory',
    operationType: 'PARTS_CONSUMPTION',
    partId: 'SENSOR-S20',
    quantity: 3, // 3 > remaining stock (5 - 4 = 1)
    technicianId: 'TECH-006',
  };

  const result = evaluateOperation(techBOperation, serverState);
  assert.strictEqual(result.ruleId, 'RULE_D_INVENTORY_SHORTAGE');
  assert.strictEqual(result.outcome, 'REVIEW_REQUIRED');
  assert.strictEqual(result.needsReview, true);
  assert.ok(result.conflictData);
  assert.strictEqual(result.conflictData.requestedQuantity, 3);
  assert.strictEqual(result.conflictData.availableStock, 1);
});

test('Rule A: Independent Field Changes merges non-overlapping edits safely', () => {
  const currentWo = {
    id: 'WO-101',
    version: 2,
    status: 'In Progress',
    diagnosticNotes: 'Old notes',
  };

  const serverState = {
    workOrders: { 'WO-101': currentWo },
    recentChanges: {
      'WO-101': [{ field: 'status', oldValue: 'Assigned', newValue: 'In Progress' }],
    },
    processedOperationIds: new Set(['op-status']),
  };

  // Tech updates diagnostic notes (different field from status) with stale baseVersion: 1
  const opNotes = {
    operationId: 'op-notes',
    ticketId: 'WO-101',
    entityType: 'workOrder',
    operationType: 'FIELD_UPDATE',
    baseVersion: 1, // Stale version!
    fieldChanges: [{ field: 'diagnosticNotes', oldValue: 'Old notes', newValue: 'Replaced thermal optics lens' }],
  };

  const result = evaluateOperation(opNotes, serverState);
  assert.strictEqual(result.ruleId, 'RULE_A_INDEPENDENT_FIELD_CHANGES');
  assert.strictEqual(result.outcome, 'APPLIED');
  assert.strictEqual(result.needsReview, false);
});

test('Rule B: Overlapping edits on same field with different values flags conflict', () => {
  const currentWo = {
    id: 'WO-101',
    version: 2,
    status: 'In Progress',
  };

  const serverState = {
    workOrders: { 'WO-101': currentWo },
    recentChanges: {
      'WO-101': [{ field: 'status', oldValue: 'Assigned', newValue: 'In Progress' }],
    },
    processedOperationIds: new Set(['op-status-1']),
  };

  // Tech B proposes status 'Completed' with stale baseVersion: 1
  const opStatusConflict = {
    operationId: 'op-status-2',
    ticketId: 'WO-101',
    entityType: 'workOrder',
    operationType: 'FIELD_UPDATE',
    baseVersion: 1,
    fieldChanges: [{ field: 'status', oldValue: 'Assigned', newValue: 'Completed' }],
    payload: { inspectionPassed: true, signOff: { name: 'Tech B' } },
  };

  const result = evaluateOperation(opStatusConflict, serverState);
  assert.strictEqual(result.ruleId, 'RULE_B_SAME_FIELD_DIFFERENT_VALUES');
  assert.strictEqual(result.outcome, 'REVIEW_REQUIRED');
  assert.strictEqual(result.needsReview, true);
  assert.ok(result.conflictingFields.length > 0);
});

test('Rule F: Work order completion is rejected if mandatory inspection checks are missing', () => {
  const currentWo = {
    id: 'WO-101',
    inspectionPassed: false,
    signOff: null,
  };

  const check = validateStatusTransition(currentWo, 'Completed', {
    inspectionPassed: false,
    signOff: null,
  });

  assert.strictEqual(check.allowed, false);
  assert.ok(check.reason.includes('Mandatory safety inspection checklist'));
});
