import React from 'react';
import { 
  ClipboardList, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  RefreshCw, 
  ShieldAlert,
  ArrowRight,
  Database,
  Cpu
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';

export default function OverviewPage() {
  const { currentRole, effectiveOnline } = useApp();

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operations Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time status of field work orders, local queued mutations, and synchronization health.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
            Active Persona: <strong className="text-slate-900">{currentRole}</strong>
          </span>
          <span className={`px-3 py-1.5 rounded-md font-medium border ${
            effectiveOnline 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            Link: {effectiveOnline ? 'Operational' : 'Offline / Standalone'}
          </span>
        </div>
      </div>

      {/* Metrics Row (Derived from App Data in Phase 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Work Orders Total</span>
            <ClipboardList className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">1</span>
            <span className="text-xs text-slate-500 font-normal">Active (Seed WO-101)</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Phase 2 Data Model
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending Local Ops</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">0</span>
            <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">Queue Empty</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Persistent in IndexedDB
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Conflicts Detected</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">0</span>
            <span className="text-xs text-slate-500">Awaiting sync</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Rules Engine (Phase 5)
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Authoritative Sync</span>
            <RefreshCw className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-800">Ready</span>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">Simulation Ready</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Local Simulated Central System
          </div>
        </div>
      </div>

      {/* Phase 1 Verification & Architecture Card */}
      <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              <Cpu className="w-3.5 h-3.5" />
              Phase 1 Milestone Complete
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-2">
              FieldSync Foundation & Layout Initialized
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              The project structure, Vite build pipeline, Tailwind CSS styles, Lucide icons, responsive navigation shell, and core application layout are configured and running without errors.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              1. Offline Storage Layer
            </div>
            <p className="text-slate-500 leading-relaxed">
              Targeted for Phase 3 via <code className="text-slate-700 font-mono">idb</code> with dedicated object stores for Work Orders, Inventory, Operations Queue, Conflicts, and Audits.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              2. Deterministic Rules
            </div>
            <p className="text-slate-500 leading-relaxed">
              Targeted for Phase 5 with 8 pure-logic conflict rules (Independent edits, Stale versions, Stock shortages, Duplicate operations, and Workflows).
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
              3. Supervisor Review
            </div>
            <p className="text-slate-500 leading-relaxed">
              Targeted for Phase 7 with side-by-side inspection, append-only audit trail logging, and safe retry protections.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs text-slate-500">
          <span>Click any sidebar item to verify navigation and placeholder views.</span>
          <Link 
            to="/work-orders" 
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
          >
            Go to Work Orders <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
