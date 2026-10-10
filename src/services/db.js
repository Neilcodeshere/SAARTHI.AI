import { openDB } from 'idb';

const DB_NAME = 'fieldsync_offline_db';
const DB_VERSION = 1;

/**
 * Initializes and returns the IndexedDB instance with all operational stores.
 */
export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // 1. Work Orders store
      if (!db.objectStoreNames.contains('workOrders')) {
        const woStore = db.createObjectStore('workOrders', { keyPath: 'id' });
        woStore.createIndex('byStatus', 'status');
      }

      // 2. Authoritative inventory snapshots
      if (!db.objectStoreNames.contains('inventory')) {
        db.createObjectStore('inventory', { keyPath: 'partId' });
      }

      // 3. Pending Operations Queue (immutable local event store)
      if (!db.objectStoreNames.contains('pendingOperations')) {
        const opStore = db.createObjectStore('pendingOperations', { keyPath: 'operationId' });
        opStore.createIndex('bySyncStatus', 'syncStatus');
        opStore.createIndex('byTicket', 'ticketId');
        opStore.createIndex('byCreatedAt', 'createdAt');
      }

      // 4. Parts consumption events
      if (!db.objectStoreNames.contains('partsConsumption')) {
        const consStore = db.createObjectStore('partsConsumption', { keyPath: 'operationId' });
        consStore.createIndex('byPartId', 'partId');
      }

      // 5. Conflict records
      if (!db.objectStoreNames.contains('conflicts')) {
        const confStore = db.createObjectStore('conflicts', { keyPath: 'conflictId' });
        confStore.createIndex('byStatus', 'status');
      }

      // 6. Audit Trail (append-only ledger)
      if (!db.objectStoreNames.contains('auditEvents')) {
        const auditStore = db.createObjectStore('auditEvents', { keyPath: 'eventId' });
        auditStore.createIndex('byEntity', 'entityId');
        auditStore.createIndex('byCreatedAt', 'createdAt');
      }

      // 7. Synchronization & server simulation metadata
      if (!db.objectStoreNames.contains('syncMetadata')) {
        db.createObjectStore('syncMetadata', { keyPath: 'key' });
      }
    },
  });
}

/**
 * Generates a unique operation or event ID with fallback
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'op-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
}

/**
 * Seeds initial demo state if database is empty.
 * Implements the required demonstration scenario:
 * - Work order WO-101 / WOT00100207
 * - Part SENSOR-S20 with 5 stock units
 * - Two technicians: TECH-001 (Alex Ray) and TECH-006 (Teddy Taylor)
 */
export async function seedInitialDataIfEmpty() {
  const db = await getDB();
  const woCount = await db.count('workOrders');

  if (woCount === 0) {
    const tx = db.transaction(
      ['workOrders', 'inventory', 'syncMetadata', 'auditEvents'],
      'readwrite'
    );

    // Initial Work Orders
    const initialOrders = [
      {
        id: 'WO-101',
        externalId: 'WOT00100207',
        title: 'Camera Malfunction in Vital Operational Zone',
        equipmentId: 'CAM-OPT-99',
        location: 'Port of San Francisco - Pier 39 Security',
        priority: 'Critical',
        status: 'Assigned',
        assignedTechnicians: ['TECH-001', 'TECH-006'], // Both Alex and Teddy
        requiredParts: [{ partId: 'SENSOR-S20', name: 'Optical Thermal Sensor', qty: 4 }],
        consumedParts: [],
        diagnosticNotes: 'Video stream corrupted; IR sensor optic lens unresponsive.',
        inspectionPassed: false,
        signOff: null,
        version: 1,
        sla: '45 minutes',
        updatedAt: '2024-11-28T08:00:00Z',
      },
      {
        id: 'WO-102',
        externalId: 'WOT00100270',
        title: 'Break Fix',
        equipmentId: 'PUMP-204',
        location: 'Financial District - 555 California St',
        priority: 'High',
        status: 'In Progress',
        assignedTechnicians: ['TECH-001'],
        requiredParts: [{ partId: 'VALVE-V10', name: 'High-Pressure Seal Valve', qty: 1 }],
        consumedParts: [],
        diagnosticNotes: 'Hydraulic pump pressure drop detected on sub-floor 3.',
        inspectionPassed: false,
        signOff: null,
        version: 1,
        sla: '2 hours',
        updatedAt: '2024-11-28T08:15:00Z',
      },
      {
        id: 'WO-103',
        externalId: 'WOT00100259',
        title: 'Multi Day - Cell tower installation',
        equipmentId: 'TWR-880',
        location: 'Twin Peaks Radio Site',
        priority: 'Moderate',
        status: 'Open',
        assignedTechnicians: ['TECH-006'],
        requiredParts: [{ partId: 'ANT-5G', name: '5G Beamformer Array', qty: 2 }],
        consumedParts: [],
        diagnosticNotes: 'Phase 1 structural mount completed; wiring pending.',
        inspectionPassed: false,
        signOff: null,
        version: 1,
        sla: '48 hours',
        updatedAt: '2024-11-28T08:30:00Z',
      },
    ];

    for (const wo of initialOrders) {
      await tx.objectStore('workOrders').put(wo);
    }

    // Authoritative Central Inventory Snapshot
    const initialInventory = [
      {
        partId: 'SENSOR-S20',
        name: 'Optical Thermal Sensor',
        authoritativeStock: 5, // Key demonstration scenario: exactly 5 available units
        unitCost: '$240.00',
        version: 1,
        updatedAt: '2024-11-28T08:00:00Z',
      },
      {
        partId: 'VALVE-V10',
        name: 'High-Pressure Seal Valve',
        authoritativeStock: 14,
        unitCost: '$115.00',
        version: 1,
        updatedAt: '2024-11-28T08:00:00Z',
      },
      {
        partId: 'ANT-5G',
        name: '5G Beamformer Array',
        authoritativeStock: 8,
        unitCost: '$890.00',
        version: 1,
        updatedAt: '2024-11-28T08:00:00Z',
      },
    ];

    for (const inv of initialInventory) {
      await tx.objectStore('inventory').put(inv);
    }

    // Sync metadata
    await tx.objectStore('syncMetadata').put({
      key: 'telemetry',
      lastSuccessfulSync: '2024-11-28T08:00:00Z',
      serverVersions: {
        'WO-101': 1,
        'WO-102': 1,
        'WO-103': 1,
        'SENSOR-S20': 1,
      },
    });

    // Seed baseline audit record
    await tx.objectStore('auditEvents').put({
      eventId: 'evt-init-001',
      operationId: 'op-init',
      entityId: 'WO-101',
      actorId: 'SYSTEM',
      action: 'SYSTEM_INITIALIZATION',
      previousValue: null,
      proposedValue: 'Initial Baseline Seed v1',
      result: 'APPLIED',
      ruleId: null,
      reason: 'FieldSync seeded baseline state initialized',
      createdAt: '2024-11-28T08:00:00Z',
    });

    await tx.done;
  }
}

