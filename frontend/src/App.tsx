import React, { useState, useEffect, useCallback } from 'react';
import { ReportItem, CreateReportResponse } from './types';
import { getReports, getHealth, API_BASE_URL } from './services/api';
import { ReportMap } from './components/ReportMap';
import { ReportList } from './components/ReportList';
import { ReportDetail } from './components/ReportDetail';
import { SubmitReportModal } from './components/SubmitReportModal';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  CloudRain,
  Activity,
  Layers,
  Database,
  Info,
  MapPin,
} from 'lucide-react';

export const App: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiHealth, setApiHealth] = useState<'ok' | 'error' | 'checking'>('checking');

  // Modal and Map Picking State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isPickingLocation, setIsPickingLocation] = useState<boolean>(false);
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch reports from DynamoDB
  const fetchReportsData = useCallback(async () => {
    setIsRefreshing(true);
    setApiError(null);
    try {
      // Check health
      try {
        await getHealth();
        setApiHealth('ok');
      } catch {
        setApiHealth('error');
      }

      // Fetch all reports
      const res = await getReports({ limit: 100 });
      setReports(res.items);

      // If currently selected report exists, update its record
      if (selectedReport) {
        const found = res.items.find((r) => r.report_id === selectedReport.report_id);
        if (found) setSelectedReport(found);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to backend';
      setApiError(msg);
      setApiHealth('error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedReport]);

  useEffect(() => {
    fetchReportsData();
  }, []);

  // Handler when map point is picked
  const handleMapLocationPick = (coords: { lat: number; lng: number }) => {
    setPickedLocation(coords);
    setIsPickingLocation(false);
    setIsSubmitModalOpen(true);
  };

  // Handler when report is created
  const handleReportCreated = (result: CreateReportResponse, lat: number, lng: number) => {
    fetchReportsData().then(() => {
      // Focus on the newly created report
      setPickedLocation(null);
    });
  };

  // Handler when report status is updated in detail view
  const handleReportUpdated = (updated: ReportItem) => {
    setSelectedReport(updated);
    setReports((prev) =>
      prev.map((r) => (r.report_id === updated.report_id ? updated : r))
    );
  };

  // Metrics
  const totalReports = reports.length;
  const openReports = reports.filter((r) => r.status === 'open').length;
  const inProgressReports = reports.filter((r) => r.status === 'in_progress').length;
  const criticalHighReports = reports.filter(
    (r) =>
      r.status !== 'resolved' &&
      ['critical', 'high'].includes((r.priority || '').toLowerCase())
  ).length;
  const resolvedReports = reports.filter((r) => r.status === 'resolved').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ── Top Operations Header ────────────────────────────────────────────── */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/60 border border-emerald-400/30">
              <CloudRain className="w-5 h-5 text-slate-950" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  DrainGuard <span className="text-emerald-400">·</span> EnvironOS
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                  Track 02: Heat & Water
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Preventive Drain-Maintenance & Flood Risk Triage Platform
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            {/* Live Backend Connection Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
              <span
                className={`w-2 h-2 rounded-full ${
                  apiHealth === 'ok'
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                    : 'bg-rose-400'
                }`}
              ></span>
              <span>AWS ap-south-1</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchReportsData}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
              title="Refresh data from DynamoDB"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* Submit Blockage CTA */}
            <button
              onClick={() => {
                setPickedLocation(null);
                setIsPickingLocation(false);
                setIsSubmitModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Report Drain Blockage
            </button>
          </div>
        </div>
      </header>

      {/* ── Heuristic & Explanatory Banner ──────────────────────────────────── */}
      <div className="bg-slate-900/40 border-b border-slate-800/60 text-[11px] text-slate-400 py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>
              <strong>Server-Side Risk Heuristic:</strong> Score (0–100) = 45% Severity + 35% Open-Meteo Rainfall + 20% Site Vulnerability.
            </span>
          </div>
          <div className="font-mono text-slate-500 text-[10px]">
            API: <span className="text-slate-400">m3sxthznac.execute-api.ap-south-1.amazonaws.com</span>
          </div>
        </div>
      </div>

      {/* ── Main Operations Dashboard ────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {/* Error Banner if API unreachable */}
        {apiError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{apiError}</span>
            </div>
            <button
              onClick={fetchReportsData}
              className="text-[11px] underline text-rose-200 hover:text-white"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* ── Metrics Cards Grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Total Incidents */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Total Blockages</span>
              <Database className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white">{totalReports}</div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">DynamoDB Records</div>
          </div>

          {/* Card 2: Open Incidents */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-rose-900/40 shadow-md">
            <div className="flex items-center justify-between text-rose-400 mb-1">
              <span className="text-xs font-medium">Open Incidents</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-rose-300">{openReports}</div>
            <div className="text-[10px] text-rose-400/80 mt-1">Pending dispatch</div>
          </div>

          {/* Card 3: Critical & High Priority */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-amber-900/40 shadow-md">
            <div className="flex items-center justify-between text-amber-400 mb-1">
              <span className="text-xs font-medium">Critical / High</span>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-300">{criticalHighReports}</div>
            <div className="text-[10px] text-amber-400/80 mt-1">Immediate intervention</div>
          </div>

          {/* Card 4: Resolved Drains */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-emerald-900/40 shadow-md">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-xs font-medium">Resolved Cleanups</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-300">{resolvedReports}</div>
            <div className="text-[10px] text-emerald-400/80 mt-1">Flow verified clear</div>
          </div>
        </div>

        {/* ── Main Content Grid: Map + Queue + Detail ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-270px)] min-h-[580px]">
          {/* Left Column: Interactive Map (7 cols on desktop) */}
          <div className={`${selectedReport ? 'lg:col-span-4' : 'lg:col-span-7'} h-full transition-all duration-300`}>
            <ReportMap
              reports={reports}
              selectedReport={selectedReport}
              onSelectReport={(r) => setSelectedReport(r)}
              isPickingLocation={isPickingLocation}
              pickedLocation={pickedLocation}
              onPickLocation={handleMapLocationPick}
            />
          </div>

          {/* Center Column: Operations Queue (5 cols when no detail, 4 cols when detail open) */}
          <div className={`${selectedReport ? 'lg:col-span-4' : 'lg:col-span-5'} h-full transition-all duration-300`}>
            <ReportList
              reports={reports}
              selectedReport={selectedReport}
              onSelectReport={(r) => setSelectedReport(r)}
              isLoading={isLoading}
            />
          </div>

          {/* Right Column: Detail Drawer (4 cols when selected) */}
          {selectedReport && (
            <div className="lg:col-span-4 h-full animate-in fade-in duration-200">
              <ReportDetail
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
                onReportUpdated={handleReportUpdated}
              />
            </div>
          )}
        </div>
      </main>

      {/* ── Location Picking Overlay Banner ─────────────────────────────────── */}
      {isPickingLocation && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[3000] bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500 shadow-2xl shadow-emerald-950/80 px-5 py-3 rounded-2xl flex items-center gap-4 text-xs text-white animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <MapPin className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center gap-2">
              <span>Map Pin Selection Active</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <div className="text-[11px] text-slate-400">
              Click anywhere on the map to set drain blockage coordinates
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsPickingLocation(false);
              setIsSubmitModalOpen(true);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            Cancel / Back to Form
          </button>
        </aside>
      )}

      {/* ── Report Submission Modal ─────────────────────────────────────────── */}
      <SubmitReportModal
        isOpen={isSubmitModalOpen}
        onClose={() => {
          setIsSubmitModalOpen(false);
          setIsPickingLocation(false);
        }}
        onReportCreated={handleReportCreated}
        pickedCoords={pickedLocation}
        onStartMapPick={() => {
          setSelectedReport(null);
          setIsSubmitModalOpen(false);
          setIsPickingLocation(true);
        }}
      />
    </div>
  );
};
