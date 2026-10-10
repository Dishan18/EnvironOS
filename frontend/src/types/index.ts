export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type SiteType = 'road' | 'commercial' | 'residential' | 'footpath' | 'park';
export type ReportStatus = 'open' | 'in_progress' | 'resolved';
export type PriorityLevel = 'critical' | 'high' | 'moderate' | 'low';

export interface ReportItem {
  report_id: string;
  reportId?: string;
  status: ReportStatus;
  severity: Severity;
  site_type: SiteType;
  siteType?: SiteType;
  latitude: number | string;
  longitude: number | string;
  description?: string | null;
  image_key?: string | null;
  imageKey?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  verification_key?: string | null;
  verificationKey?: string | null;
  verification_url?: string | null;
  verificationUrl?: string | null;
  risk_score: number;
  priorityScore?: number;
  priority: string;
  severity_component?: string | number;
  rainfall_component?: string | number;
  site_component?: string | number;
  rainfall_mm_forecast?: string | number | null;
  rainfall_source?: 'open_meteo' | 'fallback_default' | string;
  risk_explanation?: string;
  explanation?: string;
  is_demo?: boolean;
  isDemo?: boolean;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
  resolved_at?: string | null;
  resolvedAt?: string | null;
}

export interface ListReportsResponse {
  items: ReportItem[];
  next_token?: string | null;
  nextToken?: string | null;
  count: number;
}

export interface CreateReportPayload {
  report_id?: string;
  reportId?: string;
  severity: Severity;
  site_type: SiteType;
  siteType?: SiteType;
  latitude: number;
  longitude: number;
  description?: string;
  image_key?: string;
  imageKey?: string;
  is_demo?: boolean;
  isDemo?: boolean;
}

export interface CreateReportResponse {
  report_id: string;
  reportId?: string;
  risk_score: number;
  priorityScore?: number;
  priority: string;
  status: ReportStatus;
  explanation: string;
  rainfall_source: string;
}

export interface PresignRequest {
  report_id: string;
  content_type: string;
}

export interface PresignResponse {
  upload_url?: string;
  url?: string;
  fields: Record<string, string>;
  object_key: string;
  expires_in?: number;
}

export interface UpdateStatusPayload {
  status: ReportStatus;
  verification_image_key?: string;
}

export interface UpdateStatusResponse {
  report_id: string;
  status: ReportStatus;
  updated_at: string;
  resolved_at?: string | null;
}