/**
 * Saves an operational update and its corresponding audit event ATOMICALLY
 * in a single IndexedDB transaction.
 */
export async function saveOperationAtomic(operation, auditEvent) {
  const db = await getDB();
  const tx = db.transaction(['pendingOperations', 'auditEvents'], 'readwrite');

  try {
    await tx.objectStore('pendingOperations').put(operation);
    if (auditEvent) {
      await tx.objectStore('auditEvents').put(auditEvent);
    }
    await tx.done;
    return { success: true, operationId: operation.operationId };
  } catch (error) {
    console.error('Failed atomic transaction in saveOperationAtomic:', error);
    throw new Error('Local persistence failed: ' + error.message);
  }
}

/**
 * Retrieves all pending operations in deterministic order (by createdAt).
 */
export async function getPendingOperations() {
  const db = await getDB();
  const ops = await db.getAll('pendingOperations');
  return ops
    .filter(op => op.syncStatus === 'PENDING' || op.syncStatus === 'SYNCING')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Retrieves all work orders from local IndexedDB.
 */
export async function getAllWorkOrders() {
  const db = await getDB();
  return db.getAll('workOrders');
}

/**
 * Updates a work order locally in IndexedDB.
 */
export async function updateLocalWorkOrder(workOrder) {
  const db = await getDB();
  return db.put('workOrders', workOrder);
}

/**
 * Retrieves authoritative inventory snapshots.
 */
export async function getInventoryItems() {
  const db = await getDB();
  return db.getAll('inventory');
}

/**
 * Retrieves all audit events from the append-only ledger.
 */
export async function getAuditEvents() {
  const db = await getDB();
  const events = await db.getAll('auditEvents');
  return events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Retrieves all conflict records.
 */
export async function getConflicts() {
  const db = await getDB();
  return db.getAll('conflicts');
}

/**
 * Saves a conflict record.
 */
export async function saveConflict(conflict) {
  const db = await getDB();
  return db.put('conflicts', conflict);
}

/**
 * Resolves a conflict and appends a supervisor audit event atomically.
 */
export async function resolveConflictAtomic(conflictId, resolutionPayload, auditEvent) {
  const db = await getDB();
  const tx = db.transaction(['conflicts', 'workOrders', 'inventory', 'auditEvents'], 'readwrite');

  try {
    // 1. Update conflict record
    const conflict = await tx.objectStore('conflicts').get(conflictId);
    if (conflict) {
      conflict.status = 'RESOLVED';
      conflict.resolution = resolutionPayload;
      conflict.resolvedAt = new Date().toISOString();
      await tx.objectStore('conflicts').put(conflict);
    }

    // 2. Append supervisor audit event (non-destructive)
    if (auditEvent) {
      await tx.objectStore('auditEvents').put(auditEvent);
    }

    await tx.done;
    return { success: true };
  } catch (err) {
    console.error('Failed atomic conflict resolution:', err);
    throw err;
  }
}

/**
 * Retrieves sync telemetry metadata.
 */
export async function getSyncMetadata() {
  const db = await getDB();
  const meta = await db.get('syncMetadata', 'telemetry');
  return meta || { lastSuccessfulSync: null, serverVersions: {} };
}

/**
 * Updates sync telemetry metadata.
 */
export async function updateSyncMetadata(updates) {
  const db = await getDB();
  const current = (await db.get('syncMetadata', 'telemetry')) || { key: 'telemetry' };
  const updated = { ...current, ...updates, key: 'telemetry' };
  return db.put('syncMetadata', updated);
}

/**
 * Clears and resets demo state with confirmation.
 */
export async function resetAllDemoData() {
  const db = await getDB();
  const tx = db.transaction(
    ['workOrders', 'inventory', 'pendingOperations', 'conflicts', 'auditEvents', 'syncMetadata'],
    'readwrite'
  );

  await tx.objectStore('workOrders').clear();
  await tx.objectStore('inventory').clear();
  await tx.objectStore('pendingOperations').clear();
  await tx.objectStore('conflicts').clear();
  await tx.objectStore('auditEvents').clear();
  await tx.objectStore('syncMetadata').clear();

  await tx.done;

  // Re-seed baseline
  await seedInitialDataIfEmpty();
}
