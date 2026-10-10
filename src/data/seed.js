// SAARTHI.AI demo dataset — Navi Mumbai home-appliance service operation.
// Every customer, technician and address below is FICTIONAL demo data.
// Locality anchor coordinates were checked against OpenStreetMap Nominatim
// (railway-station anchors); markers sit within a few hundred metres of them.

export const TECHNICIANS = {
  'TECH-A': { id: 'TECH-A', name: 'Aarav Sharma', label: 'Technician A', zone: 'Nerul · Vashi · Sanpada' },
  'TECH-B': { id: 'TECH-B', name: 'Priya Patil', label: 'Technician B', zone: 'CBD Belapur · Kharghar · Airoli' },
};

export const SUPERVISOR = { id: 'SUP-1', name: 'Rahul Deshmukh', label: 'Service Supervisor' };

export function actorName(id) {
  if (id === SUPERVISOR.id) return SUPERVISOR.name;
  if (id === 'SYSTEM') return 'SAARTHI.AI engine';
  return TECHNICIANS[id]?.name || id;
}

export const SERVICE_AREAS = {
  Nerul: { lat: 19.0356, lng: 73.0205 },
  Vashi: { lat: 19.0690, lng: 73.0000 },
  'CBD Belapur': { lat: 19.0170, lng: 73.0420 },
  Sanpada: { lat: 19.0640, lng: 73.0120 },
  Kharghar: { lat: 19.0300, lng: 73.0640 },
  Airoli: { lat: 19.1560, lng: 72.9990 },
  Ghansoli: { lat: 19.1180, lng: 73.0050 },
  Turbhe: { lat: 19.0775, lng: 73.0190 },
  Koparkhairane: { lat: 19.1030, lng: 73.0080 },
  Juinagar: { lat: 19.0540, lng: 73.0200 },
};

export const DEPOT = { name: 'SAARTHI.AI parts depot (demo)', area: 'Turbhe', ...SERVICE_AREAS.Turbhe };

export const APPLIANCES = ['Air conditioner', 'Washing machine', 'Refrigerator', 'Television', 'Microwave', 'Water purifier'];

// Explicit status model. Supervisor review is entered only by the engine and left only by the supervisor.
export const STATUSES = ['Assigned', 'In Progress', 'Awaiting Parts', 'Completed', 'Requires Supervisor Review'];

export const ALLOWED_TRANSITIONS = {
  Assigned: ['In Progress'],
  'In Progress': ['In Progress', 'Awaiting Parts', 'Completed'],
  'Awaiting Parts': ['In Progress'],
  Completed: [], // terminal: a late offline update can never re-open a completed job
  'Requires Supervisor Review': [], // technicians cannot leave review; only the supervisor can
};

export const PARTS = {
  'AC-CAP-45': { partId: 'AC-CAP-45', name: 'AC capacitor 45+5 µF', appliance: 'Air conditioner', stock: 5 },
  'AC-FAN-MTR': { partId: 'AC-FAN-MTR', name: 'AC outdoor fan motor', appliance: 'Air conditioner', stock: 2 },
  'WM-DRN-PMP': { partId: 'WM-DRN-PMP', name: 'Washing machine drain pump', appliance: 'Washing machine', stock: 3 },
  'FR-THERMO': { partId: 'FR-THERMO', name: 'Refrigerator thermostat', appliance: 'Refrigerator', stock: 0 },
  'TV-PSU-43': { partId: 'TV-PSU-43', name: 'TV power-supply board (43")', appliance: 'Television', stock: 2 },
  'MW-MAGNETRON': { partId: 'MW-MAGNETRON', name: 'Microwave magnetron', appliance: 'Microwave', stock: 1 },
  'RO-FILTER': { partId: 'RO-FILTER', name: 'Water purifier filter cartridge', appliance: 'Water purifier', stock: 6 },
};

const SEED_TIME = '2026-10-10T04:30:00.000Z'; // 10:00 IST

function ticket(t) {
  const area = SERVICE_AREAS[t.area];
  return {
    notes: [],
    partsLog: [],
    statusLog: [],
    signOff: false,
    updatedAt: SEED_TIME,
    lat: area.lat + (t.dLat || 0),
    lng: area.lng + (t.dLng || 0),
    ...t,
  };
}

