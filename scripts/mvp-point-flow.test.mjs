import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const entry = read('src/labs/ball-lab-entry.js');
const flow = read('src/labs/mvp-point-flow.js');

assert.ok(
  entry.includes("import './mvp-point-flow.js';"),
  'Street Match entrypoint should compose the dead-ball MVP flow explicitly',
);
assert.ok(flow.includes('api.getMatch()'));
assert.ok(flow.includes('api.startRallyPoint()'));
assert.ok(flow.includes('__THE_WALL_MVP__?.getStorageKey'));
assert.ok(flow.includes('if (match?.active) markFirstRunComplete()'));
assert.ok(flow.includes("id: 'player-serve-ready'"));
assert.ok(flow.includes("id: 'player-serve-toss'"));
assert.ok(flow.includes("id: 'second-serve'"));
assert.ok(flow.includes("id: 'next-point'"));
assert.ok(flow.includes("id: 'rematch'"));
assert.ok(flow.includes("element.setAttribute('aria-live', 'polite')"));

const activeDefault = flow.indexOf("if (match.active)");
const liveRallyEscape = flow.indexOf('return null;', activeDefault);
assert.ok(
  activeDefault >= 0 && liveRallyEscape > activeDefault,
  'Unrecognized live-rally states should hide the dead-ball helper rather than compete with play',
);

for (const forbidden of [
  '../sim/',
  'stepBall(',
  'awardRally(',
  'resolveHandContact(',
  'state.',
  'getSnapshot(',
]) {
  assert.equal(
    flow.includes(forbidden),
    false,
    `Dead-ball flow must remain a public-API presentation adapter; found ${forbidden}`,
  );
}

console.log('MVP dead-ball point-flow boundary passed.');
