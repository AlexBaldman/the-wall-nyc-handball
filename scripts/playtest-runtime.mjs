import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
const failedRequests = [];

page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(error.message));
page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()}`));

function fixture(generatedAt, difficulty, winner) {
  return {
    schemaVersion: 2,
    type: 'the-wall-mvp-session',
    generatedAt,
    build: { version: '0.5.1', revision: 'runtime123', channel: 'test' },
    sport: { id: 'american-handball-one-wall', physicsProfileId: 'american-handball-one-wall' },
    tuning: { packId: 'canonical-live' },
    session: { difficulty, inputMode: 'keyboard' },
    match: { winner, scores: { player: winner === 'player' ? 11 : 7, ai: winner === 'ai' ? 11 : 7 } },
    performance: {
      totalContacts: 10,
      cleanContacts: 6,
      longestRally: 4,
      bestPaceMph: 38,
      pointsWon: winner === 'player' ? 11 : 7,
      pointsLost: winner === 'ai' ? 11 : 7,
      ralliesCompleted: 2,
      rallyContactCounts: [2, 4],
      contactTypes: { palm: 8, topspin: 2 },
      spacingTypes: { balanced: 6, stretched: 4 },
      pointReasons: { 'second-bounce': 2 },
      assistedContacts: 1,
    },
    coaching: { summary: { visibleSamples: 50, reachableRate: 0.8, averageMovementDemandMeters: 0.4, transitions: 5 }, diagnostic: {} },
  };
}

try {
  const response = await page.goto(`${baseUrl}/playtest.html`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200);
  assert.equal(await page.locator('#sessionsMetric').innerText(), '0');
  assert.equal(await page.locator('.candidate-card').count(), 4);
  assert.equal(await page.locator('.gate').count(), 4);

  const reports = [
    fixture('2026-08-28T12:00:00.000Z', 'regular', 'player'),
    fixture('2026-08-28T12:05:00.000Z', 'regular', 'ai'),
    fixture('2026-08-28T12:10:00.000Z', 'champion', 'player'),
  ];
  await page.locator('#reportFiles').setInputFiles(reports.map((report, index) => ({
    name: `session-${index}.json`,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(report)),
  })));
  await page.waitForFunction(() => document.getElementById('sessionsMetric')?.textContent === '3');
  assert.equal(await page.locator('#cleanMetric').innerText(), '60%');
  assert.equal(await page.locator('#rallyMetric').innerText(), '3.0');
  assert.equal(await page.locator('#reachableMetric').innerText(), '80%');
  assert.match(await page.locator('#confidenceNote').innerText(), /meet the minimum review floor/i);
  assert.equal(await page.locator('#cohortTableBody tr').count(), 2);
  assert.equal(await page.locator('#contactBreakdown .bar-row').count(), 2);

  await page.locator('#reportFiles').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  await page.waitForFunction(() => document.getElementById('importMessages')?.textContent.includes('invalid JSON'));
  assert.equal(await page.locator('#sessionsMetric').innerText(), '3');

  await page.selectOption('#groupDimension', 'build');
  assert.equal(await page.locator('#cohortTableBody tr').count(), 1);
  assert.match(await page.locator('#cohortTableBody').innerText(), /runtime123/);

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `Playtest Review Lab overflows mobile width by ${overflow}px`);
  assert.equal(errors.length, 0, `Console errors: ${errors.join(' | ')}`);
  assert.equal(failedRequests.length, 0, `Failed requests: ${failedRequests.join(' | ')}`);

  console.log(JSON.stringify({ status: 'passed', sessions: 3, candidates: 4, errors, failedRequests }, null, 2));
} finally {
  await browser.close();
}
