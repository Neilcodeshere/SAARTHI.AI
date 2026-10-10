import React, { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Clock, 
  Package, 
  FileText, 
  MapPin, 
  Calendar,
  ShieldCheck,
  ChevronRight,
  Compass,
  Sparkles,
  Info
} from 'lucide-react';
import { TECHNICIANS } from '../../data/mockData';
import { rankNearestTechnicians } from '../../services/locationService';
import { useApp } from '../../context/AppContext';

export default function TaskDetailModal({ 
  task, 
  isOpen, 
  onClose, 
  onAssignToTech, 
  onOpenConflictReview 
}) {
  const { technicianLocations } = useApp();
  const [assignmentSuccess, setAssignmentSuccess] = useState(false);
  const [assignedTechName, setAssignedTechName] = useState('');

  // Dynamically merge static technicians with real-time live GPS telemetry
  const dynamicTechnicians = useMemo(() => {
    return TECHNICIANS.map(tech => {
      const liveData = technicianLocations?.[tech.id];
      if (liveData && liveData.lat && liveData.lng) {
        return {
          ...tech,
          coordinates: { lat: liveData.lat, lng: liveData.lng },
          locationTimestamp: liveData.timestamp || tech.locationTimestamp,
          accuracy: liveData.accuracy,
          isLiveGPS: liveData.sharingActive || liveData.source === 'LIVE_GPS',
        };
      }
      return tech;
    });
  }, [technicianLocations]);

  // Calculate ranked nearest technicians based on coordinates and skill match
  const rankedTechnicians = useMemo(() => {
    return rankNearestTechnicians(task, dynamicTechnicians);
  }, [task, dynamicTechnicians]);

  const [selectedTechId, setSelectedTechId] = useState(rankedTechnicians[0]?.id || TECHNICIANS[0]?.id);

  if (!isOpen || !task) return null;

  const handleAssign = (techToAssign) => {
    const tech = techToAssign || TECHNICIANS.find(t => t.id === selectedTechId);
    if (tech) {
      setAssignedTechName(tech.name);
      onAssignToTech(task, tech);
      setAssignmentSuccess(true);
      setTimeout(() => {
        setAssignmentSuccess(false);
        onClose();
      }, 1400);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
              {task.id}
            </span>
            <span className="text-xs text-slate-500">
              Ticket: <strong className="text-slate-800">{task.ticketId || task.taskId || 'WO-101'}</strong>
            </span>
            {task.hasConflict && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-600" />
                Conflict Flagged
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {/* Title & Location */}
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {task.title}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {task.location || task.site || 'San Francisco Technicians'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                SLA: <strong className="text-slate-800">{task.sla || '2 hours'}</strong>
              </span>
              <span>
                Status: <strong className="text-blue-700">{task.status}</strong>
              </span>
              {task.coordinates && (
                <span className="text-slate-400 font-mono text-[10px]">
                  OSM Coords: [{task.coordinates.lat.toFixed(4)}, {task.coordinates.lng.toFixed(4)}]
                </span>
              )}
            </div>
          </div>

          {/* Diagnostic Notes */}
          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              Diagnostic Logs & Scope
            </span>
            <p className="text-slate-600 leading-relaxed">
              {task.diagnosticNotes || 'Standard maintenance protocol. Verify telemetry calibration after completion.'}
            </p>
          </div>

          {/* Required Parts & Inventory Status */}
          <div className="space-y-2">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-600" />
              Parts & Consumption Requirements
            </span>
            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 font-medium">
                  <tr>
                    <th className="p-2 border-b border-slate-200">Part ID</th>
                    <th className="p-2 border-b border-slate-200">Description</th>
                    <th className="p-2 border-b border-slate-200">Required Qty</th>
                    <th className="p-2 border-b border-slate-200">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {task.requiredParts?.map((p, idx) => (
                    <tr key={idx} className={p.partId === 'SENSOR-S20' ? 'bg-amber-50/70' : ''}>
                      <td className="p-2 font-mono font-medium">{p.partId}</td>
                      <td className="p-2">{p.name}</td>
                      <td className="p-2 font-semibold">{p.qty}</td>
                      <td className="p-2">
                        {p.partId === 'SENSOR-S20' ? (
                          <span className="text-amber-800 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Deficit (Stock: 5, Requested: 7)
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan="4" className="p-2 text-slate-400">No parts recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Conflict Flag Details Banner */}
          {task.hasConflict && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-md flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="font-bold text-red-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Deterministic Conflict Detected (Rule D)
                </span>
                <p className="text-red-700">
                  {task.conflictDetails?.description}
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenConflictReview?.();
                }}
                className="px-3 py-1.5 bg-red-600 text-white font-semibold rounded hover:bg-red-700 transition shrink-0"
              >
                Review Conflict →
              </button>
            </div>
          )}

          {/* Nearest-Technician Geolocation Recommendations */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-blue-600" />
                Nearest Technician Recommendations (Haversine Telemetry)
              </span>
              <span className="text-[10px] text-slate-500 italic">
                *Straight-line distance; not driving time
              </span>
            </div>

            <div className="space-y-2">
              {rankedTechnicians.slice(0, 3).map((tech, idx) => (
                <div 
                  key={tech.id}
                  className="p-2.5 bg-white border border-slate-200 rounded-md flex items-center justify-between hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0 border border-blue-200">
                      #{idx + 1}
                    </div>
                    <img 
                      src={tech.avatar} 
                      alt={tech.name} 
                      className="w-7 h-7 rounded-full object-cover border border-slate-200" 
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-900 text-xs">{tech.name}</strong>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                          tech.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {tech.status}
                        </span>
                        {tech.isLiveGPS && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live GPS
                          </span>
                        )}
                        {tech.isStaleLocation && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Stale Telemetry
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                        <span>Loc: <strong>{tech.currentLocation}</strong></span>
                        {tech.distance?.miles != null ? (
                          <span className="text-blue-700 font-medium">
                            {tech.distance.miles} mi ({tech.distance.km} km) straight-line
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            Distance unavailable
                          </span>
                        )}
                        <span>Updated: {tech.locationTimestamp ? new Date(tech.locationTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAssign(tech)}
                    disabled={assignmentSuccess}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] rounded transition shadow-2xs shrink-0"
                  >
                    Assign #{idx + 1}
                  </button>
                </div>
              ))}
            </div>

            {assignmentSuccess && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Work order assigned to {assignedTechName} and scheduled on timeline.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
