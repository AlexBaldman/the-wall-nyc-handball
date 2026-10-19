import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// This is an actual mobile-emulated Chromium browser with touch events and
// coarse-pointer media queries, not merely a desktop browser shrunk to 390px.
const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

async function touch(cdp, type, points) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map(({ id, x, y }) => ({
      id, x: Math.round(x), y: Math.round(y), radiusX: 4, radiusY: 4, force: 0.75,
    })),
  });
}

try {
  const response = await page.goto(`${baseUrl}/lab.html`, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200);
  await page.waitForFunction(() => window.__THE_WALL_MOBILE__?.getInput);
  assert.equal(await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches), true);
  assert.equal(await page.evaluate(() => window.__THE_WALL_MOBILE__.isActive()), false,
    'Mobile controls should not cover the choose-your-match entry screen');

  // Enter practice; the same handler is used by a physical tap on the entry
  // button, and touch gestures are tested against the rendered cockpit below.
  await page.locator('#practiceFirstButton').dispatchEvent('click');
  await page.waitForFunction(() => window.__THE_WALL_MOBILE__.isActive());
  const layout = await page.evaluate(() => {
    const viewport = document.getElementById('viewportWrap').getBoundingClientRect();
    const joystick = document.querySelector('[data-mobile-stick]').getBoundingClientRect();
    const hit = document.querySelector('[data-mobile-hit]').getBoundingClientRect();
    return {
      viewport: { top: viewport.top, height: viewport.height, width: viewport.width },
      joystick: { x: joystick.x, y: joystick.y, width: joystick.width, height: joystick.height },
      hit: { x: hit.x, y: hit.y, width: hit.width, height: hit.height },
      oldDeckVisible: getComputedStyle(document.querySelector('.technique-deck')).display !== 'none',
      pixelRatio: window.devicePixelRatio,
      renderRatio: document.getElementById('labCanvas').width / viewport.width,
      cameraFov: window.__THE_WALL_LAB__.getPlaytestContext().cameraId,
    };
  });
  assert.ok(Math.abs(layout.viewport.top) <= 1);
  assert.ok(Math.abs(layout.viewport.height - 844) <= 3, 'Playable court should fill mobile height');
  assert.ok(layout.joystick.width >= 104 && layout.hit.height >= 80);
  assert.ok(layout.hit.x > layout.joystick.x + layout.joystick.width,
    'Thumb controls should not compete for the same screen space');
  assert.equal(layout.oldDeckVisible, false, 'The desktop button deck must not block the court');
  assert.ok(layout.renderRatio <= 1.3, `Mobile render pixel ratio should be capped: ${layout.renderRatio}`);

  const firstHit = await page.locator('[data-mobile-hit]').boundingBox();
  const firstStick = await page.locator('[data-mobile-stick]').boundingBox();
  const joyOrigin = {
    id: 1,
    x: firstStick.x + firstStick.width / 2,
    y: firstStick.y + firstStick.height / 2,
  };
  const joyRight = { ...joyOrigin, x: joyOrigin.x + 35, y: joyOrigin.y - 10 };
  const shotOrigin = {
    id: 2,
    x: firstHit.x + firstHit.width / 2,
    y: firstHit.y + firstHit.height / 2,
  };
  const shotAim = { ...shotOrigin, x: shotOrigin.x + 35, y: shotOrigin.y - 15 };
  const cdp = await context.newCDPSession(page);

  await touch(cdp, 'touchStart', [joyOrigin]);
  await touch(cdp, 'touchMove', [joyRight]);
  await page.waitForFunction(() => window.__THE_WALL_MOBILE__.getInput().move.x > 0.14);

  const initialAim = await page.evaluate(() => window.__THE_WALL_MOBILE__.getInput().aim.x);
  await touch(cdp, 'touchStart', [joyRight, shotOrigin]);
  await page.waitForFunction(() => window.__THE_WALL_MOBILE__.getInput().activeTechnique === 'palm');
  await touch(cdp, 'touchMove', [joyRight, shotAim]);
  await page.waitForFunction((initial) => window.__THE_WALL_MOBILE__.getInput().aim.x > initial + 0.08,
    initialAim, { timeout: 2500 }).catch(async (error) => {
    const details = await page.evaluate(() => ({
      input: window.__THE_WALL_MOBILE__.getInput(),
      aimLabel: document.querySelector('[data-mobile-aim]')?.textContent,
      hitElement: document.elementFromPoint(125, 125)?.outerHTML.slice(0, 100),
    }));
    throw new Error(`Touch swipe not reflected in aim: ${JSON.stringify(details)}; baseline ${initialAim}`, { cause: error });
  });
  const both = await page.evaluate(() => window.__THE_WALL_MOBILE__.getInput());
  assert.ok(both.move.x > 0.14 && both.activeTechnique === 'palm',
    'Both thumbs must work simultaneously without cancelling movement');

  // CDP's touchEnd protocol expects an *empty* touchPoints array and cannot
  // natively lift only finger 2 while keeping finger 1 down. Both fingers were
  // genuine touch contacts through charge and drag; now dispatch the captured
  // right-finger pointerup, leaving the real left touch active.
  const shootingPointer = await page.evaluate(() => window.__THE_WALL_MOBILE__.getInput().shotPointer);
  const attemptsBeforeRelease = await page.evaluate(() => window.__THE_WALL_LAB__.getMatchStats().swingAttempts);
  await page.locator('[data-mobile-hit]').dispatchEvent('pointerup', {
    pointerId: shootingPointer,
    pointerType: 'touch',
    clientX: shotAim.x,
    clientY: shotAim.y,
  });
  await page.waitForFunction(() => window.__THE_WALL_MOBILE__.getInput().activeTechnique === null, null, { timeout: 5000 });
  assert.equal(
    await page.evaluate(() => window.__THE_WALL_LAB__.getMatchStats().swingAttempts),
    attemptsBeforeRelease + 1,
    'A right-thumb pointer release must commit exactly one physical swing',
  );
  assert.ok((await page.evaluate(() => window.__THE_WALL_MOBILE__.getInput().move.x)) > 0.1,
    'The left thumb must keep moving while the right thumb releases');
  await touch(cdp, 'touchEnd', []);
  assert.equal(
    await page.evaluate(() => window.__THE_WALL_LAB__.getMatchStats().swingAttempts),
    attemptsBeforeRelease + 1,
    'Subsequent native touchend must not commit a duplicate swing',
  );
  await page.waitForFunction(() => Math.abs(window.__THE_WALL_MOBILE__.getInput().move.x) < 0.001);

  // Dedicated touch shot selection must work independently of swing gestures.
  const top = await page.locator('[data-mobile-technique="topspin"]').boundingBox();
  await page.touchscreen.tap(top.x + top.width / 2, top.y + top.height / 2);
  await page.waitForFunction(() => window.__THE_WALL_MOBILE__.getInput().selected === 'topspin', null, { timeout: 3000 })
    .catch(async (error) => {
      const details = await page.evaluate(() => ({
        input: window.__THE_WALL_MOBILE__.getInput(),
        elements: document.elementsFromPoint(
          document.querySelector('[data-mobile-technique="topspin"]').getBoundingClientRect().x + 12,
          document.querySelector('[data-mobile-technique="topspin"]').getBoundingClientRect().y + 12,
        ).slice(0, 3).map((element) => element.outerHTML.slice(0, 100)),
      }));
      throw new Error(`Mobile contact selector missed tap: ${JSON.stringify(details)}`, { cause: error });
    });

  // A cancelled gesture must never generate a contact.
  const beforeCancel = await page.evaluate(() => window.__THE_WALL_LAB__.getMatchStats().swingAttempts);
  await touch(cdp, 'touchStart', [shotOrigin]);
  await touch(cdp, 'touchCancel', []);
  const afterCancel = await page.evaluate(() => window.__THE_WALL_LAB__.getMatchStats().swingAttempts);
  assert.equal(afterCancel, beforeCancel, 'Finger cancellation must never create an accidental swing');

  // Pause controls stay inside the fullscreen game and stop the authoritative tick.
  const pause = await page.locator('[data-mobile-pause]').boundingBox();
  await page.touchscreen.tap(pause.x + pause.width / 2, pause.y + pause.height / 2);
  await page.waitForFunction(() => window.__THE_WALL_LAB__.isPaused());
  const tick = await page.evaluate(() => window.__THE_WALL_LAB__.getSnapshot().tick);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => window.__THE_WALL_LAB__.getSnapshot().tick), tick);
  await page.locator('#mvpResumeButton').dispatchEvent('click');
  await page.waitForFunction((frozen) => window.__THE_WALL_LAB__.getSnapshot().tick > frozen, tick);

  // Rotating the phone keeps access to game input and room for both thumbs.
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(350);
  assert.equal(await page.evaluate(() => window.__THE_WALL_MOBILE__.isActive()), true);
  const landscape = await page.evaluate(() => ({
    height: document.getElementById('viewportWrap').getBoundingClientRect().height,
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    joystickVisible: document.querySelector('[data-mobile-stick]').getBoundingClientRect().height > 70,
  }));
  assert.ok(Math.abs(landscape.height - 390) < 3);
  assert.ok(landscape.pageWidth - landscape.viewportWidth <= 1);
  assert.equal(landscape.joystickVisible, true);

  assert.deepEqual(errors, [], `Mobile browser errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({
    status: 'passed', test: 'mobile-two-thumb',
    portrait: layout.viewport, camera: layout.cameraFov,
    movementAndShot: 'simultaneous', aim: 'swipe', cancelledSwing: 'safe',
    portraitRenderRatio: layout.renderRatio, landscape,
  }, null, 2));
} finally {
  await browser.close();
}
