import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const consoleErrors = [];
const failedRequests = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(error.message));
page.on('requestfailed', (request) => {
  failedRequests.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText}`);
});

try {
  const response = await page.goto(`${baseUrl}/lab.html`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200, 'Accuracy Lab should load');
  await page.waitForSelector('#labCanvas');
  await page.waitForTimeout(500);

  const webgl = await page.evaluate(() => {
    const canvas = document.getElementById('labCanvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  });
  assert.equal(webgl, true, 'Accuracy Lab needs a WebGL context');
  assert.equal(await page.locator('#resultLabel').textContent(), 'Ready for the feed');
  assert.equal(await page.locator('#seedValue').textContent(), '0x57414C4C');

  await page.screenshot({
    path: 'outputs/accuracy-lab-desktop.png',
    fullPage: true,
  });

  await page.click('#dropButton');
  await page.waitForFunction(
    () => document.getElementById('resultLabel')?.textContent.includes('official window'),
    null,
    { timeout: 5000 },
  );
  const dropResult = await page.locator('#resultLabel').textContent();
  assert.match(dropResult, /official window/i, 'Drop test should land in the official range');

  await page.click('#resetLabButton');
  await page.click('#feedButton');
  await page.waitForFunction(
    () => window.__THE_WALL_LAB__.getSnapshot().ball.position.z >= 3.8,
    null,
    { timeout: 3000 },
  );
  await page.keyboard.down('Space');
  await page.waitForFunction(
    () => window.__THE_WALL_LAB__.getSnapshot().ball.position.z >= 6.1,
    null,
    { timeout: 3000 },
  );
  await page.keyboard.up('Space');
  await page.waitForTimeout(800);
  const firstContactCount = Number(await page.locator('#contactValue').innerText());
  assert.ok(firstContactCount > 0, 'Feed/swing flow should create physical contacts');
  const replay = await page.evaluate(() => window.__THE_WALL_LAB__.getReplay());
  assert.ok(
    replay.contacts.some((contact) => contact.kind === 'hand'),
    'Feed/swing flow should create a swept hand contact',
  );
  assert.notEqual(
    await page.locator('#contactGrade').innerText(),
    'No contact yet',
    'Contact inspector should explain the result',
  );

  await page.click('#resetLabButton');
  await page.click('#rallyButton');
  const openingMatch = await page.evaluate(() => window.__THE_WALL_LAB__.getMatch());
  assert.equal(openingMatch.active, true);
  assert.equal(openingMatch.server, 'player');
  assert.equal(openingMatch.phase, 'serve-ready');
  assert.equal(await page.locator('#rallyButton').isDisabled(), true);
  await page.keyboard.down('Space');
  await page.waitForTimeout(460);
  await page.keyboard.up('Space');
  await page.waitForFunction(
    () => window.__THE_WALL_LAB__.getReplay().contacts.some(
      (contact) => contact.kind === 'hand' && contact.metadata?.hitter === 'player',
    ),
    null,
    { timeout: 4000 },
  );
  assert.match(
    await page.locator('#serveOwner').innerText(),
    /you serve/i,
    'Match HUD should identify service possession',
  );

  await page.evaluate(() => {
    window.__THE_WALL_LAB__.feedBall();
    window.__THE_WALL_LAB__.resetLab();
    window.__THE_WALL_LAB__.startGhostPoint();
  });
  await page.waitForFunction(
    () => {
      const match = window.__THE_WALL_LAB__.getMatch();
      return (
        match.rallyContacts >= 1
        && match.wallReached
        && !match.serveInFlight
      );
    },
    null,
    { timeout: 10000 },
  );
  const ghostServe = await page.evaluate(() => ({
    match: window.__THE_WALL_LAB__.getMatch(),
    snapshot: window.__THE_WALL_LAB__.getSnapshot(),
    observation: window.__THE_WALL_LAB__.getAiObservation(),
    replay: window.__THE_WALL_LAB__.getReplay(),
  }));
  assert.equal(ghostServe.match.server, 'ai');
  assert.equal(ghostServe.match.expectedHitter, 'player');
  assert.ok(
    ghostServe.replay.contacts.some(
      (contact) => contact.kind === 'hand' && contact.metadata?.hitter === 'ai',
    ),
    'Ghost serve must come from its swept physical hand',
  );
  const ghostServeBounce = ghostServe.replay.contacts.find(
    (contact) => contact.kind === 'floor',
  );
  assert.ok(
    ghostServeBounce.position.z >= 4.8768 && ghostServeBounce.position.z <= 10.3632,
    `Ghost serve should land between official lines, got ${ghostServeBounce.position.z}`,
  );
  assert.ok(
    ghostServe.observation.sourceTick <= ghostServe.snapshot.tick,
    'Ghost perception may be delayed, but never from a future tick',
  );
  assert.ok(
    ghostServe.replay.commands.some((command) => command.controllerId === 'ai'),
    'Replay should record opponent commands as future multiplayer inputs',
  );

  await page.evaluate(() => {
    window.__THE_WALL_LAB__.resetLab();
    window.__THE_WALL_LAB__.startGhostPoint();
  });
  await page.waitForFunction(
    () => {
      const match = window.__THE_WALL_LAB__.getMatch();
      return (
        match.rallyContacts >= 1
        && match.wallReached
        && !match.serveInFlight
      );
    },
    null,
    { timeout: 10000 },
  );
  const repeatedGhostServeBounce = await page.evaluate(
    () => window.__THE_WALL_LAB__.getReplay().contacts.find(
      (contact) => contact.kind === 'floor',
    ).position,
  );
  assert.ok(
    Math.abs(repeatedGhostServeBounce.x - ghostServeBounce.position.x) < 1e-9
      && Math.abs(repeatedGhostServeBounce.z - ghostServeBounce.position.z) < 1e-9,
    'Resetting to the same seed must reproduce the same Ghost serve bounce',
  );

  await page.click('[data-camera="tactical"]');
  assert.equal(
    await page.locator('[data-camera="tactical"]').evaluate((element) => element.classList.contains('active')),
    true,
    'Camera preset should activate',
  );

  await page.locator('#floorRestitution').fill('0.82');
  assert.equal(await page.locator('#floorRestitutionValue').innerText(), '0.820');
  await page.locator('#tempoScale').fill('100');
  assert.equal(await page.locator('#tempoValue').innerText(), '100%');
  await page.click('#resetPhysicsButton');
  assert.equal(await page.locator('#floorRestitutionValue').innerText(), '0.852');
  assert.equal(await page.locator('#tempoValue').innerText(), '78%');

  const matchPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const matchErrors = [];
  matchPage.on('pageerror', (error) => matchErrors.push(error.message));
  await matchPage.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  assert.equal(await matchPage.locator('a[href="lab.html"]').count(), 1);
  assert.equal(matchErrors.length, 0, `Match page errors: ${matchErrors.join(' | ')}`);
  await matchPage.setViewportSize({ width: 390, height: 844 });
  const matchMobileOverflow = await matchPage.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  assert.ok(
    matchMobileOverflow <= 1,
    `Preserved match overflows mobile width by ${matchMobileOverflow}px`,
  );
  await matchPage.close();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  assert.ok(horizontalOverflow <= 1, `Mobile layout overflows horizontally by ${horizontalOverflow}px`);
  await page.screenshot({
    path: 'outputs/accuracy-lab-mobile.png',
    fullPage: true,
  });

  assert.equal(consoleErrors.length, 0, `Console errors: ${consoleErrors.join(' | ')}`);
  assert.equal(failedRequests.length, 0, `Failed requests: ${failedRequests.join(' | ')}`);

  console.log(JSON.stringify({
    status: 'passed',
    webgl,
    dropResult,
    firstContactCount,
    ghostServeBounceFeet: ghostServeBounce.position.z / 0.3048,
    consoleErrors,
    failedRequests,
    screenshots: [
      'outputs/accuracy-lab-desktop.png',
      'outputs/accuracy-lab-mobile.png',
    ],
  }, null, 2));
} finally {
  await browser.close();
}
