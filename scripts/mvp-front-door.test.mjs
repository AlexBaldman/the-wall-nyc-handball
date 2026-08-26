import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const entry = read('app.js');
const frontDoor = read('src/game/mvp-front-door.js');
const html = read('index.html');

assert.ok(
  entry.includes("import './src/game/mvp-front-door.js';"),
  'Root entrypoint should compose the MVP recommendation strip',
);
assert.ok(html.includes('class="topbar"'));
assert.ok(html.includes('class="game-shell"'));
assert.ok(html.includes('id="gameCanvas"'));
assert.ok(frontDoor.includes('Current MVP · recommended'));
assert.ok(frontDoor.includes('href="lab.html"'));
assert.ok(frontDoor.includes('Play 3D Street Match'));
assert.ok(frontDoor.includes('The classic 2.5D build stays playable below.'));
assert.ok(frontDoor.includes('getRecommendedHref'));

for (const forbidden of [
  '../sim/',
  'stepBall(',
  'awardRally(',
  'state.',
  'localStorage',
]) {
  assert.equal(
    frontDoor.includes(forbidden),
    false,
    `Front-door promotion must remain navigation/presentation only; found ${forbidden}`,
  );
}

console.log('MVP front-door promotion passed.');
