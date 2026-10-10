import React from 'react';
import { Settings, Server, Database, AlertCircle, Info, RefreshCw, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SettingsPage() {
  const { currentRole, browserOnline, simulatedOffline } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings & Diagnostics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Storage diagnostics, simulated central server configuration, and environment controls.
          </p>
        </div>
      </div>

      {/* Notice Card */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 space-y-1">
          <p className="font-semibold">Local Simulation Environment Notice</p>
          <p className="text-blue-700 leading-relaxed">
            FieldSync is running in offline-first demonstration mode. All central server responses, version comparisons, and conflict checks are executed via an in-memory / local simulation service. Multi-device shared storage and true server authorization will connect to authoritative backend REST endpoints in a production deployment.
          </p>
        </div>
      </div>

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Storage status */}
        <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Database className="w-4 h-4 text-blue-600" />
            Browser Storage Status
          </div>
          <div className="text-xs space-y-2 text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Storage Provider:</span>
              <span className="font-medium text-slate-900">IndexedDB (Ready for Phase 3)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Database Name:</span>
              <span className="font-mono text-slate-700">fieldsync_offline_db</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Active Object Stores:</span>
              <span className="text-slate-700">7 stores defined (Phase 3)</span>
            </div>
          </div>
        </div>

        {/* Network & Role status */}
        <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Server className="w-4 h-4 text-emerald-600" />
            Connection Telemetry
          </div>
          <div className="text-xs space-y-2 text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Hardware Link:</span>
              <span className={`font-medium ${browserOnline ? 'text-emerald-700' : 'text-red-600'}`}>
                {browserOnline ? 'Connected (navigator.onLine)' : 'Disconnected'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Field Simulator:</span>
              <span className="font-medium text-slate-900">
                {simulatedOffline ? 'Forced Offline Active' : 'Normal'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Active Persona:</span>
              <span className="font-medium text-blue-700">{currentRole}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Controls */}
      <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Demo Data Reset</h2>
          <p className="text-xs text-slate-500 mt-1">
            Resets all local IndexedDB stores back to baseline demo state (WO-101 motor maintenance ticket and SENSOR-S20 with 5 stock units).
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            disabled
            className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            title="Active starting in Phase 3 once IndexedDB stores are initialized"
          >
            Reset Demo Seed Data (Requires Confirmation)
          </button>
          <span className="text-xs text-slate-400">Scheduled for Phase 3/4 integration</span>
        </div>
      </div>
    </div>
  );
}
