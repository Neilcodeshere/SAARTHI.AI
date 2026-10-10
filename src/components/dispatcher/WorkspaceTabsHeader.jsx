import React from 'react';
import { 
  Layout, 
  Plus, 
  ChevronDown, 
  SlidersHorizontal, 
  Link2, 
  Layers, 
  MapPin, 
  ShieldAlert,
  RefreshCw,
  Clock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function WorkspaceTabsHeader({ 
  assignmentGroup = "San Francisco Technicians",
  onSelectGroup,
  onOpenConflictModal
}) {
  const { effectiveOnline, pendingOpsCount } = useApp();

  return (
    <div className="bg-[#E5E6EA] border-b border-slate-300 select-none shrink-0">
      {/* Upper Tab Bar */}
      <div className="flex items-center px-2 pt-1.5 gap-1 border-b border-slate-300">
        <div className="flex items-center gap-2 bg-[#F3F4F6] text-slate-800 px-3 py-1.5 rounded-t text-xs font-semibold shadow-xs border-t border-l border-r border-slate-300">
          <Layout className="w-3.5 h-3.5 text-slate-600" />
          <span>Dispatcher Workspace</span>
        </div>

        <button 
          className="p-1 hover:bg-slate-300 text-slate-600 rounded transition"
          title="Open new workspace tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Lower Secondary Toolbar Bar */}
      <div className="h-9 px-3 flex items-center justify-between text-xs text-slate-700 bg-[#E5E6EA]">
        {/* Left Filters matching reference */}
        <div className="flex items-center gap-2">
          <button className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-300/60 transition">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Assignment Groups Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-700 shadow-2xs">
              <span className="text-blue-600 font-semibold">•</span>
              <span>Assignment Groups</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
          </div>

          {/* Hybrid Mode Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-700 shadow-2xs">
              <span className="text-blue-600 font-semibold">•</span>
              <span>Hybrid</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
          </div>

          {/* Map Filter Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-700 shadow-2xs">
              <span className="text-blue-600 font-semibold">•</span>
              <span>Map Filter</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
          </div>

          <button className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-300/60 transition" title="Chain / Dependency View">
            <Link2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right FieldSync Status Badges */}
        <div className="flex items-center gap-3">
          {/* Conflict Review Banner if open */}
          <button
            onClick={onOpenConflictModal}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-semibold hover:bg-amber-200 transition"
          >
            <ShieldAlert className="w-3 h-3 text-amber-700" />
            <span>1 Stock Discrepancy (WO-101)</span>
          </button>

          {/* Queue Status */}
          <div className="flex items-center gap-1 text-[11px] text-slate-600 bg-white/70 px-2 py-0.5 rounded border border-slate-300">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Local Queue: <strong>{pendingOpsCount} Pending</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
