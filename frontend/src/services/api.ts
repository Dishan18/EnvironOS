import {
  ListReportsResponse,
  ReportItem,
  CreateReportPayload,
  CreateReportResponse,
  PresignResponse,
  UpdateStatusPayload,
  UpdateStatusResponse,
  ReportStatus,
} from '../types';

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://m3sxthznac.execute-api.ap-south-1.amazonaws.com/prod';
// Ensure no trailing slash
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/** Check health / liveness of API Gateway and Lambda */
export async function getHealth(): Promise<{ status: string; timestamp: string }> {
  const res = await fetch(`${API_BASE_URL}/health`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new ApiError(`Health check failed with status ${res.status}`, res.status);
  }
  return res.json();
}

/** Fetch reports from DynamoDB via GET /reports */
export async function getReports(options: {
  status?: ReportStatus;
  minPriority?: number;
  demo?: boolean;
  limit?: number;
  nextToken?: string;
} = {}): Promise<ListReportsResponse> {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.minPriority !== undefined) params.set('minPriority', String(options.minPriority));
  if (options.demo !== undefined) params.set('demo', String(options.demo));
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.nextToken) params.set('nextToken', options.nextToken);

  const qs = params.toString();
  const url = `${API_BASE_URL}/reports${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    let errorMsg = `Failed to fetch reports (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.error) errorMsg = errJson.error;
    } catch {
      // ignore json parse error
    }
    throw new ApiError(errorMsg, res.status);
  }

  const data = await res.json();
  return {
    items: data.items || [],
    next_token: data.next_token || data.nextToken || null,
    count: data.count ?? (data.items ? data.items.length : 0),
  };
}

/** Request presigned S3 POST URL and policy fields */
export async function getPresignedUpload(
  reportId: string,
  contentType: string
): Promise<PresignResponse> {
  const res = await fetch(`${API_BASE_URL}/uploads/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      report_id: reportId,
      content_type: contentType,
    }),
  });

  if (!res.ok) {
    let msg = `Presign request failed with status ${res.status}`;
    try {
      const err = await res.json();
      if (err.error) msg = err.error;
    } catch {
      // ignore
    }
    throw new ApiError(msg, res.status);
  }

  return res.json();
}

/**
 * Upload image directly from browser to S3 via presigned POST policy.
 * S3 presigned POST requires fields in multipart/form-data with 'file' at the end.
 */
export async function uploadImageToS3(
  file: File,
  reportId: string
): Promise<string> {
  const presignData = await getPresignedUpload(reportId, file.type);
  let uploadUrl = presignData.upload_url || presignData.url;

  if (!uploadUrl) {
    throw new Error('Upload URL missing from presign response');
  }

  // Ensure regional S3 endpoint (s3.ap-south-1.amazonaws.com) to prevent cross-origin 307 redirects
  if (uploadUrl.includes('.s3.amazonaws.com') && !uploadUrl.includes('.s3.ap-south-1.amazonaws.com')) {
    uploadUrl = uploadUrl.replace('.s3.amazonaws.com', '.s3.ap-south-1.amazonaws.com');
  }

  const formData = new FormData();
  // All policy fields must precede the 'file' parameter
  Object.entries(presignData.fields || {}).forEach(([key, val]) => {
    formData.append(key, val);
  });
  formData.append('file', file);

  const res = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok && res.status !== 204 && res.status !== 201) {
    const errorText = await res.text().catch(() => '');
    throw new ApiError(`S3 direct upload failed with status ${res.status}: ${errorText}`, res.status);
  }

  return presignData.object_key;
}

/** Submit new drain blockage report to POST /reports */
export async function createReport(payload: CreateReportPayload): Promise<CreateReportResponse> {
  const res = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorMsg = `Report creation failed (${res.status})`;
    try {
      const err = await res.json();
      if (err.error) {
        errorMsg = err.error;
        if (err.details && Array.isArray(err.details)) {
          errorMsg += `: ${err.details.join(', ')}`;
        }
      }
    } catch {
      // ignore
    }
    throw new ApiError(errorMsg, res.status);
  }

  return res.json();
}

/** Update cleanup workflow status via PATCH /reports/{id}/status */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  verificationKey?: string
): Promise<UpdateStatusResponse> {
  const payload: UpdateStatusPayload = { status };
  if (verificationKey) {
    payload.verification_image_key = verificationKey;
  }

  const res = await fetch(`${API_BASE_URL}/reports/${encodeURIComponent(reportId)}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let msg = `Status update failed (${res.status})`;
    try {
      const err = await res.json();
      if (err.error) msg = err.error;
    } catch {
      // ignore
    }
    throw new ApiError(msg, res.status);
  }

  return res.json();
}
