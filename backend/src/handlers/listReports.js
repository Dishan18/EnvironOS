/**
 * handlers/listReports.js
 * GET /reports — list reports with optional filters and pagination.
 */
import { listReports } from '../lib/dynamo.js';
import { generatePresignedGet } from '../lib/s3.js';
import { respond, respondError } from '../lib/http.js';

export const handler = async (event) => {
  try {
    const q = event.queryStringParameters ?? {};

    const status = q.status;
    const minPriority = q.minPriority !== undefined ? Number(q.minPriority) : undefined;
    const limit = q.limit ? Math.min(Number(q.limit), 100) : 50;
    const includeDemo = q.demo !== 'false'; // default: include demo

    let startKey;
    if (q.nextToken) {
      try {
        startKey = JSON.parse(Buffer.from(q.nextToken, 'base64').toString('utf-8'));
      } catch {
        return respondError(400, 'Invalid nextToken');
      }
    }

    const { items, lastKey } = await listReports({
      status,
      minPriority,
      limit,
      startKey,
      includeDemo,
    });

    // Attach short-lived presigned GET URLs for any stored images
    const enriched = await Promise.all(
      items.map(async (r) => ({
        ...r,
        imageUrl: r.imageKey ? await generatePresignedGet(r.imageKey) : null,
        verificationUrl: r.verificationKey
          ? await generatePresignedGet(r.verificationKey)
          : null,
      }))
    );

    const nextToken = lastKey
      ? Buffer.from(JSON.stringify(lastKey)).toString('base64')
      : null;

    return respond(200, { items: enriched, nextToken, count: enriched.length });
  } catch (err) {
    console.error('listReports error', err);
    return respondError(500, 'Internal server error');
  }
};
