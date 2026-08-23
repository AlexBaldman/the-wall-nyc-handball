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

  assert.match(await page.locator('#cueValue').innerText(), /MOVE|PREPARE|HOLD|STRIKE|RECOVER/i);
  assert.notEqual(await page.locator('#windowValue').innerText(), '—');
  assert.notEqual(await page.locator('#freeValue').innerText(), '—');

  const initialPrepared = await page.locator('#preparedValue').innerText();
  await page.locator('#prepared').check();
  assert.equal(await page.locator('#prepared').isChecked(), true);
  assert.equal(await page.locator('#preparedValue').innerText(), initialPrepared);

  await page.locator('#playerX').fill('2.4');
  assert.equal(await page.locator('#playerXValue').innerText(), '2.40 m');
  assert.ok((await page.locator('#comparisonNote').innerText()).length > 20);

  await page.click('#resetButton');
  assert.equal(await page.locator('#playerXValue').innerText(), '1.20 m');
  assert.equal(await page.locator('#prepared').isChecked(), false);

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
    errors,
    failedRequests,
  }, null, 2));
} finally {
  await browser.close();
}
