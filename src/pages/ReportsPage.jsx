import React from 'react';
import { BarChart3, AlertCircle, PieChart, Activity } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics & Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Aggregated operational metrics, conflict recurrence breakdown, and inventory discrepancy analytics.
          </p>
        </div>
      </div>

      <div className="p-8 bg-white border border-slate-200 rounded-lg text-center space-y-4">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h2 className="text-base font-bold text-slate-900">Operational Health Metrics</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Provides charts and breakdowns for work orders by status, conflict types (stale versions vs duplicate operations vs inventory shortages), and manual supervisor intervention rates.
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
