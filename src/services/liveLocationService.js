/**
 * FieldSync Live Technician Geolocation Service
 * Captures real GPS telemetry using navigator.geolocation.watchPosition(),
 * validates coordinates, evaluates freshness, and broadcasts updates across
 * application contexts and browser windows via BroadcastChannel.
 */

// Global state for live technician tracking
const liveLocations = new Map(); // technicianId -> { lat, lng, accuracy, timestamp, source: 'LIVE'|'SEED' }
const subscribers = new Set();
let broadcastChannel = null;

// Initialize cross-tab BroadcastChannel if supported
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('fieldsync_live_gps');
    broadcastChannel.onmessage = (event) => {
      const { technicianId, location } = event.data || {};
      if (technicianId && location) {
        liveLocations.set(technicianId, location);
        notifySubscribers(technicianId, location);
      }
    };
  } catch (err) {
    console.warn('BroadcastChannel initialization fallback:', err);
  }
}

function notifySubscribers(technicianId, location) {
  subscribers.forEach((callback) => {
    try {
      callback(technicianId, location);
    } catch (err) {
      console.error('Subscriber callback error:', err);
    }
  });
}

/**
 * Validates coordinate numbers.
 */
export function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Evaluates location freshness based on timestamp.
 * @param {string|number|Date} timestamp 
 * @returns {'FRESH' | 'STALE' | 'UNAVAILABLE'}
 */
export function getLocationFreshness(timestamp) {
  if (!timestamp) return 'UNAVAILABLE';
  const ageMs = Date.now() - new Date(timestamp).getTime();
  if (ageMs < 120000) return 'FRESH'; // < 2 minutes
  if (ageMs < 600000) return 'STALE'; // 2 - 10 minutes
  return 'UNAVAILABLE'; // > 10 minutes
}

/**
 * Subscribes a React component to live location changes.
 * @param {Function} callback - (technicianId, location) => void
 * @returns {Function} unsubscribe function
 */
export function subscribeToLiveLocations(callback) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Returns latest known live location for a technician.
 * @param {string} technicianId 
 */
export function getTechnicianLiveLocation(technicianId) {
  return liveLocations.get(technicianId) || null;
}

/**
 * Returns a map of all live technicians.
 */
export function getAllLiveLocations() {
  return new Map(liveLocations);
}

/**
 * Publishes a technician's live location and broadcasts across tabs/contexts.
 */
export function publishTechnicianLocation(technicianId, location) {
  if (!technicianId || !location || !isValidCoordinate(location.lat, location.lng)) {
    return false;
  }

  const payload = {
    ...location,
    timestamp: location.timestamp || new Date().toISOString(),
    source: location.source || 'LIVE_GPS',
  };

  liveLocations.set(technicianId, payload);

  // Broadcast to other tabs if available
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ technicianId, location: payload });
    } catch (err) {
      console.warn('BroadcastChannel postMessage error:', err);
    }
  }

  // Also cache to localStorage for resilience
  try {
    localStorage.setItem(`fieldsync_gps_${technicianId}`, JSON.stringify(payload));
  } catch (e) {
    // ignore storage quota errors
  }

  notifySubscribers(technicianId, payload);
  return true;
}

/**
 * Starts watching real device GPS using navigator.geolocation.watchPosition.
 * Explicitly requires technician opt-in.
 * 
 * @param {string} technicianId 
 * @param {Object} options 
 * @param {Function} onUpdate - (coords) => void
 * @param {Function} onError - (error) => void
 * @returns {number|null} watchId or null if unsupported
 */
export function startLiveGPSTracking(technicianId, onUpdate, onError) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    if (onError) onError(new Error('Geolocation is not supported by your browser.'));
    return null;
  }

  const geoOptions = {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 15000,
  };

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy, heading, speed } = position.coords;

      if (!isValidCoordinate(latitude, longitude)) {
        if (onError) onError(new Error('Received invalid latitude/longitude from GPS.'));
        return;
      }

      const locationPayload = {
        lat: latitude,
        lng: longitude,
        accuracy: Math.round(accuracy),
        heading,
        speed,
        timestamp: new Date(position.timestamp).toISOString(),
        source: 'LIVE_GPS',
      };

      publishTechnicianLocation(technicianId, locationPayload);
      if (onUpdate) onUpdate(locationPayload);
    },
    (err) => {
      let message = 'Unable to retrieve location.';
      switch (err.code) {
        case err.PERMISSION_DENIED:
          message = 'Location access denied by user. Please allow location permissions in browser settings.';
          break;
        case err.POSITION_UNAVAILABLE:
          message = 'GPS position is currently unavailable.';
          break;
        case err.TIMEOUT:
          message = 'GPS location request timed out.';
          break;
        default:
          message = err.message || 'Unknown geolocation error.';
      }
      if (onError) onError(new Error(message));
    },
    geoOptions
  );

  return watchId;
}

/**
 * Clears the geolocation watch and notifies subscribers.
 * @param {number} watchId 
 */
export function stopLiveGPSTracking(watchId, technicianId) {
  if (typeof navigator !== 'undefined' && navigator.geolocation && watchId != null) {
    navigator.geolocation.clearWatch(watchId);
  }

  if (technicianId && liveLocations.has(technicianId)) {
    const existing = liveLocations.get(technicianId);
    const stoppedPayload = {
      ...existing,
      sharingActive: false,
      stoppedAt: new Date().toISOString(),
    };
    liveLocations.set(technicianId, stoppedPayload);
    notifySubscribers(technicianId, stoppedPayload);
  }
}
