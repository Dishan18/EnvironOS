/**
 * tests/backend/riskScore.test.js
 * Unit tests for the canonical risk-score calculation.
 * Run with: cd backend && npm test
 */
import { calculateRiskScore } from '../../backend/src/lib/riskScore.js';

describe('calculateRiskScore', () => {
  // ── Severity ──────────────────────────────────────────────────────────
  test('critical severity contributes 40 pts', () => {
    const { priorityFactors } = calculateRiskScore({ severity: 'critical', siteType: 'park', rainfallMm: 0 });
    expect(priorityFactors.severityScore).toBe(40);
  });

  test('low severity contributes 10 pts', () => {
    const { priorityFactors } = calculateRiskScore({ severity: 'low', siteType: 'park', rainfallMm: 0 });
    expect(priorityFactors.severityScore).toBe(10);
  });

  // ── Rainfall ─────────────────────────────────────────────────────────
  test('>=30mm rainfall contributes 35 pts', () => {
    const { priorityFactors } = calculateRiskScore({ severity: 'low', siteType: 'park', rainfallMm: 45 });
    expect(priorityFactors.rainfallScore).toBe(35);
  });

  test('0mm rainfall contributes 0 pts', () => {
    const { priorityFactors } = calculateRiskScore({ severity: 'low', siteType: 'park', rainfallMm: 0 });
    expect(priorityFactors.rainfallScore).toBe(0);
  });

  test('null rainfall (unavailable) uses default of 10 pts', () => {
    const { priorityFactors } = calculateRiskScore({ severity: 'low', siteType: 'park', rainfallMm: null });
    expect(priorityFactors.rainfallScore).toBe(10);
  });

  test('undefined rainfall uses default of 10 pts', () => {
    const { priorityFactors } = calculateRiskScore({ severity: 'low', siteType: 'park' });
    expect(priorityFactors.rainfallScore).toBe(10);
  });

  // ── Site type ─────────────────────────────────────────────────────────
  test('road site contributes 25 pts', () => {
    const { priorityFactors } = calculateRiskScore({ severity: 'low', siteType: 'road', rainfallMm: 0 });
    expect(priorityFactors.siteExposureScore).toBe(25);
  });

  test('park site contributes 10 pts', () => {
    const { priorityFactors } = calculateRiskScore({ severity: 'low', siteType: 'park', rainfallMm: 0 });
    expect(priorityFactors.siteExposureScore).toBe(10);
  });

  // ── Maximum score ─────────────────────────────────────────────────────
  test('critical + >=30mm + road = 100', () => {
    const { priorityScore } = calculateRiskScore({
      severity: 'critical',
      siteType: 'road',
      rainfallMm: 50,
    });
    expect(priorityScore).toBe(100); // 40+35+25 = 100
  });

  test('score is capped at 100', () => {
    // Even if components sum > 100, result must not exceed 100
    const { priorityScore } = calculateRiskScore({
      severity: 'critical',
      siteType: 'road',
      rainfallMm: 999,
    });
    expect(priorityScore).toBeLessThanOrEqual(100);
  });

  // ── Return shape ─────────────────────────────────────────────────────
  test('returns all expected fields', () => {
    const result = calculateRiskScore({ severity: 'medium', siteType: 'footpath', rainfallMm: 10 });
    expect(result).toHaveProperty('priorityScore');
    expect(result).toHaveProperty('priorityFactors.severityScore');
    expect(result).toHaveProperty('priorityFactors.rainfallScore');
    expect(result).toHaveProperty('priorityFactors.siteExposureScore');
    expect(result).toHaveProperty('rainfallMmForecast');
  });
});
