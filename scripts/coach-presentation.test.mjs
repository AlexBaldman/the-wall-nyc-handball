import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const coach = readFileSync(resolve(root, 'src/labs/intercept-coach.js'), 'utf8');

assert.ok(
  coach.includes('class="intercept-coach__radar"'),
  'Live intercept coach should render the footwork radar canvas',
);
assert.ok(
  coach.includes("canvas.getContext('2d')"),
  'Footwork radar should remain a lightweight Canvas 2D presentation surface',
);
assert.ok(
  coach.includes('ONE_WALL_HANDBALL.physics.court'),
  'Radar projection must consume canonical court geometry from the handball SportPack',
);
assert.ok(
  coach.includes('state.footwork.targetPosition'),
  'Radar should visualize the minimum movement target produced by sport-owned guidance',
);
assert.ok(
  coach.includes('state.plan.recommended.position'),
  'Radar should distinguish the predicted contact from the minimum player movement target',
);
assert.equal(
  coach.includes('stepBall('),
  false,
  'Presentation may visualize predictions but must not own ball simulation',
);
assert.equal(
  coach.includes('awardRally('),
  false,
  'Presentation may coach a point but must never own scoring',
);

console.log('Live intercept coach presentation boundary passed.');
