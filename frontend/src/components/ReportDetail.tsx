import React, { useState } from 'react';
import { ReportItem, ReportStatus } from '../types';
import {
  getPriorityColor,
  getStatusBadge,
  getSeverityLabel,
  getSiteTypeLabel,
  formatTimestamp,
} from '../utils/helpers';
import { updateReportStatus } from '../services/api';
import {
  X,
  MapPin,
  Clock,
  CloudRain,
  AlertTriangle,
  Layers,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface ReportDetailProps {
  report: ReportItem;
  onClose: () => void;
  onReportUpdated: (updatedReport: ReportItem) => void;
}

export const ReportDetail: React.FC<ReportDetailProps> = ({
  report,
  onClose,
  onReportUpdated,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const priorityInfo = getPriorityColor(report.priority);
  const statusInfo = getStatusBadge(report.status);
  const severityInfo = getSeverityLabel(report.severity);
  const isDemo = report.is_demo || report.isDemo;

  const lat = Number(report.latitude);
  const lng = Number(report.longitude);

  const handleStatusChange = async (newStatus: ReportStatus) => {
    if (newStatus === report.status) return;
    setIsUpdatingStatus(true);
    setStatusError(null);

    try {
      const res = await updateReportStatus(report.report_id, newStatus);
      const updated: ReportItem = {
        ...report,
        status: res.status,
        updated_at: res.updated_at,
        resolved_at: res.resolved_at,
      };
      onReportUpdated(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      setStatusError(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-400 font-semibold">{report.report_id}</span>
          {isDemo && (
            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Synthetic Demo
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Priority Hero Card */}
        <div className={`p-4 rounded-xl border ${priorityInfo.border} ${priorityInfo.bg} space-y-3`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Calculated Risk Tier
              </span>
              <h3 className={`text-xl font-extrabold ${priorityInfo.text}`}>
                {report.priority.toUpperCase()} PRIORITY
              </h3>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-slate-400">Risk Score</span>
              <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                {report.risk_score}
                <span className="text-sm text-slate-400 font-normal">/100</span>
              </div>
            </div>
          </div>

          {/* Explanation from server */}
          <p className="text-xs text-slate-200 leading-relaxed bg-black/30 p-2.5 rounded-lg border border-white/5 font-mono">
            {report.risk_explanation || report.explanation || 'Score calculated via server-side weighted triage heuristic.'}
          </p>
        </div>

        {/* Risk Breakdown Component Gauges */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" /> Triage Factor Breakdown
          </h4>

          <div className="space-y-2 text-xs">
            {/* Factor 1: Severity (45%) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" /> Blockage Severity (45%)
                </span>
                <span className="font-mono text-slate-200 font-semibold">{severityInfo.label}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${report.severity === 'critical' ? 100 : report.severity === 'high' ? 75 : report.severity === 'medium' ? 45 : 20}%` }}
                ></div>
              </div>
            </div>

            {/* Factor 2: Rainfall Forecast (35%) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <CloudRain className="w-3 h-3 text-sky-400" /> 24h Rainfall Forecast (35%)
                </span>
                <span className="font-mono text-slate-200 font-semibold">
                  {report.rainfall_mm_forecast ? `${report.rainfall_mm_forecast} mm` : '0 mm'}
                  <span className="text-[10px] text-slate-400 ml-1">
                    ({report.rainfall_source === 'open_meteo' ? 'Open-Meteo live' : 'fallback'})
                  </span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full"
                  style={{
                    width: `${
                      Number(report.rainfall_mm_forecast || 0) >= 50
                        ? 100
                        : Number(report.rainfall_mm_forecast || 0) >= 20
                        ? 75
                        : Number(report.rainfall_mm_forecast || 0) >= 5
                        ? 45
                        : 10
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Factor 3: Site Exposure (20%) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-emerald-400" /> Site Vulnerability (20%)
                </span>
                <span className="font-mono text-slate-200 font-semibold">{getSiteTypeLabel(report.site_type || report.siteType || 'road')}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${
                      report.site_type === 'road'
                        ? 100
                        : report.site_type === 'commercial'
                        ? 75
                        : report.site_type === 'residential'
                        ? 60
                        : report.site_type === 'footpath'
                        ? 35
                        : 15
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Attached Photograph */}
        {report.image_url ? (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-400">Attached Photograph (Private S3)</span>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video relative group">
              <img
                src={report.image_url}
                alt="Drain blockage incident"
                className="w-full h-full object-cover"
              />
              <a
                href={report.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs text-white font-medium"
              >
                <ExternalLink className="w-4 h-4" /> View Full Resolution Photo
              </a>
            </div>
          </div>
        ) : null}

        {/* Description text */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-400">Incident Description</span>
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-200 leading-relaxed">
            {report.description || 'No descriptive notes provided.'}
          </div>
        </div>

        {/* Location & Metadata */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" /> Coordinates
            </span>
            <div className="font-mono text-slate-200 text-[11px]">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 pt-1"
            >
              Open in Google Maps <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-400" /> Timestamps
            </span>
            <div className="text-[11px] text-slate-300">
              Reported: <span className="font-mono">{formatTimestamp(report.created_at || report.createdAt)}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Updated: <span className="font-mono">{formatTimestamp(report.updated_at || report.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Cleanup Workflow Status Update Action */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Operator Workflow Status
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusInfo.className}`}>
              Current: {statusInfo.label}
            </span>
          </div>

          {statusError && (
            <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded text-rose-400 text-xs">
              {statusError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleStatusChange('open')}
              disabled={isUpdatingStatus || report.status === 'open'}
              className={`py-2 px-2.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                report.status === 'open'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {isUpdatingStatus && report.status !== 'open' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : null}
              Open
            </button>

            <button
              onClick={() => handleStatusChange('in_progress')}
              disabled={isUpdatingStatus || report.status === 'in_progress'}
              className={`py-2 px-2.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                report.status === 'in_progress'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {isUpdatingStatus && report.status !== 'in_progress' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : null}
              In Progress
            </button>

            <button
              onClick={() => handleStatusChange('resolved')}
              disabled={isUpdatingStatus || report.status === 'resolved'}
              className={`py-2 px-2.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                report.status === 'resolved'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {isUpdatingStatus && report.status !== 'resolved' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : null}
              <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
