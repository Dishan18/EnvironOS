/**
 * lib/weather.js
 * Optional Open-Meteo integration.
 * Fetches the 24-hour precipitation sum for a given lat/lon.
 * No API key required. Falls back gracefully on timeout or error.
 */

const TIMEOUT_MS = 3000;
const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Fetch 24-hour rainfall forecast (mm) for a location.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<number|null>}  precipitation_sum value or null on failure
 */
export async function fetchRainfallMm(latitude, longitude) {
  try {
    const url =
      `${BASE_URL}?latitude=${latitude}&longitude=${longitude}` +
      `&daily=precipitation_sum&forecast_days=1&timezone=auto`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;

    const data = await res.json();
    const mm = data?.daily?.precipitation_sum?.[0];
    return typeof mm === 'number' ? mm : null;
  } catch {
    // Timeout, network error, or parse error — return null (graceful degradation)
    return null;
  }
}
