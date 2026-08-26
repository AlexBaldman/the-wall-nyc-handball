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
page.on('requestfailed', (request) => {
  failedRequests.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText}`);
});

try {
  const response = await page.goto(`${baseUrl}/intercept.html`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200, 'Intercept Lab should load');
  await page.waitForSelector('#courtCanvas');

  const canvasSize = await page.locator('#courtCanvas').evaluate((canvas) => ({
    width: canvas.width,
    height: canvas.height,
  }));
  assert.deepEqual(canvasSize, { width: 900, height: 720 });

  const experimentOptions = await page.locator('#movementExperiment option').evaluateAll(
    (options) => options.map((option) => option.value),
  );
  const presetOptions = await page.locator('#scenarioPreset option').evaluateAll(
    (options) => options.map((option) => option.value),
  );
  assert.deepEqual(
    presetOptions,
    ['custom', 'center-return', 'wall-bound', 'wide-return'],
    'Intercept Lab should expose the canonical scenario presets',
  );
  assert.deepEqual(
    experimentOptions,
    ['canonical', 'responsive', 'deliberate', 'prepared-relief'],
    'Intercept Lab should expose the deliberate movement experiment set',
  );
  assert.equal(
    await page.evaluate(() => window.__THE_WALL_INTERCEPT_LAB__.getExperiment()),
    'canonical',
  );
  assert.equal(await page.evaluate(() => window.__THE_WALL_INTERCEPT_LAB__.getPreset()), 'custom');
  assert.match(await page.locator('#profileValue').innerText(), /handball-free/i);

  assert.match(await page.locator('#cueValue').innerText(), /MOVE|PREPARE|HOLD|STRIKE|RECOVER/i);
  assert.notEqual(await page.locator('#windowValue').innerText(), '—');
  assert.notEqual(await page.locator('#freeValue').innerText(), '—');

  await page.selectOption('#scenarioPreset', 'wide-return');
  const widePreset = await page.evaluate(() => window.__THE_WALL_INTERCEPT_LAB__.getPresetState());
  assert.deepEqual(widePreset, {
    id: 'wide-return',
    horizon: 1.15,
    preparing: false,
    ball: {
      active: true,
      position: { x: -1.35, y: 1.05, z: 3 },
      velocity: { x: 0.2, y: 0.75, z: 7.2 },
      angularVelocity: { x: -24, y: 5, z: 0 },
    },
    player: {
      position: { x: 1, y: 0, z: 5.4 },
      velocity: { x: 0, y: 0, z: 0 },
    },
  });
  assert.match(await page.locator('#presetState').innerText(), /exact benchmark.*1\.15 s/);

  await page.selectOption('#movementExperiment', 'prepared-relief');
  assert.equal(await page.evaluate(() => window.__THE_WALL_INTERCEPT_LAB__.getPreset()), 'wide-return');
  await page.locator('#playerX').fill('2.4');
  assert.equal(await page.evaluate(() => window.__THE_WALL_INTERCEPT_LAB__.getPreset()), 'custom');
  assert.equal(await page.locator('#scenarioPreset').inputValue(), 'custom');

  await page.selectOption('#movementExperiment', 'prepared-relief');
  assert.equal(
    await page.evaluate(() => window.__THE_WALL_INTERCEPT_LAB__.getExperiment()),
    'prepared-relief',
  );
  assert.match(
    await page.locator('#movementExperimentNote').innerText(),
    /reducing only the locomotion penalty/i,
  );
  assert.match(
    await page.locator('#profileValue').innerText(),
    /handball-free/i,
    'Prepared-relief experiment must leave free movement canonical',
  );

  const initialPrepared = await page.locator('#preparedValue').innerText();
  await page.locator('#prepared').check();
  assert.equal(await page.locator('#prepared').isChecked(), true);
  assert.notEqual(await page.locator('#preparedValue').innerText(), '—');
  assert.match(
    await page.locator('#profileValue').innerText(),
    /experiment-prepared-relief/i,
    'Prepared-relief profile should activate only after entering the prepared state',
  );
  assert.ok(initialPrepared.length > 0);

  await page.locator('#playerX').fill('2.4');
  assert.equal(await page.locator('#playerXValue').innerText(), '2.40 m');
  assert.ok((await page.locator('#comparisonNote').innerText()).length > 20);

  await page.click('#resetButton');
  assert.equal(await page.locator('#playerXValue').innerText(), '1.20 m');
  assert.equal(await page.locator('#prepared').isChecked(), false);
  assert.equal(await page.locator('#movementExperiment').inputValue(), 'canonical');
  assert.match(await page.locator('#profileValue').innerText(), /handball-free/i);

  const links = await page.locator('.links a').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('href')),
  );
  assert.ok(links.includes('lab.html'));
  assert.ok(links.includes('index.html'));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  assert.ok(
    horizontalOverflow <= 1,
    `Intercept Lab overflows mobile width by ${horizontalOverflow}px`,
  );

  assert.equal(errors.length, 0, `Intercept Lab console errors: ${errors.join(' | ')}`);
  assert.equal(
    failedRequests.length,
    0,
    `Intercept Lab failed requests: ${failedRequests.join(' | ')}`,
  );

  console.log(JSON.stringify({
    status: 'passed',
    canvasSize,
    cue: await page.locator('#cueValue').innerText(),
    window: await page.locator('#windowValue').innerText(),
    experimentOptions,
    errors,
    failedRequests,
  }, null, 2));
} finally {
  await browser.close();
}
