import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { actorName, DEPOT } from '../data/seed.js';
import { STATUS_STYLE } from '../lib/format.js';

// Navi Mumbai — fits Airoli (north) to CBD Belapur / Kharghar (south).
const BOUNDS = [[19.005, 72.975], [19.170, 73.080]];

export default function ServiceMap({ tickets, selectedId, onSelect }) {
  const [tiles, setTiles] = useState('loading'); // loading | ok | error

  return (
    <div className="relative h-full min-h-[320px] overflow-hidden rounded-lg ring-1 ring-slate-200">
      <MapContainer bounds={BOUNDS} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
          eventHandlers={{
            load: () => setTiles('ok'),
            tileload: () => setTiles(s => (s === 'error' ? s : 'ok')),
            tileerror: () => setTiles(s => (s === 'ok' ? s : 'error')),
          }}
        />
        <CircleMarker center={[DEPOT.lat, DEPOT.lng]} radius={6} pathOptions={{ color: '#334155', fillColor: '#fff', fillOpacity: 1, weight: 2 }}>
          <Tooltip>{DEPOT.name} · {DEPOT.area}</Tooltip>
        </CircleMarker>
        {tickets.map(t => {
          const selected = t.id === selectedId;
          const color = STATUS_STYLE[t.status]?.color || '#475569';
          return (
            <CircleMarker
              key={t.id}
              center={[t.lat, t.lng]}
              radius={selected ? 11 : 8}
              pathOptions={{ color: selected ? '#0f172a' : '#fff', weight: selected ? 3 : 2, fillColor: color, fillOpacity: 0.95 }}
              eventHandlers={{ click: () => onSelect(t.id) }}
            >
              <Popup>
                <div className="text-xs leading-5">
                  <div className="font-semibold">{t.id} · {t.appliance}</div>
                  <div>{t.model}</div>
                  <div>Status: <b>{t.status}</b></div>
                  <div>Technician: {t.assigned.map(actorName).join(', ')}</div>
                  <div>Area: {t.area}, Navi Mumbai</div>
                  <div className="text-slate-500">Simulated demo location</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute right-2 top-2 z-[400] rounded-md bg-white/95 px-2 py-1.5 text-[11px] shadow ring-1 ring-slate-200">
        {Object.entries(STATUS_STYLE).map(([s, { color }]) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            {s}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-slate-700 bg-white" />
          Parts depot
        </div>
      </div>

      {tiles !== 'ok' && (
        <div className="absolute inset-x-2 bottom-8 z-[400] rounded-md bg-white/95 px-3 py-2 text-xs text-slate-700 shadow ring-1 ring-slate-200">
          {tiles === 'loading'
            ? 'Loading OpenStreetMap tiles…'
            : 'Map tiles unavailable (offline?). Ticket markers, sync and conflict resolution keep working: tiles are not cached offline.'}
        </div>
      )}
    </div>
  );
}
