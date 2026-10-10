import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AppLayout from './components/layout/AppLayout';

import DispatcherWorkspacePage from './pages/DispatcherWorkspacePage';
import TechnicianWorkspacePage from './pages/TechnicianWorkspacePage';
import SupervisorReviewPage from './pages/SupervisorReviewPage';
import OverviewPage from './pages/OverviewPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import InventoryPage from './pages/InventoryPage';
import ConflictCenterPage from './pages/ConflictCenterPage';
import SyncCenterPage from './pages/SyncCenterPage';
import AuditTrailPage from './pages/AuditTrailPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            {/* Primary Dispatcher Workspace */}
            <Route index element={<DispatcherWorkspacePage />} />
            <Route path="dispatcher" element={<DispatcherWorkspacePage />} />
            
            {/* Dedicated Technician Workspace Terminal */}
            <Route path="technician" element={<TechnicianWorkspacePage />} />
            <Route path="my-tasks" element={<TechnicianWorkspacePage />} />

            {/* Supervisor Dispute Resolution Station */}
            <Route path="supervisor-review" element={<SupervisorReviewPage />} />
            <Route path="conflicts" element={<SupervisorReviewPage />} />

            {/* Operational Management Sub-views */}
            <Route path="overview" element={<OverviewPage />} />
            <Route path="work-orders" element={<WorkOrdersPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="sync-center" element={<SyncCenterPage />} />
            <Route path="audit-trail" element={<AuditTrailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
