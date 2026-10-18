import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const entry = read('src/labs/ball-lab-entry.js');
const game = read('src/labs/ball-lab.js');
const pause = read('src/labs/mvp-pause.js');

assert.ok(entry.includes("import './mvp-pause.js';"), 'Pause UI must load from the Street Match entrypoint');
assert.ok(game.includes('function setPaused(nextPaused)'), 'The game must expose simulation pause');
assert.ok(game.includes('isPaused: () => paused'), 'The presentation layer must be able to read pause state');
assert.ok(game.includes('const replaySnapshot = paused ? null : updateReplay(delta)'));
assert.ok(game.includes('if (!paused && !state.replayPlayback)'), 'Paused games must not advance the authoritative simulation');
assert.ok(game.includes('if (paused || shortcutBlocked(event)) return'), 'Gameplay hotkeys must respect pause and focused controls');
assert.ok(game.includes("document.querySelector('dialog[open]')"), 'Help dialogs must block gameplay hotkeys');
assert.ok(game.includes('input.activeTechnique = null'), 'Pausing must cancel held contacts instead of swinging');
assert.ok(game.includes("window.addEventListener('blur'"), 'Losing focus must not trigger a live swing');

for (const snippet of [
  "const reasons = new Set()",
  "hold('attention')",
  "hold('help')",
  'api.setPaused(isPaused)',
  "attributeFilter: ['open']",
  "event.code !== 'KeyP' && event.code !== 'Escape'",
  'mvpResumeButton',
  'pauseButton.setAttribute',
]) {
  assert.ok(pause.includes(snippet), `Expected accessible, attention-safe pause UI: ${snippet}`);
}

for (const forbidden of ["../sim/", 'stepBall(', 'awardRally(', 'state.match =']) {
  assert.ok(!pause.includes(forbidden), `Pause UI must not mutate simulation state: ${forbidden}`);
}

console.log('MVP pause and focus-guard boundary passed.');
