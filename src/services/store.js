// IndexedDB persistence. One record for the simulated central server and one per
// technician device, so each device's offline queue survives page reloads.
import { openDB } from 'idb';
import { initialCentral } from '../data/seed.js';
import { newDevice } from '../engine/engine.js';

const DB_NAME = 'saarthi_ai';
const STORE = 'state';
export const DEVICE_IDS = ['TECH-A', 'TECH-B'];

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE);
  },
});

export async function loadAll() {
  const db = await dbPromise;
  let central = await db.get(STORE, 'central');
  if (!central) {
    return resetAll();
  }
  const devices = {};
  for (const id of DEVICE_IDS) devices[id] = (await db.get(STORE, id)) || newDevice(id, central);
  return { central, devices };
}

/** Writes central and any changed devices in one transaction (all-or-nothing). */
export async function save({ central, devices }) {
  const db = await dbPromise;
  const tx = db.transaction(STORE, 'readwrite');
  if (central) tx.store.put(central, 'central');
  for (const [id, d] of Object.entries(devices || {})) tx.store.put(d, id);
  await tx.done;
}

export async function resetAll() {
  const central = initialCentral();
  const devices = {};
  for (const id of DEVICE_IDS) devices[id] = newDevice(id, central);
  const db = await dbPromise;
  const tx = db.transaction(STORE, 'readwrite');
  tx.store.clear();
  tx.store.put(central, 'central');
  for (const [id, d] of Object.entries(devices)) tx.store.put(d, id);
  await tx.done;
  return { central, devices };
}
