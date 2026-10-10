import { useState } from 'react';
import { actorName } from '../data/seed.js';
import { RULES } from '../engine/engine.js';
import { formatIST } from '../lib/format.js';
import { Card, StatusBadge, OutcomeBadge } from './ui.jsx';

export function TicketPanel({ central, selectedId, onSelect }) {
  const tickets = Object.values(central.tickets);
  const t = central.tickets[selectedId];
  const parts = central.inventory;
  return (
    <Card title="Service tickets" subtitle="Central record (simulated server) · demo customers">
      <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto pr-1 text-sm">
        {tickets.map(x => (
          <li key={x.id}>
            <button
              type="button"
              onClick={() => onSelect(x.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left ${x.id === selectedId ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50'}`}
            >
              <span className="truncate"><b>{x.id}</b> · {x.appliance} · {x.area}</span>
              <StatusBadge status={x.status} />
            </button>
          </li>
        ))}
      </ul>
      {t && (
        <div className="border-t border-slate-100 pt-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold">{t.id} <span className="font-normal text-slate-500">· asset {t.assetId}</span></h3>
            <StatusBadge status={t.status} />
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
            <dt className="text-slate-500">Appliance</dt><dd>{t.appliance} — {t.model}</dd>
            <dt className="text-slate-500">Customer</dt><dd>{t.customer} <span className="text-slate-400">(simulated)</span></dd>
            <dt className="text-slate-500">Location</dt><dd>{t.area}, Navi Mumbai</dd>
            <dt className="text-slate-500">Technicians</dt><dd>{t.assigned.map(actorName).join(', ')}</dd>
            <dt className="text-slate-500">Reported</dt><dd>{t.problem}</dd>
            <dt className="text-slate-500">Version</dt><dd>v{t.version} · updated {formatIST(t.updatedAt)}</dd>
            <dt className="text-slate-500">Sign-off</dt><dd>{t.signOff ? 'Customer signed off' : 'Not yet'}</dd>
          </dl>
          <h4 className="mt-3 text-xs font-semibold text-slate-700">Diagnostic notes (append-only)</h4>
          <ul className="mt-1 space-y-1 text-xs">
            {t.notes.length === 0 && <li className="text-slate-500">None yet.</li>}
            {t.notes.map(n => (
              <li key={n.opId} className="rounded bg-slate-50 px-2 py-1"><b>{actorName(n.actor)}</b>: {n.text}</li>
            ))}
          </ul>
          <h4 className="mt-3 text-xs font-semibold text-slate-700">Spare parts on this ticket</h4>
          <ul className="mt-1 space-y-1 text-xs">
            {t.partsLog.length === 0 && <li className="text-slate-500">None recorded.</li>}
            {t.partsLog.map(e => (
              <li key={e.opId} className={`rounded px-2 py-1 ${e.kind === 'REVERSAL' ? 'bg-rose-50' : 'bg-slate-50'}`}>
                {e.kind === 'REVERSAL' ? 'Reversed by ' : ''}<b>{actorName(e.actor)}</b>: {e.kind === 'REVERSAL' ? '+' : '−'}{e.qty} × {parts[e.partId]?.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function InventoryPanel({ central, highlightAppliance }) {
  return (
    <Card title="Spare-parts inventory" subtitle="Central stock · Turbhe depot (demo)">
      <table className="w-full text-xs">
        <thead><tr className="text-left text-slate-500"><th className="pb-1 font-medium">Part</th><th className="pb-1 text-right font-medium">Stock</th></tr></thead>
        <tbody>
          {Object.values(central.inventory).map(p => (
            <tr key={p.partId} className={`border-t border-slate-100 ${p.appliance === highlightAppliance ? 'bg-indigo-50/60' : ''}`}>
              <td className="py-1 pr-2">
                <div className="font-medium text-slate-800">{p.name}</div>
                <div className="text-slate-500">{p.appliance} · {p.partId}</div>
              </td>
              <td className={`py-1 text-right text-base font-semibold tabular-nums ${p.stock === 0 ? 'text-rose-600' : 'text-slate-900'}`}>{p.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function SyncResults({ central }) {
  const batches = central.lastSyncResults || [];
  return (
    <Card title="Synchronisation results" subtitle="Each operation's deterministic rule and outcome (latest first)">
      {batches.length === 0 ? (
        <p className="text-sm text-slate-500">No sync yet. Record offline updates on a technician device, then reconnect it.</p>
      ) : (
        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {batches.map((b, i) => (
            <div key={b.at + b.techId + i} className="rounded-lg ring-1 ring-slate-200">
              <div className="flex flex-wrap justify-between gap-2 rounded-t-lg bg-slate-50 px-3 py-1.5 text-xs">
                <span className="font-semibold">{actorName(b.techId)} reconnected</span>
                <span className="text-slate-500">{formatIST(b.at)}{b.ackLost && ' · ack lost, device will retry'}</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {b.results.map(r => (
                  <li key={r.opId} className="px-3 py-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-slate-800">{r.ticketId}: {r.summary}</span>
                      <OutcomeBadge outcome={r.outcome} />
                    </div>
                    <div className="mt-0.5 text-slate-600"><code className="text-[11px] text-indigo-700">{r.ruleId}</code> — {r.reason}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function AuditTimeline({ central, selectedId }) {
  const [scope, setScope] = useState('ticket');
  const events = [...central.audit].reverse().filter(e => scope === 'all' || e.ticketId === selectedId || e.ticketId === null);
  return (
    <Card
      title="Audit history"
      subtitle={`Append-only ledger · ${central.audit.length} events · times in IST`}
      actions={
        <div className="flex rounded-md text-xs ring-1 ring-slate-300">
          {[['ticket', `Ticket ${selectedId}`], ['all', 'All tickets']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setScope(k)} className={`px-2.5 py-1 first:rounded-l-md last:rounded-r-md ${scope === k ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'}`}>{label}</button>
          ))}
        </div>
      }
    >
      <ol className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
        {events.map(e => (
          <li key={e.id} className="grid grid-cols-[150px_1fr] gap-2 border-l-2 border-slate-200 pl-2 text-xs max-sm:grid-cols-1">
            <span className="tabular-nums text-slate-500">{formatIST(e.at)}</span>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <b>{actorName(e.actor)}</b>
                <span className="text-slate-500">{e.type}</span>
                <OutcomeBadge outcome={e.outcome} />
                {e.ruleId && <code className="text-[11px] text-indigo-700" title={RULES[e.ruleId]}>{e.ruleId}</code>}
                {e.conflictId && <span className="text-slate-500">{e.conflictId}</span>}
              </div>
              <div className="text-slate-700">{e.ticketId ? `${e.ticketId}: ` : ''}{e.detail}</div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