export const TICKETS = [
  ticket({
    id: 'NSM-T501', assetId: 'NMM-AC101', appliance: 'Air conditioner', model: '1.5 ton inverter split AC',
    customer: 'Demo customer — Mehta residence', area: 'Nerul',
    problem: 'Indoor unit running but not cooling; outdoor fan intermittent.',
    assigned: ['TECH-A', 'TECH-B'], status: 'In Progress', version: 12,
    notes: [{ opId: 'seed-note-501', actor: 'TECH-A', text: 'Gas pressure normal. Capacitor reading low — suspected failure.', at: SEED_TIME }],
  }),
  ticket({
    id: 'NSM-T502', assetId: 'NMM-WM204', appliance: 'Washing machine', model: '7 kg front-load washer',
    customer: 'Demo customer — Iyer residence', area: 'Vashi',
    problem: 'Water not draining after wash cycle; error code on panel.',
    assigned: ['TECH-A'], status: 'Assigned', version: 3,
  }),
  ticket({
    id: 'NSM-T503', assetId: 'NMM-FR310', appliance: 'Refrigerator', model: '340 L double-door refrigerator',
    customer: 'Demo customer — Khan residence', area: 'CBD Belapur',
    problem: 'Freezer over-cooling, fresh-food section warm.',
    assigned: ['TECH-B'], status: 'Awaiting Parts', version: 5,
    notes: [{ opId: 'seed-note-503', actor: 'TECH-B', text: 'Thermostat faulty. Part out of stock at depot.', at: SEED_TIME }],
  }),
  ticket({
    id: 'NSM-T504', assetId: 'NMM-TV118', appliance: 'Television', model: '43" LED television',
    customer: 'Demo customer — Pillai residence', area: 'Kharghar',
    problem: 'No power; standby LED off.',
    assigned: ['TECH-B'], status: 'Assigned', version: 2,
  }),
  ticket({
    id: 'NSM-T505', assetId: 'NMM-MW077', appliance: 'Microwave', model: '25 L convection microwave',
    customer: 'Demo customer — Joshi residence', area: 'Sanpada',
    problem: 'Turntable rotates but food does not heat.',
    assigned: ['TECH-A'], status: 'In Progress', version: 4,
  }),
  ticket({
    id: 'NSM-T506', assetId: 'NMM-RO052', appliance: 'Water purifier', model: 'RO + UV water purifier',
    customer: 'Demo customer — Naik residence', area: 'Airoli',
    problem: 'Low output flow; filter-change indicator on.',
    assigned: ['TECH-B'], status: 'Assigned', version: 1,
  }),
  ticket({
    id: 'NSM-T507', assetId: 'NMM-AC144', appliance: 'Air conditioner', model: '1 ton window AC',
    customer: 'Demo customer — Gupta residence', area: 'Koparkhairane',
    problem: 'Annual service and filter cleaning.',
    assigned: ['TECH-A'], status: 'Completed', version: 7, signOff: true,
  }),
];

export const SCENARIO_TICKET_ID = 'NSM-T501';

// Scripted offline updates for the live demo (pre-fill only — the engine decides the outcome).
export const DEMO_SCRIPT = {
  'TECH-A': { note: 'AC capacitor replaced; cooling test completed.', partId: 'AC-CAP-45', qty: 1, status: 'Completed', signOff: true },
  'TECH-B': { note: 'Cooling test pending; compressor requires further inspection.', partId: 'AC-CAP-45', qty: 1, status: 'In Progress', signOff: false },
};

export function initialCentral() {
  const inventory = {};
  for (const p of Object.values(PARTS)) inventory[p.partId] = { ...p };
  const tickets = {};
  for (const t of TICKETS) tickets[t.id] = structuredClone(t);
  return {
    tickets,
    inventory,
    appliedOpIds: [],
    conflicts: [],
    audit: [{
      id: 'evt-seed', at: SEED_TIME, actor: 'SYSTEM', type: 'SEED', ticketId: null, opId: null,
      ruleId: null, outcome: 'INFO',
      detail: 'Demo central state loaded: 7 simulated service tickets, depot inventory at Turbhe.',
    }],
    lastSyncResults: [],
  };
}
