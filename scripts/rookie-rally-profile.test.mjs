import assert from 'node:assert/strict';
import { getGhostProfile, ghostAim } from '../src/game/wall-ghost.js';

const rookie = getGhostProfile('rookie');
const regular = getGhostProfile('regular');
const champion = getGhostProfile('champion');
const halfWidth = 2.7;
const noNoise = () => 0;
const playerX = 2;

const rookieAim = ghostAim(rookie, { playerX, halfWidth, signedRandom: noNoise });
const regularAim = ghostAim(regular, { playerX, halfWidth, signedRandom: noNoise });
const championAim = ghostAim(champion, { playerX, halfWidth, signedRandom: noNoise });

assert.equal(rookie.counterPressure, 0.28);
assert.ok(
  Math.abs(rookieAim) < Math.abs(regularAim) * 0.65,
  `Rookie should send materially more neutral returns: rookie ${rookieAim}, regular ${regularAim}`,
);
assert.ok(
  Math.abs(regularAim) < Math.abs(championAim),
  'Regular should preserve less open-court pressure than Champion',
);
assert.equal(
  ghostAim(rookie, { playerX: 0, halfWidth, signedRandom: noNoise }),
  0,
  'Rookie should still aim through center against a centered player',
);

const legacyRegular = -playerX * (0.42 + regular.aggression * 0.16);
const legacyChampion = -playerX * (0.42 + champion.aggression * 0.16);
assert.ok(Math.abs(regularAim - legacyRegular) < 1e-12, 'Regular aim behavior must remain unchanged');
assert.ok(Math.abs(championAim - legacyChampion) < 1e-12, 'Champion aim behavior must remain unchanged');

const positiveNoise = ghostAim(rookie, {
  playerX,
  halfWidth,
  signedRandom: (amount) => amount,
});
assert.ok(
  positiveNoise > rookieAim,
  'Rookie perception/aim error should remain active; easier tactics must not become scripted returns',
);

assert.equal(rookie.moveSpeed, 3.05);
assert.equal(rookie.observationDelayMs, 168);
assert.equal(rookie.english, 0.14);
assert.equal(rookie.aggression, 0.08);

console.log('Rookie rally-pressure profile passed.');
