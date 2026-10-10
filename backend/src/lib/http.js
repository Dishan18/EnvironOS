/**
 * lib/http.js
 * Thin HTTP response helpers for Lambda / API Gateway HTTP API.
 */

/**
 * Parse JSON body from an API Gateway event (handles base64-encoded bodies).
 * @param {object} event
 * @returns {object}
 */
export function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf-8')
    : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Build a successful JSON response.
 * @param {number} statusCode
 * @param {object} data
 */
export function respond(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

/**
 * Build an error JSON response.
 * @param {number} statusCode
 * @param {string} message
 * @param {any} [details]
 */
export function respondError(statusCode, message, details) {
  const body = { error: message };
  if (details !== undefined) body.details = details;
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
