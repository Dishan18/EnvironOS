/**
 * handlers/updateStatus.js
 * PATCH /reports/{id}/status — update cleanup workflow status.
 */
import { getReport, updateReportStatus } from '../lib/dynamo.js';
import { validateUpdateStatus } from '../lib/validate.js';
import { respond, respondError, parseBody } from '../lib/http.js';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

export const handler = async (event) => {
  try {
    const reportId = event.pathParameters?.id;
    if (!reportId) return respondError(400, 'Missing report id in path');

    const body = parseBody(event);
    const errors = validateUpdateStatus(body);
    if (errors.length) {
      return respondError(400, 'Validation failed', errors);
    }

    const now = new Date().toISOString();
    const fields = {
      status: body.status,
      updatedAt: now,
      resolvedAt: body.status === 'resolved' ? now : undefined,
      verificationKey: body.verificationImageKey ?? undefined,
    };

    try {
      await updateReportStatus(reportId, fields);
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        return respondError(404, 'Report not found');
      }
      throw err;
    }

    return respond(200, {
      reportId,
      status: fields.status,
      updatedAt: fields.updatedAt,
      resolvedAt: fields.resolvedAt ?? null,
    });
  } catch (err) {
    console.error('updateStatus error', err);
    return respondError(500, 'Internal server error');
  }
};
