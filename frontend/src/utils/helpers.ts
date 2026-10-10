import { PriorityLevel, ReportStatus, Severity, SiteType } from '../types';

export function getPriorityColor(priority: string | undefined): {
  bg: string;
  text: string;
  border: string;
  badge: string;
  hex: string;
} {
  const p = (priority || '').toLowerCase();
  if (p === 'critical') {
    return {
      bg: 'bg-rose-950/60',
      text: 'text-rose-400',
      border: 'border-rose-800/80',
      badge: 'bg-rose-500 text-white',
      hex: '#f43f5e',
    };
  }
  if (p === 'high') {
    return {
      bg: 'bg-amber-950/60',
      text: 'text-amber-400',
      border: 'border-amber-800/80',
      badge: 'bg-amber-500 text-slate-950',
      hex: '#f59e0b',
    };
  }
  if (p === 'moderate' || p === 'medium') {
    return {
      bg: 'bg-yellow-950/40',
      text: 'text-yellow-400',
      border: 'border-yellow-800/60',
      badge: 'bg-yellow-500 text-slate-950',
      hex: '#eab308',
    };
  }
  return {
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-400',
    border: 'border-emerald-800/60',
    badge: 'bg-emerald-500 text-slate-950',
    hex: '#10b981',
  };
}

export function getStatusBadge(status: ReportStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'open':
      return {
        label: 'Open Incident',
        className: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        className: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
      };
    case 'resolved':
      return {
        label: 'Resolved',
        className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      };
    default:
      return {
        label: status,
        className: 'bg-slate-800 text-slate-400 border border-slate-700',
      };
  }
}

export function getSeverityLabel(severity: Severity): {
  label: string;
  className: string;
} {
  switch (severity) {
    case 'critical':
      return { label: 'Critical Blockage (100%)', className: 'text-rose-400' };
    case 'high':
      return { label: 'High Blockage (75%)', className: 'text-amber-400' };
    case 'medium':
      return { label: 'Medium Blockage (45%)', className: 'text-yellow-400' };
    case 'low':
      return { label: 'Low Blockage (20%)', className: 'text-slate-400' };
  }
}

export function getSiteTypeLabel(siteType: SiteType): string {
  switch (siteType) {
    case 'road':
      return 'Arterial Road (High Vulnerability)';
    case 'commercial':
      return 'Commercial Market';
    case 'residential':
      return 'Residential Area';
    case 'footpath':
      return 'Pedestrian Walkway';
    case 'park':
      return 'Park / Open Ground';
    default:
      return siteType;
  }
}

export function formatTimestamp(isoString: string | undefined): string {
  if (!isoString) return 'Unknown';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return isoString;
  }
}
