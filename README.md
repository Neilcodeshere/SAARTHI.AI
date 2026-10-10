# SAARTHI.AI

**Intelligent Field Operations & Conflict Resolution**: IPL Hackathon, Problem Statement 5 (Field Operations Conflict Resolver).

A single-screen, offline-first field-service demo for a home-appliance repair operation in Navi Mumbai (ACs, washing machines, refrigerators, TVs, microwaves, water purifiers). Two technicians update the same ticket while offline. When they reconnect, a deterministic engine reconciles their updates without losing data, and anything it cannot decide safely goes to a supervisor.

> All customers, technicians (Aarav Sharma, Priya Patil, Rahul Deshmukh), tickets and stock are **fictional demo data**. The "central server" is simulated inside the browser. Map markers are locality-level demo locations, not live GPS.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine tests (node:test)
npm run lint
npm run build
```

No API keys, backend or paid services are needed. The ticket and sync workflow runs fully offline. Only the OpenStreetMap tiles need internet.

## How it maps to the five deliverables

| Deliverable | Where |
|---|---|
| 1. Offline persistence and queue | `src/services/store.js` (IndexedDB via `idb`): each technician device and the central state are separate records, so queues survive reloads. |
| 2. Reconciliation on reconnect | `syncDevice` / `applyBatch` in `src/engine/engine.js`. Reconnecting a device pushes its queue. "Simulate lost server acknowledgement" proves idempotent retries. |
| 3. Detect stale edits, overlaps, parts conflicts | Version-based concurrency per ticket. Rules `R4_PARTS_OVERLAP`, `R5_CONCURRENT_STATUS`, `R3_STOCK_GUARD`, `R6_INVALID_TRANSITION`. |
| 4. Deterministic resolution | `RULES` in `engine.js`. Pure functions, no timestamps used to pick winners. The sync order does not change the outcome (tested). |
| 5. Audit and supervisor review | Append-only `central.audit`. `resolveConflict` requires an explicit choice and a reason. Reversals are compensating entries, never edits. |

### Rules

- **R1** Duplicate operation ID → acknowledged, no side effects.
- **R2** Diagnostic notes are append-only; stale notes are merged, never overwritten.
- **R3** Parts must exist and match the appliance; stock never goes negative (a shortage is held for review).
- **R4** Same part logged by two technicians who didn't see each other's log → both deducted, flagged for verification.
- **R5** Different status proposals from the same base version → ticket moves to *Requires Supervisor Review*; neither wins by timestamp.
- **R6** Explicit workflow: `Assigned → In Progress → Awaiting Parts ⇄ In Progress → Completed`. Completed is terminal and needs customer sign-off.

## Project layout

```
src/data/seed.js            demo dataset, status model, parts, Navi Mumbai coordinates
src/engine/engine.js        deterministic engine (pure, UI-independent)
src/engine/engine.test.js   scenario + edge-case tests
src/services/store.js       IndexedDB persistence
src/components/*            dashboard panels (map, technicians, supervisor, audit)
src/App.jsx                 single-page dashboard
```

Map: Leaflet + react-leaflet with OpenStreetMap standard tiles (attribution shown). Respect the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/); tiles are not cached for offline use.
