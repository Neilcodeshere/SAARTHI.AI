import React from 'react';
import { AlertTriangle, AlertCircle, ShieldAlert, GitMerge } from 'lucide-react';

export default function ConflictCenterPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Conflict Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated conflict detection console showing rule evaluations, stale versions, and competing edits.
          </p>
        </div>
      </div>

      <div className="p-8 bg-white border border-slate-200 rounded-lg text-center space-y-4">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h2 className="text-base font-bold text-slate-900">Deterministic Conflict Engine</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Evaluates operations against Rules A through H (Independent field merges, Same-field divergence, Stale ticket versions, Inventory shortages, and Workflow violations).
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Implementation targeted for <strong>Phase 5 (Rules Engine) & Phase 7 (UI Console)</strong></span>
        </div>
      </div>
    </div>
  );
}
