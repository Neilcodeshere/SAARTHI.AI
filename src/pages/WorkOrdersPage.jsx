import React from 'react';
import { ClipboardList, Plus, Filter, Search, Calendar, User, AlertCircle } from 'lucide-react';

export default function WorkOrdersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Work Orders</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage field tickets, diagnostic logs, required parts, inspection checklists, and version status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            disabled 
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            title="Disabled in Phase 1 (Scheduled for Phase 2)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Work Order (Phase 2)</span>
          </button>
        </div>
      </div>

      {/* Placeholder Preview Panel */}
      <div className="p-8 bg-white border border-slate-200 rounded-lg text-center space-y-4">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
          <ClipboardList className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h2 className="text-base font-bold text-slate-900">Work Orders Module</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            This module will display the primary ticket list, filters by priority/status, ticket details (including seed ticket <strong>WO-101</strong>: "Motor maintenance"), inspection requirements, and diagnostic entries.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Implementation targeted for <strong>Phase 2: Dashboard and demo data</strong></span>
        </div>
      </div>
    </div>
  );
}
