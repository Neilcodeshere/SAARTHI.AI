import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { DEMO_SCRIPT, SCENARIO_TICKET_ID, SUPERVISOR } from './data/seed.js';
import { pull, queueOp, resolveConflict, syncDevice } from './engine/engine.js';
import { DEVICE_IDS, loadAll, resetAll, save } from './services/store.js';
import ServiceMap from './components/ServiceMap.jsx';
import TechnicianPanel from './components/TechnicianPanel.jsx';
import SupervisorPanel from './components/SupervisorPanel.jsx';
import { AuditTimeline, InventoryPanel, SyncResults, TicketPanel } from './components/Panels.jsx';

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function App() {
  const [state, setState] = useState(null); // { central, devices }
  const [selectedId, setSelectedId] = useState(SCENARIO_TICKET_ID);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
  const stateRef = useRef(null);

  useEffect(() => {
    loadAll().then(s => { stateRef.current = s; setState(s); }).catch(e => setError(`Could not open IndexedDB: ${e.message}`));
    const on = () => setBrowserOnline(true);
    const off = () => setBrowserOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Every mutation: compute next state from the latest snapshot, persist atomically, then render.
  const commit = useCallback(async (fn) => {
    setBusy(true);
    setError(null);
    try {
      const next = fn(stateRef.current);
      await save(next);
      stateRef.current = next;
      setState(next);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  const syncInto = (s, techId) => {
    const r = syncDevice(s.devices[techId], s.central, new Date().toISOString());
    return { central: r.central, devices: { ...s.devices, [techId]: r.device } };
  };

  const handleQueue = (techId, spec) => commit(s => {
    let d = s.devices[techId];
    const now = new Date().toISOString();
    if (spec === 'SCRIPT') {
      const sc = DEMO_SCRIPT[techId];
      d = queueOp(d, { opId: newId(), ticketId: SCENARIO_TICKET_ID, type: 'ADD_NOTE', payload: { text: sc.note }, createdAt: now });
      d = queueOp(d, { opId: newId(), ticketId: SCENARIO_TICKET_ID, type: 'CONSUME_PART', payload: { partId: sc.partId, qty: sc.qty }, createdAt: now });
      d = queueOp(d, { opId: newId(), ticketId: SCENARIO_TICKET_ID, type: 'SET_STATUS', payload: { status: sc.status, signOff: sc.signOff }, createdAt: now });
    } else {
      d = queueOp(d, { opId: newId(), createdAt: now, ...spec });
    }
    const next = { ...s, devices: { ...s.devices, [techId]: d } };
    return d.online ? syncInto(next, techId) : next;
  }).catch(() => {});

  const handleToggleOnline = (techId) => commit(s => {
    const d = s.devices[techId];
    const next = { ...s, devices: { ...s.devices, [techId]: { ...d, online: !d.online } } };
    return d.online ? next : syncInto(next, techId); // reconnecting triggers sync
  }).catch(() => {});

  const handleSync = (techId) => commit(s => syncInto(s, techId)).catch(() => {});

  const handleDropAck = (techId, dropAck) => commit(s => ({ ...s, devices: { ...s.devices, [techId]: { ...s.devices[techId], dropAck } } })).catch(() => {});

  const handleResolve = (conflictId, choice, reason) => commit(s => {
    const central = resolveConflict(s.central, conflictId, choice, SUPERVISOR.id, reason, new Date().toISOString());
    const devices = {};
    for (const id of DEVICE_IDS) devices[id] = s.devices[id].online ? pull(s.devices[id], central) : s.devices[id];
    return { central, devices };
  });

  const handleReset = async () => {
    if (!window.confirm('Reset the demo? This clears both device queues, conflicts and the audit history stored in this browser.')) return;
    const s = await resetAll();
    stateRef.current = s;
    setState(s);
    setSelectedId(SCENARIO_TICKET_ID);
  };

  if (!state) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-600">{error || 'Loading SAARTHI.AI…'}</div>;
  }

  const { central, devices } = state;
  const selected = central.tickets[selectedId];
  const openCount = central.conflicts.filter(c => c.status === 'OPEN').length;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <div className="text-xl font-bold tracking-tight text-slate-900">SAARTHI<span className="text-indigo-600">.AI</span></div>
            <div className="text-xs text-slate-500">Intelligent Field Operations &amp; Conflict Resolution · Home-appliance service, Navi Mumbai</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800 ring-1 ring-amber-200">Demo data · central server simulated in this browser</span>
            <span className={`rounded-full px-2.5 py-1 ring-1 ${browserOnline ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-rose-50 text-rose-800 ring-rose-200'}`}>
              Browser {browserOnline ? 'online' : 'offline'}: ticket workflow is fully local; only map tiles need internet
            </span>
            {openCount > 0 && <span className="rounded-full bg-rose-600 px-2.5 py-1 font-medium text-white">{openCount} awaiting supervisor</span>}
            <button type="button" onClick={handleReset} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 ring-1 ring-slate-300 hover:bg-slate-50">
              <RotateCcw size={13} /> Reset demo
            </button>
          </div>
        </div>
      </header>

      {error && <div className="mx-auto mt-3 max-w-[1440px] px-4"><div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">{error}</div></div>}

      <main className="mx-auto grid max-w-[1440px] gap-4 p-4 lg:grid-cols-12">
        <div className="lg:col-span-5"><TicketPanel central={central} selectedId={selectedId} onSelect={setSelectedId} /></div>
        <div className="flex flex-col gap-2 lg:col-span-4">
          <ServiceMap tickets={Object.values(central.tickets)} selectedId={selectedId} onSelect={setSelectedId} />
          <p className="text-[11px] text-slate-500">Markers are simulated service locations by locality, not live technician GPS. Click a marker to select its ticket.</p>
        </div>
        <div className="lg:col-span-3"><InventoryPanel central={central} highlightAppliance={selected?.appliance} /></div>

        {DEVICE_IDS.map(id => (
          <div key={id} className="lg:col-span-6">
            <TechnicianPanel
              key={`${id}-${selectedId}`}
              device={devices[id]}
              central={central}
              ticketId={selectedId}
              busy={busy}
              onQueue={handleQueue}
              onToggleOnline={handleToggleOnline}
              onSync={handleSync}
              onSetDropAck={handleDropAck}
            />
          </div>
        ))}

        <div className="lg:col-span-7"><SyncResults central={central} /></div>
        <div className="lg:col-span-5"><SupervisorPanel central={central} onResolve={handleResolve} busy={busy} /></div>
        <div className="lg:col-span-12"><AuditTimeline central={central} selectedId={selectedId} /></div>
      </main>
    </div>
  );
}
