import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  Globe, 
  Sparkles, 
  MessageSquare, 
  HelpCircle, 
  Bell, 
  ChevronDown, 
  Wifi, 
  WifiOff, 
  Clock, 
  Star, 
  AlertTriangle,
  ShieldAlert,
  HardHat,
  LayoutGrid,
  Check,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function TopNavBar({ onOpenConflictModal, onToggleTour }) {
  const navigate = useNavigate();
  const location = useLocation();

  const { 
    currentRole, 
    setCurrentRole, 
    activeTechnicianId,
    effectiveOnline, 
    toggleSimulatedOffline, 
    simulatedOffline,
    pendingOpsCount,
    isSyncing,
    triggerSync 
  } = useApp();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setIsRoleDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roles = [
    {
      id: 'Admin',
      label: 'Admin / Dispatcher',
      path: '/',
      icon: LayoutGrid,
      color: 'text-blue-400',
      description: 'Manage work orders, assign technicians, monitor schedules, and review operational conflicts.'
    },
    {
      id: 'Technician',
      label: 'Technician',
      path: '/technician',
      icon: HardHat,
      color: 'text-emerald-400',
      description: 'View assigned jobs, update work status, record diagnostic notes, consume parts, and work offline.'
    },
    {
      id: 'Supervisor',
      label: 'Supervisor',
      path: '/supervisor-review',
      icon: UserCheck,
      color: 'text-amber-400',
      description: 'Review unresolved conflicts, inspect original submissions, approve valid resolutions, and maintain audit accountability.'
    }
  ];

  const handleSelectRole = (role) => {
    setCurrentRole(role.id);
    setIsRoleDropdownOpen(false);
    navigate(role.path);
  };

  const getRoleLabel = () => {
    if (currentRole === 'Technician') return 'Technician';
    if (currentRole === 'Supervisor') return 'Supervisor';
    return 'Admin / Dispatcher';
  };

  return (
    <header className="h-12 bg-[#171820] text-slate-200 px-3 flex items-center justify-between border-b border-slate-800 select-none z-30 shrink-0 text-xs">
      {/* Left: Brand + Navigation links + Role Selector Dropdown */}
      <div className="flex items-center gap-4">
        {/* FieldSync Wordmark */}
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-6 h-6 rounded bg-[#5AC445] text-slate-950 font-black text-xs flex items-center justify-center tracking-tighter shadow-sm">
            FS
          </div>
          <span className="font-bold text-sm tracking-tight text-white group-hover:text-emerald-400 transition">
            FieldSync
          </span>
        </div>

        {/* Global Nav Links with Role Selector Popover */}
        <nav className="hidden lg:flex items-center gap-1 text-[13px] text-slate-300 font-normal">
          {['All', 'Favorites', 'History', 'Workspaces'].map((link) => (
            <button
              key={link}
              className="px-2 py-1 rounded transition hover:text-white text-slate-300 hover:bg-slate-800/40"
            >
              {link}
            </button>
          ))}

          {/* Interactive Role Switcher Dropdown (Admin / Technician / Supervisor) */}
          <div className="relative" ref={roleDropdownRef}>
            <button
              onClick={() => setIsRoleDropdownOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700/80 text-white font-medium border border-slate-700/80 transition"
              title="Switch Persona / Workspace Role"
            >
              <span className="w-2 h-2 rounded-full bg-[#5AC445]"></span>
              <span>{getRoleLabel()}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Role Options Dropdown Card */}
            {isRoleDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-80 bg-[#1e202c] border border-slate-700 rounded-lg shadow-2xl z-50 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 border-b border-slate-700/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Switch Workspace Persona</span>
                  <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.2 rounded font-normal">
                    Demo Mode
                  </span>
                </div>

                <div className="py-1 space-y-1">
                  {roles.map((r) => {
                    const Icon = r.icon;
                    const isSelected = currentRole === r.id;

                    return (
                      <button
                        key={r.id}
                        onClick={() => handleSelectRole(r)}
                        className={`w-full text-left p-2.5 rounded-md flex items-start gap-3 transition ${
                          isSelected
                            ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                            : 'hover:bg-slate-800/80 text-slate-300 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className={`p-1.5 rounded bg-slate-900 shrink-0 ${r.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-xs font-semibold text-slate-100">
                              {r.label}
                            </strong>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-blue-400" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                            {r.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="px-2.5 py-1.5 border-t border-slate-700/80 text-[10px] text-slate-400 italic">
                  *Simulated frontend role switching for field conflict demonstration.
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Center: Configurable Workspace Pill Selector */}
      <div className="flex items-center">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 transition font-medium text-xs shadow-inner"
        >
          <span className="text-slate-100">
            {currentRole === 'Technician' ? 'Technician Field Terminal' : 'CSM/FSM Configurable Workspace'}
          </span>
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        </button>
      </div>

      {/* Right: Search, Utilities, Telemetry, and User Avatar */}
      <div className="flex items-center gap-2.5">
        {/* Search Input with Category Dropdown */}
        <div className="relative hidden md:flex items-center bg-slate-800/90 border border-slate-700 rounded-md overflow-hidden h-7 w-52">
          <Search className="w-3.5 h-3.5 text-slate-400 ml-2 shrink-0" />
          <input
            type="text"
            placeholder="Search tickets, parts"
            className="w-full bg-transparent px-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* FieldSync Offline Simulator Toggle */}
        <button
          onClick={toggleSimulatedOffline}
          title={simulatedOffline ? "Simulated Offline Mode Active - Click to reconnect" : "Connected - Click to simulate field offline mode"}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition ${
            effectiveOnline
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/60'
              : 'bg-amber-950/80 text-amber-300 border-amber-600/70 hover:bg-amber-900/80 animate-pulse'
          }`}
        >
          {effectiveOnline ? (
            <>
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Offline (Sim)</span>
            </>
          )}
        </button>

        {/* Sync Now Action Button */}
        <button
          onClick={triggerSync}
          disabled={isSyncing || !effectiveOnline}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border transition ${
            isSyncing
              ? 'bg-blue-900 text-blue-200 border-blue-700 animate-pulse'
              : pendingOpsCount > 0
              ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500 shadow-xs'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          title={effectiveOnline ? "Reconcile queued offline mutations with simulated server" : "Disabled while offline"}
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Sync Now</span>
          {pendingOpsCount > 0 && (
            <span className="ml-0.5 px-1 bg-amber-400 text-slate-950 rounded-full text-[9px] font-bold">
              {pendingOpsCount}
            </span>
          )}
        </button>

        {/* Conflict Center Alert Trigger */}
        <button
          onClick={onOpenConflictModal}
          className="relative p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="Open FieldSync Conflict Center"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Global Utility Icons */}
        <div className="hidden sm:flex items-center gap-1 text-slate-400 border-l border-slate-800 pl-2">
          <button 
            onClick={onToggleTour}
            className="p-1 hover:text-white rounded hover:bg-slate-800 transition" 
            title="Start Onboarding Tour"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          <button className="relative p-1 hover:text-white rounded hover:bg-slate-800 transition" title="Notifications">
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute -top-1 -right-1 px-1 bg-blue-500 text-white text-[9px] font-bold rounded-full">
              4
            </span>
          </button>
        </div>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
          <img
            src={
              currentRole === 'Technician'
                ? (activeTechnicianId === 'TECH-006' 
                    ? "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face"
                    : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face")
                : "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face"
            }
            alt="User profile avatar"
            className="w-7 h-7 rounded-full border border-emerald-500/80 object-cover"
          />
        </div>
      </div>
    </header>
  );
}
