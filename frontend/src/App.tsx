import React, { useState, useEffect, useCallback } from 'react';
import { ReportItem, CreateReportResponse } from './types';
import { getReports, getHealth, API_BASE_URL } from './services/api';
import { ReportMap } from './components/ReportMap';
import { ReportList } from './components/ReportList';
import { ReportDetail } from './components/ReportDetail';
import { SubmitReportModal } from './components/SubmitReportModal';
import { LoginModal } from './components/LoginModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  Shield,
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Database,
  Info,
  MapPin,
  User,
  LogOut,
} from 'lucide-react';

const AppInner: React.FC = () => {
  const { user, role, isLoading: authLoading, signOut, isAuthenticated } = useAuth();
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

      // If currently selected report exists, update its record without creating new reference if unchanged
      setSelectedReport((prev) => {
        if (!prev) return null;
        const found = res.items.find((r) => r.report_id === prev.report_id);
        if (!found) return prev;
        if (
          found.status === prev.status &&
          found.updated_at === prev.updated_at &&
          found.risk_score === prev.risk_score
        ) {
          return prev;
        }
        return found;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to backend';
      setApiError(msg);
      setApiHealth('error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReportsData();
    } else {
      setIsLoading(false);
      getHealth()
        .then(() => setApiHealth('ok'))
        .catch(() => setApiHealth('error'));
    }
  }, [isAuthenticated, fetchReportsData]);

  // Handler when map point is picked
  const handleMapLocationPick = (coords: { lat: number; lng: number }) => {
    setPickedLocation(coords);
    setIsPickingLocation(false);
    setIsSubmitModalOpen(true);
  };

  // Handler when report is created
  const handleReportCreated = (result: CreateReportResponse, lat: number, lng: number) => {
    fetchReportsData().then(() => {
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
    <div className="min-h-screen bg-[#F5F6F8] text-[#17191C] flex flex-col font-sans">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="border-b border-[#E6E8EC] bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Identity (No Emojis) */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#E8F4F1] flex items-center justify-center text-[#157A70] border border-[#157A70]/15">
              <Shield className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-[#17191C]">
                  DrainGuard
                </h1>
                <span className="text-[11px] text-[#696F78] font-normal">EnvironOS</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8F4F1] text-[#157A70] border border-[#157A70]/15 font-medium">
                  Track 02 · Heat & Water
                </span>
              </div>
              <p className="text-[11px] text-[#696F78]">
                Preventive Drain-Maintenance & Flood Risk Triage Platform
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            {/* Live Backend Connection Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F6F8] border border-[#E6E8EC] text-[11px] text-[#696F78] font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  apiHealth === 'ok' ? 'bg-[#16A34A]' : 'bg-[#D9383A]'
                }`}
              ></span>
              <span>AWS ap-south-1</span>
            </div>

            {/* Authenticated User & Role Badge */}
            {isAuthenticated && user && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E8F4F1] border border-[#157A70]/20 text-[11px] text-[#157A70]"
                title={`Signed in as ${user.email} (${user.role})`}
              >
                {role === 'admin' ? (
                  <Shield className="w-3.5 h-3.5 text-[#157A70]" />
                ) : (
                  <User className="w-3.5 h-3.5 text-[#157A70]" />
                )}
                <span className="font-semibold uppercase text-[10px] tracking-wider">{role}</span>
                <span className="hidden xl:inline text-[11px] text-[#696F78] font-normal truncate max-w-[130px]">
                  ({user.email})
                </span>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={fetchReportsData}
              disabled={isRefreshing || !isAuthenticated}
              className="p-2 rounded-xl bg-white hover:bg-[#F5F6F8] border border-[#E6E8EC] text-[#696F78] hover:text-[#17191C] transition-colors cursor-pointer disabled:opacity-40"
              title="Refresh data from DynamoDB"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#157A70]' : ''}`} />
            </button>

            {/* Sign Out Button */}
            {isAuthenticated && (
              <button
                onClick={signOut}
                className="p-2 rounded-xl bg-white hover:bg-[#FDF2F2] border border-[#E6E8EC] hover:border-[#D9383A]/30 text-[#696F78] hover:text-[#D9383A] transition-colors cursor-pointer"
                title="Sign out of demonstration session"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Submit Blockage CTA */}
            <button
              onClick={() => {
                setPickedLocation(null);
                setIsPickingLocation(false);
                setIsSubmitModalOpen(true);
              }}
              disabled={!isAuthenticated}
              className="px-3 py-1.5 rounded-xl bg-[#157A70] hover:bg-[#11685F] text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Report Drain Blockage</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Heuristic & Explanatory Banner ──────────────────────────────────── */}
      <div className="bg-white/70 border-b border-[#E6E8EC] text-[11px] text-[#696F78] py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#157A70] shrink-0" />
            <span>
              <strong>Server-Side Risk Heuristic:</strong> Score (0-100) = 45% Severity + 35% Open-Meteo Rainfall + 20% Site Vulnerability.
            </span>
          </div>
          <div className="font-mono text-[#9298A1] text-[10px]">
            API: <span className="text-[#696F78]">m3sxthznac.execute-api.ap-south-1.amazonaws.com</span>
          </div>
        </div>
      </div>

      {/* ── Main Operations Dashboard ────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {/* Error Banner if API unreachable */}
        {apiError && (
          <div className="p-3 bg-[#FDF2F2] border border-[#F8D7D7] rounded-xl text-[#C5282A] text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D9383A] shrink-0" />
              <span>{apiError}</span>
            </div>
            <button
              onClick={fetchReportsData}
              className="text-[11px] underline font-medium text-[#C5282A] hover:text-[#991B1B] cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* ── Overview Metrics: 4 Understated KPI Cards ─────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Total Incidents */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E6E8EC] shadow-sm">
            <div className="flex items-center justify-between text-[#696F78] mb-1">
              <span className="text-xs font-medium">Total Blockages</span>
              <Database className="w-3.5 h-3.5 text-[#9298A1]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#17191C]">{totalReports}</div>
            <div className="text-[11px] text-[#9298A1] mt-0.5 font-mono">DynamoDB Records</div>
          </div>

          {/* Card 2: Open Incidents */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E6E8EC] shadow-sm">
            <div className="flex items-center justify-between text-[#C5282A] mb-1">
              <span className="text-xs font-medium">Open Incidents</span>
              <AlertCircle className="w-3.5 h-3.5 text-[#D9383A]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#C5282A]">{openReports}</div>
            <div className="text-[11px] text-[#9298A1] mt-0.5">Pending dispatch</div>
          </div>

          {/* Card 3: Critical & High Priority */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E6E8EC] shadow-sm">
            <div className="flex items-center justify-between text-[#B45309] mb-1">
              <span className="text-xs font-medium">Critical / High</span>
              <ShieldAlert className="w-3.5 h-3.5 text-[#D97706]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#B45309]">{criticalHighReports}</div>
            <div className="text-[11px] text-[#9298A1] mt-0.5">Immediate intervention</div>
          </div>

          {/* Card 4: Resolved Cleanups */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E6E8EC] shadow-sm">
            <div className="flex items-center justify-between text-[#15803D] mb-1">
              <span className="text-xs font-medium">Resolved Cleanups</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#15803D]">{resolvedReports}</div>
            <div className="text-[11px] text-[#9298A1] mt-0.5">Flow verified clear</div>
          </div>
        </div>

        {/* ── Main Operations Grid: Map + Queue + Detail ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[calc(100vh-250px)] lg:min-h-[580px]">
          {/* Left Column: Interactive Map */}
          <div className={`${selectedReport ? 'lg:col-span-4' : 'lg:col-span-7'} h-[360px] lg:h-full transition-all duration-300`}>
            <ReportMap
              reports={reports}
              selectedReport={selectedReport}
              onSelectReport={(r) => setSelectedReport(r)}
              isPickingLocation={isPickingLocation}
              pickedLocation={pickedLocation}
              onPickLocation={handleMapLocationPick}
            />
          </div>

          {/* Center Column: Operations Queue */}
          <div className={`${selectedReport ? 'lg:col-span-4' : 'lg:col-span-5'} h-[540px] lg:h-full transition-all duration-300`}>
            <ReportList
              reports={reports}
              selectedReport={selectedReport}
              onSelectReport={(r) => setSelectedReport(r)}
              isLoading={isLoading}
            />
          </div>

          {/* Right Column: Detail Drawer (Desktop inline / Mobile overlay) */}
          {selectedReport && (
            <div className="fixed inset-0 z-[2000] p-4 bg-black/25 backdrop-blur-xs flex items-center justify-center lg:static lg:inset-auto lg:p-0 lg:bg-transparent lg:backdrop-blur-none lg:block lg:col-span-4 h-full animate-in fade-in duration-200">
              <div className="w-full max-w-lg lg:max-w-none h-[90vh] lg:h-full">
                <ReportDetail
                  report={selectedReport}
                  onClose={() => setSelectedReport(null)}
                  onReportUpdated={handleReportUpdated}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Location Picking Overlay Banner ─────────────────────────────────── */}
      {isPickingLocation && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[3000] bg-white border border-[#157A70] shadow-xl px-4 py-2 rounded-2xl flex items-center gap-3 text-xs text-[#17191C] animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <div className="w-7 h-7 rounded-xl bg-[#E8F4F1] flex items-center justify-center text-[#157A70] shrink-0">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-semibold text-[#17191C]">
              Map Pin Selection Active
            </div>
            <div className="text-[11px] text-[#696F78]">
              Click anywhere on the map to set drain blockage coordinates
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsPickingLocation(false);
              setIsSubmitModalOpen(true);
            }}
            className="px-2.5 py-1 bg-[#F5F6F8] hover:bg-[#E6E8EC] text-[#17191C] rounded-lg text-xs font-medium border border-[#E6E8EC] transition-colors ml-1 cursor-pointer"
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

      {/* ── Cognito Demonstration Authentication Modal ────────────────────── */}
      <LoginModal isOpen={!isAuthenticated && !authLoading} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
};


