import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import TopNavBar from '../dispatcher/TopNavBar';
import IconSidebar from '../dispatcher/IconSidebar';
import { useApp } from '../../context/AppContext';

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    isTourOpen, 
    setIsTourOpen, 
    isConflictModalOpen, 
    setIsConflictModalOpen 
  } = useApp();

  // Determine active view based on pathname
  const getActiveView = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dispatcher') return 'dispatcher';
    if (path.includes('technician') || path.includes('my-tasks')) return 'tasks';
    if (path.includes('overview')) return 'home';
    if (path.includes('work-orders')) return 'tasks';
    if (path.includes('inventory')) return 'inventory';
    if (path.includes('conflicts')) return 'conflicts';
    if (path.includes('supervisor')) return 'supervisor';
    if (path.includes('sync')) return 'sync';
    if (path.includes('reports')) return 'reports';
    if (path.includes('settings')) return 'settings';
    return 'dispatcher';
  };

  const handleSelectView = (viewId) => {
    switch (viewId) {
      case 'dispatcher':
        navigate('/');
        break;
      case 'home':
        navigate('/overview');
        break;
      case 'tasks':
        navigate('/technician');
        break;
      case 'inventory':
        navigate('/inventory');
        break;
      case 'conflicts':
        navigate('/supervisor-review');
        break;
      case 'supervisor':
        navigate('/supervisor-review');
        break;
      case 'sync':
        navigate('/sync-center');
        break;
      case 'reports':
        navigate('/reports');
        break;
      case 'settings':
        navigate('/settings');
        break;
      default:
        navigate('/');
        break;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#E5E6EA] text-slate-900 font-sans">
      {/* Top Navigation Bar (#171820) */}
      <TopNavBar
        onOpenConflictModal={() => setIsConflictModalOpen(true)}
        onToggleTour={() => setIsTourOpen(prev => !prev)}
      />

      {/* Main Workspace Frame with Icon Sidebar */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Vertical Icon Sidebar (~44px) */}
        <IconSidebar
          activeView={getActiveView()}
          onSelectView={handleSelectView}
          conflictCount={1}
        />

        {/* Workspace Display Outlet */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
