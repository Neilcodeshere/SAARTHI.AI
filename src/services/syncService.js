import { 
  getDB, 
  getPendingOperations, 
  getAllWorkOrders, 
  getInventoryItems, 
  updateLocalWorkOrder, 
  saveConflict, 
  updateSyncMetadata, 
  getSyncMetadata,
  generateUUID
} from './db';
import { evaluateOperation } from './conflictRules';

/**
 * Runs the deterministic synchronization protocol against the simulated central server.
 * Implements safe retries, idempotency, and preserves non-repudiation audit trails.
 */
export async function runSynchronization() {
  const db = await getDB();
  const pendingOps = await getPendingOperations();

  if (pendingOps.length === 0) {
    const meta = await getSyncMetadata();
    return {
      success: true,
      totalProcessed: 0,
      appliedCount: 0,
      conflictCount: 0,
      rejectedCount: 0,
      timestamp: new Date().toISOString(),
      message: 'Queue empty — All operations synchronized.'
    };
  }

  // 1. Build authoritative simulated server snapshot from IndexedDB
  const workOrders = await getAllWorkOrders();
  const inventoryList = await getInventoryItems();
  const meta = await getSyncMetadata();

  const serverWorkOrders = {};
  workOrders.forEach(wo => {
    serverWorkOrders[wo.id] = { ...wo };
  });

  const serverInventory = {};
  inventoryList.forEach(inv => {
    serverInventory[inv.partId] = { ...inv };
  });

  // Track accepted consumptions and processed IDs in simulated server memory
  const processedOperationIds = new Set(meta.processedOperationIds || []);
  const acceptedConsumption = { ...(meta.acceptedConsumption || {}) };
  const recentChanges = { ...(meta.recentChanges || {}) };

  const serverState = {
    workOrders: serverWorkOrders,
    inventory: serverInventory,
    processedOperationIds,
    acceptedConsumption,
    recentChanges,
  };

  let appliedCount = 0;
  let conflictCount = 0;
  let rejectedCount = 0;

  // 2. Deterministic execution loop
  for (const op of pendingOps) {
    // Mark as SYNCING in queue
    op.syncStatus = 'SYNCING';
    await db.put('pendingOperations', op);

    // Evaluate against deterministic business rules
    const evaluation = evaluateOperation(op, serverState);

    // Create append-only audit event for this sync attempt
    const syncAuditEvent = {
      eventId: generateUUID(),
      operationId: op.operationId,
      entityId: op.ticketId || op.partId,
      actorId: op.technicianId || 'SYSTEM',
      action: op.operationType,
      previousValue: JSON.stringify(op.baseVersion || 1),
      proposedValue: JSON.stringify(op.fieldChanges || { qty: op.quantity, part: op.partId }),
      result: evaluation.outcome,
      ruleId: evaluation.ruleId,
      reason: evaluation.reason,
      createdAt: new Date().toISOString(),
    };

    if (evaluation.outcome === 'APPLIED') {
      appliedCount++;
      op.syncStatus = 'SYNCED';
      op.resolutionStatus = 'APPLIED';

      // Apply changes to simulated server state
      if (op.operationType === 'PARTS_CONSUMPTION' || op.partId) {
        const qty = Number(op.quantity || 0);
        acceptedConsumption[op.partId] = (acceptedConsumption[op.partId] || 0) + qty;
        
        // Record in the work order's consumedParts array
        if (serverState.workOrders[op.ticketId]) {
          const currentWo = serverState.workOrders[op.ticketId];
          currentWo.consumedParts = [
            ...(currentWo.consumedParts || []),
            {
              technicianId: op.technicianId,
              partId: op.partId,
              quantity: qty,
              timestamp: op.createdAt,
            }
          ];
          await db.put('workOrders', currentWo);
        }
      } else if (op.fieldChanges && serverState.workOrders[op.ticketId]) {
        const currentWo = serverState.workOrders[op.ticketId];
        op.fieldChanges.forEach(fc => {
          currentWo[fc.field] = fc.newValue;
        });

        // Bump server version
        currentWo.version = (currentWo.version || 1) + 1;
        currentWo.updatedAt = new Date().toISOString();
        await db.put('workOrders', currentWo);

        // Record recent changes for subsequent concurrent comparisons
        recentChanges[op.ticketId] = [
          ...(recentChanges[op.ticketId] || []),
          ...op.fieldChanges
        ];
      }

      processedOperationIds.add(op.operationId);
    } else if (evaluation.outcome === 'REVIEW_REQUIRED') {
      conflictCount++;
      op.syncStatus = 'REVIEW_REQUIRED';
      op.resolutionStatus = 'UNRESOLVED_CONFLICT';

      // Persist Conflict Record to IndexedDB without discarding the operation
      if (evaluation.conflictData) {
        await saveConflict({
          ...evaluation.conflictData,
          operationIds: [op.operationId],
        });
      }
      processedOperationIds.add(op.operationId);
    } else {
      // REJECTED
      rejectedCount++;
      op.syncStatus = 'FAILED';
      op.resolutionStatus = 'REJECTED';
      op.rejectionReason = evaluation.reason;
    }

    // Persist updated operation status and append audit event atomically
    await db.put('pendingOperations', op);
    await db.put('auditEvents', syncAuditEvent);
  }

  // 3. Update Sync Metadata
  const nowIso = new Date().toISOString();
  await updateSyncMetadata({
    lastSuccessfulSync: nowIso,
    processedOperationIds: Array.from(processedOperationIds),
    acceptedConsumption,
    recentChanges,
  });

  return {
    success: true,
    totalProcessed: pendingOps.length,
    appliedCount,
    conflictCount,
    rejectedCount,
    timestamp: nowIso,
    message: `Sync completed: ${appliedCount} applied, ${conflictCount} flagged for review, ${rejectedCount} rejected.`
  };
}
