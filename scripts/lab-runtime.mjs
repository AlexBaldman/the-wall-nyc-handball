import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const screenshotDirectory = process.env.UPDATE_SCREENSHOTS === '1'
  ? 'outputs'
  : join(tmpdir(), 'the-wall-lab-runtime');
const desktopScreenshot = join(screenshotDirectory, 'accuracy-lab-desktop.png');
const mobileScreenshot = join(screenshotDirectory, 'accuracy-lab-mobile.png');
mkdirSync(screenshotDirectory, { recursive: true });

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
  assert.equal(await page.locator('#courtEntry').isVisible(), true, '3D match should open with a focused court-entry flow');
  assert.equal(
    await page.evaluate(() => window.__THE_WALL_LAB__.getMatch().targetScore),
    11,
    'Street match should use the player-facing race-to-11 target',
  );
  await page.click('#courtEntry [data-difficulty="champion"]');
  assert.equal(
    await page.evaluate(() => window.__THE_WALL_LAB__.getDifficulty()),
    'champion',
    'Court entry should configure the opponent profile',
  );
  assert.match(await page.locator('#opponentReadDelay').innerText(), /58 ms/i);
  await page.click('#courtEntry [data-difficulty="regular"]');

  await page.screenshot({
    path: desktopScreenshot,
    fullPage: true,
  });

  await page.click('#practiceFirstButton');
  assert.equal(
    await page.locator('#courtEntry').evaluate((element) => element.classList.contains('is-hidden')),
    true,
    'Starting practice should reveal the playable court',
  );
  await page.click('[data-drill="pace"]');
  assert.deepEqual(
    await page.evaluate(() => window.__THE_WALL_LAB__.getWallSchool()),
    {
      active: true,
      completed: false,
      drillId: 'pace',
      progress: 0,
      attempts: 0,
    },
    'Wall School should start an outcome-driven physical practice feed',
  );
  await page.locator('.advanced-lab').evaluate((element) => {
    element.open = true;
  });
  await page.click('#dropButton');
  await page.waitForFunction(
    () => document.getElementById('resultLabel')?.textContent.includes('official window'),
    null,
    { timeout: 20000 },
  );
  const dropResult = await page.locator('#resultLabel').textContent();
  assert.match(dropResult, /official window/i, 'Drop test should land in the official range');

  await page.click('#resetLabButton');
  assert.equal(
    await page.evaluate(() => window.__THE_WALL_LAB__.getWallSchool().active),
    false,
    'Reset should exit the active Wall School drill',
  );
  await page.click('#feedButton');
  await page.waitForFunction(
    () => window.__THE_WALL_LAB__.getSnapshot().ball.position.z >= 3.8,
    null,
    { timeout: 10000 },
  );
  await page.keyboard.down('Space');
  await page.waitForFunction(
    () => window.__THE_WALL_LAB__.getSnapshot().ball.position.z >= 6.1,
    null,
    { timeout: 10000 },
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
  const playerHandContact = replay.contacts.find(
    (contact) => contact.kind === 'hand' && contact.metadata?.hitter === 'player',
  );
  assert.ok(
    playerHandContact?.metadata?.outcome?.shot?.id,
    'Recorded hand contacts should include deterministic shot outcomes',
  );
  assert.ok(
    Number.isFinite(playerHandContact.metadata.outcome.paceMph),
    'Recorded contact outcomes should include physical pace',
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
    { timeout: 10000 },
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
    { timeout: 20000 },
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
    { timeout: 20000 },
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
    path: mobileScreenshot,
    fullPage: true,
  });
  await page.click('#enterCourtButton');
  const touchStartZ = await page.evaluate(
    () => window.__THE_WALL_LAB__.getSnapshot().player.position.z,
  );
  const towardWallButton = page.locator('[data-touch-z="-1"]');
  await towardWallButton.dispatchEvent('pointerdown', {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
  });
  await page.waitForFunction(
    (startZ) => window.__THE_WALL_LAB__.getSnapshot().player.position.z < startZ - 0.05,
    touchStartZ,
    { timeout: 10000 },
  );
  await towardWallButton.dispatchEvent('pointerup', {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
  });
  const mobileViewport = page.viewportSize();
  const contactDock = await page.locator('.technique-deck').boundingBox();
  assert.ok(
    contactDock
      && contactDock.y < mobileViewport.height
      && contactDock.y + contactDock.height >= mobileViewport.height - 74,
    'Phone contact controls should stay docked inside the gameplay viewport',
  );

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
    screenshots: [desktopScreenshot, mobileScreenshot],
  }, null, 2));
} finally {
  await browser.close();
}
