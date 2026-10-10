import React, { useState, useEffect } from 'react';
import WorkspaceTabsHeader from '../components/dispatcher/WorkspaceTabsHeader';
import PendingDispatchPanel from '../components/dispatcher/PendingDispatchPanel';
import DispatcherMap from '../components/dispatcher/DispatcherMap';
import SchedulingTimeline from '../components/dispatcher/SchedulingTimeline';
import OnboardingTourPopover from '../components/dispatcher/OnboardingTourPopover';
import TaskDetailModal from '../components/dispatcher/TaskDetailModal';
import ConflictReviewModal from '../components/dispatcher/ConflictReviewModal';

import { useApp } from '../context/AppContext';
import { INITIAL_PENDING_TASKS, TECHNICIANS } from '../data/mockData';
import { getAllWorkOrders } from '../services/db';

export default function DispatcherWorkspacePage() {
  const { 
    isTourOpen, 
    setIsTourOpen, 
    isConflictModalOpen, 
    setIsConflictModalOpen 
  } = useApp();

  const [pendingTasks, setPendingTasks] = useState(INITIAL_PENDING_TASKS);
  const [technicians, setTechnicians] = useState(TECHNICIANS);
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [inspectingTask, setInspectingTask] = useState(null);

  // Sync with IndexedDB work orders
  useEffect(() => {
    async function syncWithDB() {
      try {
        const dbOrders = await getAllWorkOrders();
        if (dbOrders && dbOrders.length > 0) {
          // Merge any status/field updates from IndexedDB
          setPendingTasks(prev => prev.map(t => {
            const dbMatch = dbOrders.find(o => o.id === t.ticketId || o.externalId === t.id);
            if (dbMatch) {
              return {
                ...t,
                status: dbMatch.status === 'Completed' ? 'Completed' : t.status,
                diagnosticNotes: dbMatch.diagnosticNotes || t.diagnosticNotes,
                version: dbMatch.version || t.version,
              };
            }
            return t;
          }));
        }
      } catch (err) {
        console.warn('Syncing Dispatcher Workspace with DB:', err);
      }
    }
    syncWithDB();
  }, []);

  // Workflow: Dispatcher assigns a pending work order to a technician
  const handleAssignTask = (taskToAssign, targetTech) => {
    // 1. Remove task from pending list
    setPendingTasks(prev => prev.filter(t => t.id !== taskToAssign.id));

    // 2. Add to technician schedule
    setTechnicians(prev => prev.map(tech => {
      if (tech.id === targetTech.id) {
        // Calculate appropriate start time based on existing schedule
        const lastJob = tech.schedule[tech.schedule.length - 1];
        const newStartHour = lastJob ? Math.min(lastJob.startHour + lastJob.durationHours + 0.5, 14.0) : 11.0;

        const newJob = {
          id: `SCH-${Date.now()}`,
          taskId: taskToAssign.id,
          title: taskToAssign.title,
          startHour: newStartHour,
          durationHours: taskToAssign.durationHours || 2.0,
          status: 'Scheduled',
          type: 'wrench',
          color: 'teal',
          location: taskToAssign.location || 'San Francisco',
        };

        return {
          ...tech,
          schedule: [...tech.schedule, newJob]
        };
      }
      return tech;
    }));
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-[#E5E6EA]">
      {/* Workspace Tabs & Sub-toolbar */}
      <WorkspaceTabsHeader 
        onOpenConflictModal={() => setIsConflictModalOpen(true)}
      />

      {/* Main Split Body: Left Tasks Panel + Right (Map + Timeline) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Pending Dispatch Work Orders List (~320px) */}
        <PendingDispatchPanel
          tasks={pendingTasks}
          selectedTaskId={selectedTask?.id}
          onSelectTask={(task) => setSelectedTask(task)}
          onInspectTask={(task) => setInspectingTask(task)}
          onAssignTask={(task) => setInspectingTask(task)}
        />

        {/* Right Area: Geographic Map (Upper) + Scheduling Timeline (Lower) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Map Section */}
          <DispatcherMap
            selectedTaskId={selectedTask?.id}
            onSelectMarker={(marker) => {
              const matched = pendingTasks.find(t => t.id === marker.taskId);
              if (matched) setInspectingTask(matched);
            }}
            onInspectTask={(task) => setInspectingTask(task)}
          />

          {/* Timeline Section */}
          <SchedulingTimeline
            technicians={technicians}
            onSelectScheduledTask={(job, tech) => {
              setInspectingTask({
                id: job.taskId,
                title: job.title,
                location: job.location,
                status: job.status,
                assignedTech: tech.name,
                durationHours: job.durationHours,
              });
            }}
            onAssignToTech={handleAssignTask}
          />
        </div>
      </div>

      {/* Onboarding Contextual Tour Popover */}
      <OnboardingTourPopover
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />

      {/* Work Order Inspection & Assignment Modal */}
      <TaskDetailModal
        task={inspectingTask}
        isOpen={!!inspectingTask}
        onClose={() => setInspectingTask(null)}
        onAssignToTech={handleAssignTask}
        onOpenConflictReview={() => setIsConflictModalOpen(true)}
      />

      {/* FieldSync Conflict Review Modal */}
      <ConflictReviewModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
      />
    </div>
  );
}
