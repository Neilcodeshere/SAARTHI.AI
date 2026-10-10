import { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, ListPlus } from 'lucide-react';
import { TECHNICIANS, ALLOWED_TRANSITIONS, DEMO_SCRIPT, SCENARIO_TICKET_ID } from '../data/seed.js';
import { formatIST, OUTCOME_STYLE } from '../lib/format.js';
import { StatusBadge } from './ui.jsx';

function describe(op, parts) {
  if (op.type === 'ADD_NOTE') return `Note: “${op.payload.text}”`;
  if (op.type === 'CONSUME_PART') return `Part: ${op.payload.qty} × ${parts[op.payload.partId]?.name || op.payload.partId}`;
  return `Status → ${op.payload.status}${op.payload.signOff ? ' (customer sign-off)' : ''}`;
}

export default function TechnicianPanel({ device, central, ticketId, onQueue, onToggleOnline, onSync, onSetDropAck, busy }) {
  const tech = TECHNICIANS[device.techId];
  const ticket = device.snapshot[ticketId];
  const parts = central.inventory;
  const centralTicket = central.tickets[ticketId];

  const compatible = ticket ? Object.values(parts).filter(p => p.appliance === ticket.appliance) : [];
  const [note, setNote] = useState('');
  const [partId, setPartId] = useState('');
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState('');
  const [signOff, setSignOff] = useState(false);

  const pendingHere = device.queue.filter(op => op.ticketId === ticketId);
  const localStatus = [...pendingHere].reverse().find(op => op.type === 'SET_STATUS')?.payload.status || ticket?.status;
  const statusOptions = ticket ? ALLOWED_TRANSITIONS[ticket.status] || [] : [];
  const effectivePart = compatible.some(p => p.partId === partId) ? partId : compatible[0]?.partId || '';
  const effectiveStatus = statusOptions.includes(status) ? status : statusOptions[0] || '';
  const lastBatch = central.lastSyncResults?.find(b => b.techId === device.techId);

  const queue = (type, payload) => onQueue(device.techId, { ticketId, type, payload });

  return (
    <section className="flex flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{tech.label} · device</div>
          <h2 className="text-lg font-semibold text-slate-900">{tech.name}</h2>
          <div className="text-xs text-slate-500">Zone: {tech.zone}</div>
        </div>
        <button
          type="button"
          onClick={() => onToggleOnline(device.techId)}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${device.online ? 'bg-emerald-50 text-emerald-800 ring-emerald-300 hover:bg-emerald-100' : 'bg-slate-800 text-white ring-slate-800 hover:bg-slate-700'}`}
        >
          {device.online ? <Wifi size={15} /> : <WifiOff size={15} />}
          {device.online ? 'Online — go offline' : 'Offline — reconnect'}
        </button>
      </header>

      {!ticket ? (
        <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{ticketId} is not assigned to {tech.name}. Select a ticket assigned to this technician.</p>
      ) : (
        <>
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{ticket.id} · {ticket.appliance}, {ticket.area}</span>
              <StatusBadge status={localStatus} />
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Local copy <b>v{ticket.version}</b> · central <b>v{centralTicket.version}</b>
              {centralTicket.version > ticket.version && <span className="ml-1 text-orange-700">(local copy is stale — edits will be checked on sync)</span>}
            </div>
          </div>

          {ticketId === SCENARIO_TICKET_ID && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onQueue(device.techId, 'SCRIPT')}
              className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <ListPlus size={16} /> Record demo update: “{DEMO_SCRIPT[device.techId].note.split(';')[0]}…” + 1 capacitor + {DEMO_SCRIPT[device.techId].status}
            </button>
          )}

          <div className="mt-3 grid gap-3 text-sm">
            <div>
              <label className="text-xs font-medium text-slate-600" htmlFor={`note-${device.techId}`}>Diagnostic note</label>
              <div className="mt-1 flex gap-2">
                <input id={`note-${device.techId}`} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Drain filter cleaned" className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5" />
                <button type="button" disabled={!note.trim() || busy} onClick={() => { queue('ADD_NOTE', { text: note.trim() }); setNote(''); }} className="rounded-md bg-slate-900 px-3 text-white disabled:opacity-40">Add</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600" htmlFor={`part-${device.techId}`}>Spare part consumed (compatible with {ticket.appliance.toLowerCase()})</label>
              <div className="mt-1 flex gap-2">
                <select id={`part-${device.techId}`} value={effectivePart} onChange={e => setPartId(e.target.value)} className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5">
                  {compatible.map(p => <option key={p.partId} value={p.partId}>{p.name} (local stock view: {device.stock[p.partId]})</option>)}
                </select>
                <input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))} className="w-16 rounded-md border border-slate-300 px-2" aria-label="Quantity" />
                <button type="button" disabled={!effectivePart || qty < 1 || busy} onClick={() => queue('CONSUME_PART', { partId: effectivePart, qty })} className="rounded-md bg-slate-900 px-3 text-white disabled:opacity-40">Log</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600" htmlFor={`status-${device.techId}`}>Status (allowed from {ticket.status})</label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <select id={`status-${device.techId}`} value={effectiveStatus} onChange={e => setStatus(e.target.value)} disabled={!statusOptions.length} className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5">
                  {statusOptions.length ? statusOptions.map(s => <option key={s}>{s}</option>) : <option>No technician transitions from {ticket.status}</option>}
                </select>
                <label className="flex items-center gap-1 text-xs text-slate-700">
                  <input type="checkbox" checked={signOff} onChange={e => setSignOff(e.target.checked)} /> Customer sign-off
                </label>
                <button type="button" disabled={!effectiveStatus || busy} onClick={() => queue('SET_STATUS', { status: effectiveStatus, signOff })} className="rounded-md bg-slate-900 px-3 py-1.5 text-white disabled:opacity-40">Set</button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Offline queue <span className="font-normal text-slate-500">(IndexedDB · {device.queue.length} pending)</span></h3>
          <button
            type="button"
            onClick={() => onSync(device.techId)}
            disabled={!device.online || device.queue.length === 0 || busy}
            className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-40"
          >
            <RefreshCw size={13} /> Sync now
          </button>
        </div>
        <label className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" checked={device.dropAck} onChange={e => onSetDropAck(device.techId, e.target.checked)} />
          Simulate lost server acknowledgement (ops stay queued and are re-sent)
        </label>
        {device.queue.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">Nothing pending.{device.lastSync && ` Last sync ${formatIST(device.lastSync)}.`}</p>
        ) : (
          <ol className="mt-2 space-y-1.5">
            {device.queue.map(op => (
              <li key={op.opId} className="rounded-md bg-amber-50 px-2 py-1.5 text-xs ring-1 ring-amber-200">
                <div className="font-medium text-slate-800">{describe(op, parts)}</div>
                <div className="text-slate-500">{op.ticketId} · base v{op.baseVersion} · {formatIST(op.createdAt)} · id {op.opId.slice(0, 8)}</div>
              </li>
            ))}
          </ol>
        )}
        {lastBatch && (
          <div className="mt-2 text-xs text-slate-600">
            Last server response: {lastBatch.results.map(r => (
              <span key={r.opId + r.outcome} className={`mr-1 inline-block rounded px-1.5 py-0.5 ring-1 ${OUTCOME_STYLE[r.outcome]}`}>{r.outcome}</span>
            ))}
            {lastBatch.ackLost && <span className="text-orange-700"> (acknowledgement lost)</span>}
          </div>
        )}
      </div>
    </section>
  );
}
