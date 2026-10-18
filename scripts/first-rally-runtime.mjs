import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1360, height: 880 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

try {
  const response = await page.goto(`${baseUrl}/lab.html`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200);
  await page.waitForFunction(() => (
    window.__THE_WALL_LAB__?.setAssistance
    && window.__THE_WALL_MVP__?.getState
    && window.__THE_WALL_MVP_PLAYTEST__?.getReport
    && window.__THE_WALL_PAUSE__?.isPaused
    && window.__THE_WALL_RETURN_GUIDE__?.isEnabled
  ));

  assert.equal(await page.evaluate(() => window.__THE_WALL_LAB__.getAssistance()), 'guided');
  await page.click('[data-assistance="street"]');
  await page.click('#courtEntry [data-difficulty="champion"]');
  const combined = await page.evaluate(() => ({
    difficulty: window.__THE_WALL_LAB__.getDifficulty(),
    assistance: window.__THE_WALL_LAB__.getAssistance(),
  }));
  assert.deepEqual(combined, { difficulty: 'champion', assistance: 'street' });

  await page.click('[data-assistance="pure"]');
  const pureReport = await page.evaluate(() => window.__THE_WALL_MVP_PLAYTEST__.getReport());
  assert.equal(pureReport.tuning.assistanceProfileId, 'pure');
  assert.equal(pureReport.tuning.handAssistProfileId, 'none');
  assert.equal(pureReport.session.assistance, 'pure');

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__THE_WALL_MVP__?.getState);
  assert.equal(await page.evaluate(() => window.__THE_WALL_LAB__.getAssistance()), 'pure');
  assert.equal(await page.locator('[data-assistance="pure"]').getAttribute('aria-pressed'), 'true');

  await page.click('[data-assistance="guided"]');
  const guidedReport = await page.evaluate(() => window.__THE_WALL_MVP_PLAYTEST__.getReport());
  assert.equal(guidedReport.tuning.handAssistProfileId, 'novice-hand-start');

  await page.click('#practiceFirstButton');
  const beforePause = await page.evaluate(() => window.__THE_WALL_LAB__.getSnapshot().tick);
  await page.click('#mvpPauseButton');
  assert.equal(await page.evaluate(() => window.__THE_WALL_LAB__.isPaused()), true);
  const frozen = await page.evaluate(() => window.__THE_WALL_LAB__.getSnapshot().tick);
  await page.waitForTimeout(240);
  assert.equal(await page.evaluate(() => window.__THE_WALL_LAB__.getSnapshot().tick), frozen);
  assert.ok(frozen >= beforePause);
  await page.click('#mvpResumeButton');
  await page.waitForFunction((tick) => window.__THE_WALL_LAB__.getSnapshot().tick > tick, frozen);

  const guide = await page.evaluate(() => window.__THE_WALL_RETURN_GUIDE__.isEnabled());
  await page.click('#returnGuideToggle');
  assert.equal(await page.evaluate(() => window.__THE_WALL_RETURN_GUIDE__.isEnabled()), !guide);

  await page.evaluate(() => window.__THE_WALL_LAB__.resetLab());
  await page.click('#mvpHelpButton');
  assert.equal(await page.locator('#mvpHelpDialog').evaluate((e) => e.open), true);
  await page.keyboard.press('r');
  assert.equal(await page.evaluate(() => window.__THE_WALL_LAB__.getMatch().active), false,
    'Help dialog must prevent an accidental match start');
  await page.click('[data-mvp-close]');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  const overflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
  assert.ok(overflow <= 1, `Phone viewport horizontal overflow: ${overflow}px`);
  assert.deepEqual(pageErrors, [], `Browser errors: ${pageErrors.join(' | ')}`);
  console.log('First-rally browser runtime checks passed: assistance, provenance, persistence, pause, focus, phone.');
} finally {
  await browser.close();
}
