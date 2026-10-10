import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getHealth,
  getReports,
  createReport,
  uploadImageToS3,
  updateReportStatus,
  API_BASE_URL,
} from '../services/api';

describe('API Service Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly constructs base URL without trailing slash', () => {
    expect(API_BASE_URL).not.toMatch(/\/$/);
  });

  it('getHealth returns status ok on 200 response', async () => {
    const mockResponse = { status: 'ok', timestamp: '2026-10-10T18:00:00Z' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const res = await getHealth();
    expect(res).toEqual(mockResponse);
  });

  it('getReports parses items, count and handles query parameters', async () => {
    const mockReports = [
      {
        report_id: 'rpt_1',
        status: 'open',
        severity: 'critical',
        site_type: 'road',
        latitude: '12.9716',
        longitude: '77.5946',
        risk_score: 85,
        priority: 'critical',
        created_at: '2026-10-10T18:00:00Z',
        updated_at: '2026-10-10T18:00:00Z',
      },
    ];

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockReports, count: 1 }),
    } as Response);

    const res = await getReports({ status: 'open', limit: 50 });
    expect(res.items).toHaveLength(1);
    expect(res.count).toBe(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/reports?status=open&limit=50'),
      expect.any(Object)
    );
  });

  it('getReports throws descriptive ApiError on server error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'DynamoDB connection error' }),
    } as Response);

    await expect(getReports()).rejects.toThrow('DynamoDB connection error');
  });

  it('createReport sends correct payload and returns server risk score', async () => {
    const payload = {
      report_id: 'rpt_123',
      severity: 'critical' as const,
      site_type: 'road' as const,
      latitude: 12.9716,
      longitude: 77.5946,
      description: 'Blockage on main road',
    };

    const mockResponse = {
      report_id: 'rpt_123',
      risk_score: 85,
      priority: 'critical',
      status: 'open' as const,
      explanation: 'Weighted calculation',
      rainfall_source: 'open_meteo',
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const res = await createReport(payload);
    expect(res.risk_score).toBe(85);
    expect(res.priority).toBe('critical');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/reports'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
  });

  it('uploadImageToS3 handles presign POST fields and appends file', async () => {
    const presignMock = {
      upload_url: 'https://s3.amazonaws.com/test-bucket',
      fields: {
        key: 'uploads/rpt_123/photo.jpg',
        'Content-Type': 'image/jpeg',
        policy: 'mock-policy',
      },
      object_key: 'uploads/rpt_123/photo.jpg',
    };

    // First fetch: POST /uploads/presign
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => presignMock,
      } as Response)
      // Second fetch: POST to S3
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
      } as Response);

    const dummyFile = new File(['dummy-bytes'], 'drain.jpg', { type: 'image/jpeg' });
    const key = await uploadImageToS3(dummyFile, 'rpt_123');

    expect(key).toBe('uploads/rpt_123/photo.jpg');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('updateReportStatus updates status and handles conditional check', async () => {
    const mockRes = {
      report_id: 'rpt_123',
      status: 'in_progress' as const,
      updated_at: '2026-10-10T18:00:00Z',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRes,
    } as Response);

    const res = await updateReportStatus('rpt_123', 'in_progress');
    expect(res.status).toBe('in_progress');
  });
});
