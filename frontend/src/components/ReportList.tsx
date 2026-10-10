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
    <div className="flex flex-col h-full bg-white border border-[#E6E8EC] rounded-2xl overflow-hidden shadow-sm">
      {/* Header & Search */}
      <div className="p-3.5 border-b border-[#E6E8EC] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#17191C]">
              Triage Operations Queue
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F5F6F8] text-[#696F78] font-mono border border-[#E6E8EC]">
              {filteredReports.length} {filteredReports.length === 1 ? 'incident' : 'incidents'}
            </span>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-[#696F78] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDemoOnly}
              onChange={(e) => setShowDemoOnly(e.target.checked)}
              className="rounded border-[#D1D5DB] text-[#157A70] focus:ring-0"
            />
            <Sparkles className="w-3 h-3 text-[#157A70]" />
            <span>Demo Only</span>
          </label>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#9298A1] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search report ID, site, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl text-xs text-[#17191C] placeholder-[#9298A1] focus:outline-none focus:border-[#157A70] focus:bg-white transition-all"
          />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl px-2 py-1 text-xs text-[#696F78] focus:outline-none focus:border-[#157A70] focus:bg-white transition-colors"
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
              className="w-full bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl px-2 py-1 text-xs text-[#696F78] focus:outline-none focus:border-[#157A70] focus:bg-white transition-colors"
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
              className="w-full bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl px-2 py-1 text-xs text-[#696F78] focus:outline-none focus:border-[#157A70] focus:bg-white transition-colors"
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
      <div className="flex-1 overflow-y-auto divide-y divide-[#E6E8EC] p-2 space-y-1.5">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-[#9298A1] space-y-3">
            <div className="w-5 h-5 border-2 border-[#157A70] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs">Loading reports from DynamoDB...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-16 text-center text-[#9298A1] px-4 space-y-2">
            <AlertTriangle className="w-7 h-7 text-[#9298A1] mx-auto" />
            <p className="text-xs font-medium text-[#696F78]">No reports matching filter criteria</p>
            <p className="text-[11px] text-[#9298A1]">Try loosening your search or filters above</p>
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
                    ? 'bg-[#E8F4F1]/60 border-[#157A70] shadow-sm ring-1 ring-[#157A70]/30'
                    : 'bg-white border-[#E6E8EC] hover:bg-[#F5F6F8] hover:border-[#D1D5DB]'
                }`}
              >
                {/* Header: Score Gauge + Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {/* Score badge */}
                    <div
                      className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center font-bold text-xs border ${priorityInfo.border} ${priorityInfo.bg} ${priorityInfo.text}`}
                    >
                      <span className="text-[9px] leading-none opacity-80">SCORE</span>
                      <span className="text-sm leading-none font-mono font-extrabold">{report.risk_score}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#17191C]">
                          {report.priority.toUpperCase()} PRIORITY
                        </span>
                        {isDemo && (
                          <span className="text-[10px] bg-[#E8F4F1] text-[#157A70] border border-[#157A70]/20 px-1.5 py-0.2 rounded font-medium">
                            Demo
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-[#696F78] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#9298A1]" />
                        {report.site_type || report.siteType || 'Unknown site'}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-[#696F78] font-normal line-clamp-2 mb-2">
                  {report.description || 'No descriptive notes submitted with this incident.'}
                </p>

                {/* Footer metadata */}
                <div className="flex items-center justify-between text-[11px] text-[#9298A1] pt-1.5 border-t border-[#E6E8EC]">
                  <span className="flex items-center gap-1 text-[10px] text-[#9298A1]">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(report.created_at || report.createdAt)}
                  </span>

                  <div className="flex items-center gap-2">
                    {(report.image_key || report.imageKey || report.image_url) && (
                      <span className="flex items-center gap-1 text-[10px] text-[#157A70] font-medium">
                        <ImageIcon className="w-3 h-3" /> Photo
                      </span>
                    )}
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'translate-x-0.5 text-[#157A70]' : 'text-[#9298A1]'}`} />
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
