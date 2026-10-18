import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deriveReturnGuideView } from '../src/presentation/return-guide.js';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const base = {
  visible: true,
  preparing: false,
  cue: 'move',
  plan: { recommended: { time: 0.42 } },
  footwork: {
    available: true,
    label: 'LEFT + STEP IN',
    movementDistanceMeters: 0.46,
    targetPosition: { x: -0.7, y: 0, z: 6.2 },
  },
};
const move = deriveReturnGuideView(base);
assert.equal(move.visible, true);
assert.equal(move.label, 'MOVE HERE');
assert.match(move.detail, /LEFT \+ STEP IN/);
assert.equal(move.targetPosition.y, 0.035, 'Screen marker should sit just above the court');
assert.equal(Object.isFrozen(move.targetPosition), true);

const settled = {
  ...base,
  cue: 'prepare',
  footwork: { ...base.footwork, movementDistanceMeters: 0.04 },
};
assert.equal(deriveReturnGuideView(settled).label, 'LOAD OPEN PALM');
assert.equal(deriveReturnGuideView({ ...settled, cue: 'hold', preparing: true }).label, 'HOLD YOUR LOAD');
assert.equal(deriveReturnGuideView({ ...settled, cue: 'strike', preparing: true }).label, 'RELEASE NOW');
assert.equal(deriveReturnGuideView({ ...settled, cue: 'strike' }).label, 'QUICK PALM');

for (const hidden of [
  null,
  { ...base, visible: false },
  { ...base, footwork: { available: false } },
  { ...base, plan: { recommended: null } },
]) {
  assert.equal(deriveReturnGuideView(hidden).visible, false);
}
assert.deepEqual(base.footwork.targetPosition, { x: -0.7, y: 0, z: 6.2 }, 'Guidance must not mutate coach data');

const shell = read('src/labs/mvp-shell.js');
const guide = read('src/labs/return-guide.js');
const game = read('src/labs/ball-lab.js');
assert.ok(shell.includes("await import('./return-guide.js');"), 'Guide must load after the coach and first-run shell');
assert.ok(game.includes('function projectCourtPoint(point = {})'), 'Game must publish camera projection read-only');
assert.ok(game.includes('  projectCourtPoint,'), 'Camera projection should be exposed in the public presentation API');
assert.ok(guide.includes('deriveReturnGuideView(coach.getState())'), 'Guide must consume live coach state');
assert.ok(guide.includes('api.projectCourtPoint(guidance.targetPosition)'), 'Guide must use the current game camera');
assert.ok(guide.includes("event.code !== 'KeyH'"), 'H should toggle the optional marker');
assert.ok(guide.includes('!api.isPaused?.()'), 'Pause should hide the marker');
for (const forbidden of ['../sim/', 'stepBall(', 'awardRally(', 'state.ball =', 'state.match =']) {
  assert.equal(guide.includes(forbidden), false, `Read-only guide may not own physics or rules: ${forbidden}`);
}
console.log('3D return guide view and presentation boundary passed.');
