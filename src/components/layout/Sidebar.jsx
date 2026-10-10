import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  CheckSquare,
  Package,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  FileText,
  BarChart3,
  Settings,
  Radio,
  ShieldCheck,
  HardHat
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Sidebar() {
  const { currentRole } = useApp();

  const navigation = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Work Orders', href: '/work-orders', icon: ClipboardList },
    { name: 'My Tasks', href: '/my-tasks', icon: CheckSquare, badge: 'Tech' },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Conflict Center', href: '/conflicts', icon: AlertTriangle, alert: true },
    { name: 'Supervisor Review', href: '/supervisor-review', icon: UserCheck, badge: 'Supv' },
    { name: 'Sync Center', href: '/sync-center', icon: RefreshCw },
    { name: 'Audit Trail', href: '/audit-trail', icon: FileText },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 gap-3 border-b border-slate-800 bg-slate-950/60">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold tracking-tight">
          FS
        </div>
        <div>
          <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
            FieldSync
            <span className="px-1.5 py-0.2 text-[10px] font-normal uppercase tracking-wider bg-blue-900/60 text-blue-300 rounded border border-blue-700/50">
              v0.1
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Offline Conflict Engine</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Operations
        </div>
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition group ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-white" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info / Storage indicator */}
      <div className="p-3 m-3 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            Client Engine
          </span>
          <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">
            Phase 1
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Storage: <strong className="text-slate-300 font-normal">IndexedDB (Ready)</strong><br />
          Role: <strong className="text-blue-400">{currentRole}</strong>
        </p>
      </div>
    </aside>
  );
}
