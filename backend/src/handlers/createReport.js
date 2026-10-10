/**
 * handlers/createReport.js
 * POST /reports — validate, score, persist a new drain-blockage report.
 */
import { putReport } from '../lib/dynamo.js';
import { validateCreateReport } from '../lib/validate.js';
import { calculateRiskScore } from '../lib/riskScore.js';
import { fetchRainfallMm } from '../lib/weather.js';
import { respond, respondError, parseBody } from '../lib/http.js';

export const handler = async (event) => {
  try {
    const body = parseBody(event);
    const errors = validateCreateReport(body);
    if (errors.length) {
      return respondError(400, 'Validation failed', errors);
    }

    // Fetch live rainfall (optional — falls back to null → default score)
    const rainfallMm = await fetchRainfallMm(body.latitude, body.longitude);

    const { priorityScore, priorityFactors, rainfallMmForecast } =
      calculateRiskScore({
        severity: body.severity,
        siteType: body.siteType,
        rainfallMm,
      });

    const now = new Date().toISOString();
    const item = {
      reportId: body.reportId,
      status: 'open',
      severity: body.severity,
      siteType: body.siteType,
      latitude: body.latitude,
      longitude: body.longitude,
      description: body.description ?? null,
      imageKey: body.imageKey ?? null,
      verificationKey: null,
      priorityScore,
      priorityFactors,
      rainfallMmForecast,
      isDemo: body.isDemo === true,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    };

    await putReport(item);

    return respond(201, { reportId: item.reportId, priorityScore, status: 'open' });
  } catch (err) {
    console.error('createReport error', err);
    return respondError(500, 'Internal server error');
  }
};
