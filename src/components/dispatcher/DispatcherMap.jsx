import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Users, 
  ClipboardList, 
  Maximize2, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  WifiOff, 
  Layers, 
  Crosshair, 
  ShieldAlert, 
  ChevronRight, 
  Info,
  Navigation,
  Radio,
  Compass
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { INITIAL_PENDING_TASKS, TECHNICIANS, SCHEDULED_FIELD_TASKS } from '../../data/mockData';
import { getLocationFreshness } from '../../services/liveLocationService';

// Map Auto-Controller to handle fitBounds, resizing, and fly-to selection/centering
function MapController({ selectedCoords, centeredCoords, allCoords, triggerFit }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  // Center on selected task coordinates
  useEffect(() => {
    if (selectedCoords && selectedCoords.lat && selectedCoords.lng) {
      map.flyTo([selectedCoords.lat, selectedCoords.lng], 14, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [map, selectedCoords]);

  // Center on technician coordinates when requested
  useEffect(() => {
    if (centeredCoords && centeredCoords.lat && centeredCoords.lng) {
      map.flyTo([centeredCoords.lat, centeredCoords.lng], centeredCoords.zoom || 15, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [map, centeredCoords]);

  // Zoom-to-fit all markers
  useEffect(() => {
    if (triggerFit && allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords.map(c => [c.lat, c.lng]));
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
    }
  }, [map, triggerFit, allCoords]);

  return null;
}

// Generate Custom Leaflet HTML DivIcons with Live GPS Status Rings
function createTechnicianIcon(tech, locationMeta, isSelected) {
  const freshness = getLocationFreshness(locationMeta?.timestamp);
  const isLive = locationMeta?.sharingActive || locationMeta?.source === 'LIVE_GPS';

  let ringColor = '#94a3b8'; // Gray (unavailable / stopped)
  let ringClasses = 'border-slate-300';

  if (freshness === 'FRESH' && isLive) {
    ringColor = '#10B981'; // Green
    ringClasses = 'border-emerald-500 ring-2 ring-emerald-300';
  } else if (freshness === 'STALE') {
    ringColor = '#F59E0B'; // Amber
    ringClasses = 'border-amber-500 ring-2 ring-amber-200';
  }

  const html = `
    <div class="relative group cursor-pointer flex items-center justify-center">
      ${isLive && freshness === 'FRESH' ? `
        <span class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-emerald-400 opacity-60"></span>
      ` : ''}
      <div class="w-8 h-8 rounded-full border-2 ${ringClasses} shadow-md bg-slate-900 overflow-hidden relative z-10 flex items-center justify-center">
        ${tech.avatar ? `
          <img src="${tech.avatar}" alt="${tech.name}" class="w-full h-full object-cover" />
        ` : `
          <span class="text-[10px] font-bold text-white">${tech.initials}</span>
        `}
      </div>
      <span 
        class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white z-20 shadow-xs" 
        style="background-color: ${ringColor}"
        title="Telemetry: ${freshness}"
      ></span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-tech-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function createWorkOrderIcon(task, isSelected) {
  let badgeClass = 'bg-blue-600 border-white text-white';
  let badgeLabel = task.id.replace('WOT00100', '#');

  if (task.priority === 'P1' || task.priority === 'Critical') {
    badgeClass = 'bg-[#EA580C] border-white text-white font-black';
    badgeLabel = 'P1';
  } else if (task.hasConflict) {
    badgeClass = 'bg-red-600 border-white text-white';
    badgeLabel = '!';
  } else if (task.status === 'Completed') {
    badgeClass = 'bg-emerald-600 border-white text-white';
    badgeLabel = '✓';
  }

  const html = `
    <div class="relative cursor-pointer flex items-center justify-center ${isSelected ? 'scale-125 z-30' : 'z-20'} transition-transform">
      ${isSelected ? `
        <span class="absolute -inset-1 rounded-md bg-blue-500 opacity-40 animate-pulse"></span>
      ` : ''}
      <div class="px-1.5 py-0.5 rounded shadow-md border text-[10px] font-bold flex items-center justify-center tracking-tight ${badgeClass}">
        ${badgeLabel}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-wo-marker',
    iconSize: [32, 22],
    iconAnchor: [16, 11],
    popupAnchor: [0, -12],
  });
}

export default function DispatcherMap({ 
  selectedTaskId, 
  onSelectMarker,
  onInspectTask
}) {
  const { 
    effectiveOnline, 
    technicianLocations, 
    centeredCoords, 
    setCenteredCoords,
    centerMapOnTechnician 
  } = useApp();

  const [mapLayer, setMapLayer] = useState('osm'); // 'osm' or 'satellite'
  const [showTechnicians, setShowTechnicians] = useState(true);
  const [showWorkOrders, setShowWorkOrders] = useState(true);
  const [fitTrigger, setFitTrigger] = useState(0);

  // Default initial center: San Francisco downtown
  const SF_CENTER = [37.7749, -122.4194];

  // Combine pending tasks and scheduled field tasks
  const allTasks = useMemo(() => {
    return [...INITIAL_PENDING_TASKS, ...SCHEDULED_FIELD_TASKS];
  }, []);

  const validTasks = useMemo(() => {
    return allTasks.filter(t => t.coordinates && t.coordinates.lat && t.coordinates.lng);
  }, [allTasks]);

  // Merge baseline TECHNICIANS with live location telemetry from AppContext
  const dynamicTechnicians = useMemo(() => {
    return TECHNICIANS.map(tech => {
      const liveData = technicianLocations?.[tech.id];
      const lat = liveData?.lat ?? tech.coordinates.lat;
      const lng = liveData?.lng ?? tech.coordinates.lng;
      return {
        ...tech,
        coordinates: { lat, lng },
        liveMeta: liveData || {
          lat,
          lng,
          accuracy: 20,
          timestamp: tech.locationTimestamp,
          source: 'SEED',
          sharingActive: false,
        }
      };
    }).filter(t => t.coordinates && t.coordinates.lat && t.coordinates.lng);
  }, [technicianLocations]);

  // Selected task coordinates
  const selectedTaskCoords = useMemo(() => {
    const matched = allTasks.find(t => t.id === selectedTaskId);
    return matched?.coordinates || null;
  }, [allTasks, selectedTaskId]);

  // All coordinates for zoom-to-fit
  const allCoordinates = useMemo(() => {
    const coords = [];
    if (showWorkOrders) {
      validTasks.forEach(t => coords.push(t.coordinates));
    }
    if (showTechnicians) {
      dynamicTechnicians.forEach(t => coords.push(t.coordinates));
    }
    return coords;
  }, [validTasks, dynamicTechnicians, showWorkOrders, showTechnicians]);

  return (
    <div className="h-64 relative w-full overflow-hidden bg-[#E5E3DF] border-b border-slate-300 select-none">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-2.5 left-3 z-[1000] flex items-center gap-2">
        {/* Map / Satellite Layer Toggle */}
        <div className="flex shadow-sm rounded overflow-hidden border border-slate-300 bg-white text-xs font-medium">
          <button
            onClick={() => setMapLayer('osm')}
            className={`px-2.5 py-1 transition ${
              mapLayer === 'osm'
                ? 'bg-slate-800 text-white font-semibold'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            OpenStreetMap
          </button>
          <button
            onClick={() => setMapLayer('satellite')}
            className={`px-2.5 py-1 border-l border-slate-300 transition ${
              mapLayer === 'satellite'
                ? 'bg-slate-800 text-white font-semibold'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            Satellite
          </button>
        </div>

        {/* Visibility Toggles */}
        <div className="hidden sm:flex items-center gap-1 bg-white/90 backdrop-blur-xs border border-slate-300 rounded px-2 py-0.5 text-[11px] text-slate-700 shadow-2xs">
          <label className="flex items-center gap-1 cursor-pointer hover:text-slate-900 pr-2 border-r border-slate-200">
            <input
              type="checkbox"
              checked={showTechnicians}
              onChange={(e) => setShowTechnicians(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer w-3 h-3"
            />
            <span>Techs ({dynamicTechnicians.length})</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer hover:text-slate-900 pl-1">
            <input
              type="checkbox"
              checked={showWorkOrders}
              onChange={(e) => setShowWorkOrders(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer w-3 h-3"
            />
            <span>Tasks ({validTasks.length})</span>
          </label>
        </div>

        {/* Fit Bounds Action */}
        <button
          onClick={() => setFitTrigger(prev => prev + 1)}
          className="bg-white/90 hover:bg-white text-slate-700 border border-slate-300 rounded p-1 shadow-2xs transition"
          title="Zoom to Fit All Visible Markers"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Freshness Legend Bar in Bottom Right */}
      <div className="absolute bottom-2 right-12 z-[1000] bg-white/95 backdrop-blur-xs border border-slate-300 rounded px-2.5 py-1 text-[10px] text-slate-700 shadow-sm flex items-center gap-3">
        <span className="font-semibold text-slate-900">GPS Telemetry:</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Live (&lt;2m)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span> Stale (&lt;10m)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span> Offline
        </span>
      </div>

      {/* Offline Mode Warning Banner */}
      {!effectiveOnline && (
        <div className="absolute top-2.5 right-3 z-[1000] bg-amber-500 text-slate-950 font-bold px-2.5 py-1 rounded text-[11px] shadow-md border border-amber-600 flex items-center gap-1.5 animate-pulse">
          <WifiOff className="w-3 h-3" />
          <span>Offline — Cached Map</span>
        </div>
      )}

      {/* React Leaflet Map Container */}
      <MapContainer
        center={SF_CENTER}
        zoom={12}
        scrollWheelZoom={true}
        zoomControl={true}
        className="h-full w-full z-0"
      >
        {mapLayer === 'osm' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        ) : (
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={18}
          />
        )}

        {/* Map Controller for programmatic updates */}
        <MapController 
          selectedCoords={selectedTaskCoords}
          centeredCoords={centeredCoords}
          allCoords={allCoordinates}
          triggerFit={fitTrigger}
        />

        {/* 1. Dynamic Technician Markers with Live GPS Position */}
        {showTechnicians && dynamicTechnicians.map((tech) => {
          const locMeta = tech.liveMeta;
          const freshness = getLocationFreshness(locMeta?.timestamp);
          const isLive = locMeta?.sharingActive || locMeta?.source === 'LIVE_GPS';

          return (
            <Marker
              key={tech.id}
              position={[tech.coordinates.lat, tech.coordinates.lng]}
              icon={createTechnicianIcon(tech, locMeta, false)}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-3 w-72 text-xs select-none space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <img 
                        src={tech.avatar} 
                        alt={tech.name} 
                        className="w-8 h-8 rounded-full object-cover border border-slate-200" 
                      />
                      <div>
                        <h4 className="font-bold text-slate-900">{tech.name}</h4>
                        <span className="text-[10px] text-slate-500">{tech.role}</span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                      freshness === 'FRESH' && isLive
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : freshness === 'STALE'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        freshness === 'FRESH' && isLive ? 'bg-emerald-500 animate-pulse' : freshness === 'STALE' ? 'bg-amber-500' : 'bg-slate-400'
                      }`}></span>
                      {isLive ? 'Live GPS' : 'Cached Location'}
                    </span>
                  </div>

                  <div className="py-1 space-y-1 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <strong className="text-emerald-700">{tech.status}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Coordinates:</span>
                      <span className="font-mono text-slate-800 text-[10px]">
                        [{tech.coordinates.lat.toFixed(5)}, {tech.coordinates.lng.toFixed(5)}]
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">GPS Accuracy:</span>
                      <span className="text-blue-700 font-medium">
                        ±{locMeta?.accuracy || 15} meters
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[10px]">
                      <span>Telemetry Timestamp:</span>
                      <span>
                        {locMeta?.timestamp ? new Date(locMeta.timestamp).toLocaleTimeString() : 'Recent'}
                      </span>
                    </div>
                  </div>

                  {tech.schedule?.length > 0 && (
                    <div className="p-1.5 bg-slate-50 rounded border border-slate-100 text-[10px] text-slate-600">
                      <span>Active Task: </span>
                      <strong className="text-slate-800">{tech.schedule[0].title}</strong> ({tech.schedule[0].taskId})
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => centerMapOnTechnician(tech.id)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-medium text-[10px] rounded transition flex items-center gap-1"
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>Center Map</span>
                    </button>
                    <span className="text-[10px] text-slate-400 italic">
                      {isLive ? 'Transmitting' : 'Opt-in required'}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 2. Work Order Markers */}
        {showWorkOrders && validTasks.map((task) => {
          const isSelected = selectedTaskId === task.id;

          return (
            <Marker
              key={task.id}
              position={[task.coordinates.lat, task.coordinates.lng]}
              icon={createWorkOrderIcon(task, isSelected)}
              eventHandlers={{
                click: () => onSelectMarker?.(task)
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-3 w-64 text-xs select-none space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="font-mono font-bold text-blue-700 text-[11px]">{task.id}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                      task.priority === 'P1' || task.priority === 'Critical' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {task.priority || 'Standard'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 leading-snug">{task.title}</h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {task.location}
                    </p>
                  </div>

                  {task.hasConflict && (
                    <div className="p-1.5 rounded bg-red-50 border border-red-200 text-red-800 text-[10px] flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-red-600 shrink-0" />
                      <span>Inventory Discrepancy (Rule D)</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-medium">Status: {task.status}</span>
                    <button
                      onClick={() => onInspectTask?.(task)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-[10px] rounded transition flex items-center gap-0.5"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
