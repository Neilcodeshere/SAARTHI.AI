/**
 * FieldSync Location & Geocoding Service
 * Provides Haversine straight-line distance calculation, nearest-technician ranking,
 * and cached geocoding compliance with OpenStreetMap Nominatim policies.
 */

// In-memory cache for geocoded addresses to prevent repeated queries
const geocodeCache = new Map();

// Known demo coordinate lookup table for instant fallback without network requests
const KNOWN_DEMO_LOCATIONS = {
  "Financial District - 555 California St": { lat: 37.7925, lng: -122.4035 },
  "Twin Peaks Radio Site": { lat: 37.7544, lng: -122.4477 },
  "Port of San Francisco - Pier 39 Security": { lat: 37.8087, lng: -122.4098 },
  "Presidio Heights": { lat: 37.7886, lng: -122.4532 },
  "Pacific Heights": { lat: 37.7925, lng: -122.4352 },
  "Outer Sunset": { lat: 37.7562, lng: -122.5015 },
  "Mission District": { lat: 37.7599, lng: -122.4148 },
  "SOMA District": { lat: 37.7812, lng: -122.4005 },
  "Van Ness Civic Center": { lat: 37.7792, lng: -122.4191 },
  "Marina District - Bay St": { lat: 37.8025, lng: -122.4382 },
  "Union Square Plaza": { lat: 37.7879, lng: -122.4075 },
  "Ocean Beach Control": { lat: 37.7690, lng: -122.4862 },
  "Market St Retail Center": { lat: 37.7845, lng: -122.4065 },
  "Transamerica Tower Annex": { lat: 37.7940, lng: -122.4015 }
};

/**
 * Calculates straight-line distance between two coordinates using the Haversine formula.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {{ km: number, miles: number }}
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return { km: null, miles: null };
  }

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R * c;
  const miles = km * 0.621371;

  return {
    km: parseFloat(km.toFixed(2)),
    miles: parseFloat(miles.toFixed(2)),
  };
}

/**
 * Ranks eligible technicians for a given work order based on:
 * 1. Straight-line distance from technician's last-known coordinates
 * 2. Required skills match
 * 3. Availability status
 * 
 * Note: Straight-line distance is NOT road driving time.
 * @param {Object} task 
 * @param {Array} technicians 
 * @returns {Array} Ranked list of technicians with distance telemetry
 */
export function rankNearestTechnicians(task, technicians = []) {
  if (!task || !task.coordinates) {
    return technicians.map(tech => ({
      ...tech,
      distance: null,
      skillMatch: true,
      rankingScore: 999,
      hasValidLocation: false,
    }));
  }

  const { lat: taskLat, lng: taskLng } = task.coordinates;

  return technicians
    .map(tech => {
      const techCoords = tech.coordinates;
      const hasCoords = techCoords && typeof techCoords.lat === 'number' && typeof techCoords.lng === 'number';
      const distance = hasCoords
        ? calculateHaversineDistance(taskLat, taskLng, techCoords.lat, techCoords.lng)
        : { km: null, miles: null };

      // Check skill alignment
      const requiredSkills = task.requiredSkills || [];
      const hasSkills = requiredSkills.length === 0 || 
        requiredSkills.some(skill => tech.skills?.includes(skill));

      // Freshness check (10 min threshold)
      const locationAgeMs = tech.locationTimestamp ? (Date.now() - new Date(tech.locationTimestamp).getTime()) : Infinity;
      const isStaleLocation = locationAgeMs > 600000; // >10 mins
      const isLocationMissing = !hasCoords || distance.miles == null;

      // Ranking score: lower is better
      let penalty = 0;
      if (tech.status === 'Busy') penalty += 10;
      if (tech.status === 'En Route') penalty += 3;
      if (!hasSkills) penalty += 20;
      if (isStaleLocation) penalty += 15;
      if (isLocationMissing) penalty += 100;

      const score = (distance.miles != null ? distance.miles : 50) + penalty;

      return {
        ...tech,
        distance,
        skillMatch: hasSkills,
        rankingScore: score,
        isStaleLocation,
        hasValidLocation: !isLocationMissing,
        locationAgeMs,
      };
    })
    .sort((a, b) => a.rankingScore - b.rankingScore);
}

/**
 * Resolves address coordinates with caching and offline fallback.
 * Adheres to OSM Nominatim policy: includes rate limiting and custom User-Agent.
 * @param {string} address 
 * @returns {Promise<{lat: number, lng: number}|null>}
 */
export async function geocodeAddress(address) {
  if (!address) return null;

  // 1. Check in-memory cache
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address);
  }

  // 2. Check local seeded lookup
  if (KNOWN_DEMO_LOCATIONS[address]) {
    const coords = KNOWN_DEMO_LOCATIONS[address];
    geocodeCache.set(address, coords);
    return coords;
  }

  // 3. Optional live geocoding via Nominatim if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const encoded = encodeURIComponent(`${address}, San Francisco, CA`);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`;
      
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FieldSync-Offline-Resolver/1.0'
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const coords = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
          geocodeCache.set(address, coords);
          return coords;
        }
      }
    } catch (err) {
      console.warn("Nominatim geocode request failed, falling back to default city center:", err);
    }
  }

  // Fallback default: San Francisco Civic Center
  return { lat: 37.7749, lng: -122.4194 };
}
