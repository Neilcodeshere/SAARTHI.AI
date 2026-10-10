/**
 * FieldSync Deterministic Conflict Resolution Engine
 * Standalone pure-logic functions independent of React components and UI.
 * Implements Rules A through F as specified in the software architecture.
 */

/**
 * Validates status transitions and mandatory completion prerequisites (Rule F).
 * @param {Object} currentWorkOrder 
 * @param {string} proposedStatus 
 * @param {Object} operationPayload 
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function validateStatusTransition(currentWorkOrder, proposedStatus, operationPayload = {}) {
  // If attempting to mark as "Completed", verify mandatory inspection and sign-off
  if (proposedStatus === 'Completed') {
    const inspectionPassed = operationPayload.inspectionPassed ?? currentWorkOrder.inspectionPassed;
    const signOff = operationPayload.signOff ?? currentWorkOrder.signOff;

    if (!inspectionPassed) {
      return {
        allowed: false,
        reason: 'Mandatory safety inspection checklist must be completed and passed before marking work order as Completed (Rule F).'
      };
    }

    if (!signOff || !signOff.name) {
      return {
        allowed: false,
        reason: 'Authorized technician sign-off signature is required before completing the work order (Rule F).'
      };
    }
  }

  return { allowed: true };
}

/**
 * Evaluates an operation against current server-simulation state using Rules A-F.
 * 
 * @param {Object} operation - The incoming queued operation
 * @param {Object} serverState - Authoritative simulated server state { workOrders, inventory, processedOps }
 * @returns {Object} Structured decision result
 */
