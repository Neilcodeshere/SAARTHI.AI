import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  Bell, 
  Search, 
  User, 
  Clock, 
  Layers,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Header() {
  const { 
    currentRole, 
    setCurrentRole, 
    browserOnline, 
    simulatedOffline, 
    toggleSimulatedOffline, 
    effectiveOnline,
    pendingOpsCount,
    searchQuery,
    setSearchQuery,
    notificationsCount 
  } = useApp();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Search input */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search work orders, equipment, tickets, parts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder-slate-400 transition"
          />
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Network Status & Field Simulator */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSimulatedOffline}
            title={simulatedOffline ? "Click to disable offline simulation" : "Click to simulate disconnected field work"}
            className={`flex items-center gap-2 px-2.5 py-1 text-xs font-medium rounded-full border transition cursor-pointer ${
              effectiveOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            {effectiveOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>{simulatedOffline ? "Simulated Offline" : "Offline (No Link)"}</span>
              </>
            )}
            <span className="text-[10px] text-slate-400 border-l border-slate-300 pl-1.5 ml-0.5">
              {simulatedOffline ? 'Sim On' : 'Toggle'}
            </span>
          </button>
        </div>

        {/* Pending Operations Badge */}
        <div 
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200"
          title="Operations queued in local storage awaiting synchronization"
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Pending Ops:</span>
          <span className={`px-1.5 py-0.2 rounded text-[11px] font-semibold ${
            pendingOpsCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {pendingOpsCount}
          </span>
        </div>

        {/* Role Selector (Demo simulation) */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
          <User className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-500">Role:</span>
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            className="text-xs font-medium text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
            aria-label="Current Role Selector"
          >
            <option value="Technician">Technician</option>
            <option value="Supervisor">Supervisor</option>
            <option value="Manager">Manager</option>
          </select>
          <span 
            className="text-[10px] text-slate-400 bg-slate-200 px-1 rounded ml-1"
            title="Role switching is for frontend demonstration only. Authoritative authentication and RBAC will be enforced on the central backend."
          >
            Demo
          </span>
        </div>

        {/* Notifications */}
        <button 
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition"
          title="Notifications"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4" />
          {notificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </button>
      </div>
    </header>
  );
}
