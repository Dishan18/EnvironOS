import React, { useState, useMemo } from 'react';
import { ReportItem, ReportStatus, Severity } from '../types';
import { getPriorityColor, getStatusBadge, formatTimestamp } from '../utils/helpers';
import {
  Search,
  Filter,
  AlertTriangle,
  ImageIcon,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  ChevronRight,
} from 'lucide-react';

interface ReportListProps {
  reports: ReportItem[];
  selectedReport: ReportItem | null;
  onSelectReport: (report: ReportItem) => void;
  isLoading: boolean;
}

export const ReportList: React.FC<ReportListProps> = ({
  reports,
  selectedReport,
  onSelectReport,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showDemoOnly, setShowDemoOnly] = useState<boolean>(false);

  // Filter and rank reports (highest risk score first)
  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => {
        // Search filter
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const idMatch = r.report_id.toLowerCase().includes(term);
          const descMatch = (r.description || '').toLowerCase().includes(term);
          const siteMatch = (r.site_type || '').toLowerCase().includes(term);
          if (!idMatch && !descMatch && !siteMatch) return false;
        }

        // Status filter
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;

        // Priority filter
        if (priorityFilter !== 'all' && r.priority.toLowerCase() !== priorityFilter.toLowerCase()) {
          return false;
        }

        // Severity filter
        if (severityFilter !== 'all' && r.severity.toLowerCase() !== severityFilter.toLowerCase()) {
          return false;
        }

        // Demo toggle
        if (showDemoOnly && !r.is_demo && !r.isDemo) return false;

        return true;
      })
      .sort((a, b) => {
        // Put open/in_progress first, then sort by risk_score descending
        if (a.status === 'resolved' && b.status !== 'resolved') return 1;
        if (a.status !== 'resolved' && b.status === 'resolved') return -1;
        return Number(b.risk_score) - Number(a.risk_score);
      });
  }, [reports, searchTerm, statusFilter, priorityFilter, severityFilter, showDemoOnly]);

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header & Search */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Triage Operations Queue
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {filteredReports.length} {filteredReports.length === 1 ? 'incident' : 'incidents'}
            </span>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDemoOnly}
              onChange={(e) => setShowDemoOnly(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
            />
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Demo Only</span>
          </label>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search report ID, site, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="moderate">Moderate</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-2">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-3">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs">Loading reports from DynamoDB...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-16 text-center text-slate-500 px-4 space-y-2">
            <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-400">No reports matching filter criteria</p>
            <p className="text-[11px] text-slate-600">Try loosening your search or filters above</p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const isSelected = selectedReport?.report_id === report.report_id;
            const priorityInfo = getPriorityColor(report.priority);
            const statusInfo = getStatusBadge(report.status);
            const isDemo = report.is_demo || report.isDemo;

            return (
              <div
                key={report.report_id}
                onClick={() => onSelectReport(report)}
                className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'bg-slate-800/90 border-emerald-500/80 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                    : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                {/* Header: Score Gauge + Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {/* Score badge */}
                    <div
                      className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center font-bold text-xs border ${priorityInfo.border} ${priorityInfo.bg} ${priorityInfo.text}`}
                    >
                      <span className="text-[10px] leading-none opacity-80">SCORE</span>
                      <span className="text-sm leading-none font-mono font-extrabold">{report.risk_score}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200">
                          {report.priority.toUpperCase()} PRIORITY
                        </span>
                        {isDemo && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-medium">
                            Demo
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {report.site_type || report.siteType || 'Unknown site'}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 font-normal line-clamp-2 mb-2">
                  {report.description || 'No descriptive notes submitted with this incident.'}
                </p>

                {/* Footer metadata */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(report.created_at || report.createdAt)}
                  </span>

                  <div className="flex items-center gap-2">
                    {(report.image_key || report.imageKey || report.image_url) && (
                      <span className="flex items-center gap-1 text-[10px] text-sky-400">
                        <ImageIcon className="w-3 h-3" /> Photo
                      </span>
                    )}
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'translate-x-0.5 text-emerald-400' : 'text-slate-600'}`} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
