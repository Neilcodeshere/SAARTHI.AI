import React from 'react';
import { CheckSquare, AlertCircle, HardHat, ShieldCheck, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function MyTasksPage() {
  const { currentRole } = useApp();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Technician Workspace (My Tasks)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Dedicated field interface for technicians to perform offline work, log parts, and submit status updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700 border border-slate-200">
            Current Profile: <strong>{currentRole}</strong>
          </span>
        </div>
      </div>

      {/* Placeholder Preview Panel */}
      <div className="p-8 bg-white border border-slate-200 rounded-lg text-center space-y-4">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <HardHat className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h2 className="text-base font-bold text-slate-900">Offline Field Technician Station</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Technicians will use this workspace to view assigned tasks (e.g. TECH-A & TECH-B on WO-101), record parts consumption, update inspection checkboxes, sign off, and queue immutable operations locally while disconnected.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Implementation targeted for <strong>Phase 2 & Phase 3 (Persistence)</strong></span>
        </div>
      </div>
    </div>
  );
}