export function evaluateOperation(operation, serverState) {
  const { operationId, ticketId, entityType, operationType, baseVersion, fieldChanges, technicianId, partId, quantity } = operation;

  // RULE E: Duplicate Operation Check (Idempotency)
  if (serverState.processedOperationIds?.has(operationId)) {
    return {
      ruleId: 'RULE_E_DUPLICATE_SUBMISSION',
      decision: 'ALREADY_PROCESSED',
      outcome: 'APPLIED',
      reason: `Operation ID ${operationId} was already applied. Idempotent response returned without duplicate side effects.`,
      needsReview: false,
    };
  }

  // 1. PARTS CONSUMPTION EVALUATION (RULE D: Inventory Shortage)
  if (operationType === 'PARTS_CONSUMPTION' || partId) {
    const inventoryItem = serverState.inventory?.[partId];

    if (!inventoryItem) {
      return {
        ruleId: 'RULE_D_INVENTORY_UNKNOWN_PART',
        decision: 'REJECTED',
        outcome: 'REJECTED',
        reason: `Inventory Part ${partId} does not exist in authoritative system.`,
        needsReview: false,
      };
    }

    const currentStock = inventoryItem.authoritativeStock;
    const previouslyAcceptedConsumption = serverState.acceptedConsumption?.[partId] || 0;
    const remainingStock = currentStock - previouslyAcceptedConsumption;
    const requestedQty = Number(quantity || 0);

    // If requested quantity exceeds remaining available stock -> RULE D Discrepancy
    if (requestedQty > remainingStock) {
      return {
        ruleId: 'RULE_D_INVENTORY_SHORTAGE',
        decision: 'CONFLICT_DETECTED',
        outcome: 'REVIEW_REQUIRED',
        reason: `Reported consumption of ${requestedQty} units for ${partId} exceeds remaining stock of ${remainingStock} (Total Stock: ${currentStock}, Previously Allocated: ${previouslyAcceptedConsumption}). Preserved for supervisor review.`,
        needsReview: true,
        conflictData: {
          conflictId: `CONF-INV-${Date.now()}`,
          entityType: 'inventory',
          entityId: partId,
          ticketId,
          conflictType: 'INVENTORY_SHORTAGE',
          technicianId,
          ruleId: 'RULE_D_INVENTORY_SHORTAGE',
          description: `Discrepancy: ${technicianId} requested ${requestedQty} units of ${partId}, but only ${remainingStock} units remain in stock.`,
          requestedQuantity: requestedQty,
          availableStock: remainingStock,
          authoritativeStock: currentStock,
          status: 'OPEN',
          createdAt: new Date().toISOString(),
        }
      };
    }

    // Safe consumption within stock limits
    return {
      ruleId: 'RULE_D_INVENTORY_SAFE_CONSUMPTION',
      decision: 'SAFE_CONSUMPTION',
      outcome: 'APPLIED',
      reason: `Consumption of ${requestedQty} units of ${partId} validated against stock (${remainingStock} remaining).`,
      needsReview: false,
      appliedQuantity: requestedQty,
    };
  }

  // 2. WORK ORDER FIELD UPDATE EVALUATION (RULES A, B, C, F)
  const currentTicket = serverState.workOrders?.[ticketId];
  if (!currentTicket) {
    return {
      ruleId: 'UNKNOWN_ENTITY',
      decision: 'REJECTED',
      outcome: 'REJECTED',
      reason: `Work Order ${ticketId} not found in central system.`,
      needsReview: false,
    };
  }

  const currentServerVersion = currentTicket.version || 1;
  const isStale = Number(baseVersion) < currentServerVersion;

  // RULE F Check: Status workflow validation
  const statusChange = fieldChanges?.find(c => c.field === 'status');
  if (statusChange) {
    const transitionCheck = validateStatusTransition(currentTicket, statusChange.newValue, operation.payload || {});
    if (!transitionCheck.allowed) {
      return {
        ruleId: 'RULE_F_STATUS_WORKFLOW',
        decision: 'REJECTED',
        outcome: 'REJECTED',
        reason: transitionCheck.reason,
        needsReview: false,
      };
    }
  }

  // If versions match (no concurrent edits on server yet) -> Safe apply
  if (!isStale) {
    return {
      ruleId: 'SAFE_VERSION_UPDATE',
      decision: 'APPLIED',
      outcome: 'APPLIED',
      reason: 'Base version matches current server version with valid business constraints.',
      needsReview: false,
      safeChanges: fieldChanges,
    };
  }

  // RULE C: Stale Version triggers field-level comparison
  // Check for Rule A (Independent field changes) vs Rule B (Same field, different values)
  const serverRecentChanges = serverState.recentChanges?.[ticketId] || [];
  
  let conflictingFields = [];
  let independentFields = [];

  for (const proposedChange of (fieldChanges || [])) {
    const concurrentServerEdit = serverRecentChanges.find(sc => sc.field === proposedChange.field);
    
    if (concurrentServerEdit && concurrentServerEdit.newValue !== proposedChange.newValue) {
      // RULE B: Same field changed to different values
      conflictingFields.push({
        field: proposedChange.field,
        proposedValue: proposedChange.newValue,
        serverValue: concurrentServerEdit.newValue,
        technicianId,
      });
    } else {
      // RULE A: Independent field change
      independentFields.push(proposedChange);
    }
  }

  if (conflictingFields.length > 0) {
    return {
      ruleId: 'RULE_B_SAME_FIELD_DIFFERENT_VALUES',
      decision: 'CONFLICT_DETECTED',
      outcome: 'REVIEW_REQUIRED',
      reason: `Incompatible edits detected on field(s): ${conflictingFields.map(f => f.field).join(', ')}. Automatic resolution unsafe.`,
      needsReview: true,
      conflictingFields,
      independentFields,
      conflictData: {
        conflictId: `CONF-WO-${Date.now()}`,
        entityType: 'workOrder',
        entityId: ticketId,
        conflictType: 'SAME_FIELD_CHANGED',
        technicianId,
        ruleId: 'RULE_B_SAME_FIELD_DIFFERENT_VALUES',
        description: `Conflicting values proposed for ${conflictingFields.map(f => f.field).join(', ')}.`,
        baseVersion,
        currentVersion: currentServerVersion,
        conflictingFields,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      }
    };
  }

  // RULE A: Safe 3-way merge of independent field edits
  return {
    ruleId: 'RULE_A_INDEPENDENT_FIELD_CHANGES',
    decision: 'SAFE_MERGE',
    outcome: 'APPLIED',
    reason: 'Base version was stale, but proposed changes modify independent fields without conflict (Rule A safe merge).',
    needsReview: false,
    safeChanges: independentFields,
  };
}
