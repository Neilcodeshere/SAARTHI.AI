import React from 'react';
import { FileText, AlertCircle, History, Shield } from 'lucide-react';

export default function AuditTrailPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Trail</h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable, append-only operational history capturing every field change, rule decision, and supervisor resolution.
          </p>
        </div>
      </div>

      <div className="p-8 bg-white border border-slate-200 rounded-lg text-center space-y-4">
        <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center mx-auto">
          <History className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h2 className="text-base font-bold text-slate-900">Append-Only Event Ledger</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Every operational modification creates an immutable audit record linking eventId, operationId, entityId, actorId, action, previousValue, proposedValue, and rule results. Corrections append new records without rewriting history.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Implementation targeted for <strong>Phase 8: Audit, Polish, & Acceptance</strong></span>
        </div>
      </div>
    </div>
  );
}
