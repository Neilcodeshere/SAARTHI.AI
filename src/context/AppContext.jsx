import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  seedInitialDataIfEmpty, 
  getPendingOperations, 
  getSyncMetadata 
} from '../services/db';
import { runSynchronization } from '../services/syncService';
import { TECHNICIANS } from '../data/mockData';
import { 
  subscribeToLiveLocations, 
  publishTechnicianLocation, 
  getAllLiveLocations 
} from '../services/liveLocationService';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Current user role: 'Admin', 'Technician', or 'Supervisor'
  const [currentRole, setCurrentRole] = useState('Admin');

  // Active Technician Profile for Technician Workspace simulation
  const [activeTechnicianId, setActiveTechnicianId] = useState('TECH-001'); // Alex Ray default

  // Real browser network connectivity
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Simulated offline toggle for field simulation demo
  const [simulatedOffline, setSimulatedOffline] = useState(false);

  // Pending operations count from persistent IndexedDB queue
  const [pendingOpsCount, setPendingOpsCount] = useState(0);

  // Last successful synchronization timestamp
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Unread notifications count
  const [notificationsCount, setNotificationsCount] = useState(4);

  // Onboarding tour popover state
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Conflict review modal state
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  // Real-time technician GPS tracking state
  // Initialized from baseline TECHNICIANS seed, dynamically updated by live GPS
  const [technicianLocations, setTechnicianLocations] = useState(() => {
    const initialMap = {};
    TECHNICIANS.forEach(t => {
      initialMap[t.id] = {
        lat: t.coordinates.lat,
        lng: t.coordinates.lng,
        accuracy: 15,
        timestamp: t.locationTimestamp || new Date().toISOString(),
        currentLocation: t.currentLocation,
        source: 'SEED',
        sharingActive: false,
      };
    });
    return initialMap;
  });

  // Track map centering request for a specific technician
  const [centeredCoords, setCenteredCoords] = useState(null);

  // Subscribe to real-time GPS telemetry from liveLocationService
  useEffect(() => {
    const unsubscribe = subscribeToLiveLocations((technicianId, newLocation) => {
      setTechnicianLocations(prev => ({
        ...prev,
        [technicianId]: {
          ...prev[technicianId],
          ...newLocation,
          sharingActive: newLocation.sharingActive !== false,
        }
      }));
    });
    return unsubscribe;
  }, []);

  // Refresh pending count directly from IndexedDB
  const refreshPendingCount = useCallback(async () => {
    try {
      const ops = await getPendingOperations();
      setPendingOpsCount(ops.length);
      const meta = await getSyncMetadata();
      if (meta?.lastSuccessfulSync) {
        setLastSyncTime(meta.lastSuccessfulSync);
      }
    } catch (err) {
      console.warn('Error reading IndexedDB pending count:', err);
    }
  }, []);

  // Initialize DB and seed baseline demo state
  useEffect(() => {
    async function init() {
      try {
        await seedInitialDataIfEmpty();
        await refreshPendingCount();
      } catch (err) {
        console.error('Failed to initialize FieldSync DB:', err);
      }
    }
    init();
  }, [refreshPendingCount]);

  // Online / Offline hardware event listeners
  useEffect(() => {
    const handleOnline = () => {
      setBrowserOnline(true);
      if (!simulatedOffline) {
        triggerSync();
      }
    };
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [simulatedOffline]);

  // Effective network status considers both browser connectivity and simulated offline mode
  const effectiveOnline = browserOnline && !simulatedOffline;

  // Manual or automatic synchronization trigger
  const triggerSync = async () => {
    if (!effectiveOnline) {
      setSyncResult({
        success: false,
        message: 'Cannot synchronize while in offline mode. Restore link first.'
      });
      return;
    }

    setIsSyncing(true);
    try {
      const result = await runSynchronization();
      setSyncResult(result);
      await refreshPendingCount();
      return result;
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncResult({
        success: false,
        message: 'Sync error: ' + err.message
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const centerMapOnTechnician = (techId) => {
    const loc = technicianLocations[techId];
    if (loc && loc.lat && loc.lng) {
      setCenteredCoords({ lat: loc.lat, lng: loc.lng, zoom: 15, key: Date.now() });
    }
  };

  const value = {
    currentRole,
    setCurrentRole,
    activeTechnicianId,
    setActiveTechnicianId,
    browserOnline,
    simulatedOffline,
    setSimulatedOffline,
    toggleSimulatedOffline: () => setSimulatedOffline(prev => !prev),
    effectiveOnline,
    pendingOpsCount,
    setPendingOpsCount,
    refreshPendingCount,
    lastSyncTime,
    isSyncing,
    syncResult,
    triggerSync,
    searchQuery,
    setSearchQuery,
    notificationsCount,
    setNotificationsCount,
    isTourOpen,
    setIsTourOpen,
    isConflictModalOpen,
    setIsConflictModalOpen,
    // Live Location Telemetry
    technicianLocations,
    centeredCoords,
    setCenteredCoords,
    centerMapOnTechnician,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
