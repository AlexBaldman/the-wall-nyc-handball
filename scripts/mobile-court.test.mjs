import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { joystickVector, draggedWallAim, aimDescription, MOBILE_TECHNIQUES } from '../src/controls/mobile-thumb.js';

const center = joystickVector({ x: 50, y: 50, centerX: 50, centerY: 50 });
assert.deepEqual(center, { x: 0, z: 0 });
const right = joystickVector({ x: 110, y: 50, centerX: 50, centerY: 50, radius: 60 });
assert.ok(right.x > 0.99 && right.z === 0, 'Rightward thumb movement should move right');
const forward = joystickVector({ x: 50, y: -20, centerX: 50, centerY: 50, radius: 60 });
assert.ok(forward.z < -0.99, 'Up on joystick should move toward the front wall');
const diagonal = joystickVector({ x: 110, y: -10, centerX: 50, centerY: 50, radius: 60 });
assert.ok(Math.hypot(diagonal.x, diagonal.z) <= 1 + 1e-9);
const tiny = joystickVector({ x: 53, y: 51, centerX: 50, centerY: 50, radius: 60 });
assert.deepEqual(tiny, { x: 0, z: 0 }, 'Deadzone avoids involuntary foot movement');
assert.deepEqual(joystickVector({ x: Infinity, y: Infinity, centerX: 0, centerY: 0 }), { x: 0, z: 0 },
  'Touch math must never emit NaN or Infinity');

const initial = { x: 0, y: -0.7 };
const steer = draggedWallAim(initial, 70, -30);
assert.ok(steer.x > 0.4 && steer.y > -0.7);
assert.deepEqual(initial, { x: 0, y: -0.7 }, 'Swipe must not mutate the caller');
assert.equal(draggedWallAim(initial, 1000, -999).x, 1);
assert.equal(draggedWallAim(initial, -1000, 999).y, -1);
assert.equal(aimDescription({ x: 0, y: -0.7 }), 'CENTER · LOW');
assert.equal(aimDescription({ x: -1, y: 1 }), 'LEFT · HIGH');
assert.deepEqual(MOBILE_TECHNIQUES.map((shot) => shot.id), ['palm', 'topspin', 'backspin', 'fist']);

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const game = read('src/labs/ball-lab.js');
const controls = read('src/labs/mobile-court.js');
const css = read('mobile-court.css');
const shell = read('src/labs/mvp-shell.js');
const html = read('lab.html');
const stage = read('scripts/stage-site.mjs');
assert.ok(shell.includes("await import('./mobile-court.js');"));
assert.ok(html.includes('href="mobile-court.css"'));
assert.ok(stage.includes("'mobile-court.css'"));
assert.ok(game.includes('getTouchControlState,') && game.includes('beginTouchContact: beginTechnique'));
assert.ok(game.includes('setTouchMove,') && game.includes('setTouchAim,'));
assert.ok(game.includes('function mobileRendering()'));
assert.ok(game.includes('1.35 / camera.aspect'), 'Portrait should preserve horizontal court coverage');
assert.ok(controls.includes('setPointerCapture('), 'Genuine pointer capture required for two simultaneous thumbs');
assert.ok(controls.includes('releaseShot(event.pointerId, false)'), 'Cancelled touches must not swing');
assert.ok(controls.includes('api.finishTouchContact(selected)'), 'Successful release must use canonical swing input');
assert.ok(css.includes('100dvh') && css.includes('safe-area-inset-bottom'));
for(const forbidden of ['stepBall(', 'awardRally(', 'state.ball =']) {
  assert.ok(!controls.includes(forbidden), `Touch presentation must not own simulation: ${forbidden}`);
}
console.log('Two-thumb mobile math, ownership, responsiveness and deployment boundary passed.');
