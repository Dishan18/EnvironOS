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
      bg: 'bg-[#FDF2F2]',
      text: 'text-[#C5282A]',
      border: 'border-[#F8D7D7]',
      badge: 'bg-[#FDF2F2] text-[#C5282A] border border-[#F8D7D7]',
      hex: '#D9383A',
    };
  }
  if (p === 'high') {
    return {
      bg: 'bg-[#FEF3C7]',
      text: 'text-[#B45309]',
      border: 'border-[#FDE68A]',
      badge: 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]',
      hex: '#D97706',
    };
  }
  if (p === 'moderate' || p === 'medium') {
    return {
      bg: 'bg-[#FEF9C3]',
      text: 'text-[#A16207]',
      border: 'border-[#FEF08A]',
      badge: 'bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A]',
      hex: '#CA8A04',
    };
  }
  return {
    bg: 'bg-[#F0FDF4]',
    text: 'text-[#15803D]',
    border: 'border-[#BBF7D0]',
    badge: 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]',
    hex: '#16A34A',
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
        className: 'bg-[#FDF2F2] text-[#C5282A] border border-[#F8D7D7]',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        className: 'bg-[#F0F7FF] text-[#0284C7] border border-[#BAE6FD]',
      };
    case 'resolved':
      return {
        label: 'Resolved',
        className: 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]',
      };
    default:
      return {
        label: status,
        className: 'bg-[#F5F6F8] text-[#696F78] border border-[#E6E8EC]',
      };
  }
}

export function getSeverityLabel(severity: Severity): {
  label: string;
  className: string;
} {
  switch (severity) {
    case 'critical':
      return { label: 'Critical Blockage (100%)', className: 'text-[#C5282A]' };
    case 'high':
      return { label: 'High Blockage (75%)', className: 'text-[#B45309]' };
    case 'medium':
      return { label: 'Medium Blockage (45%)', className: 'text-[#A16207]' };
    case 'low':
      return { label: 'Low Blockage (20%)', className: 'text-[#696F78]' };
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
