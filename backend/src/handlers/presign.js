/**
 * handlers/presign.js
 * POST /uploads/presign — generate a presigned S3 POST for direct browser upload.
 */
import { generatePresignedPost } from '../lib/s3.js';
import { validatePresign } from '../lib/validate.js';
import { respond, respondError, parseBody } from '../lib/http.js';

export const handler = async (event) => {
  try {
    const body = parseBody(event);
    const errors = validatePresign(body);
    if (errors.length) {
      return respondError(400, 'Validation failed', errors);
    }

    const result = await generatePresignedPost(body.reportId, body.contentType);
    return respond(200, result);
  } catch (err) {
    console.error('presign error', err);
    return respondError(500, 'Internal server error');
  }
};
