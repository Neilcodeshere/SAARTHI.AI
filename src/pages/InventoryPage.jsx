import React from 'react';
import { Package, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Parts & Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Authoritative stock balances, pending offline consumption transactions, and inventory discrepancies.
          </p>
        </div>
      </div>

      <div className="p-8 bg-white border border-slate-200 rounded-lg text-center space-y-4">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <Package className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h2 className="text-base font-bold text-slate-900">Event-Sourced Inventory Tracking</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Displays inventory items (including demo part <strong>SENSOR-S20</strong> with base quantity 5). Balances are never overwritten by offline calculations; consumption events are tracked independently to detect cumulative shortages.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Implementation targeted for <strong>Phase 2 (Views) & Phase 5 (Shortage Detection)</strong></span>
        </div>
      </div>
    </div>
  );
}
