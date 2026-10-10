#!/usr/bin/env node
/**
 * infrastructure/scripts/seed-demo.js
 * Inserts clearly-labelled synthetic demo reports into DrainGuard.
 *
 * Usage:
 *   API_BASE_URL=https://xxx.execute-api.us-east-1.amazonaws.com/prod \
 *   node infrastructure/scripts/seed-demo.js
 *
 * All records have isDemo: true and appear in the UI as "Demo" badges.
 * They are safe to delete at any time.
 */

import { nanoid } from 'nanoid';

const API = process.env.API_BASE_URL?.replace(/\/$/, '');
if (!API) {
  console.error('ERROR: API_BASE_URL environment variable is required');
  process.exit(1);
}

const DEMO_REPORTS = [
  {
    severity: 'critical', siteType: 'road',
    latitude: 12.9716, longitude: 77.5946,
    description: '[DEMO] Storm drain fully blocked near Silk Board junction — standing water visible.',
  },
  {
    severity: 'high', siteType: 'residential',
    latitude: 12.9611, longitude: 77.6387,
    description: '[DEMO] Drain blocked with plastic bags and construction debris.',
  },
  {
    severity: 'medium', siteType: 'footpath',
    latitude: 12.9352, longitude: 77.6245,
    description: '[DEMO] Partial blockage. Slow drainage after rain.',
  },
  {
    severity: 'low', siteType: 'park',
    latitude: 12.9784, longitude: 77.6408,
    description: '[DEMO] Leaf litter accumulation — low immediate risk.',
  },
  {
    severity: 'critical', siteType: 'road',
    latitude: 13.0002, longitude: 77.5993,
    description: '[DEMO] Major arterial drain blocked — reported flooding during last monsoon.',
  },
  {
    severity: 'high', siteType: 'commercial',
    latitude: 12.9254, longitude: 77.5946,
    description: '[DEMO] Market area drain overflowing with food waste.',
  },
  {
    severity: 'medium', siteType: 'road',
    latitude: 12.9819, longitude: 77.6082,
    description: '[DEMO] Gravel and silt buildup. Drain functional but reduced capacity.',
  },
  {
    severity: 'high', siteType: 'residential',
    latitude: 12.9155, longitude: 77.6101,
    description: '[DEMO] Drain cover missing — safety hazard plus blockage risk.',
  },
  {
    severity: 'low', siteType: 'footpath',
    latitude: 12.9910, longitude: 77.5820,
    description: '[DEMO] Minor debris. Flagged for routine maintenance.',
  },
  {
    severity: 'medium', siteType: 'commercial',
    latitude: 12.9445, longitude: 77.5738,
    description: '[DEMO] Grease trap overflow. Restaurant row drainage compromised.',
  },
];

async function createReport(report) {
  const reportId = `rpt_${nanoid(10)}`;

  const res = await fetch(`${API}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...report, reportId, isDemo: true }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error(`  ✗ Failed: ${JSON.stringify(data)}`);
    return;
  }
  console.log(`  ✓ ${reportId}  severity=${report.severity}  score=${data.priorityScore}`);
}

console.log(`\nSeeding ${DEMO_REPORTS.length} demo reports to ${API} ...\n`);
for (const r of DEMO_REPORTS) {
  await createReport(r);
}
console.log('\n✅ Demo data seeded successfully.\n');
