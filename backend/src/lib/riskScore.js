/**
 * lib/riskScore.js
 * Canonical risk-score calculation for DrainGuard.
 *
 * Score = severityScore + rainfallScore + siteExposureScore   (0–100)
 *
 * This is a maintenance-prioritisation heuristic.
 * It does NOT predict flooding.
 */

/** @param {'low'|'medium'|'high'|'critical'} severity */
function severityScore(severity) {
  const map = { low: 10, medium: 20, high: 30, critical: 40 };
  return map[severity] ?? 10;
}

/**
 * @param {number|null} rainfallMm  24-hour forecast precipitation in mm.
 *                                   Pass null if unavailable (uses default).
 */
function rainfallScore(rainfallMm) {
  if (rainfallMm === null || rainfallMm === undefined) return 10; // default
  if (rainfallMm >= 30) return 35;
  if (rainfallMm >= 15) return 25;
  if (rainfallMm >= 5)  return 15;
  if (rainfallMm > 0)   return 5;
  return 0;
}

/** @param {'road'|'footpath'|'park'|'residential'|'commercial'|'other'} siteType */
function siteExposureScore(siteType) {
  const map = {
    road: 25,
    footpath: 20,
    residential: 20,
    commercial: 15,
    park: 10,
    other: 10,
  };
  return map[siteType] ?? 10;
}

/**
 * Calculate priority score and individual factors.
 *
 * @param {{ severity: string, siteType: string, rainfallMm?: number|null }} params
 * @returns {{ priorityScore: number, priorityFactors: object, rainfallMmForecast: number|null }}
 */
export function calculateRiskScore({ severity, siteType, rainfallMm = null }) {
  const sev = severityScore(severity);
  const rain = rainfallScore(rainfallMm);
  const site = siteExposureScore(siteType);
  const total = Math.min(100, sev + rain + site);

  return {
    priorityScore: total,
    priorityFactors: {
      severityScore: sev,
      rainfallScore: rain,
      siteExposureScore: site,
    },
    rainfallMmForecast: rainfallMm,
  };
}
