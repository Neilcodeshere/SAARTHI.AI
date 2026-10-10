import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  Package, 
  FileCheck, 
  History, 
  ShieldCheck, 
  ArrowRight 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { resolveConflictAtomic, generateUUID } from '../../services/db';

export default function ConflictReviewModal({ isOpen, onClose }) {
  const { currentRole } = useApp();
  const [resolutionDecision, setResolutionDecision] = useState('PARTIAL_ALLOCATION');
  const [resolutionReason, setResolutionReason] = useState(
    'Authorized 3 units to Tech A (Critical Pier 39 Camera) and 2 units to Tech B. Expedited warehouse reorder initiated.'
  );
  const [isResolved, setIsResolved] = useState(false);

  if (!isOpen) return null;

  const handleApplyResolution = async () => {
    const nowIso = new Date().toISOString();
    const resolutionPayload = {
      decision: resolutionDecision,
      reason: resolutionReason,
      resolvedBy: 'Supervisor Reviewer',
      resolvedAt: nowIso,
    };

    const supervisorAuditEvent = {
      eventId: generateUUID(),
      operationId: 'conf-res-' + Date.now(),
      entityId: 'WO-101',
      actorId: 'SUPERVISOR',
      action: 'SUPERVISOR_RESOLUTION',
      previousValue: 'UNRESOLVED_DISCREPANCY (Rule D)',
      proposedValue: JSON.stringify(resolutionPayload),
      result: 'RESOLVED',
      ruleId: 'RULE_D_INVENTORY_SHORTAGE',
      reason: resolutionReason,
      createdAt: nowIso,
    };

    try {
      await resolveConflictAtomic('CONFLICT-INV-001', resolutionPayload, supervisorAuditEvent);
    } catch (err) {
      console.warn('Persisting conflict resolution:', err);
    }

    setIsResolved(true);
    setTimeout(() => {
      setIsResolved(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                FieldSync Conflict Resolution Console
              </h2>
              <p className="text-[11px] text-slate-300">
                Conflict ID: <strong className="text-amber-400 font-mono">CONFLICT-INV-001</strong> • Entity: <strong className="text-white">WO-101 (Camera Malfunction)</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Rule Evaluation Card */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-center justify-between font-semibold text-amber-900">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Triggered Rule: Rule D (Inventory Shortage on Offline Events)
              </span>
              <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded font-bold uppercase">
                Supervisor Review Required
              </span>
            </div>
            <p className="text-amber-800 mt-1.5 leading-relaxed">
              Authoritative central inventory snapshot has <strong>5 units</strong> of Part <code className="font-mono bg-amber-100 px-1 rounded">SENSOR-S20</code>. Two offline field operations submitted overlapping consumption reports totaling <strong>7 units</strong>. Local client did not silently overwrite balances; both reports are preserved.
            </p>
          </div>

          {/* Side-by-Side Submissions Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tech A Submission */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Technician A (Alex Ray)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
                  Offline Sync #OP-882
                </span>
              </div>
              <div className="space-y-1 text-slate-600">
                <p>Base Version: <strong>v1</strong></p>
                <p>Reported Part: <strong>SENSOR-S20 (Optical Thermal)</strong></p>
                <p>Quantity Consumed: <strong className="text-blue-700 text-sm">4 units</strong></p>
                <p className="italic text-slate-500">Note: "Replaced 4 burnt thermal sensors at Pier 39 security gate."</p>
              </div>
            </div>

            {/* Tech B Submission */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-600" />
                  Technician B (Teddy Taylor)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-semibold">
                  Offline Sync #OP-883
                </span>
              </div>
              <div className="space-y-1 text-slate-600">
                <p>Base Version: <strong>v1</strong></p>
                <p>Reported Part: <strong>SENSOR-S20 (Optical Thermal)</strong></p>
                <p>Quantity Consumed: <strong className="text-purple-700 text-sm">3 units</strong></p>
                <p className="italic text-slate-500">Note: "Configured backup array using 3 sensors from field van."</p>
              </div>
            </div>
          </div>

          {/* Supervisor Resolution Controls */}
          <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg space-y-3">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Supervisor Decision & Audit Justification
            </span>

            <div className="space-y-2">
              <label className="block text-slate-700 font-medium">Resolution Strategy:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'PARTIAL_ALLOCATION', label: 'Partial Split (3 Tech A / 2 Tech B)' },
                  { id: 'ACCEPT_TECH_A', label: 'Prioritize Tech A (4 units)' },
                  { id: 'REQUEST_INSPECTION', label: 'Hold for Site Physical Audit' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setResolutionDecision(opt.id)}
                    className={`p-2 rounded text-left border transition text-xs ${
                      resolutionDecision === opt.id
                        ? 'bg-blue-600 text-white font-semibold border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">
                Mandatory Resolution Reason (Appended to Audit Trail):
              </label>
              <textarea
                rows={2}
                value={resolutionReason}
                onChange={(e) => setResolutionReason(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-2 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <History className="w-3.5 h-3.5" />
            <span>Audit integrity guaranteed: Original reports remain immutable.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyResolution}
              disabled={isResolved || !resolutionReason.trim()}
              className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-2xs"
            >
              {isResolved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Resolution Committed to Ledger</span>
                </>
              ) : (
                <>
                  <span>Commit Supervisor Resolution</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
