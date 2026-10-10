import React from 'react';
import { 
  Home, 
  ListTodo, 
  MapPin, 
  CalendarDays, 
  LayoutGrid, 
  Package, 
  MessageSquareText, 
  BarChart2, 
  Calendar,
  Settings,
  AlertTriangle,
  RefreshCw,
  UserCheck
} from 'lucide-react';

export default function IconSidebar({ 
  activeView = 'dispatcher', 
  onSelectView, 
  conflictCount = 1 
}) {
  const items = [
    { id: 'home', icon: Home, label: 'Overview Dashboard' },
    { id: 'tasks', icon: ListTodo, label: 'Work Orders & Tasks' },
    { id: 'map', icon: MapPin, label: 'Field Geographic Map' },
    { id: 'schedule', icon: CalendarDays, label: 'Technician Schedule' },
    { id: 'dispatcher', icon: LayoutGrid, label: 'Dispatcher Workspace', primary: true },
    { id: 'inventory', icon: Package, label: 'Parts & Inventory' },
    { id: 'conflicts', icon: AlertTriangle, label: 'Conflict Center', badge: conflictCount },
    { id: 'supervisor', icon: UserCheck, label: 'Supervisor Review' },
    { id: 'sync', icon: RefreshCw, label: 'Sync Pipeline' },
    { id: 'reports', icon: BarChart2, label: 'Operations Analytics' },
    { id: 'calendar', icon: Calendar, label: 'Calendar Schedule' },
  ];

  return (
    <aside className="w-11 bg-gradient-to-b from-[#2A2B42] via-[#212236] to-[#1C1D2F] flex flex-col items-center py-2.5 border-r border-slate-800/80 shrink-0 z-20 select-none">
      <div className="flex flex-col gap-2.5 items-center w-full">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <div key={item.id} className="relative group flex items-center justify-center">
              <button
                onClick={() => onSelectView?.(item.id)}
                className={`w-8 h-8 rounded flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50'
                }`}
                aria-label={item.label}
              >
                <Icon className="w-4 h-4" />
                {item.badge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#212236]" />
                )}
              </button>

              {/* Tooltip */}
              <div className="absolute left-11 ml-1 px-2 py-1 bg-slate-900 text-white text-[11px] rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Settings Icon */}
      <div className="mt-auto relative group">
        <button
          onClick={() => onSelectView?.('settings')}
          className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
        <div className="absolute left-11 ml-1 bottom-1 px-2 py-1 bg-slate-900 text-white text-[11px] rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700">
          System Settings & Storage
        </div>
      </div>
    </aside>
  );
}
