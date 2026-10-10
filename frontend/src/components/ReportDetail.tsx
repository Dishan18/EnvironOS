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
    <div className="flex flex-col h-full bg-white border border-[#E6E8EC] rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-3.5 border-b border-[#E6E8EC] flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#17191C] font-semibold">{report.report_id}</span>
          {isDemo && (
            <span className="text-[10px] bg-[#E8F4F1] text-[#157A70] border border-[#157A70]/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Synthetic Demo
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[#696F78] hover:text-[#17191C] hover:bg-[#F5F6F8] transition-colors cursor-pointer"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Priority Hero Card */}
        <div className={`p-4 rounded-xl border ${priorityInfo.border} ${priorityInfo.bg} space-y-2.5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#696F78]">
                Calculated Risk Tier
              </span>
              <h3 className={`text-xl font-bold ${priorityInfo.text}`}>
                {report.priority.toUpperCase()} PRIORITY
              </h3>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-[#696F78]">Risk Score</span>
              <div className="text-3xl font-bold font-mono text-[#17191C] tracking-tight">
                {report.risk_score}
                <span className="text-sm text-[#9298A1] font-normal">/100</span>
              </div>
            </div>
          </div>

          {/* Explanation from server */}
          <p className="text-xs text-[#17191C] leading-relaxed bg-white/80 p-2.5 rounded-lg border border-[#E6E8EC] font-mono">
            {report.risk_explanation || report.explanation || `Score ${report.risk_score}/100 — Calculated via server-side weighted triage heuristic.`}
          </p>
        </div>

        {/* Risk Breakdown Component Gauges */}
        <div className="bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl p-3.5 space-y-3">
          <h4 className="text-xs font-semibold text-[#17191C] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#157A70]" /> Triage Factor Breakdown
          </h4>

          <div className="space-y-2.5 text-xs">
            {/* Factor 1: Severity (45%) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#696F78] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-[#D97706]" /> Blockage Severity (45%)
                </span>
                <span className="font-mono text-[#17191C] font-semibold">{severityInfo.label}</span>
              </div>
              <div className="w-full h-1.5 bg-[#E6E8EC] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D97706] rounded-full"
                  style={{ width: `${report.severity === 'critical' ? 100 : report.severity === 'high' ? 75 : report.severity === 'medium' ? 45 : 20}%` }}
                ></div>
              </div>
            </div>

            {/* Factor 2: Rainfall Forecast (35%) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#696F78] flex items-center gap-1">
                  <CloudRain className="w-3 h-3 text-[#157A70]" /> 24h Rainfall Forecast (35%)
                </span>
                <span className="font-mono text-[#17191C] font-semibold">
                  {report.rainfall_mm_forecast ? `${report.rainfall_mm_forecast} mm` : '0 mm'}
                  <span className="text-[10px] text-[#9298A1] ml-1">
                    ({report.rainfall_source === 'open_meteo' ? 'Open-Meteo live' : 'fallback'})
                  </span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#E6E8EC] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#157A70] rounded-full"
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
                <span className="text-[#696F78] flex items-center gap-1">
                  <Layers className="w-3 h-3 text-[#16A34A]" /> Site Vulnerability (20%)
                </span>
                <span className="font-mono text-[#17191C] font-semibold">{getSiteTypeLabel(report.site_type || report.siteType || 'road')}</span>
              </div>
              <div className="w-full h-1.5 bg-[#E6E8EC] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#16A34A] rounded-full"
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
            <span className="text-xs font-semibold text-[#17191C]">Attached Photograph (Private S3)</span>
            <div className="rounded-xl overflow-hidden border border-[#E6E8EC] bg-[#F5F6F8] aspect-video relative group">
              <img
                src={report.image_url}
                alt="Drain blockage incident"
                className="w-full h-full object-cover"
              />
              <a
                href={report.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs text-white font-medium"
              >
                <ExternalLink className="w-4 h-4" /> View Full Resolution Photo
              </a>
            </div>
          </div>
        ) : null}

        {/* Description text */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-[#17191C]">Incident Description</span>
          <div className="p-3 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl text-xs text-[#17191C] leading-relaxed">
            {report.description || 'No descriptive notes provided.'}
          </div>
        </div>

        {/* Location & Metadata */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl space-y-1">
            <span className="text-[11px] text-[#696F78] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#157A70]" /> Coordinates
            </span>
            <div className="font-mono text-[#17191C] text-[11px]">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[#157A70] hover:underline flex items-center gap-1 pt-0.5 font-medium"
            >
              Open in Google Maps <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          <div className="p-3 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl space-y-1">
            <span className="text-[11px] text-[#696F78] flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#157A70]" /> Timestamps
            </span>
            <div className="text-[11px] text-[#17191C]">
              Reported: <span className="font-mono text-[#696F78]">{formatTimestamp(report.created_at || report.createdAt)}</span>
            </div>
            <div className="text-[10px] text-[#696F78]">
              Updated: <span className="font-mono">{formatTimestamp(report.updated_at || report.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Cleanup Workflow Status Update Action */}
        <div className="pt-2 border-t border-[#E6E8EC] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#17191C] uppercase tracking-wider">
              Operator Workflow Status
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusInfo.className}`}>
              Current: {statusInfo.label}
            </span>
          </div>

          {statusError && (
            <div className="p-2 bg-[#FDF2F2] border border-[#F8D7D7] rounded-xl text-[#C5282A] text-xs">
              {statusError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleStatusChange('open')}
              disabled={isUpdatingStatus || report.status === 'open'}
              className={`py-2 px-2.5 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                report.status === 'open'
                  ? 'bg-[#FDF2F2] text-[#C5282A] border-[#F8D7D7] font-semibold shadow-xs'
                  : 'bg-white text-[#696F78] border-[#E6E8EC] hover:bg-[#F5F6F8] hover:text-[#17191C]'
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
              className={`py-2 px-2.5 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                report.status === 'in_progress'
                  ? 'bg-[#F0F7FF] text-[#0284C7] border-[#BAE6FD] font-semibold shadow-xs'
                  : 'bg-white text-[#696F78] border-[#E6E8EC] hover:bg-[#F5F6F8] hover:text-[#17191C]'
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
              className={`py-2 px-2.5 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                report.status === 'resolved'
                  ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0] font-semibold shadow-xs'
                  : 'bg-white text-[#696F78] border-[#E6E8EC] hover:bg-[#F5F6F8] hover:text-[#17191C]'
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
