/**
 * lib/validate.js
 * Input validation helpers for Lambda handlers.
 */

const SEVERITY_VALUES = ['low', 'medium', 'high', 'critical'];
const SITE_TYPE_VALUES = ['road', 'footpath', 'park', 'residential', 'commercial', 'other'];
const STATUS_VALUES = ['open', 'in_progress', 'resolved'];
const REPORT_ID_RE = /^rpt_[A-Za-z0-9_-]{6,36}$/;
const S3_KEY_RE = /^uploads\//;

/**
 * Validate a POST /reports body.
 * @param {object} body
 * @returns {string[]} Array of error messages (empty = valid)
 */
export function validateCreateReport(body) {
  const errors = [];

  if (!body.reportId || !REPORT_ID_RE.test(body.reportId)) {
    errors.push('reportId must match pattern rpt_<nanoid>');
  }
  if (!SEVERITY_VALUES.includes(body.severity)) {
    errors.push(`severity must be one of: ${SEVERITY_VALUES.join(', ')}`);
  }
  if (!SITE_TYPE_VALUES.includes(body.siteType)) {
    errors.push(`siteType must be one of: ${SITE_TYPE_VALUES.join(', ')}`);
  }

  const lat = Number(body.latitude);
  const lon = Number(body.longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.push('latitude must be a number between -90 and 90');
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    errors.push('longitude must be a number between -180 and 180');
  }

  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string' || body.description.length > 500) {
      errors.push('description must be a string of max 500 characters');
    }
  }

  if (body.imageKey !== undefined && body.imageKey !== null) {
    if (typeof body.imageKey !== 'string' || !S3_KEY_RE.test(body.imageKey)) {
      errors.push('imageKey must be a string starting with uploads/');
    }
  }

  return errors;
}

/**
 * Validate a PATCH /reports/{id}/status body.
 * @param {object} body
 * @returns {string[]}
 */
export function validateUpdateStatus(body) {
  const errors = [];

  if (!STATUS_VALUES.includes(body.status)) {
    errors.push(`status must be one of: ${STATUS_VALUES.join(', ')}`);
  }
  if (body.verificationImageKey !== undefined && body.verificationImageKey !== null) {
    if (
      typeof body.verificationImageKey !== 'string' ||
      !S3_KEY_RE.test(body.verificationImageKey)
    ) {
      errors.push('verificationImageKey must be a string starting with uploads/');
    }
  }

  return errors;
}

/**
 * Validate POST /uploads/presign body.
 * @param {object} body
 * @returns {string[]}
 */
export function validatePresign(body) {
  const errors = [];
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  if (!body.reportId || !REPORT_ID_RE.test(body.reportId)) {
    errors.push('reportId must match pattern rpt_<nanoid>');
  }
  if (!ALLOWED_TYPES.includes(body.contentType)) {
    errors.push(`contentType must be one of: ${ALLOWED_TYPES.join(', ')}`);
  }

  return errors;
}
