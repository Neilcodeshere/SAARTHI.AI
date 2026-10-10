import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  HardHat, 
  Wifi, 
  WifiOff, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Package, 
  ShieldCheck, 
  Play, 
  Pause, 
  CheckSquare, 
  Send, 
  Layers, 
  ChevronRight,
  Database,
  History,
  Lock,
  User,
  Plus,
  ArrowRight,
  Navigation,
  Radio,
  Compass,
  MapPin,
  Crosshair
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  getAllWorkOrders, 
  updateLocalWorkOrder, 
  saveOperationAtomic, 
  getPendingOperations, 
  getInventoryItems,
  getAuditEvents,
  generateUUID 
} from '../services/db';
import { 
  startLiveGPSTracking, 
  stopLiveGPSTracking, 
  publishTechnicianLocation,
  getTechnicianLiveLocation 
} from '../services/liveLocationService';

export default function TechnicianWorkspacePage() {
  const { 
    effectiveOnline, 
    simulatedOffline, 
    toggleSimulatedOffline, 
    activeTechnicianId, 
    setActiveTechnicianId,
    pendingOpsCount,
    refreshPendingCount,
    lastSyncTime,
    isSyncing,
    triggerSync,
    syncResult
  } = useApp();

  const [workOrders, setWorkOrders] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState('WO-101');
  const [statusFilter, setStatusFilter] = useState('All');
  const [inventoryList, setInventoryList] = useState([]);
  const [auditList, setAuditList] = useState([]);
  const [localPendingOps, setLocalPendingOps] = useState([]);

  // Form states for work order execution
  const [diagnosticNotesInput, setDiagnosticNotesInput] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('SENSOR-S20');
  const [consumeQty, setConsumeQty] = useState(4);
  const [inspectionChecks, setInspectionChecks] = useState({
    visual: false,
    voltage: false,
    calibration: false,
  });
  const [signOffName, setSignOffName] = useState('Alex Ray');
  const [actionNotice, setActionNotice] = useState(null);

  // Live GPS Telemetry state
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [liveLocationData, setLiveLocationData] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const watchIdRef = useRef(null);

  // Load records from IndexedDB
  const loadDataFromDB = async () => {
    try {
      const orders = await getAllWorkOrders();
      setWorkOrders(orders);
      const inv = await getInventoryItems();
      setInventoryList(inv);
      const audits = await getAuditEvents();
      setAuditList(audits);
      const ops = await getPendingOperations();
      setLocalPendingOps(ops);
      await refreshPendingCount();
    } catch (err) {
      console.error('Error loading data from IndexedDB:', err);
    }
  };

  useEffect(() => {
    loadDataFromDB();
  }, [activeTechnicianId]);

  // Clean up location watch on unmount or technician switch
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        stopLiveGPSTracking(watchIdRef.current, activeTechnicianId);
        watchIdRef.current = null;
      }
    };
  }, [activeTechnicianId]);

  // Active technician metadata
  const technicianInfo = useMemo(() => {
    if (activeTechnicianId === 'TECH-006') {
      return {
        id: 'TECH-006',
        name: 'Teddy Taylor',
        role: 'Technician B (Senior Network Specialist)',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
        defaultQty: 3,
        baseCoords: { lat: 37.7952, lng: -122.4028 },
      };
    }
    return {
      id: 'TECH-001',
      name: 'Alex Ray',
      role: 'Technician A (Senior Field Specialist)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
      defaultQty: 4,
      baseCoords: { lat: 37.7886, lng: -122.4532 },
    };
  }, [activeTechnicianId]);

  // Sync default quantity and signoff with active technician
  useEffect(() => {
    setSignOffName(technicianInfo.name);
    setConsumeQty(technicianInfo.defaultQty);
    // Reset location sharing when switching technician profile
    if (watchIdRef.current != null) {
      stopLiveGPSTracking(watchIdRef.current, activeTechnicianId);
      watchIdRef.current = null;
      setIsSharingLocation(false);
      setLiveLocationData(null);
    }
  }, [technicianInfo]);

  // Handle Start Live GPS Sharing
  const handleStartSharing = () => {
    setLocationError(null);

    const watchId = startLiveGPSTracking(
      activeTechnicianId,
      (coords) => {
        setLiveLocationData(coords);
        setIsSharingLocation(true);
        showFeedback('success', `Live GPS sharing active: [${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}] ±${coords.accuracy}m`);
      },
      (err) => {
        setLocationError(err.message);
        setIsSharingLocation(false);
        showFeedback('error', err.message);
      }
    );

    if (watchId != null) {
      watchIdRef.current = watchId;
      setIsSharingLocation(true);
    }
  };

  // Handle Stop Live GPS Sharing
  const handleStopSharing = () => {
    if (watchIdRef.current != null) {
      stopLiveGPSTracking(watchIdRef.current, activeTechnicianId);
      watchIdRef.current = null;
    }
    setIsSharingLocation(false);
    showFeedback('success', 'Location sharing paused. Geolocation watch cleared.');
  };

  // Field Movement Simulator (shifts coordinates by 0.002 degrees for live demo testing)
  const handleSimulateMovement = (deltaLat, deltaLng) => {
    const current = liveLocationData || {
      lat: technicianInfo.baseCoords.lat,
      lng: technicianInfo.baseCoords.lng,
      accuracy: 12,
    };

    const updated = {
      lat: parseFloat((current.lat + deltaLat).toFixed(5)),
      lng: parseFloat((current.lng + deltaLng).toFixed(5)),
      accuracy: 10,
      timestamp: new Date().toISOString(),
      source: 'LIVE_GPS',
      sharingActive: true,
    };

    setLiveLocationData(updated);
    setIsSharingLocation(true);
    publishTechnicianLocation(activeTechnicianId, updated);
    showFeedback('success', `Simulated movement: [${updated.lat}, ${updated.lng}] broadcasted to Dispatcher Map.`);
  };

  // Filter tasks assigned to this technician
  const assignedTasks = useMemo(() => {
    return workOrders.filter(wo => {
      const isAssigned = wo.assignedTechnicians?.includes(activeTechnicianId);
      if (!isAssigned) return false;
      if (statusFilter === 'All') return true;
      return wo.status === statusFilter;
    });
  }, [workOrders, activeTechnicianId, statusFilter]);

  // Active selected work order
  const activeWorkOrder = useMemo(() => {
    return workOrders.find(wo => wo.id === selectedTicketId) || assignedTasks[0] || workOrders[0];
  }, [workOrders, selectedTicketId, assignedTasks]);

  useEffect(() => {
    if (activeWorkOrder) {
      setDiagnosticNotesInput(activeWorkOrder.diagnosticNotes || '');
      setInspectionChecks({
        visual: !!activeWorkOrder.inspectionPassed,
        voltage: !!activeWorkOrder.inspectionPassed,
        calibration: !!activeWorkOrder.inspectionPassed,
      });
    }
  }, [activeWorkOrder]);

  const showFeedback = (type, message) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Status Lifecycle Update
  const handleUpdateStatus = async (newStatus) => {
    if (!activeWorkOrder) return;

    const opId = generateUUID();
    const nowIso = new Date().toISOString();

    const operation = {
      operationId: opId,
      ticketId: activeWorkOrder.id,
      technicianId: activeTechnicianId,
      entityType: 'workOrder',
      operationType: 'STATUS_UPDATE',
      fieldChanges: [
        { field: 'status', oldValue: activeWorkOrder.status, newValue: newStatus }
      ],
      payload: {
        inspectionPassed: inspectionChecks.visual && inspectionChecks.voltage && inspectionChecks.calibration,
        signOff: activeWorkOrder.signOff,
      },
      baseVersion: activeWorkOrder.version || 1,
      createdAt: nowIso,
      syncStatus: 'PENDING',
      resolutionStatus: 'UNASSESSED',
    };

    const auditEvent = {
      eventId: generateUUID(),
      operationId: opId,
      entityId: activeWorkOrder.id,
      actorId: activeTechnicianId,
      action: 'STATUS_UPDATE',
      previousValue: activeWorkOrder.status,
      proposedValue: newStatus,
      result: 'PENDING_OFFLINE',
      ruleId: null,
      reason: `Technician changed status from ${activeWorkOrder.status} to ${newStatus}`,
      createdAt: nowIso,
    };

    try {
      await saveOperationAtomic(operation, auditEvent);
      
      const updatedWo = {
        ...activeWorkOrder,
        status: newStatus,
        updatedAt: nowIso,
      };
      await updateLocalWorkOrder(updatedWo);

      await loadDataFromDB();
      showFeedback('success', `Status updated to "${newStatus}" and queued in local IndexedDB.`);
    } catch (err) {
      showFeedback('error', 'Failed to save update locally: ' + err.message);
    }
  };

  // Save Notes (Rule A)
  const handleSaveNotes = async () => {
    if (!activeWorkOrder) return;

    const opId = generateUUID();
    const nowIso = new Date().toISOString();

    const operation = {
      operationId: opId,
      ticketId: activeWorkOrder.id,
      technicianId: activeTechnicianId,
      entityType: 'workOrder',
      operationType: 'DIAGNOSTIC_NOTES_UPDATE',
      fieldChanges: [
        { field: 'diagnosticNotes', oldValue: activeWorkOrder.diagnosticNotes, newValue: diagnosticNotesInput }
      ],
      baseVersion: activeWorkOrder.version || 1,
      createdAt: nowIso,
      syncStatus: 'PENDING',
      resolutionStatus: 'UNASSESSED',
    };

    const auditEvent = {
      eventId: generateUUID(),
      operationId: opId,
      entityId: activeWorkOrder.id,
      actorId: activeTechnicianId,
      action: 'FIELD_UPDATE',
      previousValue: activeWorkOrder.diagnosticNotes,
      proposedValue: diagnosticNotesInput,
      result: 'PENDING_OFFLINE',
      ruleId: 'RULE_A_INDEPENDENT_FIELD_CHANGES',
      reason: 'Field diagnostic notes updated by technician',
      createdAt: nowIso,
    };

    try {
      await saveOperationAtomic(operation, auditEvent);
      
      const updatedWo = {
        ...activeWorkOrder,
        diagnosticNotes: diagnosticNotesInput,
        updatedAt: nowIso,
      };
      await updateLocalWorkOrder(updatedWo);

      await loadDataFromDB();
      showFeedback('success', 'Diagnostic notes saved locally in IndexedDB queue (Rule A safe merge candidate).');
    } catch (err) {
      showFeedback('error', 'Error saving notes: ' + err.message);
    }
  };

  // Parts Consumption (Rule D)
  const handleLogConsumption = async () => {
    if (!activeWorkOrder || !consumeQty || consumeQty <= 0) return;

    const opId = generateUUID();
    const nowIso = new Date().toISOString();

    const operation = {
      operationId: opId,
      ticketId: activeWorkOrder.id,
      technicianId: activeTechnicianId,
      entityType: 'inventory',
      operationType: 'PARTS_CONSUMPTION',
      partId: selectedPartId,
      quantity: Number(consumeQty),
      baseInventoryVersion: 1,
      createdAt: nowIso,
      syncStatus: 'PENDING',
      resolutionStatus: 'UNASSESSED',
    };

    const auditEvent = {
      eventId: generateUUID(),
      operationId: opId,
      entityId: selectedPartId,
      actorId: activeTechnicianId,
      action: 'PARTS_CONSUMPTION',
      previousValue: null,
      proposedValue: `Consume ${consumeQty} units for ${activeWorkOrder.id}`,
      result: 'PENDING_OFFLINE',
      ruleId: 'RULE_D_INVENTORY_SHORTAGE',
      reason: `${technicianInfo.name} reported consuming ${consumeQty} units of ${selectedPartId} while disconnected`,
      createdAt: nowIso,
    };

    try {
      await saveOperationAtomic(operation, auditEvent);

      const updatedWo = {
        ...activeWorkOrder,
        consumedParts: [
          ...(activeWorkOrder.consumedParts || []),
          {
            technicianId: activeTechnicianId,
            partId: selectedPartId,
            quantity: Number(consumeQty),
            timestamp: nowIso,
            localOnly: true,
          }
        ]
      };
      await updateLocalWorkOrder(updatedWo);

      await loadDataFromDB();
      showFeedback('success', `Logged consumption of ${consumeQty} units of ${selectedPartId}. Safely stored in IndexedDB.`);
    } catch (err) {
      showFeedback('error', 'Failed to log consumption: ' + err.message);
    }
  };

  // Complete Work Order (Rule F)
  const handleCompleteWorkOrder = async () => {
    if (!activeWorkOrder) return;

    const inspectionPassed = inspectionChecks.visual && inspectionChecks.voltage && inspectionChecks.calibration;
    
    if (!inspectionPassed) {
      showFeedback('error', 'Rule F Block: All 3 mandatory inspection checkpoints must be completed before completing work.');
      return;
    }

    if (!signOffName.trim()) {
      showFeedback('error', 'Rule F Block: Authorized technician sign-off signature is required.');
      return;
    }

    const opId = generateUUID();
    const nowIso = new Date().toISOString();
    const signOffPayload = {
      name: signOffName,
      signedAt: nowIso,
      technicianId: activeTechnicianId,
    };

    const operation = {
      operationId: opId,
      ticketId: activeWorkOrder.id,
      technicianId: activeTechnicianId,
      entityType: 'workOrder',
      operationType: 'WORK_ORDER_COMPLETION',
      fieldChanges: [
        { field: 'status', oldValue: activeWorkOrder.status, newValue: 'Completed' },
        { field: 'inspectionPassed', oldValue: false, newValue: true },
        { field: 'signOff', oldValue: null, newValue: signOffPayload }
      ],
      payload: {
        inspectionPassed: true,
        signOff: signOffPayload,
      },
      baseVersion: activeWorkOrder.version || 1,
      createdAt: nowIso,
      syncStatus: 'PENDING',
      resolutionStatus: 'UNASSESSED',
    };

    const auditEvent = {
      eventId: generateUUID(),
      operationId: opId,
      entityId: activeWorkOrder.id,
      actorId: activeTechnicianId,
      action: 'WORK_ORDER_COMPLETION',
      previousValue: activeWorkOrder.status,
      proposedValue: 'Completed',
      result: 'PENDING_OFFLINE',
      ruleId: 'RULE_F_STATUS_WORKFLOW',
      reason: `Sign-off completed by ${signOffName}. Work order completed.`,
      createdAt: nowIso,
    };

    try {
      await saveOperationAtomic(operation, auditEvent);

      const updatedWo = {
        ...activeWorkOrder,
        status: 'Completed',
        inspectionPassed: true,
        signOff: signOffPayload,
        updatedAt: nowIso,
      };
      await updateLocalWorkOrder(updatedWo);

      await loadDataFromDB();
      showFeedback('success', 'Work Order Completed & signed off! Queued for synchronization.');
    } catch (err) {
      showFeedback('error', 'Completion error: ' + err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-100 select-none text-xs">
      {/* A. Technician Header Banner */}
      <div className="bg-slate-900 text-slate-100 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <img 
            src={technicianInfo.avatar} 
            alt={technicianInfo.name} 
            className="w-9 h-9 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">{technicianInfo.name}</span>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                <HardHat className="w-3 h-3" />
                Technician Terminal
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Assigned Field Unit: <strong className="text-slate-300">{technicianInfo.role}</strong>
            </p>
          </div>
        </div>

        {/* Technician Profile Switcher */}
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-2.5 py-1 rounded-md">
          <span className="text-[11px] text-slate-400">Simulate Profile:</span>
          <select
            value={activeTechnicianId}
            onChange={(e) => setActiveTechnicianId(e.target.value)}
            className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
          >
            <option value="TECH-001" className="bg-slate-900 text-white">Technician A (Alex Ray)</option>
            <option value="TECH-006" className="bg-slate-900 text-white">Technician B (Teddy Taylor)</option>
          </select>
        </div>

        {/* Network Telemetry & Sync Status */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleSimulatedOffline}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition ${
              effectiveOnline
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                : 'bg-amber-950 text-amber-300 border-amber-600 animate-pulse'
            }`}
          >
            {effectiveOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline Field Mode Active</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>IndexedDB Queue:</span>
            <span className={`px-1.5 py-0.2 rounded font-bold ${
              pendingOpsCount > 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-300'
            }`}>
              {pendingOpsCount}
            </span>
          </div>

          <button
            onClick={async () => {
              await triggerSync();
              await loadDataFromDB();
            }}
            disabled={isSyncing || !effectiveOnline}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
              isSyncing
                ? 'bg-blue-800 text-white animate-pulse'
                : pendingOpsCount > 0
                ? 'bg-[#5AC445] text-slate-950 hover:bg-[#4db139] shadow-sm'
                : 'bg-slate-700 text-slate-300 hover:text-white'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync Now</span>
          </button>
        </div>
      </div>

      {/* Live GPS Telemetry & Location Sharing Control Bar */}
      <div className="bg-slate-800 text-slate-200 px-4 py-2 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Navigation className={`w-4 h-4 ${isSharingLocation ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <strong className="text-white text-xs">Live Technician GPS Telemetry:</strong>
          </div>

          <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
            isSharingLocation
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
              : 'bg-slate-700 text-slate-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isSharingLocation ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
            {isSharingLocation ? 'Transmitting Real GPS' : 'Sharing Paused (Opt-in required)'}
          </span>

          {liveLocationData && (
            <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-300 font-mono">
              <span>[{liveLocationData.lat.toFixed(5)}, {liveLocationData.lng.toFixed(5)}]</span>
              <span className="text-blue-300 font-sans">Accuracy: ±{liveLocationData.accuracy}m</span>
              <span className="text-slate-400 font-sans">Updated: {new Date(liveLocationData.timestamp).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Controls: Start/Stop Sharing + Demo Stepper */}
        <div className="flex items-center gap-2">
          {!isSharingLocation ? (
            <button
              onClick={handleStartSharing}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded transition flex items-center gap-1 shadow-xs"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Share My Live Location</span>
            </button>
          ) : (
            <button
              onClick={handleStopSharing}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition flex items-center gap-1 shadow-xs"
            >
              <span>Stop Sharing</span>
            </button>
          )}

          {/* Stepper for Desktop Simulation Verification */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px]">
            <span className="text-slate-400 mr-1">Simulate Move:</span>
            <button 
              onClick={() => handleSimulateMovement(0.002, 0)} 
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
              title="Move North"
            >
              ▲ N
            </button>
            <button 
              onClick={() => handleSimulateMovement(-0.002, 0)} 
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
              title="Move South"
            >
              ▼ S
            </button>
            <button 
              onClick={() => handleSimulateMovement(0, 0.002)} 
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
              title="Move East"
            >
              ► E
            </button>
            <button 
              onClick={() => handleSimulateMovement(0, -0.002)} 
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
              title="Move West"
            >
              ◄ W
            </button>
          </div>
        </div>
      </div>

      {/* Offline Alert Strip */}
      {!effectiveOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-between border-b border-amber-600">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>OPERATING IN OFFLINE MODE — All edits, checklist updates, and parts consumptions are safely saved to local IndexedDB storage.</span>
          </div>
          <span className="text-[11px] underline cursor-pointer" onClick={toggleSimulatedOffline}>
            Reconnect Link
          </span>
        </div>
      )}

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className={`px-4 py-2 text-xs font-medium flex items-center justify-between border-b ${
          actionNotice.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
            : 'bg-red-50 text-red-900 border-red-200'
        }`}>
          <span>{actionNotice.message}</span>
          <button onClick={() => setActionNotice(null)} className="font-bold ml-2">×</button>
        </div>
      )}

      {/* Main Split Layout: Left Assigned Tasks + Right Execution Station */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* B. My Tasks Left List (~300px) */}
        <div className="w-76 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-xs">Assigned Work Orders</h2>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                {assignedTasks.length} Assigned
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1 text-[10px]">
              {['All', 'Assigned', 'In Progress', 'Completed'].map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2 py-0.5 rounded transition ${
                    statusFilter === f
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Work Orders List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {assignedTasks.map((wo) => {
              const isSelected = activeWorkOrder?.id === wo.id;
              const hasLocalPending = localPendingOps.some(op => op.ticketId === wo.id);

              return (
                <div
                  key={wo.id}
                  onClick={() => setSelectedTicketId(wo.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/60 border-blue-500 shadow-xs ring-1 ring-blue-500/30'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-blue-700 font-mono">{wo.id}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                      wo.priority === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {wo.priority}
                    </span>
                  </div>

                  <h3 className="font-semibold text-slate-900 text-xs mt-1 leading-snug line-clamp-2">
                    {wo.title}
                  </h3>

                  <p className="text-[10px] text-slate-500 mt-1">
                    Equip: <strong className="text-slate-700">{wo.equipmentId}</strong> • Ver: <strong>v{wo.version || 1}</strong>
                  </p>

                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="font-medium text-slate-700">{wo.status}</span>
                    
                    {hasLocalPending ? (
                      <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1 rounded font-semibold flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        Pending Local Sync
                      </span>
                    ) : (
                      <span className="text-emerald-700 bg-emerald-50 px-1 rounded font-medium">
                        Synced
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {assignedTasks.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-xs">
                No work orders match the selected filter.
              </div>
            )}
          </div>
        </div>

        {/* C. Work-Order Execution Detail Station */}
        {activeWorkOrder ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Ticket Header & Status Controls */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 text-blue-800">
                      {activeWorkOrder.id}
                    </span>
                    <span className="text-xs text-slate-500">
                      Ref: <strong className="text-slate-800">{activeWorkOrder.externalId || activeWorkOrder.id}</strong>
                    </span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Base Version: <strong>v{activeWorkOrder.version || 1}</strong>
                    </span>
                  </div>
                  <h1 className="text-lg font-bold text-slate-900 mt-1">
                    {activeWorkOrder.title}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Location: <strong className="text-slate-700">{activeWorkOrder.location}</strong> • SLA: <strong className="text-slate-700">{activeWorkOrder.sla || '2 hours'}</strong>
                  </p>
                </div>

                {/* Status Action Buttons */}
                <div className="flex items-center gap-2">
                  {activeWorkOrder.status === 'Assigned' && (
                    <button
                      onClick={() => handleUpdateStatus('In Progress')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Work</span>
                    </button>
                  )}

                  {activeWorkOrder.status === 'In Progress' && (
                    <button
                      onClick={() => handleUpdateStatus('Paused')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Work</span>
                    </button>
                  )}

                  {activeWorkOrder.status === 'Paused' && (
                    <button
                      onClick={() => handleUpdateStatus('In Progress')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume Work</span>
                    </button>
                  )}

                  {activeWorkOrder.status === 'Completed' && (
                    <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 font-semibold rounded flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Completed & Signed Off</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Diagnostic Notes Editor (Rule A Independent Changes) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Field Diagnostic Notes & Logs (Rule A Safe Merge)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Independent field edit candidate
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={diagnosticNotesInput}
                  onChange={(e) => setDiagnosticNotesInput(e.target.value)}
                  placeholder="Record observations, measurements, equipment condition..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotes}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded transition flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    <span>Save Notes to Local Queue</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Parts Consumption Station (Crucial for Rule D: Inventory Shortage) */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-600" />
                    Record Parts Consumption (Rule D Demonstration)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Report parts consumed during service. Updates queue in IndexedDB and reconcile against central stock.
                  </p>
                </div>
                <div className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                  Authoritative SENSOR-S20 Stock: 5 Units
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Select Part</label>
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800 font-medium"
                  >
                    {inventoryList.map(inv => (
                      <option key={inv.partId} value={inv.partId}>
                        {inv.partId} — {inv.name} (Stock: {inv.authoritativeStock})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Quantity Consumed</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={consumeQty}
                    onChange={(e) => setConsumeQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800 font-semibold"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleLogConsumption}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded transition flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log {consumeQty} Units (Offline Queue)</span>
                  </button>
                </div>
              </div>

              {/* Consumed History on Ticket */}
              {activeWorkOrder.consumedParts?.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Locally Recorded Consumptions:
                  </span>
                  <div className="space-y-1">
                    {activeWorkOrder.consumedParts.map((cp, idx) => (
                      <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-slate-800 font-medium">
                          {cp.partId} × {cp.quantity} units
                        </span>
                        <span className="text-slate-500">
                          By: <strong className="text-slate-700">{cp.technicianId}</strong> • {new Date(cp.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Inspection Checklist & Sign-Off (Rule F Prerequisite) */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
              <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Mandatory Safety Inspection & Sign-Off (Rule F)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Rule F prevents work-order completion if any inspection checkbox or technician sign-off is omitted.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={inspectionChecks.visual}
                    onChange={(e) => setInspectionChecks(prev => ({ ...prev, visual: e.target.checked }))}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">1. Optical Lens Check</span>
                    <span className="text-[10px] text-slate-500">Inspect physical lens for micro-fractures</span>
                  </div>
                </label>

                <label className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={inspectionChecks.voltage}
                    onChange={(e) => setInspectionChecks(prev => ({ ...prev, voltage: e.target.checked }))}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">2. Input Voltage Check</span>
                    <span className="text-[10px] text-slate-500">Ensure 24V supply meets calibration limits</span>
                  </div>
                </label>

                <label className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={inspectionChecks.calibration}
                    onChange={(e) => setInspectionChecks(prev => ({ ...prev, calibration: e.target.checked }))}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">3. Telemetry Stream OK</span>
                    <span className="text-[10px] text-slate-500">Confirm optical data transmits without jitter</span>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="w-full sm:w-72">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Technician Signature / Name:
                  </label>
                  <input
                    type="text"
                    value={signOffName}
                    onChange={(e) => setSignOffName(e.target.value)}
                    placeholder="Enter full name for legal audit"
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800 font-semibold"
                  />
                </div>

                <button
                  onClick={handleCompleteWorkOrder}
                  disabled={activeWorkOrder.status === 'Completed'}
                  className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md transition flex items-center justify-center gap-2 shadow-2xs disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Completion & Sign-Off</span>
                </button>
              </div>
            </div>

            {/* Audit History Ledger for this Ticket */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-slate-600" />
                  Operation & Audit Trail (Append-Only Event Ledger)
                </h3>
                <span className="text-[10px] text-slate-400">Non-repudiation log</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {auditList
                  .filter(evt => evt.entityId === activeWorkOrder.id || evt.entityId === 'SENSOR-S20')
                  .map(evt => (
                    <div key={evt.eventId} className="py-2 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-semibold text-slate-800 font-mono text-[10px] bg-slate-100 px-1 py-0.2 rounded mr-1.5">
                          {evt.action}
                        </span>
                        <span className="text-slate-600">{evt.reason || evt.proposedValue}</span>
                      </div>
                      <div className="text-slate-400 text-[10px]">
                        By <strong className="text-slate-600">{evt.actorId}</strong> • {new Date(evt.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-xs">
            Select a work order from the left column to open execution controls.
          </div>
        )}
      </div>
    </div>
  );
}
