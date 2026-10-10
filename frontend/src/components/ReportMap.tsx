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

  const bgHex = isResolved ? '#16A34A' : pColor.hex;

  const html = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
      <div style="
        background: ${bgHex};
        width: ${isSelected ? '32px' : '26px'};
        height: ${isSelected ? '32px' : '26px'};
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.18);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: 11px;
        font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
      ">
        ${isResolved ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : report.risk_score}
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
      background: #157A70;
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 4px 12px rgba(21, 122, 112, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'picker-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
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
  const map = useMapEvents({
    click(e) {
      if (isPicking && onPick) {
        onPick({ lat: Number(e.latlng.lat.toFixed(5)), lng: Number(e.latlng.lng.toFixed(5)) });
      }
    },
  });

  useEffect(() => {
    if (!map || typeof (map as any).getContainer !== 'function') return;
    const container = (map as any).getContainer();
    if (container) {
      if (isPicking) {
        container.style.cursor = 'crosshair';
      } else {
        container.style.cursor = '';
      }
    }
  }, [isPicking, map]);

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
    <div
      className={`relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border bg-white shadow-sm transition-all duration-300 ${
        isPickingLocation
          ? 'border-[#157A70] ring-2 ring-[#157A70]/20'
          : 'border-[#E6E8EC]'
      }`}
    >
      {/* Location Picker Banner overlay */}
      {isPickingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-md text-[#17191C] text-xs font-medium px-3.5 py-1.5 rounded-full shadow-md border border-[#157A70]/30 flex items-center gap-2 pointer-events-none">
          <Navigation className="w-3.5 h-3.5 text-[#157A70]" />
          <span>Click map to set blockage coordinates</span>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-md border border-[#E6E8EC] p-3 rounded-xl shadow-sm text-xs space-y-1.5 hidden sm:block">
        <div className="font-semibold text-[#17191C] mb-1 flex items-center gap-1.5 text-[11px] tracking-tight">
          <MapPin className="w-3.5 h-3.5 text-[#157A70]" />
          <span>Priority Legend (Score 0–100)</span>
        </div>
        <div className="flex items-center gap-2 text-[#696F78]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D9383A]"></span>
          <span>Critical (75–100)</span>
        </div>
        <div className="flex items-center gap-2 text-[#696F78]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]"></span>
          <span>High (50–74)</span>
        </div>
        <div className="flex items-center gap-2 text-[#696F78]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#CA8A04]"></span>
          <span>Moderate (25–49)</span>
        </div>
        <div className="flex items-center gap-2 text-[#696F78]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span>
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
              <div className="text-xs text-[#17191C]">
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
              interactive={!isPickingLocation}
              eventHandlers={{
                click: () => {
                  if (!isPickingLocation) {
                    onSelectReport(report);
                  }
                },
              }}
            >
              <Popup>
                <div className="w-64 p-1 text-[#17191C]">
                  <div className="flex items-center justify-between gap-2 border-b border-[#E6E8EC] pb-2 mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityInfo.badge}`}>
                      {report.priority.toUpperCase()} ({report.risk_score})
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {report.image_url && (
                    <div className="mb-2 rounded-xl overflow-hidden bg-[#F5F6F8] border border-[#E6E8EC] aspect-video relative">
                      <img
                        src={report.image_url}
                        alt="Blocked drain observation"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="text-xs text-[#17191C] font-medium mb-1.5 line-clamp-2">
                    {report.description || 'No description provided.'}
                  </div>

                  <div className="text-[11px] text-[#696F78] space-y-0.5 mb-3">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-[#D97706]" />
                      <span>Severity: <strong className="text-[#17191C]">{report.severity}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CloudRain className="w-3 h-3 text-[#157A70]" />
                      <span>Rainfall: <strong className="text-[#17191C]">{report.rainfall_mm_forecast ? `${report.rainfall_mm_forecast} mm` : '0 mm'}</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectReport(report)}
                    className="w-full py-1.5 px-3 bg-[#157A70] hover:bg-[#11685F] text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Triage Details</span>
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
