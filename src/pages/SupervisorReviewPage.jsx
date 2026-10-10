import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  History, 
  FileText, 
  Package, 
  User, 
  Check, 
  X, 
  ArrowRight,
  Database
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  getConflicts, 
  resolveConflictAtomic, 
  getInventoryItems, 
  getAuditEvents,
  generateUUID 
} from '../services/db';

export default function SupervisorReviewPage() {
  const { currentRole } = useApp();

  const [conflicts, setConflicts] = useState([]);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [resolutionStrategy, setResolutionStrategy] = useState('PARTIAL_ALLOCATION');
  const [resolutionReason, setResolutionReason] = useState(
    'Authorized 3 units to Tech A (Critical Pier 39 Camera) and 2 units to Tech B. Expedited warehouse reorder initiated.'
  );
  const [resolutionSuccess, setResolutionSuccess] = useState(false);
  const [auditEvents, setAuditEvents] = useState([]);

  const loadConflictsData = async () => {
    try {
      const allConflicts = await getConflicts();
      setConflicts(allConflicts);
      if (allConflicts.length > 0 && !selectedConflict) {
        setSelectedConflict(allConflicts[0]);
      }
      const audits = await getAuditEvents();
      setAuditEvents(audits);
    } catch (err) {
      console.error('Error loading supervisor conflicts:', err);
    }
  };

  useEffect(() => {
    loadConflictsData();
  }, []);

  // Handle Supervisor Commit
  const handleResolveConflict = async () => {
    if (!selectedConflict || !resolutionReason.trim()) return;

    const nowIso = new Date().toISOString();
    const resolutionPayload = {
      strategy: resolutionStrategy,
      reason: resolutionReason,
      resolvedBy: 'Supervisor Reviewer',
      resolvedAt: nowIso,
    };

    const supervisorAuditEvent = {
      eventId: generateUUID(),
      operationId: selectedConflict.operationIds?.[0] || 'manual-resolution',
      entityId: selectedConflict.entityId || 'WO-101',
      actorId: 'SUPERVISOR',
      action: 'SUPERVISOR_RESOLUTION',
      previousValue: 'UNRESOLVED_DISCREPANCY',
      proposedValue: JSON.stringify(resolutionPayload),
      result: 'RESOLVED',
      ruleId: selectedConflict.ruleId || 'RULE_D_INVENTORY_SHORTAGE',
      reason: resolutionReason,
      createdAt: nowIso,
    };

    try {
      await resolveConflictAtomic(selectedConflict.conflictId, resolutionPayload, supervisorAuditEvent);
      setResolutionSuccess(true);
      await loadConflictsData();
      setTimeout(() => {
        setResolutionSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to commit supervisor resolution:', err);
    }
  };

  const openConflicts = conflicts.filter(c => c.status === 'OPEN');

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-100 select-none text-xs">
      {/* Top Header */}
      <div className="bg-slate-900 text-slate-100 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base text-white">Supervisor Conflict Resolution Station</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Role: Supervisor
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Manual oversight console for reconciling competing field updates, parts deficits, and non-repudiation audit notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-slate-800 rounded border border-slate-700 text-slate-300 font-semibold">
            {openConflicts.length} Unresolved Conflicts
          </span>
        </div>
      </div>

      {/* Main Split Body: Left Conflict List + Right Comparison / Review Station */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Conflict Items (~280px) */}
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-200 bg-slate-50 font-bold text-slate-800">
            Disputed Records Queue
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {conflicts.map(conf => (
              <div
                key={conf.conflictId}
                onClick={() => setSelectedConflict(conf)}
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  selectedConflict?.conflictId === conf.conflictId
                    ? 'bg-amber-50/70 border-amber-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-bold text-slate-900">{conf.conflictId}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    conf.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {conf.status}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-800 text-xs mt-1">
                  {conf.description}
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">
                  Entity: <strong>{conf.entityId}</strong> • Rule: <strong>{conf.ruleId}</strong>
                </p>
              </div>
            ))}

            {conflicts.length === 0 && (
              <div className="p-6 text-center text-slate-400">
                No active conflicts logged in IndexedDB. Use Technician Workspace while disconnected to simulate concurrent reports.
              </div>
            )}
          </div>
        </div>

        {/* Right Comparison & Resolution Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Rule Details Banner */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Rule Evaluation: {selectedConflict?.ruleId || 'RULE_D_INVENTORY_SHORTAGE'}
              </span>
              <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                Supervisor Authorization Mandated
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed text-xs">
              Authoritative central inventory snapshot holds <strong>5 units</strong> of Part <code className="font-mono bg-slate-100 px-1 rounded">SENSOR-S20</code>. Two offline field operations submitted overlapping consumption reports totaling <strong>7 units</strong>.
              FieldSync preserved both reports without silent overwriting or last-write-wins bias.
            </p>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tech A Submission */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Technician A (Alex Ray - TECH-001)
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.2 rounded">
                  Reported: 4 Units
                </span>
              </div>
              <div className="space-y-1 text-slate-600 text-[11px]">
                <p>Target Work Order: <strong>WO-101 (Camera Malfunction)</strong></p>
                <p>Location: <strong>Port of San Francisco - Pier 39 Security</strong></p>
                <p className="italic text-slate-500">"Replaced 4 burnt thermal sensors at Pier 39 security gate."</p>
              </div>
            </div>

            {/* Tech B Submission */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-600" />
                  Technician B (Teddy Taylor - TECH-006)
                </span>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.2 rounded">
                  Reported: 3 Units
                </span>
              </div>
              <div className="space-y-1 text-slate-600 text-[11px]">
                <p>Target Work Order: <strong>WO-101 (Camera Malfunction)</strong></p>
                <p>Location: <strong>Port of San Francisco - Pier 39 Security</strong></p>
                <p className="italic text-slate-500">"Configured backup array using 3 sensors from field van."</p>
              </div>
            </div>
          </div>

          {/* Supervisor Decision Station */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Supervisor Resolution Decision
            </h3>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Select Resolution Strategy:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'PARTIAL_ALLOCATION', label: 'Split (3 to Tech A / 2 to Tech B)' },
                  { id: 'PRIORITIZE_TECH_A', label: 'Prioritize Tech A (4 Units)' },
                  { id: 'HOLD_FOR_AUDIT', label: 'Hold for Physical Van Audit' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setResolutionStrategy(opt.id)}
                    className={`p-2.5 rounded-md border text-left transition ${
                      resolutionStrategy === opt.id
                        ? 'bg-blue-600 text-white font-semibold border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Mandatory Resolution Reason (Appended to Immutable Audit Trail):
              </label>
              <textarea
                rows={2}
                value={resolutionReason}
                onChange={(e) => setResolutionReason(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Non-repudiation: Original reports remain immutable; resolution appends a new audit record.
              </span>
              <button
                onClick={handleResolveConflict}
                disabled={!resolutionReason.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded transition flex items-center gap-1.5 shadow-2xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Commit Supervisor Resolution</span>
              </button>
            </div>

            {resolutionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Resolution successfully committed! Conflict marked resolved and audit trail appended.</span>
              </div>
            )}
          </div>

          {/* Audit History */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-600" />
              Audit Trail Ledger
            </h3>
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {auditEvents.map(evt => (
                <div key={evt.eventId} className="py-2 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-semibold text-slate-800 font-mono text-[10px] bg-slate-100 px-1 py-0.2 rounded mr-1.5">
                      {evt.action}
                    </span>
                    <span className="text-slate-600">{evt.reason || evt.proposedValue}</span>
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    By <strong className="text-slate-600">{evt.actorId}</strong> • {new Date(evt.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
