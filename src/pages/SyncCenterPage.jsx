import React from 'react';
import { RefreshCw, Wifi, WifiOff, AlertCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SyncCenterPage() {
  const { effectiveOnline, toggleSimulatedOffline, simulatedOffline, pendingOpsCount } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sync Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic synchronization pipeline, network telemetry, and queue replay management.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSimulatedOffline}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            {simulatedOffline ? "Restore Simulated Online" : "Simulate Offline Mode"}
          </button>
          <button 
            disabled
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Now (Phase 6)</span>
          </button>
        </div>
      </div>

      <div className="p-8 bg-white border border-slate-200 rounded-lg text-center space-y-4">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
          <RefreshCw className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h2 className="text-base font-bold text-slate-900">Simulated Central Server & Replay Queue</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Maintains the transactional boundary between local IndexedDB queues and the simulated central system. Replays mutations in deterministic order with idempotency checks to prevent duplicate execution on retries.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Implementation targeted for <strong>Phase 6: Sync Simulation</strong></span>
        </div>
      </div>
    </div>
  );
}
