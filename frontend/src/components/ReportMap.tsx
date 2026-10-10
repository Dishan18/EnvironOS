import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { ReportItem } from '../types';
import { getPriorityColor, getStatusBadge } from '../utils/helpers';
import { MapPin, Navigation, AlertTriangle, CloudRain, Eye } from 'lucide-react';

interface ReportMapProps {
  reports: ReportItem[];
  selectedReport: ReportItem | null;
  onSelectReport: (report: ReportItem) => void;
  isPickingLocation?: boolean;
  pickedLocation?: { lat: number; lng: number } | null;
  onPickLocation?: (coords: { lat: number; lng: number }) => void;
}

// Custom SVG marker factory
function createCustomIcon(report: ReportItem, isSelected: boolean) {
  const pColor = getPriorityColor(report.priority);
  const isResolved = report.status === 'resolved';
  const isCritical = (report.priority || '').toLowerCase() === 'critical' && !isResolved;

  const bgHex = isResolved ? '#10b981' : pColor.hex;
  const pulseClass = isCritical ? 'marker-pulse-critical' : '';

  const html = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
      <div class="${pulseClass}" style="
        background: ${bgHex};
        width: ${isSelected ? '32px' : '26px'};
        height: ${isSelected ? '32px' : '26px'};
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: 11px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
      ">
        ${isResolved ? '✓' : report.risk_score}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function createPickerIcon() {
  const html = `
    <div style="
      background: #3b82f6;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 4px 10px rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'picker-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

// Controller to smoothly pan/zoom to selected report or fit bounds
function MapController({
  reports,
  selectedReport,
}: {
  reports: ReportItem[];
  selectedReport: ReportItem | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedReport) {
      const lat = Number(selectedReport.latitude);
      const lng = Number(selectedReport.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        map.flyTo([lat, lng], 15, { duration: 1.2 });
      }
    }
  }, [selectedReport, map]);

  useEffect(() => {
    if (!selectedReport && reports.length > 0) {
      const validCoords = reports
        .map((r) => [Number(r.latitude), Number(r.longitude)] as [number, number])
        .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));

      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
  }, [reports, selectedReport, map]);

  return null;
}

// Map events handler for clicking coordinates
function LocationPickerHandler({
  isPicking,
  onPick,
}: {
  isPicking?: boolean;
  onPick?: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      if (isPicking && onPick) {
        onPick({ lat: Number(e.latlng.lat.toFixed(5)), lng: Number(e.latlng.lng.toFixed(5)) });
      }
    },
  });
  return null;
}

export const ReportMap: React.FC<ReportMapProps> = ({
  reports,
  selectedReport,
  onSelectReport,
  isPickingLocation,
  pickedLocation,
  onPickLocation,
}) => {
  const defaultCenter: [number, number] = [12.9716, 77.5946]; // Bengaluru default

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Location Picker Banner overlay */}
      {isPickingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-blue-400/30 flex items-center gap-2 animate-bounce">
          <Navigation className="w-3.5 h-3.5" />
          Click anywhere on the map to set blockage coordinates
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-800/80 p-3 rounded-lg shadow-xl text-xs space-y-1.5 hidden sm:block">
        <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Priority Legend (Score 0-100)
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
          <span>Critical (75–100)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
          <span>High (50–74)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50"></span>
          <span>Moderate (25–49)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
          <span>Low (0–24) / Resolved</span>
        </div>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="w-full h-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapController reports={reports} selectedReport={selectedReport} />
        <LocationPickerHandler isPicking={isPickingLocation} onPick={onPickLocation} />

        {/* Temporary location picker marker */}
        {pickedLocation && (
          <Marker
            position={[pickedLocation.lat, pickedLocation.lng]}
            icon={createPickerIcon()}
          >
            <Popup>
              <div className="text-xs">
                <strong>Selected Coordinates:</strong>
                <br />
                {pickedLocation.lat}, {pickedLocation.lng}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Render reports markers */}
        {reports.map((report) => {
          const lat = Number(report.latitude);
          const lng = Number(report.longitude);
          if (isNaN(lat) || !isNaN(lng) === false) return null;

          const isSelected = selectedReport?.report_id === report.report_id;
          const statusBadge = getStatusBadge(report.status);
          const priorityInfo = getPriorityColor(report.priority);

          return (
            <Marker
              key={report.report_id}
              position={[lat, lng]}
              icon={createCustomIcon(report, isSelected)}
              eventHandlers={{
                click: () => onSelectReport(report),
              }}
            >
              <Popup>
                <div className="w-64 p-1 text-slate-100">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityInfo.badge}`}>
                      {report.priority.toUpperCase()} ({report.risk_score})
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {report.image_url && (
                    <div className="mb-2 rounded-md overflow-hidden bg-slate-950 aspect-video relative">
                      <img
                        src={report.image_url}
                        alt="Blocked drain observation"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="text-xs text-slate-300 font-medium mb-1 line-clamp-2">
                    {report.description || 'No description provided.'}
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-0.5 mb-3">
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      <span>Severity: <strong className="text-slate-200">{report.severity}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CloudRain className="w-3 h-3 text-sky-400" />
                      <span>Rainfall: <strong className="text-slate-200">{report.rainfall_mm_forecast ? `${report.rainfall_mm_forecast} mm` : '0 mm'}</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectReport(report)}
                    className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Triage Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
