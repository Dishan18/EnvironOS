/**
 * tests/backend/validate.test.js
 * Unit tests for input validation helpers.
 */
import {
  validateCreateReport,
  validateUpdateStatus,
  validatePresign,
} from '../../backend/src/lib/validate.js';

// ── validateCreateReport ───────────────────────────────────────────────────

describe('validateCreateReport', () => {
  const valid = {
    reportId: 'rpt_abc123def',
    severity: 'high',
    siteType: 'road',
    latitude: 12.97,
    longitude: 77.59,
  };

  test('accepts a valid minimal body', () => {
    expect(validateCreateReport(valid)).toHaveLength(0);
  });

  test('rejects missing reportId', () => {
    const errs = validateCreateReport({ ...valid, reportId: undefined });
    expect(errs.some((e) => e.includes('reportId'))).toBe(true);
  });

  test('rejects invalid reportId prefix', () => {
    const errs = validateCreateReport({ ...valid, reportId: 'bad_id' });
    expect(errs.some((e) => e.includes('reportId'))).toBe(true);
  });

  test('rejects unknown severity', () => {
    const errs = validateCreateReport({ ...valid, severity: 'extreme' });
    expect(errs.some((e) => e.includes('severity'))).toBe(true);
  });

  test('rejects unknown siteType', () => {
    const errs = validateCreateReport({ ...valid, siteType: 'river' });
    expect(errs.some((e) => e.includes('siteType'))).toBe(true);
  });

  test('rejects latitude out of range', () => {
    const errs = validateCreateReport({ ...valid, latitude: 91 });
    expect(errs.some((e) => e.includes('latitude'))).toBe(true);
  });

  test('rejects longitude out of range', () => {
    const errs = validateCreateReport({ ...valid, longitude: -200 });
    expect(errs.some((e) => e.includes('longitude'))).toBe(true);
  });

  test('rejects description > 500 chars', () => {
    const errs = validateCreateReport({ ...valid, description: 'x'.repeat(501) });
    expect(errs.some((e) => e.includes('description'))).toBe(true);
  });

  test('rejects imageKey not starting with uploads/', () => {
    const errs = validateCreateReport({ ...valid, imageKey: 'secret/file.jpg' });
    expect(errs.some((e) => e.includes('imageKey'))).toBe(true);
  });

  test('accepts valid optional fields', () => {
    const errs = validateCreateReport({
      ...valid,
      description: 'Blocked drain near park',
      imageKey: 'uploads/rpt_abc123def/photo.jpg',
    });
    expect(errs).toHaveLength(0);
  });
});

// ── validateUpdateStatus ───────────────────────────────────────────────────

describe('validateUpdateStatus', () => {
  test('accepts valid status', () => {
    expect(validateUpdateStatus({ status: 'in_progress' })).toHaveLength(0);
  });

  test('accepts resolved with verificationImageKey', () => {
    const errs = validateUpdateStatus({
      status: 'resolved',
      verificationImageKey: 'uploads/rpt_abc/verify.jpg',
    });
    expect(errs).toHaveLength(0);
  });

  test('rejects unknown status', () => {
    const errs = validateUpdateStatus({ status: 'done' });
    expect(errs.some((e) => e.includes('status'))).toBe(true);
  });

  test('rejects bad verificationImageKey', () => {
    const errs = validateUpdateStatus({
      status: 'resolved',
      verificationImageKey: 'private/file.jpg',
    });
    expect(errs.some((e) => e.includes('verificationImageKey'))).toBe(true);
  });
});

// ── validatePresign ────────────────────────────────────────────────────────

describe('validatePresign', () => {
  test('accepts valid jpeg presign request', () => {
    expect(validatePresign({ reportId: 'rpt_abc123', contentType: 'image/jpeg' })).toHaveLength(0);
  });

  test('rejects disallowed content type', () => {
    const errs = validatePresign({ reportId: 'rpt_abc123', contentType: 'application/pdf' });
    expect(errs.some((e) => e.includes('contentType'))).toBe(true);
  });

  test('rejects invalid reportId', () => {
    const errs = validatePresign({ reportId: 'bad', contentType: 'image/jpeg' });
    expect(errs.some((e) => e.includes('reportId'))).toBe(true);
  });
});
